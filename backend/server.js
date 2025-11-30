
require('dotenv').config(); // Load biến môi trường từ file .env
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- CẤU HÌNH KẾT NỐI DATABASE (Update cho Render) ---
// Nếu có DATABASE_URL (Render cung cấp), ưu tiên dùng nó.
// Nếu không, dùng các biến lẻ (DB_USER, DB_HOST...) cho localhost.
const isProduction = !!process.env.DATABASE_URL;

const poolConfig = isProduction
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Bắt buộc cho kết nối SSL trên Cloud (Render/Neon/Heroku)
      }
    }
  : {
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'sigmavie_data',
      password: process.env.DB_PASSWORD || 'Pgadmin@654321!',
      port: process.env.DB_PORT || 5432,
    };

const pool = new Pool(poolConfig);

// Log debug để kiểm tra kết nối
if (isProduction) {
    console.log("--- DEBUG CONNECTION ---");
    // Che giấu mật khẩu trong log
    const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
    console.log("Using DATABASE_URL:", maskedUrl);
} else {
    console.log("Using Local Config:", poolConfig.host);
}

// Xử lý lỗi ngầm định của Pool để tránh crash app
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Không exit process ở đây để giữ server sống trên Render
});

// --- KHỞI TẠO DATABASE & BẢNG ---
const initDb = async () => {
  let client;
  try {
    // Thử kết nối, nếu sai thông tin DB thì sẽ nhảy vào catch ngay
    client = await pool.connect();
    
    await client.query('BEGIN');
    
    console.log("Đang kiểm tra và khởi tạo bảng...");

    // 1. Products Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(100) UNIQUE NOT NULL,
        name TEXT NOT NULL,
        price NUMERIC,
        sale_price NUMERIC,
        import_price NUMERIC,
        description TEXT,
        image_url TEXT,
        stock INTEGER DEFAULT 0,
        category_id TEXT, 
        brand TEXT,
        status VARCHAR(50) DEFAULT 'active',
        is_flash_sale BOOLEAN DEFAULT FALSE,
        flash_sale_start TIMESTAMP,
        flash_sale_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Categories Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(100) PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT
      );
    `);

    // 3. Customers Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id VARCHAR(100) PRIMARY KEY,
        full_name TEXT NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(50),
        password_hash TEXT NOT NULL,
        address TEXT,
        created_at BIGINT
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
        product_id INTEGER,
        product_name TEXT,
        quantity INTEGER,
        total_price NUMERIC,
        status VARCHAR(50),
        timestamp BIGINT
      );
    `);

    // 5. Inventory Transactions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_transactions (
        id VARCHAR(100) PRIMARY KEY,
        product_id INTEGER,
        product_name TEXT,
        type VARCHAR(20),
        quantity INTEGER,
        timestamp BIGINT,
        note TEXT
      );
    `);

    await client.query('COMMIT');
    console.log("-> Cơ sở dữ liệu đã sẵn sàng.");
  } catch (e) {
    if (client) await client.query('ROLLBACK');
    console.error("--- LỖI KẾT NỐI DATABASE ---");
    console.error("Vui lòng kiểm tra lại biến môi trường DATABASE_URL hoặc thông tin DB.");
    console.error("Chi tiết lỗi:", e.message);
    // Không throw lỗi tiếp để Server vẫn khởi động được
  } finally {
    if (client) client.release();
  }
};

// Gọi hàm khởi tạo nhưng bắt lỗi global để chắc chắn không crash
initDb().catch(err => {
    console.error("Critical Init Error:", err);
});

// Helper: Format tiền tệ
const formatMoney = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
const parsePrice = (priceStr) => {
  if (!priceStr) return 0;
  if (typeof priceStr === 'number') return priceStr;
  const numberStr = priceStr.toString().replace(/[^0-9]/g, '');
  return parseInt(numberStr, 10) || 0;
};

// --- NODEMAILER CONFIGURATION ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // e.g. dongphonui1975@gmail.com
    pass: process.env.EMAIL_PASS  // App Password 16 ký tự
  }
});

// --- API ENDPOINTS ---

// Middleware kiểm tra DB connection trước khi xử lý request
const checkDbConnection = async (req, res, next) => {
    try {
        // Chỉ check nhanh pool
        if (pool.totalCount === 0 && !isProduction) { 
            // Nếu local và chưa có connect nào thì có thể warn
        }
        next();
    } catch (e) {
        res.status(500).json({ error: 'Database connection failed' });
    }
}

// 0. SEND EMAIL API
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html } = req.body;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(500).json({ success: false, message: 'Email configuration missing on server.' });
  }

  const mailOptions = {
    from: `"Sigma Vie Store" <${process.env.EMAIL_USER}>`,
    to: to,
    subject: subject,
    html: html
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${to}`);
    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
});

// 1. PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const products = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      price: formatMoney(row.price),
      salePrice: row.sale_price ? formatMoney(row.sale_price) : undefined,
      importPrice: row.import_price ? formatMoney(row.import_price) : undefined,
      description: row.description,
      imageUrl: row.image_url,
      stock: row.stock,
      sku: row.sku,
      category: row.category_id,
      brand: row.brand,
      status: row.status,
      isFlashSale: row.is_flash_sale,
      flashSaleStartTime: row.flash_sale_start ? new Date(row.flash_sale_start).getTime() : undefined,
      flashSaleEndTime: row.flash_sale_end ? new Date(row.flash_sale_end).getTime() : undefined,
    }));
    res.json(products);
  } catch (err) {
    console.error(err);
    // Trả về mảng rỗng hoặc lỗi 500 nhưng không crash
    res.status(500).send(err.message);
  }
});

app.post('/api/products/sync', async (req, res) => {
  const p = req.body;
  try {
    const price = parsePrice(p.price);
    const salePrice = parsePrice(p.salePrice);
    const importPrice = parsePrice(p.importPrice);
    const fsStart = p.flashSaleStartTime ? new Date(p.flashSaleStartTime).toISOString() : null;
    const fsEnd = p.flashSaleEndTime ? new Date(p.flashSaleEndTime).toISOString() : null;

    const query = `
      INSERT INTO products (
        sku, name, price, sale_price, import_price, description, image_url, 
        stock, category_id, brand, status, is_flash_sale, flash_sale_start, flash_sale_end
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name, price = EXCLUDED.price, sale_price = EXCLUDED.sale_price,
        import_price = EXCLUDED.import_price, description = EXCLUDED.description,
        image_url = EXCLUDED.image_url, stock = EXCLUDED.stock, category_id = EXCLUDED.category_id,
        brand = EXCLUDED.brand, status = EXCLUDED.status, is_flash_sale = EXCLUDED.is_flash_sale,
        flash_sale_start = EXCLUDED.flash_sale_start, flash_sale_end = EXCLUDED.flash_sale_end
      RETURNING id;
    `;
    const values = [p.sku, p.name, price, salePrice, importPrice, p.description, p.imageUrl, p.stock, p.category, p.brand, p.status, p.isFlashSale, fsStart, fsEnd];
    await pool.query(query, values);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW API: ATOMIC STOCK UPDATE (Quan trọng cho vấn đề Race Condition)
app.post('/api/products/stock', async (req, res) => {
  const { id, quantityChange } = req.body;
  try {
    // Sử dụng logic cộng dồn trực tiếp trên DB: stock = stock + $1
    // Điều này đảm bảo tính toàn vẹn dữ liệu ngay cả khi có nhiều request cùng lúc
    const query = `
      UPDATE products
      SET stock = stock + $1
      WHERE id = $2
      RETURNING stock;
    `;
    const result = await pool.query(query, [quantityChange, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, newStock: result.rows[0].stock });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    const result = await pool.query('SELECT * FROM customers');
    const customers = result.rows.map(r => ({
        id: r.id, fullName: r.full_name, email: r.email, phoneNumber: r.phone_number,
        passwordHash: r.password_hash, address: r.address, createdAt: parseInt(r.created_at)
    }));
    res.json(customers);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/customers/sync', async (req, res) => {
  const c = req.body;
  try {
    await pool.query(
      `INSERT INTO customers (id, full_name, email, phone_number, password_hash, address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`, 
       [c.id, c.fullName, c.email, c.phoneNumber, c.passwordHash, c.address, c.createdAt]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

// 4. ORDERS
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
    const orders = result.rows.map(r => ({
        id: r.id, customerId: r.customer_id, customerName: r.customer_name,
        customerContact: r.customer_contact, customerAddress: r.customer_address,
        productId: r.product_id, productName: r.product_name, quantity: r.quantity,
        totalPrice: parseFloat(r.total_price), status: r.status, timestamp: parseInt(r.timestamp)
    }));
    res.json(orders);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/orders/sync', async (req, res) => {
  const o = req.body;
  try {
    await pool.query(
      `INSERT INTO orders (id, customer_id, customer_name, customer_contact, customer_address, product_id, product_name, quantity, total_price, status, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
      [o.id, o.customerId, o.customerName, o.customerContact, o.customerAddress, o.productId, o.productName, o.quantity, o.totalPrice, o.status, o.timestamp]
    );
    res.json({ success: true });
  } catch (err) { 
      console.error(err);
      res.status(500).json({ success: false }); 
  }
});

// 5. INVENTORY
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory_transactions ORDER BY timestamp DESC');
    const trans = result.rows.map(r => ({
        id: r.id, productId: r.product_id, productName: r.product_name,
        type: r.type, quantity: r.quantity, timestamp: parseInt(r.timestamp), note: r.note
    }));
    res.json(trans);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/inventory/sync', async (req, res) => {
  const t = req.body;
  try {
    await pool.query(
      `INSERT INTO inventory_transactions (id, product_id, product_name, type, quantity, timestamp, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [t.id, t.productId, t.productName, t.type, t.quantity, t.timestamp, t.note]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Backend đang chạy tại cổng ${PORT}`);
});
