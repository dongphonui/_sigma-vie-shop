
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// --- PREVENT CRASH ON UNHANDLED ERRORS ---
process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Cấu hình kết nối tối ưu cho Neon.tech
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Bắt buộc cho Neon/Render khi dùng SSL
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection ngay lập tức
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ LỖI KẾT NỐI DATABASE:', err.message);
        console.error('Hãy kiểm tra DATABASE_URL trong Environment Variables.');
    } else {
        console.log('✅ Đã kết nối thành công tới Postgres tại:', res.rows[0].now);
    }
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize Database Schema
const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("🛠️ Đang khởi tạo Database Tables...");

    // Tạo các bảng cơ bản
    await client.query(`CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY, name TEXT, stock INTEGER DEFAULT 0, data JSONB, updated_at BIGINT);`);
    await client.query(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, data JSONB, created_at BIGINT);`); 
    
    // Đảm bảo các cột cho customers (tránh lỗi migration)
    const customerCols = ['name', 'phone', 'email', 'data', 'created_at'];
    for (const col of customerCols) {
        await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS ${col} TEXT;`).catch(() => {});
    }

    await client.query(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT, total_price NUMERIC, status TEXT, timestamp BIGINT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, product_id BIGINT, type TEXT, quantity INTEGER, timestamp BIGINT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, user_agent TEXT, timestamp BIGINT);`);
    await client.query(`CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, fullname TEXT, role TEXT, permissions JSONB, created_at BIGINT, totp_secret TEXT, is_totp_enabled BOOLEAN DEFAULT FALSE);`);
    await client.query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB);`);

    console.log('✅ Hệ thống bảng đã sẵn sàng trong Neon.');
  } catch (err) {
    console.error('⚠️ Lỗi khởi tạo Schema:', err.message);
  } finally {
    if (client) client.release();
  }
};

// --- API ROUTES ---

app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    dbConnected: pool.totalCount > 0,
    timestamp: new Date().toISOString()
}));

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(row => row.data).filter(p => p));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query(`INSERT INTO products (id, name, stock, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, stock=$3, data=$4, updated_at=$5`, [p.id, p.name, p.stock, p, Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM inventory_transactions WHERE product_id::text = $1', [productId]);
        const result = await client.query('DELETE FROM products WHERE id::text = $1', [productId]);
        await client.query('COMMIT');
        if (result.rowCount === 0) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true });
    } catch (err) { 
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message }); 
    } finally {
        client.release();
    }
});

// Các route khác giữ nguyên...
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`INSERT INTO customers (id, name, phone, email, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`, [c.id, c.fullName || c.name, c.phoneNumber || c.phone, c.email, c, c.createdAt || Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
    const o = req.body;
    try {
        await pool.query(`INSERT INTO orders (id, customer_id, total_price, status, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET status=$4, data=$6`, [o.id, o.customerId, o.totalPrice, o.status, o.timestamp, o]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Auth
app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else res.json({ success: false, message: 'Sai thông tin' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Cài đặt app settings
app.get('/api/settings/:key', async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [req.params.key]);
        res.json(result.rows.length > 0 ? result.rows[0].value : {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        await pool.query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [req.params.key, req.body]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server SigmaVie đang chạy tại cổng ${port}`);
    initDb();
});
