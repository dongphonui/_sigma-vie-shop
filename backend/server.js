
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');

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
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const initDb = async () => {
  if (!dbUrl) {
      console.error("❌ DATABASE_URL is missing! Please set it in environment variables.");
      return;
  }
  let client;
  try {
    client = await pool.connect();
    console.log("📡 Connected to PostgreSQL");
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
    console.log("✅ Database Schema Ready");
  } catch (err) { console.error('❌ Schema Initialization Error:', err.stack); }
  finally { if (client) client.release(); }
};

initDb();

// --- SETTINGS ROUTES ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
        if (result.rows.length > 0) {
            res.json(result.rows[0].value);
        } else {
            res.json({});
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = req.body;
        console.log(`💾 Saving setting: ${key}`);
        await pool.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
        res.json({ success: true });
    } catch (err) { 
        console.error(`❌ Error saving setting ${key}:`, err.message);
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        const currentStock = parseInt(p.stock) || 0;
        await pool.query(`INSERT INTO products (id, name, stock, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, stock=$3, data=$4, updated_at=$5`, [p.id, p.name, currentStock, p, Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ... (Các route khác giữ nguyên hoặc tương tự)

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
