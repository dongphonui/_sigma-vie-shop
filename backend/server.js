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
  max: 10,
  idleTimeoutMillis: 30000,
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
    // KHÔNG THOÁT CHƯƠNG TRÌNH KHI DB LỖI QUOTA
    console.error("❌ Database Init Fail (Quota Exceeded?):", err.message);
    console.log("⚠️ Server continues running in memory-mode for critical tasks like SMS.");
  } finally {
    if (client) client.release();
  }
};
initDb();

// Helper gửi SMS qua SpeedSMS (Chuẩn hóa cho tài khoản cá nhân)
const sendSms = (phone, content, senderId = "") => {
    return new Promise((resolve) => {
        const apiKey = process.env.SPEEDSMS_API_KEY;
        
        if (!apiKey) {
            console.error("[SpeedSMS] ❌ LỖI: API Key trống. Hãy kiểm tra biến SPEEDSMS_API_KEY trên Render.");
            return resolve({ success: false, error: 'No API Key' });
        }

        // Định dạng SĐT chuẩn cho SpeedSMS (nên là mảng)
        const phoneList = [phone.toString()];

        console.log(`[SpeedSMS] 🚀 Gọi API cho số: ${phoneList.join(',')}...`);

        // SpeedSMS sử dụng Basic Auth: base64(API_KEY:)
        const auth = Buffer.from(`${apiKey}:`).toString('base64');
        const postData = JSON.stringify({
            to: phoneList,
            content: content,
            sms_type: 2, // 2: Loại tin nhắn CSKH/OTP (Dùng cho cá nhân)
            sender: senderId || "" // Để trống nếu chưa đăng ký Brandname
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

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                console.log("[SpeedSMS] 📥 API Response:", body);
                try {
                    const result = JSON.parse(body);
                    resolve({ success: result.status === 'success', data: result });
                } catch (e) {
                    resolve({ success: false, error: 'Parse Error' });
                }
            });
        });

        req.on('error', (e) => {
            console.error("[SpeedSMS] ❌ Lỗi kết nối:", e.message);
            resolve({ success: false, error: e.message });
        });

        req.write(postData);
        req.end();
    });
};

app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    db_connected: !!dbUrl,
    speedsms_key_configured: !!process.env.SPEEDSMS_API_KEY 
}));

app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    // Đăng nhập cứng để cứu hộ nếu DB chết
    if (username === 'admin' && password === 'admin') {
        return res.json({ 
            success: true, 
            user: { id: 'admin', username: 'admin', fullname: 'Master Admin', role: 'MASTER' } 
        });
    }
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập.' });
});

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp, senderId } = req.body;
    const content = `Ma xac thuc Sigma Vie cua ban la: ${otp}. Vui long khong cung cap ma nay cho bat ky ai.`;

    console.log(`[OTP Engine] 🔔 Đang xử lý OTP cho: ${phone}`);

    // Thực hiện gửi SMS
    const smsRes = await sendSms(phone, content, senderId);
    
    // Thực hiện gửi Email nếu có thể
    let emailSent = false;
    if (process.env.EMAIL_USER) {
        try {
            await transporter.sendMail({
                from: `"Sigma Security" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `[OTP] Mã xác thực: ${otp}`,
                text: content
            });
            emailSent = true;
        } catch (e) { console.error("[Email] Lỗi gửi mail:", e.message); }
    }

    // Luôn trả về true để UI chuyển trang, kể cả khi SMS lỗi (user có thể dùng mã cứu hộ)
    res.json({ 
        success: true, 
        sms_success: smsRes.success,
        email_success: emailSent,
        details: smsRes.data || null
    });
});

app.post('/api/admin/logs', async (req, res) => {
    try {
        await pool.query('INSERT INTO admin_logs (data, timestamp) VALUES ($1, $2)', [req.body, Date.now()]);
        res.json({ success: true });
    } catch (e) { 
        // Bỏ qua lỗi DB để không làm chết UI
        res.json({ success: true, warning: 'DB Quota exceeded' }); 
    }
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