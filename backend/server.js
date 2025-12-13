
// ... existing code ...
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

// 8. DANGEROUS: FACTORY RESET / BULK DELETE
app.post('/api/admin/reset', async (req, res) => {
    const { scope } = req.body; // 'FULL', 'ORDERS', 'PRODUCTS'
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (scope === 'ORDERS') {
            // Xóa đơn hàng và lịch sử kho (vì lịch sử kho gắn liền với giao dịch đơn hàng)
            await client.query('TRUNCATE TABLE orders');
            await client.query('TRUNCATE TABLE inventory_transactions');
            console.log("Reset: Cleared Orders & Inventory History");
        } 
        else if (scope === 'PRODUCTS') {
            // Xóa sản phẩm -> Phải xóa cả kho, đơn hàng (để tránh lỗi tham chiếu khóa ngoại nếu có, hoặc dữ liệu rác)
            // Tuy nhiên trong demo này ta xóa lỏng lẻo. 
            // Tốt nhất xóa sản phẩm thì xóa luôn giao dịch kho liên quan.
            await client.query('TRUNCATE TABLE products');
            await client.query('TRUNCATE TABLE inventory_transactions'); 
            // Optional: Có thể xóa luôn orders nếu muốn sạch sẽ hoàn toàn
            console.log("Reset: Cleared Products & Inventory History");
        }
        else if (scope === 'FULL') {
            await client.query('TRUNCATE TABLE products');
            await client.query('TRUNCATE TABLE categories');
            await client.query('TRUNCATE TABLE customers');
            await client.query('TRUNCATE TABLE orders');
            await client.query('TRUNCATE TABLE inventory_transactions');
            await client.query('TRUNCATE TABLE admin_logs');
            console.log("Reset: FACTORY RESET COMPLETE");
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Đã xóa dữ liệu phạm vi ${scope} thành công trên Server.` });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Reset Error:", e);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

// Start Server
initDb().then(() => {
// ... existing code ...
