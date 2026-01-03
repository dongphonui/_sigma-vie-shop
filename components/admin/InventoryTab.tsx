
import React, { useState, useEffect } from 'react';
import type { InventoryTransaction } from '../../types';
import { getTransactions, addTransaction } from '../../utils/inventoryStorage';
import { getProducts, updateProductStock } from '../../utils/productStorage';

const InventoryTab: React.FC = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  const [selectedProductForInventory, setSelectedProductForInventory] = useState<string>('');
  const [inventoryQuantity, setInventoryQuantity] = useState<string>('');
  const [inventoryNote, setInventoryNote] = useState('');
  const [inventoryType, setInventoryType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [inventoryFeedback, setInventoryFeedback] = useState('');
  const [inventoryView, setInventoryView] = useState<'stock' | 'history'>('stock');
  const [inventorySearch, setInventorySearch] = useState('');
  
  const [inventorySize, setInventorySize] = useState(''); 
  const [inventoryColor, setInventoryColor] = useState('');

  const refreshLocalData = () => {
      setTransactions(getTransactions());
      setProducts(getProducts());
  };

  useEffect(() => {
      refreshLocalData();
      window.addEventListener('sigma_vie_products_update', refreshLocalData);
      return () => window.removeEventListener('sigma_vie_products_update', refreshLocalData);
  }, []);

  const handleInventorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForInventory || !inventoryQuantity) {
        setInventoryFeedback('Vui lòng chọn sản phẩm và nhập số lượng.');
        return;
    }

    const productId = parseInt(selectedProductForInventory);
    const qty = parseInt(inventoryQuantity);
    const product = products.find(p => p.id === productId);

    if (!product) return;
    if (qty <= 0) {
        setInventoryFeedback('Số lượng phải lớn hơn 0.');
        return;
    }
    
    if (product.sizes && product.sizes.length > 0 && !inventorySize) {
        setInventoryFeedback('Vui lòng chọn Size cho sản phẩm này.');
        return;
    }
    if (product.colors && product.colors.length > 0 && !inventoryColor) {
        setInventoryFeedback('Vui lòng chọn Màu cho sản phẩm này.');
        return;
    }

    const change = inventoryType === 'IMPORT' ? qty : -qty;
    
    let currentStock = product.stock;
    if (inventorySize || inventoryColor) {
        const variant = product.variants?.find((v: any) => 
            (v.size === inventorySize || (!v.size && !inventorySize)) && 
            (v.color === inventoryColor || (!v.color && !inventoryColor))
        );
        currentStock = variant ? variant.stock : 0;
    }

    if (inventoryType === 'EXPORT' && currentStock < qty) {
         setInventoryFeedback(`Lỗi: Tồn kho hiện tại (${currentStock}) không đủ để xuất ${qty}.`);
         return;
    }

    const success = updateProductStock(productId, change, inventorySize, inventoryColor);

    if (success) {
        let noteDetails = inventoryNote;
        if(inventorySize) noteDetails += ` [Size: ${inventorySize}]`;
        if(inventoryColor) noteDetails += ` [Màu: ${inventoryColor}]`;

        addTransaction({
            productId,
            productName: product.name,
            type: inventoryType,
            quantity: qty,
            note: noteDetails,
            selectedSize: inventorySize,
            selectedColor: inventoryColor
        });
        
        setInventoryFeedback(`Thành công: ${inventoryType === 'IMPORT' ? 'Nhập' : 'Xuất'} ${qty} sản phẩm.`);
        setInventoryQuantity('');
        setInventoryNote('');
        
        // Buộc UI cập nhật lại danh sách sản phẩm
        refreshLocalData();
        
        setTimeout(() => setInventoryFeedback(''), 3000);
    } else {
        setInventoryFeedback('Đã xảy ra lỗi khi cập nhật tồn kho.');
    }
  };

  return (
      <div className="space-y-6 animate-fade-in-up">
           <div className="flex border-b border-gray-200 mb-6">
                <button 
                    onClick={() => setInventoryView('stock')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${inventoryView === 'stock' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Nhập/Xuất Kho
                </button>
                <button 
                    onClick={() => setInventoryView('history')}
                    className={`px-6 py-3 font-medium transition-colors border-b-2 ${inventoryView === 'history' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Lịch sử Giao dịch
                </button>
           </div>

           {inventoryView === 'stock' ? (
                <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Điều chỉnh Tồn kho</h3>
                    <form onSubmit={handleInventorySubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn sản phẩm</label>
                            <select 
                                value={selectedProductForInventory} 
                                onChange={(e) => {
                                    setSelectedProductForInventory(e.target.value);
                                    setInventorySize('');
                                    setInventoryColor('');
                                }}
                                className="w-full border rounded px-3 py-2"
                                required
                            >
                                <option value="">-- Chọn sản phẩm --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} (Tổng tồn: {p.stock})</option>
                                ))}
                            </select>
                        </div>

                        {selectedProductForInventory && (() => {
                            const p = products.find(prod => prod.id === parseInt(selectedProductForInventory));
                            if (!p) return null;
                            return (
                                <div className="grid grid-cols-2 gap-4">
                                    {p.sizes && p.sizes.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước</label>
                                            <select value={inventorySize} onChange={(e) => setInventorySize(e.target.value)} className="w-full border rounded px-3 py-2" required>
                                                <option value="">-- Chọn Size --</option>
                                                {p.sizes.map((s: string) => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {p.colors && p.colors.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc</label>
                                            <select value={inventoryColor} onChange={(e) => setInventoryColor(e.target.value)} className="w-full border rounded px-3 py-2" required>
                                                <option value="">-- Chọn Màu --</option>
                                                {p.colors.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                                <select value={inventoryType} onChange={(e) => setInventoryType(e.target.value as any)} className="w-full border rounded px-3 py-2">
                                    <option value="IMPORT">Nhập kho (+)</option>
                                    <option value="EXPORT">Xuất kho (-)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                                <input type="number" min="1" value={inventoryQuantity} onChange={(e) => setInventoryQuantity(e.target.value)} className="w-full border rounded px-3 py-2" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                            <textarea value={inventoryNote} onChange={(e) => setInventoryNote(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
                        </div>
                        
                        {selectedProductForInventory && (
                             <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                                 {(() => {
                                     const p = products.find(prod => prod.id === parseInt(selectedProductForInventory));
                                     if (!p) return null;
                                     let stockDisplay = p.stock;
                                     let label = 'Tổng tồn kho';
                                     if (inventorySize || inventoryColor) {
                                         const v = p.variants?.find((v: any) => (v.size === inventorySize || (!v.size && !inventorySize)) && (v.color === inventoryColor || (!v.color && !inventoryColor)));
                                         stockDisplay = v ? v.stock : 0;
                                         label = `Tồn kho biến thể`;
                                     }
                                     return <span><strong>{label}:</strong> {stockDisplay}</span>;
                                 })()}
                             </div>
                        )}

                        <button type="submit" className="w-full bg-[#00695C] text-white py-2 rounded font-bold hover:bg-[#004d40]">Cập nhật kho</button>
                        {inventoryFeedback && <div className={`mt-2 text-center text-sm font-medium ${inventoryFeedback.includes('Lỗi') ? 'text-red-600' : 'text-green-600'}`}>{inventoryFeedback}</div>}
                    </form>
                </div>
           ) : (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                     <div className="p-4 border-b">
                         <input type="text" placeholder="Tìm kiếm giao dịch..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className="border rounded px-3 py-2 w-full max-w-sm" />
                     </div>
                     <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">Thời gian</th>
                                <th className="px-4 py-3">Sản phẩm</th>
                                <th className="px-4 py-3">Phân loại</th>
                                <th className="px-4 py-3">Loại</th>
                                <th className="px-4 py-3">Số lượng</th>
                                <th className="px-4 py-3">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {transactions
                                .filter(t => t.productName.toLowerCase().includes(inventorySearch.toLowerCase()) || t.note?.toLowerCase().includes(inventorySearch.toLowerCase()))
                                .map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">{new Date(t.timestamp).toLocaleString('vi-VN')}</td>
                                    <td className="px-4 py-3 font-medium text-gray-900">{t.productName}</td>
                                    <td className="px-4 py-3">{t.selectedSize && `Size: ${t.selectedSize} `}{t.selectedColor && `Màu: ${t.selectedColor}`}{!t.selectedSize && !t.selectedColor && '-'}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'IMPORT' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>{t.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}</span></td>
                                    <td className="px-4 py-3 font-bold">{t.quantity}</td>
                                    <td className="px-4 py-3 italic text-gray-400">{t.note || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>
           )}
      </div>
  );
};

export default InventoryTab;
