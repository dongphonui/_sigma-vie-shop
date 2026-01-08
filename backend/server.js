
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const https = require('https');

const app = express();
const port = process.env.PORT || 3000;

// Hàm làm sạch Database URL từ Render
const cleanDbUrl = (url) => {
    if (!url) return null;
    let cleaned = url.trim().replace(/^["']|["']$/g, '');
    if (cleaned.startsWith('base=')) cleaned = cleaned.replace('base=', '');
    if (cleaned.startsWith('DATABASE_URL=')) cleaned = cleaned.replace('DATABASE_URL=', '');
    return cleaned.trim();
};

const dbUrl = cleanDbUrl(process.env.DATABASE_URL);

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
});

// Cấu hình Email (Gmail App Password)
const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });
};

// Gửi SMS qua SpeedSMS (sender "" cho tài khoản chưa có Brandname)
const sendSMS = (phone, content) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SPEED_SMS_API_KEY;
        if (!apiKey) return resolve({ status: 'error', message: "Missing API Key" });

        let cleanPhone = phone.replace(/\s/g, '').replace(/[^\d]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '84' + cleanPhone.substring(1);

        const data = JSON.stringify({
            to: [cleanPhone],
            content: content,
            sms_type: 2, 
            sender: "" // Bắt buộc để trống nếu chưa đăng ký Brandname chính thức
        });

        const options = {
            hostname: 'api.speedsms.vn',
            port: 443,
            path: '/index.php/sms/send',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + Buffer.from(apiKey + ':x').toString('base64')
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch (e) { resolve({ status: 'error' }); }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
};

// Tự động khởi tạo cấu trúc bảng dữ liệu
const initDb = async () => {
  if (!dbUrl) return;
  let client;
  try {
    client = await pool.connect();
    const queries = [
        `CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY, data JSONB, updated_at BIGINT);`,
        `CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, data JSONB);`,
        `CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data JSONB, created_at BIGINT);`,
        `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, data JSONB, timestamp BIGINT);`,
        `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value JSONB);`,
        `CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, timestamp BIGINT);`,
        `CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, session_id TEXT, data JSONB, timestamp BIGINT);`
    ];
    for (let q of queries) await client.query(q);
  } catch (err) { console.error("Database Init Error:", err); }
  finally { if (client) client.release(); }
};
initDb();

// API ENDPOINTS
app.get('/api/health', (req, res) => res.json({ status: 'ok', database: !!dbUrl }));

app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query('INSERT INTO products (id, data, updated_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = $3', [p.id, p, Date.now()]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp } = req.body;
    const results = { email: false, sms: false };
    
    if (phone && phone.length > 8) {
        const smsRes = await sendSMS(phone, `Ma OTP Sigma Vie cua ban la: ${otp}. Hieu luc 5 phut.`);
        results.sms = (smsRes.status === 'success');
    }

    const transporter = getTransporter();
    if (transporter && email) {
        try {
            await transporter.sendMail({
                from: `"Sigma Vie" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Mã xác thực Sigma Vie',
                html: `<h3>Mã OTP của bạn là: <b style="color:#D4AF37; font-size:24px;">${otp}</b></h3>`
            });
            results.email = true;
        } catch (e) { console.error("Email Error:", e); }
    }
    res.json({ success: true, delivered: results });
});

app.post('/api/orders', async (req, res) => {
    try {
        await pool.query('INSERT INTO orders (id, data, timestamp) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $2', [req.body.id, req.body, req.body.timestamp]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(r => r.data));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => console.log(`🚀 Sigma Vie Backend running on port ${port}`));
