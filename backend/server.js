
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

// --- PREVENT CRASH ON UNHANDLED ERRORS ---
process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
    // Keep the server running
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION:', reason);
    // Keep the server running
});

const app = express();
const port = process.env.PORT || 3000;

// Increase timeout to prevent premature socket closure
app.keepAliveTimeout = 65000;
app.headersTimeout = 66000;

// Middleware
app.use(cors()); // Allow all origins
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Check Database Config
if (!process.env.DATABASE_URL) {
    console.error("❌ FATAL ERROR: DATABASE_URL is missing in .env file.");
}

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle database client', err);
  // Don't exit process
});

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize Database Schema (Async)
const initDb = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log("🛠️ Kiểm tra và cập nhật cấu trúc Database...");

    // 1. Products Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT PRIMARY KEY,
        name TEXT,
        stock INTEGER DEFAULT 0
      );
    `);
    
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS data JSONB;`);
    await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at BIGINT;`);
    
    try {
        const checkSku = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='sku';`);
        if (checkSku.rows.length > 0) {
            await client.query(`ALTER TABLE products ALTER COLUMN sku DROP NOT NULL;`);
        }
    } catch (e) { console.warn("⚠️ Modify SKU warn:", e.message); }

    // 2. Categories
    await client.query(`CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, name TEXT);`);
    await client.query(`ALTER TABLE categories ADD COLUMN IF NOT EXISTS data JSONB;`);

    // 3. Customers - FIX MISSING COLUMNS HERE
    await client.query(`CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY);`); // Removed name from here to force add via ALTER below
    
    // CRITICAL FIX: Ensure 'name' column exists even if table was created previously without it
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS name TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS data JSONB;`);
    await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_at BIGINT;`);

    // 4. Orders
    await client.query(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT, total_price NUMERIC, status TEXT, timestamp BIGINT);`);
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS data JSONB;`);

    // 5. Inventory
    await client.query(`CREATE TABLE IF NOT EXISTS inventory_transactions (id TEXT PRIMARY KEY, product_id BIGINT, type TEXT, quantity INTEGER, timestamp BIGINT);`);
    await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS data JSONB;`);

    // 6. Logs
    await client.query(`CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, username TEXT, method TEXT, status TEXT, ip_address TEXT, user_agent TEXT, timestamp BIGINT);`);

    // 7. Admin Users
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT, 
        fullname TEXT,
        role TEXT, 
        permissions JSONB,
        created_at BIGINT
      );
    `);
    // Ensure permissions exists as JSONB. If it was TEXT, this might warn but won't crash.
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB;`);
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;`);
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN DEFAULT FALSE;`);

    // 8. Settings
    await client.query(`CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value JSONB);`);

    // Default Admin
    const checkAdmin = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (checkAdmin.rows.length === 0) {
        await client.query(`
            INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['admin_master', 'admin', 'admin', 'Master Admin', 'MASTER', JSON.stringify(['ALL']), Date.now()]);
        console.log('✅ Default admin user created.');
    }

    console.log('✅ Database schema ready.');
  } catch (err) {
    console.error('⚠️ DB Initialization Warning:', err.message);
    console.log('Server continues to run but some DB features might fail.');
  } finally {
    if (client) client.release();
  }
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        const products = result.rows.map(row => row.data).filter(p => p !== null);
        res.json(products);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/products', async (req, res) => {
    const p = req.body;
    try {
        await pool.query(
            `INSERT INTO products (id, name, stock, data, updated_at) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (id) DO UPDATE 
             SET name = $2, stock = $3, data = $4, updated_at = $5`,
            [p.id, p.name, p.stock, p, Date.now()]
        );
        res.json({ success: true });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        const result = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        
        let product = result.rows[0].data || {}; 
        let newStock = (product.stock || 0) + quantityChange;

        if (size || color) {
            if (!product.variants) product.variants = [];
            const vIndex = product.variants.findIndex(v => 
                (v.size === size || (!v.size && !size)) && 
                (v.color === color || (!v.color && !color))
            );
            
            if (vIndex !== -1) {
                product.variants[vIndex].stock += quantityChange;
            } else if (quantityChange > 0) {
                product.variants.push({ size: size || '', color: color || '', stock: quantityChange });
            }
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

// 2. CATEGORIES, CUSTOMERS, ORDERS, INVENTORY (Generic Pattern)
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM categories');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/categories', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(`INSERT INTO categories (id, name, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, data = $3`, [c.id, c.name, c]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM customers ORDER BY created_at DESC');
        res.json(result.rows.map(row => row.data).filter(d => d));
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/customers', async (req, res) => {
    const c = req.body;
    try {
        // Explicitly map fullName to name column
        await pool.query(`INSERT INTO customers (id, name, phone, email, data, created_at) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`, [c.id, c.fullName, c.phoneNumber, c.email, c, c.createdAt || Date.now()]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// UPDATED CUSTOMER PUT ROUTE (FIXED)
app.put('/api/customers/:id', async (req, res) => {
    const c = req.body;
    const id = req.params.id;
    try {
        // Safe mapping with defaults to avoid "undefined" errors in SQL
        const name = c.fullName || '';
        const phone = c.phoneNumber || '';
        const email = c.email || '';
        const data = c; // Save full object as JSON

        await pool.query(
            `UPDATE customers SET name=$1, phone=$2, email=$3, data=$4 WHERE id=$5`, 
            [name, phone, email, data, id]
        );
        res.json({ success: true });
    } catch (err) { 
        console.error("Update Customer Error:", err);
        // Better error response
        res.status(500).json({ error: err.message }); 
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// NEW: CUSTOMER LOGIN VERIFICATION (Server-Side)
app.post('/api/customers/login', async (req, res) => {
    const { identifier, passwordHash } = req.body;
    try {
        // Query matching phoneNumber OR email inside the JSONB data
        // Also checks top-level 'phone' and 'email' columns if they exist and are populated
        const result = await pool.query(
            `SELECT data FROM customers 
             WHERE data->>'phoneNumber' = $1 
                OR data->>'email' = $1 
                OR phone = $1 
                OR email = $1`, 
            [identifier]
        );
        
        if (result.rows.length > 0) {
            const customer = result.rows[0].data;
            if (customer && customer.passwordHash === passwordHash) {
                res.json({ success: true, customer: customer });
            } else {
                res.json({ success: false, message: 'Sai mật khẩu.' });
            }
        } else {
            res.json({ success: false, message: 'Tài khoản không tồn tại trên hệ thống.' });
        }
    } catch (err) { 
        console.error("Login Error:", err);
        // Fallback friendly error
        if (err.message.includes('does not exist')) {
             res.status(500).json({ error: "Lỗi cấu trúc Database (Thiếu cột). Vui lòng báo Admin reset server." });
        } else {
             res.status(500).json({ error: err.message }); 
        }
    }
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

// Settings Handlers (Simplified)
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

// Settings Routes
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


// 7. ADMIN & SUB-ADMINS (CRITICAL FIXES HERE)

app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            await pool.query(`INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) VALUES ($1, $2, $3, $4, $5, $6)`, [username, 'PASSWORD', 'SUCCESS', req.ip, req.get('User-Agent'), Date.now()]);
            const permissions = typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : (user.permissions || []);
            res.json({ 
                success: true, 
                user: { id: user.id, username: user.username, fullname: user.fullname, role: user.role, permissions: permissions, is_totp_enabled: user.is_totp_enabled, totp_secret: user.totp_secret }
            });
        } else {
            res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/change-password', async (req, res) => {
    const { id, oldPassword, newPassword } = req.body;
    try {
        const result = await pool.query('SELECT * FROM admin_users WHERE id = $1 AND password = $2', [id, oldPassword]);
        if (result.rows.length > 0) {
            await pool.query('UPDATE admin_users SET password = $1 WHERE id = $2', [newPassword, id]);
            res.json({ success: true, message: 'Đổi mật khẩu thành công' });
        } else {
            res.json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, fullname, role, permissions, created_at, is_totp_enabled FROM admin_users ORDER BY created_at DESC');
        const users = result.rows.map(user => {
            let parsedPerms = [];
            try {
                if (typeof user.permissions === 'string') {
                    parsedPerms = JSON.parse(user.permissions);
                } else if (Array.isArray(user.permissions)) {
                    parsedPerms = user.permissions;
                }
            } catch (e) { console.warn("Failed to parse permissions for user:", user.username); }
            
            return { ...user, permissions: parsedPerms };
        });
        res.json(users);
    } catch (err) { 
        console.error("Fetch Users Error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/admin/users', async (req, res) => {
    const { username, password, fullname, permissions } = req.body;
    console.log("Creating user:", username);
    try {
        const id = 'admin_' + Date.now();
        const permissionsJson = JSON.stringify(permissions || []);
        
        await pool.query(
            `INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at)
             VALUES ($1, $2, $3, $4, 'STAFF', $5, $6)`,
            [id, username, password, fullname, permissionsJson, Date.now()]
        );
        res.json({ success: true });
    } catch (err) { 
        console.error("Create User Error:", err);
        if (err.code === '23505') {
            res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        } else {
            res.json({ success: false, message: 'Lỗi Database: ' + err.message });
        }
    }
});

app.put('/api/admin/users/:id', async (req, res) => {
    const { password, fullname, permissions, totp_secret, is_totp_enabled } = req.body;
    const { id } = req.params;
    try {
        let query = 'UPDATE admin_users SET ';
        const values = [];
        let idx = 1;

        if (password) { query += `password=$${idx++}, `; values.push(password); }
        if (fullname) { query += `fullname=$${idx++}, `; values.push(fullname); }
        if (permissions) { query += `permissions=$${idx++}, `; values.push(JSON.stringify(permissions)); }
        if (totp_secret !== undefined) { query += `totp_secret=$${idx++}, `; values.push(totp_secret); }
        if (is_totp_enabled !== undefined) { query += `is_totp_enabled=$${idx++}, `; values.push(is_totp_enabled); }

        query = query.slice(0, -2);
        query += ` WHERE id=$${idx}`;
        values.push(id);

        await pool.query(query, values);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM admin_users WHERE id = $1 AND role != 'MASTER'", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/login', async (req, res) => {
    const { method, status, username } = req.body;
    try {
        await pool.query(
            `INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [username || 'admin', method, status, req.ip, req.get('User-Agent'), Date.now()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows.map(r => ({ ...r, id: r.id.toString(), timestamp: parseInt(r.timestamp) })));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/email', async (req, res) => {
    const { to, subject, html } = req.body;
    if (!process.env.EMAIL_USER) return res.json({ success: false, message: 'Email config missing' });
    try {
        await transporter.sendMail({ from: `"Sigma Vie Admin" <${process.env.EMAIL_USER}>`, to, subject, html });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/admin/reset', async (req, res) => {
    const { scope } = req.body; 
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (scope === 'ORDERS') {
            await client.query('TRUNCATE TABLE orders');
            await client.query('TRUNCATE TABLE inventory_transactions');
        } else if (scope === 'PRODUCTS') {
            await client.query('TRUNCATE TABLE products');
            await client.query('TRUNCATE TABLE inventory_transactions');
        } else if (scope === 'FULL') {
            await client.query('TRUNCATE TABLE products; TRUNCATE TABLE categories; TRUNCATE TABLE customers; TRUNCATE TABLE orders; TRUNCATE TABLE inventory_transactions; TRUNCATE TABLE admin_logs; TRUNCATE TABLE app_settings;');
        }
        await client.query('COMMIT');
        res.json({ success: true, message: `Reset ${scope} successful.` });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

// START SERVER IMMEDIATELY (Don't wait for DB)
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Server is running on port ${port}`);
    // Start DB Init in background
    initDb();
});
