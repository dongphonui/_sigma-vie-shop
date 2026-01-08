
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const https = require('https');

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

const getTransporter = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
    return nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 5000
    });
};

// Hàm gửi SMS qua SpeedSMS (Dành cho tài khoản cá nhân hoặc Brandname)
const sendSMS = (phone, content, senderId) => {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SPEED_SMS_API_KEY;
        if (!apiKey) {
            console.log("⚠️ [CONFIG ERROR] Thiếu SPEED_SMS_API_KEY trên Render");
            return resolve({ status: 'error', message: "Thiếu API Key" });
        }

        // CHUẨN HÓA SỐ ĐIỆN THOẠI: Chuyển 0... thành 84...
        let cleanPhone = phone.replace(/\s/g, '').replace(/[^\d]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '84' + cleanPhone.substring(1);
        }

        const data = JSON.stringify({
            to: [cleanPhone],
            content: content,
            sms_type: 2, // 2 là tin nhắn CSKH/OTP có tỉ lệ thành công cao nhất
            sender: senderId || "" // Nếu không có Brandname đã đăng ký, bắt buộc để TRỐNG ""
        });

        console.log(`📤 Đang gửi OTP đến ${cleanPhone} | Sender: "${senderId || 'Hệ thống ngẫu nhiên'}"`);

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
                try {
                    const result = JSON.parse(body);
                    console.log("📩 Kết quả từ SpeedSMS:", result);
                    resolve(result);
                } catch (e) {
                    console.error("❌ Lỗi Parse dữ liệu SpeedSMS:", body);
                    resolve({ status: 'error', message: "Server phản hồi sai định dạng" });
                }
            });
        });

        req.on('error', (e) => {
            console.error("❌ Lỗi kết nối API SpeedSMS:", e.message);
            reject(e);
        });
        
        req.write(data);
        req.end();
    });
};

const initDb = async () => {
  if (!dbUrl) return;
  let client;
  try {
    client = await pool.connect();
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
    const checkAdmin = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (checkAdmin.rows.length === 0) {
        await client.query("INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)", ['admin_master', 'admin', 'admin', 'Quản trị viên Sigma', 'MASTER', '["ALL"]', Date.now()]);
    }
  } catch (err) { console.error(err); }
  finally { if (client) client.release(); }
};
initDb();

app.post('/api/admin/send-otp', async (req, res) => {
    const { email, phone, otp, senderId } = req.body;
    const results = { email: false, sms: false };
    
    // Gửi qua SMS
    if (phone && phone.length > 8) {
        try {
            const smsRes = await sendSMS(phone, `Ma OTP dang nhap Sigma Vie cua ban la: ${otp}. Hieu luc 5 phut.`, senderId);
            results.sms = (smsRes.status === 'success');
        } catch (e) { console.error("SMS Logic Error:", e.message); }
    }

    // Gửi qua Email (Luôn gửi cả 2 để đảm bảo)
    const transporter = getTransporter();
    if (transporter && email) {
        try {
            await transporter.sendMail({
                from: `"Sigma Vie" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Mã xác thực đăng nhập Sigma Vie',
                html: `<div style="padding:20px; font-family:sans-serif; background:#f9f9f9;">
                        <h2 style="color:#D4AF37;">Sigma Vie Admin</h2>
                        <p>Mã OTP của bạn là: <b style="font-size:24px; color:#111827;">${otp}</b></p>
                        <p style="font-size:12px; color:#999;">Mã này có hiệu lực trong 5 phút. Vui lòng không chia sẻ cho bất kỳ ai.</p>
                       </div>`
            });
            results.email = true;
        } catch (e) { console.error("Email Error:", e.message); }
    }

    res.json({ 
        success: true, 
        delivered: results,
        message: (results.sms || results.email) ? "Mã đã được gửi." : "Gửi thất bại qua cả 2 kênh."
    });
});

app.post('/api/admin/login', async (req, res) => {
    const { username, password, method } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        if (method) {
            await pool.query("INSERT INTO admin_logs (username, method, status, ip_address, timestamp) VALUES ($1, $2, $3, $4, $5)", [username || 'Unknown', method, 'SUCCESS', ip, Date.now()]);
            return res.json({ success: true });
        }
        const result = await pool.query("SELECT * FROM admin_users WHERE username = $1 AND password = $2", [username, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.json({ success: false, message: 'Tài khoản hoặc mật khẩu không đúng' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/products', async (req, res) => {
    const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
    res.json(result.rows.map(row => row.data));
});
app.post('/api/products', async (req, res) => {
    const p = req.body;
    await pool.query(`INSERT INTO products (id, name, stock, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, stock=$3, data=$4, updated_at=$5`, [p.id, p.name, p.stock, p, Date.now()]);
    res.json({ success: true });
});
app.listen(port, () => console.log(`🚀 Sigma Vie Server running on port ${port}`));
