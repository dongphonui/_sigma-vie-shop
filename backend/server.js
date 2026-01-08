
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
// Tăng giới hạn lên 100mb để nhận ảnh base64 thoải mái
app.use(bodyParser.json({ limit: '100mb' }));
app.use(bodyParser.urlencoded({ limit: '100mb', extended: true }));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initDb = async () => {
  if (!dbUrl) {
      console.warn("⚠️ Không tìm thấy DATABASE_URL. Server chạy không DB.");
      return;
  }
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
        CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, session_id TEXT, data JSONB, timestamp BIGINT);
        CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, data JSONB, timestamp BIGINT);
        CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, data JSONB);
    `);
    console.log("✅ Database initialized successfully.");
  } catch (err) {
    console.error("❌ Database Connection Error:", err.message);
  } finally {
    if (client) client.release();
  }
};
initDb();

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: !!dbUrl }));

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    if (!p || !p.id) return res.status(400).json({ error: 'Missing product data' });
    try {
        await pool.query('INSERT INTO products (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3', [p.id, p, Date.now()]);
        res.json({ success: true });
    } catch (e) { 
        console.error("Save product error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- ORDERS ---
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
    try {
        await pool.query('INSERT INTO orders (id, data, timestamp) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2', [req.body.id, req.body, Date.now()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SETTINGS ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const result = await pool.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
        res.json(result.rows[0]?.value || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [req.params.key, req.body]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CUSTOMERS ---
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/customers', async (req, res) => {
    try {
        await pool.query('INSERT INTO customers (id, data, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2', [req.body.id, req.body, req.body.createdAt || Date.now()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- CHAT ---
app.get('/api/chat/messages/:sid', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM chat_messages WHERE session_id = $1 ORDER BY timestamp ASC', [req.params.sid]);
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/chat/messages', async (req, res) => {
    try {
        await pool.query('INSERT INTO chat_messages (id, session_id, data, timestamp) VALUES ($1, $2, $3, $4)', [req.body.id, req.body.sessionId, req.body, req.body.timestamp]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`🚀 Sigma Vie Backend running on port ${port}`));
