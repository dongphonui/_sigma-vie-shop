
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

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
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
        `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB);`,
        `CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, timestamp BIGINT);`
    ];
    for (let q of queries) await client.query(q);
    console.log("✅ Database Schema Initialized");
  } catch (err) { console.error('Schema Error:', err.message); }
  finally { if (client) client.release(); }
};

initDb();

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- PRODUCTS API ---
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

app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        const productRes = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (productRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm' });
        let p = productRes.rows[0].data;
        
        if (size || color) {
            if (!p.variants) p.variants = [];
            const vIndex = p.variants.findIndex(v => (v.size === size || (!v.size && !size)) && (v.color === color || (!v.color && !color)));
            if (vIndex !== -1) {
                p.variants[vIndex].stock = (p.variants[vIndex].stock || 0) + quantityChange;
            } else if (quantityChange > 0) {
                p.variants.push({ size: size || '', color: color || '', stock: quantityChange });
            }
            p.stock = p.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
        } else {
            p.stock = (p.stock || 0) + quantityChange;
        }

        await pool.query('UPDATE products SET stock = $1, data = $2, updated_at = $3 WHERE id = $4', [p.stock, p, Date.now(), id]);
        res.json({ success: true, newStock: p.stock });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CATEGORIES API ---
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM categories');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', async (req, res) => {
    const c = req.body;
    try {
        await pool.query('INSERT INTO categories (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name=$2, data=$3', [c.id, c.name, c]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CUSTOMERS API ---
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(
            "INSERT INTO customers (id, name, phone, email, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5",
            [c.id, c.fullName, c.phoneNumber, c.email, c, c.createdAt || Date.now()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers/login', async (req, res) => {
    const { identifier, passwordHash } = req.body;
    try {
        const result = await pool.query(
            "SELECT data FROM customers WHERE (phone = $1 OR email = $1) AND data->>'passwordHash' = $2",
            [identifier, passwordHash]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, customer: result.rows[0].data });
        } else {
            res.json({ success: false, message: 'Số điện thoại/Email hoặc mật khẩu không chính xác.' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
    const c = req.body;
    try {
        await pool.query("UPDATE customers SET name=$1, phone=$2, email=$3, data=$4 WHERE id=$5", [c.fullName, c.phoneNumber, c.email, c, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ORDERS API ---
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
    const o = req.body;
    try {
        await pool.query(
            "INSERT INTO orders (id, customer_id, total_price, status, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET status=$4, data=$6",
            [o.id, o.customerId, o.totalPrice, o.status, o.timestamp, o]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVENTORY API ---
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM inventory_transactions ORDER BY timestamp DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', async (req, res) => {
    const t = req.body;
    try {
        await pool.query("INSERT INTO inventory_transactions (id, product_id, type, quantity, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING", [t.id, t.productId, t.type, t.quantity, t.timestamp, t]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SETTINGS API ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [req.params.key]);
        res.json(result.rows.length > 0 ? result.rows[0].value : {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        await pool.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [req.params.key, req.body]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN & AUTH API ---
app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        return res.json({ 
            success: true, 
            user: { id: 'master', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER', permissions: ['ALL'] } 
        });
    }
    res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu.' });
});

app.post('/api/admin/login', async (req, res) => {
    const { username, method, status } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        await pool.query("INSERT INTO admin_logs (username, method, status, ip_address, timestamp) VALUES ($1, $2, $3, $4, $5)", [username || 'unknown', method, status, ip, Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/email', async (req, res) => {
    const { to, subject, html } = req.body;
    if (!process.env.EMAIL_USER) {
        return res.json({ success: false, message: 'Chưa cấu hình Email Server.' });
    }
    try {
        await transporter.sendMail({ from: `"Sigma Vie" <${process.env.EMAIL_USER}>`, to, subject, html });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// --- RESET DATABASE ---
app.post('/api/admin/reset', async (req, res) => {
    const { scope } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (scope === 'ORDERS') {
            await client.query('TRUNCATE orders, inventory_transactions RESTART IDENTITY CASCADE');
        } else if (scope === 'PRODUCTS') {
            await client.query('TRUNCATE products, inventory_transactions, orders RESTART IDENTITY CASCADE');
        } else if (scope === 'FULL') {
            await client.query('TRUNCATE products, categories, customers, orders, inventory_transactions, admin_logs, app_settings RESTART IDENTITY CASCADE');
        }
        await client.query('COMMIT');
        res.json({ success: true, message: 'Dữ liệu đã được xóa trắng trên Server.' });
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: err.message }); 
    } finally { client.release(); }
});

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
