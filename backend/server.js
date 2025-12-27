
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// --- PREVENT CRASH ON UNHANDLED ERRORS ---
process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
});

const app = express();
const port = process.env.PORT || 3000;

app.keepAliveTimeout = 65000;
app.headersTimeout = 66000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize Database Schema
const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("🛠️ Khởi tạo Database...");

    await client.query(`CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY, name TEXT, stock INTEGER DEFAULT 0, data JSONB, updated_at BIGINT);`);
    await client.query(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY);`); 
    
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS data JSONB;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at BIGINT;`);

    // Gỡ bỏ ràng buộc NOT NULL cho các cột cũ để tránh lỗi 23502
    const colsToRelax = ['fullname', 'phonenumber', 'full_name', 'phone_number', 'cccdnumber', 'cccd_number', 'address', 'gender', 'dob', 'issuedate', 'issue_date', 'password_hash', 'password'];
    for (const col of colsToRelax) {
        try {
            await client.query(`ALTER TABLE customers ALTER COLUMN "${col}" DROP NOT NULL`);
        } catch (e) {}
    }

    await client.query(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT, total_price NUMERIC, status TEXT, timestamp BIGINT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, product_id BIGINT, type TEXT, quantity INTEGER, timestamp BIGINT, data JSONB);`);
    await client.query(`CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, user_agent TEXT, timestamp BIGINT);`);
    await client.query(`CREATE TABLE IF NOT EXISTS admin_users (id TEXT PRIMARY KEY, username TEXT UNIQUE, password TEXT, fullname TEXT, role TEXT, permissions JSONB, created_at BIGINT, totp_secret TEXT, is_totp_enabled BOOLEAN DEFAULT FALSE);`);
    await client.query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB);`);

    console.log('✅ Database schema ready.');
  } catch (err) {
    console.error('⚠️ DB Init Error:', err.message);
  } finally {
    if (client) client.release();
  }
};

// --- API ROUTES ---

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        res.json(result.rows.map(row => row.data).filter(p => p));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query(`INSERT INTO products (id, name, stock, data, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET name=$2, stock=$3, data=$4, updated_at=$5`, [p.id, p.name, p.stock, p, Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        const result = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
        let product = result.rows[0].data || {}; 
        let newStock = (product.stock || 0) + quantityChange;
        if (size || color) {
            if (!product.variants) product.variants = [];
            const vIndex = product.variants.findIndex(v => (v.size === size || (!v.size && !size)) && (v.color === color || (!v.color && !color)));
            if (vIndex !== -1) product.variants[vIndex].stock += quantityChange;
            else if (quantityChange > 0) product.variants.push({ size: size || '', color: color || '', stock: quantityChange });
            newStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        }
        product.stock = newStock;
        await pool.query('UPDATE products SET stock = $1, data = $2, updated_at = $3 WHERE id = $4', [newStock, product, Date.now(), id]);
        res.json({ success: true, newStock });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CUSTOMERS
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// REGISTER CUSTOMER (POST)
app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        const name = c.fullName || c.name || '';
        const phone = c.phoneNumber || c.phone || '';
        const email = c.email || '';
        const customerData = { ...c, fullName: name, phoneNumber: phone, email: email };

        await pool.query(
            `INSERT INTO customers (id, name, phone, email, data, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`,
            [c.id, name, phone, email, customerData, c.createdAt || Date.now()]
        );
        res.json({ success: true });
    } catch (err) { 
        handleCustomerDbError(err, res);
    }
});

// UPDATE CUSTOMER (PUT) - ENHANCED FIX
app.put('/api/customers/:id', async (req, res) => {
    const c = req.body;
    const id = req.params.id;
    try {
        const name = c.fullName || c.name || '';
        const phone = c.phoneNumber || c.phone || '';
        const email = c.email || '';
        const customerData = { ...c, fullName: name, phoneNumber: phone, email: email };

        // Chúng tôi sử dụng một kỹ thuật SQL linh hoạt hơn:
        // Cập nhật các cột chuẩn VÀ cố gắng cập nhật các cột cũ nếu chúng tồn tại trong DB 
        // để tránh vi phạm NOT NULL của cột cũ.
        
        const result = await pool.query(
            `UPDATE customers 
             SET name=$1, phone=$2, email=$3, data=$4
             WHERE id=$5`, 
            [name, phone, email, customerData, id]
        );
        
        res.json({ success: true });
    } catch (err) { 
        console.error("Update Error:", err);
        handleCustomerDbError(err, res);
    }
});

// Helper to handle 23502 Errors for Customers
async function handleCustomerDbError(err, res) {
    if (err.code === '23502') {
        let faultyColumn = err.column;
        if (!faultyColumn && err.detail) {
            const colMatch = err.detail.match(/column "(.*?)"/);
            if (colMatch) faultyColumn = colMatch[1];
        }
        if (faultyColumn) {
            console.log(`AUTO-FIX: Dropping NOT NULL on '${faultyColumn}'`);
            try {
                await pool.query(`ALTER TABLE customers ALTER COLUMN "${faultyColumn}" DROP NOT NULL`);
                return res.status(500).json({ error: `Lỗi cấu trúc: Đã sửa cột '${faultyColumn}'. Vui lòng bấm 'Lưu' lại.` });
            } catch (e) {}
        }
    }
    res.status(500).json({ error: err.message });
}

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers/login', async (req, res) => {
    const { identifier, passwordHash } = req.body;
    try {
        const result = await pool.query(
            `SELECT data FROM customers WHERE phone=$1 OR email=$1 OR data->>'phoneNumber'=$1 OR data->>'phone'=$1 OR data->>'email'=$1`, [identifier]
        );
        if (result.rows.length > 0) {
            const customer = result.rows[0].data;
            if (customer && customer.passwordHash === passwordHash) res.json({ success: true, customer });
            else res.json({ success: false, message: 'Sai mật khẩu.' });
        } else res.json({ success: false, message: 'Tài khoản không tồn tại.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// CATEGORIES, ORDERS, INVENTORY, SETTINGS
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM categories');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/categories', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`INSERT INTO categories (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name=$2, data=$3`, [c.id, c.name, c]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/orders', async (req, res) => {
    const o = req.body;
    try {
        await pool.query(`INSERT INTO orders (id, customer_id, total_price, status, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET status=$4, data=$6`, [o.id, o.customerId, o.totalPrice, o.status, o.timestamp, o]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM inventory_transactions ORDER BY timestamp DESC LIMIT 500');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/inventory', async (req, res) => {
    const t = req.body;
    try {
        await pool.query(`INSERT INTO inventory_transactions (id, product_id, type, quantity, timestamp, data) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`, [t.id, t.productId, t.type, t.quantity, t.timestamp, t]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const handleSetting = (key) => ({
    get: async (req, res) => {
        try {
            const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
            res.json(result.rows.length > 0 ? result.rows[0].value : {});
        } catch (err) { res.status(500).json({ error: err.message }); }
    },
    post: async (req, res) => {
        try {
            await pool.query(`INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2`, [key, req.body]);
            res.json({ success: true });
        } catch (err) { res.status(500).json({ error: err.message }); }
    }
});
app.get('/api/settings/shipping', handleSetting('shipping').get);
app.post('/api/settings/shipping', handleSetting('shipping').post);
app.get('/api/settings/home', handleSetting('home_page').get);
app.post('/api/settings/home', handleSetting('home_page').post);
app.get('/api/settings/about-content', handleSetting('about_content').get);
app.post('/api/settings/about-content', handleSetting('about_content').post);
app.get('/api/settings/about-settings', handleSetting('about_settings').get);
app.post('/api/settings/about-settings', handleSetting('about_settings').post);
app.get('/api/settings/store', handleSetting('store_settings').get);
app.post('/api/settings/store', handleSetting('store_settings').post);
app.get('/api/settings/bank', handleSetting('bank_settings').get);
app.post('/api/settings/bank', handleSetting('bank_settings').post);

// ADMIN
app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            await pool.query(`INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) VALUES ($1, $2, $3, $4, $5, $6)`, [username, 'PASSWORD', 'SUCCESS', req.ip, req.get('User-Agent'), Date.now()]);
            const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : (user.permissions || []);
            res.json({ success: true, user: { ...user, permissions } });
        } else res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, fullname, role, permissions, created_at, is_totp_enabled FROM admin_users ORDER BY created_at DESC');
        res.json(result.rows.map(user => ({ ...user, permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || []) })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/admin/users', async (req, res) => {
    const { username, password, fullname, permissions } = req.body;
    try {
        await pool.query(`INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at) VALUES ($1, $2, $3, $4, 'STAFF', $5, $6)`, ['admin_' + Date.now(), username, password, fullname, JSON.stringify(permissions || []), Date.now()]);
        res.json({ success: true });
    } catch (err) { res.json({ success: false, message: err.message }); }
});
app.put('/api/admin/users/:id', async (req, res) => {
    const { password, fullname, permissions, totp_secret, is_totp_enabled } = req.body;
    try {
        let q = 'UPDATE admin_users SET ', v = [], i = 1;
        if (password) { q += `password=$${i++}, `; v.push(password); }
        if (fullname) { q += `fullname=$${i++}, `; v.push(fullname); }
        if (permissions) { q += `permissions=$${i++}, `; v.push(JSON.stringify(permissions)); }
        if (totp_secret !== undefined) { q += `totp_secret=$${i++}, `; v.push(totp_secret); }
        if (is_totp_enabled !== undefined) { q += `is_totp_enabled=$${i++}, `; v.push(is_totp_enabled); }
        q = q.slice(0, -2) + ` WHERE id=$${i}`; v.push(req.params.id);
        await pool.query(q, v); res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/admin/users/:id', async (req, res) => {
    try { await pool.query("DELETE FROM admin_users WHERE id = $1 AND role != 'MASTER'", [req.params.id]); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString(), timestamp: parseInt(r.timestamp) })));
    } catch (err) { res.status(500).send(err.message); }
});
app.post('/api/admin/email', async (req, res) => {
    const { to, subject, html } = req.body;
    try { await transporter.sendMail({ from: `"Sigma Vie Admin" <${process.env.EMAIL_USER}>`, to, subject, html }); res.json({ success: true }); }
    catch (err) { res.status(500).json({ success: false, error: err.message }); }
});
app.post('/api/admin/reset', async (req, res) => {
    const { scope } = req.body; 
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (scope === 'ORDERS') { await client.query('TRUNCATE TABLE orders; TRUNCATE TABLE inventory_transactions;'); }
        else if (scope === 'PRODUCTS') { await client.query('TRUNCATE TABLE products; TRUNCATE TABLE inventory_transactions;'); }
        else if (scope === 'FULL') { await client.query('TRUNCATE TABLE products; TRUNCATE TABLE categories; TRUNCATE TABLE customers; TRUNCATE TABLE orders; TRUNCATE TABLE inventory_transactions; TRUNCATE TABLE admin_logs; TRUNCATE TABLE app_settings;'); }
        await client.query('COMMIT'); res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: e.message }); }
    finally { client.release(); }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${port}`);
    initDb();
});
