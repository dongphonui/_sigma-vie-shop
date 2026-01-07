
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
      console.error("❌ DATABASE_URL is missing!");
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
        `CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, timestamp BIGINT);`,
        `CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, session_id TEXT, customer_id TEXT, customer_name TEXT, sender_role TEXT, text TEXT, image_url TEXT, timestamp BIGINT, is_read BOOLEAN DEFAULT FALSE, reactions JSONB DEFAULT '{}');`
    ];
    for (let q of queries) await client.query(q);
    
    console.log("✅ Database Schema Ready");
  } catch (err) { console.error('❌ Schema Initialization Error:', err.stack); }
  finally { if (client) client.release(); }
};

initDb();

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
            `INSERT INTO customers (id, name, phone, email, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`,
            [c.id, c.fullName, c.phoneNumber || null, c.email || null, c, c.createdAt]
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
            res.json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
        }
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
        // Cập nhật: Đảm bảo total_price được lưu chính xác vào cột riêng biệt để báo cáo dễ dàng
        await pool.query(
            'INSERT INTO orders (id, customer_id, total_price, status, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET status=$4, total_price=$3, data=$6',
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
        await pool.query(
            'INSERT INTO inventory_transactions (id, product_id, type, quantity, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET data=$6',
            [t.id, t.productId, t.type, t.quantity, t.timestamp, t]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CHAT API ---
app.get('/api/chat/messages/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await pool.query('SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY timestamp ASC', [sessionId]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/chat/messages', async (req, res) => {
    try {
        const m = req.body;
        await pool.query(
            'INSERT INTO chat_messages (id, session_id, customer_id, customer_name, sender_role, text, image_url, timestamp, is_read, reactions) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
            [m.id, m.sessionId, m.customerId || null, m.customerName, m.senderRole, m.text, m.imageUrl || null, m.timestamp, m.isRead, m.reactions || {}]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/chat/sessions', async (req, res) => {
    try {
        const query = `
            WITH LastMessages AS (
                SELECT session_id, customer_name, text, image_url, timestamp, customer_id,
                ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp DESC) as rn
                FROM chat_messages
            ),
            UnreadCounts AS (
                SELECT session_id, COUNT(*) as unread_count
                FROM chat_messages
                WHERE sender_role = 'customer' AND is_read = FALSE
                GROUP BY session_id
            )
            SELECT 
                lm.session_id as "sessionId", 
                lm.customer_name as "customerName", 
                CASE 
                    WHEN lm.image_url IS NOT NULL AND (lm.text IS NULL OR lm.text = '') THEN '[Hình ảnh]'
                    WHEN lm.image_url IS NOT NULL THEN '[Hình ảnh] ' || lm.text
                    ELSE lm.text 
                END as "lastMessage", 
                lm.timestamp as "lastTimestamp",
                lm.customer_id as "customerId",
                COALESCE(uc.unread_count, 0) as "unreadCount"
            FROM LastMessages lm
            LEFT JOIN UnreadCounts uc ON lm.session_id = uc.session_id
            WHERE lm.rn = 1
            ORDER BY lm.timestamp DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SETTINGS APIS ---
app.get('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const result = await pool.query('SELECT value FROM app_settings WHERE key = $1', [key]);
        res.json(result.rows.length > 0 ? result.rows[0].value : {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = req.body;
        await pool.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

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

app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
