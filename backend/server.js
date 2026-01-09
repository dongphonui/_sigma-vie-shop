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
            console.error("[SpeedSMS] ❌ LỖI: SPEEDSMS_API_KEY chưa được cài đặt trong Environment của Render.");
            return resolve({ success: false, error: 'Missing API Key' });
        }

        // SpeedSMS yêu cầu số điện thoại nhận được phải là mảng hoặc chuỗi phân cách bởi dấu phẩy
        // Chúng ta đảm bảo nó là một mảng
        const recipients = [phone.toString()];

        console.log(`[SpeedSMS] 🚀 Đang gọi API gửi mã đến: ${recipients.join(',')}...`);

        const auth = Buffer.from(`${apiKey}:`).toString('base64');
        const postData = JSON.stringify({
            to: recipients,
            content: content,
            sms_type: 2, // 2: Loại tin nhắn CSKH/OTP
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

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => responseBody += chunk);
            res.on('end', () => {
                console.log("[SpeedSMS] 📥 Phản hồi từ SpeedSMS:", responseBody);
                try {
                    const result = JSON.parse(responseBody);
                    // SpeedSMS trả về status: "success" nếu thành công
                    if (result.status === 'success') {
                        console.log("[SpeedSMS] ✅ Gửi tin nhắn thành công!");
                        resolve({ success: true, data: result });
                    } else {
                        console.error("[SpeedSMS] ❌ Gửi tin nhắn thất bại:", result.message || 'Không có thông báo lỗi');
                        resolve({ success: false, error: result.message || 'API rejected request' });
                    }
                } catch (e) {
                    console.error("[SpeedSMS] ❌ Lỗi phân tích phản hồi JSON:", e.message);
                    resolve({ success: false, error: 'Invalid JSON response from SpeedSMS' });
                }
            });
        });

        req.on('error', (e) => {
            console.error("[SpeedSMS] ❌ Lỗi kết nối HTTP:", e.message);
            resolve({ success: false, error: e.message });
        });

        req.write(postData);
        req.end();
    });
};

app.get('/api/health', (req, res) => res.json({ 
    status: 'ok', 
    db: !!dbUrl, 
    speedsms_configured: !!process.env.SPEEDSMS_API_KEY,
    email_configured: !!process.env.EMAIL_USER
}));

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

    console.log(`[OTP Engine] 🔔 Yêu cầu OTP cho SĐT: ${phone} | Email: ${email}`);

    // Gửi SMS (Chạy async)
    const smsPromise = sendSms(phone, content, senderId);
    
    // Gửi Email (Chạy async)
    let emailSent = false;
    const emailPromise = (process.env.EMAIL_USER && process.env.EMAIL_PASS) ? transporter.sendMail({
        from: `"Sigma Vie Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: `[OTP] Mã xác thực đăng nhập: ${otp}`,
        text: content,
        html: `<div style="font-family:sans-serif; padding:30px; background:#f9f9f9; text-align:center;">
                <div style="background:white; padding:40px; border-radius:20px; border:1px solid #eee; display:inline-block;">
                    <h2 style="color:#111827;">Mã xác thực Admin</h2>
                    <p style="color:#666;">Dùng mã dưới đây để vào trang Quản trị:</p>
                    <div style="font-size:40px; font-weight:900; color:#D4AF37; margin:30px 0; letter-spacing:10px;">${otp}</div>
                    <p style="font-size:12px; color:#999;">Mã có hiệu lực trong 5 phút. Nếu không phải bạn yêu cầu, hãy kiểm tra lại bảo mật.</p>
                </div>
               </div>`
    }).then(() => { emailSent = true; console.log("[Email] ✅ Đã gửi OTP thành công."); })
      .catch(e => console.error("[Email] ❌ Lỗi gửi mail:", e.message))
    : Promise.resolve();

    // Chờ cả hai hoàn thành hoặc lỗi
    const [smsResult] = await Promise.all([smsPromise, emailPromise]);

    // Luôn trả về success: true để UI chuyển sang trang nhập OTP (tránh bị kẹt ở Login)
    res.json({ 
        success: true, 
        sms_details: smsResult,
        email_sent: emailSent
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