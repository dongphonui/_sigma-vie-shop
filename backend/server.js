
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
    const productId = req.params.id;
    console.log(`🗑️ Request to delete product ID: ${productId}`);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Delete associated inventory transactions
        const deletedTrans = await client.query('DELETE FROM inventory_transactions WHERE product_id::text = $1', [productId]);
        console.log(`- Deleted ${deletedTrans.rowCount} associated transactions.`);

        // 2. Delete the product itself
        const deletedProd = await client.query('DELETE FROM products WHERE id::text = $1', [productId]);
        
        if (deletedProd.rowCount === 0) {
            console.warn(`- No product found with ID ${productId} to delete.`);
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Product not found on server.' });
        }

        await client.query('COMMIT');
        console.log(`✅ Successfully deleted product ${productId}.`);
        res.json({ success: true, message: 'Đã xóa sản phẩm khỏi hệ thống.' });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error("❌ SQL delete failed:", err);
        res.status(500).json({ success: false, error: err.message }); 
    } finally {
        client.release();
    }
});

// CUSTOMERS
app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        const name = c.fullName || c.name || '';
        const phone = c.phoneNumber || c.phone || '';
        const email = c.email || '';
        const customerData = { ...c, fullName: name, phoneNumber: phone, email: email };
        await pool.query(`INSERT INTO customers (id, name, phone, email, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`, [c.id, name, phone, email, customerData, c.createdAt || Date.now()]);
        res.json({ success: true });
    } catch (err) { handleCustomerDbError(err, res); }
});

app.put('/api/customers/:id', async (req, res) => {
    const c = req.body;
    const id = req.params.id;
    try {
        const name = c.fullName || c.name || '';
        const phone = c.phoneNumber || c.phone || '';
        const email = c.email || '';
        const customerData = { ...c, fullName: name, phoneNumber: phone, email: email };
        await pool.query(`UPDATE customers SET name=$1, phone=$2, email=$3, data=$4 WHERE id=$5`, [name, phone, email, customerData, id]);
        res.json({ success: true });
    } catch (err) { handleCustomerDbError(err, res); }
});

async function handleCustomerDbError(err, res) {
    if (err.code === '23502') {
        let faultyColumn = err.column;
        if (!faultyColumn && err.detail) {
            const colMatch = err.detail.match(/column "(.*?)"/);
            if (colMatch) faultyColumn = colMatch[1];
        }
        if (faultyColumn) {
            try {
                await pool.query(`ALTER TABLE customers ALTER COLUMN "${faultyColumn}" DROP NOT NULL`);
                return res.status(500).json({ error: `Lỗi cấu trúc: Đã sửa cột '${faultyColumn}'. Vui lòng bấm 'Lưu' lại.` });
            } catch (e) {}
        }
    }
    res.status(500).json({ error: err.message });
}

// RESET DATABASE (ENHANCED)
app.post('/api/admin/reset', async (req, res) => {
    const { scope } = req.body; 
    console.log(`🧨 RESET INITIATED: Scope = ${scope}`);
    
    let client;
    try {
        client = await pool.connect();
        await client.query('BEGIN');
        
        if (scope === 'ORDERS') {
            console.log("Cleaning Orders and Transactions...");
            await client.query('TRUNCATE TABLE orders, inventory_transactions RESTART IDENTITY CASCADE');
        } 
        else if (scope === 'PRODUCTS') {
            console.log("Cleaning Products, Transactions AND Orders (Dependencies)...");
            await client.query('TRUNCATE TABLE products, inventory_transactions, orders RESTART IDENTITY CASCADE');
        } 
        else if (scope === 'FULL') {
            console.log("Cleaning ALL Data Tables...");
            await client.query('TRUNCATE TABLE products, categories, customers, orders, inventory_transactions, admin_logs RESTART IDENTITY CASCADE');
        } else {
            throw new Error("Invalid reset scope");
        }
        
        await client.query('COMMIT');
        console.log(`✅ ${scope} Reset successful.`);
        res.json({ success: true, message: `Server đã xóa sạch dữ liệu ${scope} thành công.` });
    } catch (e) {
        if (client) await client.query('ROLLBACK');
        console.error(`❌ SQL RESET FAILED [${scope}]:`, e.message);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        if (client) client.release();
    }
});

// OTHER ROUTES
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

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${port}`);
    initDb();
});
