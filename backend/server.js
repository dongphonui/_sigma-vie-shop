const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const https = require('https');
const nodemailer = require('nodemailer');

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

// Cấu hình Email (Nodemailer)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
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

// Helper gửi SMS qua SpeedSMS
const sendSms = (phone, content, senderId = "") => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SPEEDSMS_API_KEY;
        if (!apiKey) {
            console.warn("[SpeedSMS] API Key missing. Skipping SMS.");
            return resolve(false);
        }

        const auth = Buffer.from(`${apiKey}:`).toString('base64');
        const data = JSON.stringify({
            to: [phone],
            content: content,
            sms_type: 2, // 2: Chăm sóc khách hàng / OTP
            sender: senderId || ""
        });

        const options = {
            hostname: 'api.speedsms.vn',
            port: 443,
            path: '/index.php/sms/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`,
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                console.log("[SpeedSMS] API Response:", responseData);
                resolve(true);
            });
        });

        req.on('error', (e) => {
            console.error("[SpeedSMS] Error:", e);
            resolve(false);
        });

        req.write(data);
        req.end();
    });
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: !!dbUrl }));

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        return res.json({ success: true, user: { id: 'admin', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER' } });
    }
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập.' });
});

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp, senderId } = req.body;
    const content = `Ma xac thuc Sigma Vie cua ban la: ${otp}. Vui long khong cung cap ma nay cho bat ky ai.`;

    console.log(`[OTP] Processing request for ${phone} / ${email}`);

    // Gửi song song SMS và Email
    const results = await Promise.allSettled([
        sendSms(phone, content, senderId),
        process.env.EMAIL_USER ? transporter.sendMail({
            from: `"Sigma Vie Security" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `[OTP] Mã xác thực đăng nhập Sigma Vie: ${otp}`,
            text: content,
            html: `<div style="font-family:sans-serif; padding:20px; border:1px solid #eee; border-radius:10px;">
                    <h2 style="color:#111827;">Xác minh Quản trị</h2>
                    <p>Mã OTP của bạn là:</p>
                    <div style="font-size:32px; font-weight:bold; letter-spacing:5px; color:#D4AF37; margin:20px 0;">${otp}</div>
                    <p style="color:#666; font-size:12px;">Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này.</p>
                   </div>`
        }) : Promise.resolve(false)
    ]);

    res.json({ 
        success: true, 
        sms_attempted: results[0].status === 'fulfilled',
        email_attempted: results[1].status === 'fulfilled'
    });
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