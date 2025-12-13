
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
    // Products Table: Stores full JSON in 'data' for flexibility
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

// Update Stock (Specific Endpoint for efficiency)
app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        // Fetch current product data
        const result = await pool.query('SELECT data FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
        
        let product = result.rows[0].data;
        let newStock = product.stock + quantityChange;

        // Variant Logic matches frontend
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
            
            // Recalculate total stock
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
    // Same as POST for upsert
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

// 6. ADMIN
app.post('/api/admin/login', async (req, res) => {
    const { method, status } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const agent = req.get('User-Agent');
    try {
        await pool.query(
            `INSERT INTO admin_logs (username, method, status, ip_address, user_agent, timestamp) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin', method, status, ip, agent, Date.now()]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        const logs = result.rows.map(r => ({
            id: r.id.toString(),
            username: r.username,
            method: r.method,
            ip_address: r.ip_address,
            user_agent: r.user_agent,
            timestamp: parseInt(r.timestamp),
            status: r.status
        }));
        res.json(logs);
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
    const { scope } = req.body; // 'FULL', 'ORDERS', 'PRODUCTS'
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
