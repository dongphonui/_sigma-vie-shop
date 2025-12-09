
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increase limit for image uploads

// Database Connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize Database
const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log("Initializing Database...");

    // 1. Products Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id BIGINT PRIMARY KEY,
        name TEXT,
        price TEXT,
        import_price TEXT,
        description TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 0,
        sku TEXT,
        category TEXT,
        brand TEXT,
        status VARCHAR(20),
        is_flash_sale BOOLEAN DEFAULT FALSE,
        sale_price TEXT,
        flash_sale_start_time BIGINT,
        flash_sale_end_time BIGINT,
        sizes TEXT,
        colors TEXT,
        variants TEXT -- Stores JSON: [{"size":"M","color":"Red","stock":10}]
      );
    `);

    // 2. Categories Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT,
        description TEXT
      );
    `);

    // 3. Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        full_name TEXT,
        email TEXT,
        phone_number TEXT,
        address TEXT,
        password_hash TEXT,
        created_at BIGINT,
        cccd_number TEXT,
        gender TEXT,
        dob TEXT,
        issue_date TEXT
      );
    `);

    // 4. Orders Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100),
        customer_name TEXT,
        customer_contact TEXT,
        customer_address TEXT,
        product_id BIGINT,
        product_name TEXT,
        quantity INTEGER,
        total_price NUMERIC,
        shipping_fee NUMERIC DEFAULT 0,
        status VARCHAR(50),
        timestamp BIGINT,
        payment_method VARCHAR(50),
        product_size VARCHAR(50),
        product_color VARCHAR(50)
      );
    `);
    
    // Migration: Add columns if they don't exist
    try {
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_size VARCHAR(50)`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_color VARCHAR(50)`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price TEXT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_start_time BIGINT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS flash_sale_end_time BIGINT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes TEXT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS colors TEXT`);
        await client.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS variants TEXT`); 
        await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS cccd_number TEXT`);
        await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS gender TEXT`);
        await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS dob TEXT`);
        await client.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS issue_date TEXT`);
        await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS selected_size VARCHAR(50)`);
        await client.query(`ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS selected_color VARCHAR(50)`);
    } catch (err) {
        console.log("Migration notice (ignore if columns exist):", err.message);
    }

    // 5. Inventory Transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id VARCHAR(100) PRIMARY KEY,
        product_id BIGINT,
        product_name TEXT,
        type VARCHAR(20),
        quantity INTEGER,
        timestamp BIGINT,
        note TEXT,
        selected_size VARCHAR(50),
        selected_color VARCHAR(50)
      );
    `);

    // 6. Admin Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        username TEXT,
        method VARCHAR(50),
        ip_address TEXT,
        user_agent TEXT,
        timestamp BIGINT,
        status VARCHAR(20)
      );
    `);

    console.log("Database Initialized Successfully.");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    client.release();
  }
};

// --- ROUTES ---

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const products = result.rows.map(r => ({
      id: parseInt(r.id),
      name: r.name,
      price: r.price,
      importPrice: r.import_price,
      description: r.description,
      imageUrl: r.image_url,
      stock: r.stock,
      sku: r.sku,
      category: r.category,
      brand: r.brand,
      status: r.status,
      isFlashSale: r.is_flash_sale,
      salePrice: r.sale_price,
      flashSaleStartTime: r.flash_sale_start_time ? parseInt(r.flash_sale_start_time) : undefined,
      flashSaleEndTime: r.flash_sale_end_time ? parseInt(r.flash_sale_end_time) : undefined,
      sizes: r.sizes ? r.sizes.split(',') : [],
      colors: r.colors ? r.colors.split(',') : [],
      variants: r.variants ? JSON.parse(r.variants) : [] 
    }));
    res.json(products);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/products/sync', async (req, res) => {
  const p = req.body;
  // Safely convert arrays to comma-separated strings
  const sizesStr = Array.isArray(p.sizes) ? p.sizes.join(',') : '';
  const colorsStr = Array.isArray(p.colors) ? p.colors.join(',') : '';
  // Safely stringify variants, default to empty array
  const variantsStr = p.variants ? JSON.stringify(p.variants) : '[]';

  try {
    await pool.query(
      `INSERT INTO products (id, name, price, import_price, description, image_url, stock, sku, category, brand, status, is_flash_sale, sale_price, flash_sale_start_time, flash_sale_end_time, sizes, colors, variants)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, price = EXCLUDED.price, import_price = EXCLUDED.import_price, 
         description = EXCLUDED.description, image_url = EXCLUDED.image_url, stock = EXCLUDED.stock,
         sku = EXCLUDED.sku, category = EXCLUDED.category, brand = EXCLUDED.brand, status = EXCLUDED.status,
         is_flash_sale = EXCLUDED.is_flash_sale, sale_price = EXCLUDED.sale_price,
         flash_sale_start_time = EXCLUDED.flash_sale_start_time, flash_sale_end_time = EXCLUDED.flash_sale_end_time,
         sizes = EXCLUDED.sizes, colors = EXCLUDED.colors, variants = EXCLUDED.variants`,
      [p.id, p.name, p.price, p.importPrice, p.description, p.imageUrl, p.stock, p.sku, p.category, p.brand, p.status, p.isFlashSale, p.salePrice, p.flashSaleStartTime, p.flashSaleEndTime, sizesStr, colorsStr, variantsStr]
    );
    res.json({ success: true });
  } catch (err) { 
      console.error("Error syncing product:", err); 
      res.status(500).json({ success: false, error: err.message }); 
  }
});

// Atomic Stock Update
app.post('/api/products/stock', async (req, res) => {
    const { id, quantityChange, size, color } = req.body;
    try {
        const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        const product = result.rows[0];
        let newTotalStock = product.stock + quantityChange;
        let variants = product.variants ? JSON.parse(product.variants) : [];

        if (size || color) {
            const variantIndex = variants.findIndex((v) => 
                (v.size === size || (!v.size && !size)) && 
                (v.color === color || (!v.color && !color))
            );

            if (variantIndex !== -1) {
                variants[variantIndex].stock = Math.max(0, variants[variantIndex].stock + quantityChange);
            } else if (quantityChange > 0) {
                variants.push({ size: size || '', color: color || '', stock: quantityChange });
            }
            
            if (variants.length > 0) {
                newTotalStock = variants.reduce((sum, v) => sum + v.stock, 0);
            }
        }

        const updateResult = await pool.query(
            `UPDATE products SET stock = $1, variants = $2 WHERE id = $3 RETURNING stock`,
            [newTotalStock, JSON.stringify(variants), id]
        );

        res.json({ success: true, newStock: updateResult.rows[0].stock, variants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ... (Rest of existing routes for Categories, Customers, Orders, Inventory, Email, Logs) ...
// 2. CATEGORIES
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories');
    res.json(result.rows);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/categories/sync', async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `INSERT INTO categories (id, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [c.id, c.name, c.description]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 3. CUSTOMERS
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    const customers = result.rows.map(r => ({
      id: r.id, fullName: r.full_name, email: r.email, phoneNumber: r.phone_number,
      address: r.address, passwordHash: r.password_hash, createdAt: parseInt(r.created_at),
      cccd_number: r.cccd_number, gender: r.gender, dob: r.dob, issueDate: r.issue_date
    }));
    res.json(customers);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/customers/sync', async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `INSERT INTO customers (id, full_name, email, phone_number, address, password_hash, created_at, cccd_number, gender, dob, issue_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET 
         full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone_number = EXCLUDED.phone_number,
         address = EXCLUDED.address, password_hash = EXCLUDED.password_hash,
         cccd_number = EXCLUDED.cccd_number, gender = EXCLUDED.gender, dob = EXCLUDED.dob, issue_date = EXCLUDED.issue_date`,
      [c.id, c.fullName, c.email, c.phoneNumber, c.address, c.passwordHash, c.createdAt, c.cccdNumber, c.gender, c.dob, c.issueDate]
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const c = req.body;
    try {
        await pool.query(
            `UPDATE customers SET full_name = $1, email = $2, phone_number = $3, address = $4 WHERE id = $5`,
            [c.fullName, c.email, c.phoneNumber, c.address, id]
        );
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

// 4. ORDERS
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
    const orders = result.rows.map(r => ({
        id: r.id, customerId: r.customer_id, customerName: r.customer_name,
        customerContact: r.customer_contact, customerAddress: r.customer_address,
        productId: parseInt(r.product_id), productName: r.product_name, quantity: r.quantity,
        totalPrice: parseFloat(r.total_price),
        shippingFee: parseFloat(r.shipping_fee || 0),
        productSize: r.product_size,
        productColor: r.product_color,
        status: r.status, timestamp: parseInt(r.timestamp),
        paymentMethod: r.payment_method
    }));
    res.json(orders);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/orders/sync', async (req, res) => {
  const o = req.body;
  try {
    await pool.query(
      `INSERT INTO orders (id, customer_id, customer_name, customer_contact, customer_address, product_id, product_name, quantity, total_price, status, timestamp, payment_method, shipping_fee, product_size, product_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payment_method = EXCLUDED.payment_method, shipping_fee = EXCLUDED.shipping_fee, product_size = EXCLUDED.product_size, product_color = EXCLUDED.product_color`,
      [o.id, o.customerId, o.customerName, o.customerContact, o.customerAddress, o.productId, o.productName, o.quantity, o.totalPrice, o.status, o.timestamp, o.paymentMethod, o.shippingFee || 0, o.productSize, o.productColor]
    );
    res.json({ success: true });
  } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

// 5. INVENTORY
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_transactions ORDER BY timestamp DESC');
    const transactions = result.rows.map(r => ({
      id: r.id, productId: parseInt(r.product_id), productName: r.product_name,
      type: r.type, quantity: r.quantity, timestamp: parseInt(r.timestamp), note: r.note,
      selectedSize: r.selected_size,
      selectedColor: r.selected_color
    }));
    res.json(transactions);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/inventory/sync', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO inventory_transactions (id, product_id, product_name, type, quantity, timestamp, note, selected_size, selected_color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.productId, t.productName, t.type, t.quantity, t.timestamp, t.note, t.selectedSize, t.selectedColor]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 6. EMAIL SERVICE
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'sigmavieshop@gmail.com', // Use env var
    pass: process.env.EMAIL_PASS || 'your-app-password' // Use env var
  }
});

app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;
  try {
    const info = await transporter.sendMail({
      from: '"Sigma Vie Store" <sigmavieshop@gmail.com>',
      to,
      subject,
      html
    });
    console.log("Email sent: %s", info.messageId);
    res.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 7. ADMIN LOGS
app.post('/api/admin/logs', async (req, res) => {
    const l = req.body;
    try {
        await pool.query(
            `INSERT INTO admin_logs (username, method, ip_address, user_agent, timestamp, status) VALUES ($1, $2, $3, $4, $5, $6)`,
            [l.username, l.method, req.ip, req.headers['user-agent'], l.timestamp, l.status]
        );
        res.json({ success: true });
    } catch (err) { console.error(err); res.status(500).json({ success: false }); }
});

app.get('/api/admin/logs', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM admin_logs ORDER BY timestamp DESC LIMIT 100');
        const logs = result.rows.map(r => ({
            id: r.id.toString(), username: r.username, method: r.method,
            ip_address: r.ip_address, user_agent: r.user_agent,
            timestamp: parseInt(r.timestamp), status: r.status
        }));
        res.json(logs);
    } catch (err) { res.status(500).send(err.message); }
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  initDb();
});
