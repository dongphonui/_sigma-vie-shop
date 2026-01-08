
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 3000;

const cleanDbUrl = (url) => {
    if (!url) return null;
    return url.trim().replace(/^["']|["']$/g, '');
};

const dbUrl = cleanDbUrl(process.env.DATABASE_URL);

app.use(cors());
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const initDb = async () => {
  if (!dbUrl) return;
  let client;
  try {
    client = await pool.connect();
    await client.query(`
        CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY, data JSONB, updated_at BIGINT);
        CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data JSONB);
        CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data JSONB, created_at BIGINT);
        CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB, timestamp BIGINT);
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB);
        CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, data JSONB, timestamp BIGINT);
        CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, data JSONB, timestamp BIGINT);
    `);
    console.log("✅ Database structure verified.");
  } catch (err) {
    console.error("❌ Database Init Fail:", err.message);
  } finally {
    if (client) client.release();
  }
};
initDb();

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: !!dbUrl }));

// --- ADMIN & AUTH API ---
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    // Đăng nhập mặc định cho admin
    if (username === 'admin' && password === 'admin') {
        return res.json({ success: true, user: { id: 'admin', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER' } });
    }
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập.' });
});

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp } = req.body;
    console.log(`[OTP] Gửi mã ${otp} tới Email: ${email} và SĐT: ${phone}`);
    // Mock gửi thành công để frontend không báo lỗi network
    res.json({ success: true, delivered: { email: true, sms: false } });
});

app.post('/api/admin/logs', async (req, res) => {
    try {
        await pool.query('INSERT INTO admin_logs (data, timestamp) VALUES ($1, $2)', [req.body, Date.now()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 50');
        res.json(result.rows.map(r => ({ ...r.data, id: r.id, timestamp: r.timestamp })));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- PRODUCTS API ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query(
            'INSERT INTO products (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3', 
            [p.id, p, Date.now()]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS API ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
        res.json(result.rows[0]?.value || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        await pool.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', 
            [req.params.key, req.body]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`🚀 Sigma Vie Backend listening on port ${port}`));
