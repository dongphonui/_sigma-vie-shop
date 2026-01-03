
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const cleanDbUrl = (url) => {
    if (!url) return null;
    let cleaned = url.trim();
    if (cleaned.startsWith('base=')) cleaned = cleaned.replace('base=', '');
    if (cleaned.startsWith('DATABASE_URL=')) cleaned = cleaned.replace('DATABASE_URL=', '');
    cleaned = cleaned.replace(/^"|"$/g, '');
    cleaned = cleaned.replace(/^'|'$/g, '');
    return cleaned.trim();
};

const dbUrl = cleanDbUrl(process.env.DATABASE_URL);
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 10,
  connectionTimeoutMillis: 10000, 
});

const initDb = async () => {
  if (!dbUrl) return;
  let client;
  try {
    client = await pool.connect();
    const queries = [
        `CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY, name TEXT, stock INTEGER DEFAULT 0, data JSONB, updated_at BIGINT);`,
        `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT, data JSONB);`,
        `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, data JSONB, created_at BIGINT);`,
        `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT, total_price NUMERIC, status TEXT, timestamp BIGINT, data JSONB);`,
        `CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, product_id BIGINT, type TEXT, quantity INTEGER, timestamp BIGINT, data JSONB);`,
        `CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, fullname TEXT, role TEXT, permissions JSONB, created_at BIGINT, totp_secret TEXT, is_totp_enabled BOOLEAN DEFAULT FALSE);`,
        `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB);`
    ];
    for (let q of queries) await client.query(q);
  } catch (err) { console.error('Schema Error:', err.message); }
  finally { if (client) client.release(); }
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query(`INSERT INTO products (id, name, stock, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, stock=$3, data=$4, updated_at=$5`, [p.id, p.name, p.stock, p, Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ROUTE CẬP NHẬT KHO HÀNG (QUAN TRỌNG) ---
app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        // 1. Lấy dữ liệu sản phẩm hiện tại
        const productRes = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        
        let p = productRes.rows[0].data;
        
        // 2. Cập nhật logic tồn kho (Bao gồm variant)
        if (size || color) {
            if (!p.variants) p.variants = [];
            const vIndex = p.variants.findIndex(v => (v.size === size || (!v.size && !size)) && (v.color === color || (!v.color && !color)));
            
            if (vIndex !== -1) {
                p.variants[vIndex].stock = (p.variants[vIndex].stock || 0) + quantityChange;
            } else if (quantityChange > 0) {
                p.variants.push({ size: size || '', color: color || '', stock: quantityChange });
            }
            // Tính lại tổng tồn kho từ các variant
            p.stock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        } else {
            p.stock = (p.stock || 0) + quantityChange;
        }

        // 3. Đảm bảo tồn kho không âm
        if (p.stock < 0) p.stock = 0;

        // 4. Cập nhật ngược lại database (Cả cột stock và cột data)
        await pool.query(
            'UPDATE products SET stock = $1, data = $2, updated_at = $3 WHERE id = $4',
            [p.stock, p, Date.now(), id]
        );

        res.json({ success: true, newStock: p.stock });
    } catch (err) {
        console.error('Stock Update Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Auth
app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
        else res.json({ success: false, message: 'Sai thông tin' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server đang chạy tại cổng ${port}`);
    initDb();
});
