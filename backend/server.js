
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
        shipping_fee NUMERIC DEFAULT 0,
        status VARCHAR(50),
        timestamp BIGINT,
        payment_method VARCHAR(50)
      );
    `);
    
    // MIGRATION: Thêm cột payment_method và shipping_fee
    try {
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)`);
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0`);
    } catch (err) {
        console.log("Column migration error:", err.message);
    }

    // ... (rest of initDb)

// ...

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY timestamp DESC');
    const orders = result.rows.map(r => ({
        id: r.id, customerId: r.customer_id, customerName: r.customer_name,
        customerContact: r.customer_contact, customerAddress: r.customer_address,
        productId: r.product_id, productName: r.product_name, quantity: r.quantity,
        totalPrice: parseFloat(r.total_price), 
        shippingFee: parseFloat(r.shipping_fee || 0), // Map shipping fee
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
      `INSERT INTO orders (id, customer_id, customer_name, customer_contact, customer_address, product_id, product_name, quantity, total_price, status, timestamp, payment_method, shipping_fee)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payment_method = EXCLUDED.payment_method, shipping_fee = EXCLUDED.shipping_fee`,
      [o.id, o.customerId, o.customerName, o.customerContact, o.customerAddress, o.productId, o.productName, o.quantity, o.totalPrice, o.status, o.timestamp, o.paymentMethod, o.shippingFee || 0]
    );
    res.json({ success: true });
  } catch (err) { 
      console.error(err);
      res.status(500).json({ success: false }); 
  }
});
