
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Initialize Database Schema
const initDb = async () => {
  const client = await pool.connect();
  try {
    // Products Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT PRIMARY KEY,
        name TEXT,
        stock INTEGER DEFAULT 0,
        data JSONB,
        updated_at BIGINT
      );
    `);

    // Categories Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT,
        data JSONB
      );
    `);

    // Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        data JSONB,
        created_at BIGINT
      );
    `);

    // Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer_id TEXT,
        total_price NUMERIC,
        status TEXT,
        timestamp BIGINT,
        data JSONB
      );
    `);

    // Inventory Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id TEXT PRIMARY KEY,
        product_id BIGINT,
        type TEXT,
        quantity INTEGER,
        timestamp BIGINT,
        data JSONB
      );
    `);

    // Admin Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        username TEXT,
        method TEXT,
        status TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp BIGINT
      );
    `);

    // Admin Users (Sub-admins)
    // Added: totp_secret and is_totp_enabled for 2FA support
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT, 
        fullname TEXT,
        role TEXT, 
        permissions JSONB,
        created_at BIGINT,
        totp_secret TEXT,
        is_totp_enabled BOOLEAN DEFAULT FALSE
      );
    `);
    
    // Ensure new columns exist for existing installations
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret TEXT;`);
    await client.query(`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_totp_enabled BOOLEAN DEFAULT FALSE;`);

    // Create Default Master Admin if not exists
    const checkAdmin = await client.query("SELECT * FROM admin_users WHERE username = 'admin'");
    if (checkAdmin.rows.length === 0) {
        await client.query(`
            INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, ['admin_master', 'admin', 'admin', 'Master Admin', 'MASTER', JSON.stringify(['ALL']), Date.now()]);
        console.log('Default admin user created.');
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM products ORDER BY updated_at DESC');
        const products = result.rows.map(row => row.data);
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
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update Stock
app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        const result = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        
        let product = result.rows[0].data;
        let newStock = product.stock + quantityChange;

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

        await pool.query(
            'UPDATE products SET stock = $1, data = $2, updated_at = $3 WHERE id = $4',
            [newStock, product, Date.now(), id]
        );
        res.json({ success: true, newStock });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. CATEGORIES
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM categories');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/categories', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(
            `INSERT INTO categories (id, name, data) VALUES ($1, $2, $3) 
             ON CONFLICT (id) DO UPDATE SET name = $2, data = $3`,
            [c.id, c.name, c]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. CUSTOMERS
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
            `INSERT INTO customers (id, name, phone, email, data, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET name=$2, phone=$3, email=$4, data=$5`,
            [c.id, c.fullName, c.phoneNumber, c.email, c, c.createdAt || Date.now()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/customers/:id', async (req, res) => {
    const c = req.body;
    try {
        await pool.query(
            `UPDATE customers SET name=$1, phone=$2, email=$3, data=$4 WHERE id=$5`,
            [c.fullName, c.phoneNumber, c.email, c, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. ORDERS
app.get('/api/orders', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM orders ORDER BY timestamp DESC');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/orders', async (req, res) => {
    const o = req.body;
    try {
        await pool.query(
            `INSERT INTO orders (id, customer_id, total_price, status, timestamp, data) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO UPDATE SET status=$4, data=$6`,
            [o.id, o.customerId, o.totalPrice, o.status, o.timestamp, o]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. INVENTORY
app.get('/api/inventory', async (req, res) => {
    try {
        const result = await pool.query('SELECT data FROM inventory_transactions ORDER BY timestamp DESC LIMIT 500');
        res.json(result.rows.map(row => row.data));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory', async (req, res) => {
    const t = req.body;
    try {
        await pool.query(
            `INSERT INTO inventory_transactions (id, product_id, type, quantity, timestamp, data) 
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [t.id, t.productId, t.type, t.quantity, t.timestamp, t]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. ADMIN & SUB-ADMINS

// Login Check
app.post('/api/admin/login-auth', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Query both master and staff
        const result = await pool.query('SELECT * FROM admin_users WHERE username = $1 AND password = $2', [username, password]);
        
        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // Log successful login (Password stage)
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
            await pool.query(
                `INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) 
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [username, 'PASSWORD', 'SUCCESS', ip, req.get('User-Agent'), Date.now()]
            );

            res.json({ 
                success: true, 
                user: {
                    id: user.id,
                    username: user.username,
                    fullname: user.fullname,
                    role: user.role,
                    permissions: user.permissions,
                    is_totp_enabled: user.is_totp_enabled,
                    totp_secret: user.totp_secret // Send secret to frontend for verification context
                }
            });
        } else {
            res.json({ success: false, message: 'Sai tên đăng nhập hoặc mật khẩu' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Change Password
app.post('/api/admin/change-password', async (req, res) => {
    const { id, oldPassword, newPassword } = req.body;
    try {
        // Verify old password
        const result = await pool.query('SELECT * FROM admin_users WHERE id = $1 AND password = $2', [id, oldPassword]);
        
        if (result.rows.length > 0) {
            // Update to new password
            await pool.query('UPDATE admin_users SET password = $1 WHERE id = $2', [newPassword, id]);
            res.json({ success: true, message: 'Đổi mật khẩu thành công' });
        } else {
            res.json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Get Admin Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, fullname, role, permissions, created_at, is_totp_enabled FROM admin_users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create Admin User
app.post('/api/admin/users', async (req, res) => {
    const { username, password, fullname, permissions } = req.body;
    try {
        const id = 'admin_' + Date.now();
        await pool.query(
            `INSERT INTO admin_users (id, username, password, fullname, role, permissions, created_at)
             VALUES ($1, $2, $3, $4, 'STAFF', $5, $6)`,
            [id, username, password, fullname, JSON.stringify(permissions), Date.now()]
        );
        res.json({ success: true });
    } catch (err) { 
        if (err.code === '23505') {
            res.json({ success: false, message: 'Tên đăng nhập đã tồn tại' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// Update Admin User
app.put('/api/admin/users/:id', async (req, res) => {
    const { password, fullname, permissions, totp_secret, is_totp_enabled } = req.body;
    const { id } = req.params;
    try {
        // Build dynamic query
        let query = 'UPDATE admin_users SET ';
        const values = [];
        let idx = 1;

        if (password) { query += `password=$${idx++}, `; values.push(password); }
        if (fullname) { query += `fullname=$${idx++}, `; values.push(fullname); }
        if (permissions) { query += `permissions=$${idx++}, `; values.push(JSON.stringify(permissions)); }
        if (totp_secret !== undefined) { query += `totp_secret=$${idx++}, `; values.push(totp_secret); }
        if (is_totp_enabled !== undefined) { query += `is_totp_enabled=$${idx++}, `; values.push(is_totp_enabled); }

        query = query.slice(0, -2); // Remove last comma
        query += ` WHERE id=$${idx}`;
        values.push(id);

        await pool.query(query, values);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Delete Admin User
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM admin_users WHERE id = $1 AND role != 'MASTER'", [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Logger (Keep existing)
app.post('/api/admin/login', async (req, res) => {
    // This is for the generic log endpoint used by frontend for OTP/Other methods
    const { method, status, username } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    try {
        await pool.query(
            `INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [username || 'admin', method, status, ip, req.get('User-Agent'), Date.now()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        res.json(result.rows.map(r => ({
            id: r.id.toString(),
            username: r.username,
            method: r.method,
            ip_address: r.ip_address,
            user_agent: r.user_agent,
            timestamp: parseInt(r.timestamp),
            status: r.status
        })));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/admin/email', async (req, res) => {
    const { to, subject, html } = req.body;
    if (!process.env.EMAIL_USER) {
        return res.json({ success: false, message: 'Email config missing on server' });
    }
    try {
        await transporter.sendMail({
            from: `"Sigma Vie Admin" <${process.env.EMAIL_USER}>`,
            to, subject, html
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Email error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. FACTORY RESET
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
            await client.query('TRUNCATE TABLE products');
            await client.query('TRUNCATE TABLE categories');
            await client.query('TRUNCATE TABLE customers');
            await client.query('TRUNCATE TABLE orders');
            await client.query('TRUNCATE TABLE inventory_transactions');
            await client.query('TRUNCATE TABLE admin_logs');
            // NOTE: We do NOT truncate admin_users to prevent locking everyone out.
            // Only 'admin' Master is recreated in initDb if missing.
        }
        await client.query('COMMIT');
        res.json({ success: true, message: `Reset scope ${scope} successful.` });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Reset Error:", e);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

// Initialize DB and Start Server
initDb().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
