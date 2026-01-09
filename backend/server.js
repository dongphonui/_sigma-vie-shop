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

// Helper gửi SMS qua SpeedSMS chuẩn hóa API v2
const sendSms = (phone, content, senderId = "") => {
    return new Promise((resolve) => {
        const apiKey = process.env.SPEEDSMS_API_KEY;
        if (!apiKey) {
            console.warn("[SpeedSMS] API Key missing. Check Render Env.");
            return resolve(false);
        }

        // SpeedSMS dùng Basic Auth với API Key làm username, password để trống
        const auth = Buffer.from(`${apiKey}:`).toString('base64');
        
        const postData = JSON.stringify({
            to: [phone], // SpeedSMS yêu cầu mảng cho số điện thoại
            content: content,
            sms_type: 2, // 2: Loại CSKH (thường dùng cho OTP)
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
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        console.log(`[SpeedSMS] Calling API for ${phone}...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log("[SpeedSMS] Response:", data);
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed.status === 'success');
                } catch (e) {
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error("[SpeedSMS] Request error:", e.message);
            resolve(false);
        });

        req.write(postData);
        req.end();
    });
};

app.get('/api/health', (req, res) => res.json({ status: 'ok', db: !!dbUrl }));

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        return res.json({ 
            success: true, 
            user: { id: 'admin', username: 'admin', fullname: 'Quản trị viên', role: 'MASTER' } 
        });
    }
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập.' });
});

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp, senderId } = req.body;
    const content = `Ma xac thuc Sigma Vie cua ban la: ${otp}. Vui long khong cung cap ma nay cho bat ky ai.`;

    console.log(`[OTP] Sending to Phone: ${phone}, Email: ${email}`);

    // Chạy song song cả SMS và Email để tăng độ tin cậy
    const smsPromise = sendSms(phone, content, senderId);
    const emailPromise = process.env.EMAIL_USER ? transporter.sendMail({
        from: `"Sigma Vie Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[OTP] Mã xác thực đăng nhập: ${otp}`,
        html: `<div style="font-family:sans-serif; padding:30px; background:#f9f9f9; text-align:center;">
                <div style="background:white; padding:40px; border-radius:20px; display:inline-block; border:1px solid #eee;">
                    <h2 style="margin-top:0; color:#111827;">Mã xác thực Quản trị</h2>
                    <p style="color:#666;">Dùng mã dưới đây để truy cập hệ thống Sigma Vie:</p>
                    <div style="font-size:40px; font-weight:900; letter-spacing:10px; color:#D4AF37; margin:30px 0;">${otp}</div>
                    <p style="font-size:12px; color:#999;">Mã có hiệu lực trong 5 phút. Nếu không phải bạn yêu cầu, hãy đổi mật khẩu ngay.</p>
                </div>
               </div>`
    }).catch(e => { console.error("Email Error:", e.message); return null; }) : Promise.resolve(null);

    const [smsOk, emailRes] = await Promise.all([smsPromise, emailPromise]);

    res.json({ 
        success: true, 
        sms_sent: smsOk,
        email_sent: !!emailRes
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