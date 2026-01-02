
import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../../utils/categoryStorage';
import { 
    SearchIcon, EditIcon, Trash2Icon, ImagePlus, LightningIcon, QrCodeIcon, XIcon, SparklesIcon, PrinterIcon, CopyIcon, RefreshIcon
} from '../Icons';

const ProductTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Product Form
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState('');
  const [newProductSizes, setNewProductSizes] = useState('');
  const [newProductColors, setNewProductColors] = useState('');

  // Filter
  const [productSearch, setProductSearch] = useState('');

  useEffect(() => {
    refreshData();
    const handleUpdate = () => setProducts(getProducts());
    window.addEventListener('sigma_vie_products_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_products_update', handleUpdate);
  }, []);

  const refreshData = () => {
      setProducts(getProducts());
      setCategories(getCategories());
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          setProductFeedback('⚠️ Vui lòng nhập tên sản phẩm để AI có dữ liệu.');
          return;
      }
      setIsGeneratingAI(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Bạn là chuyên gia thời trang cao cấp của Sigma Vie. 
          Hãy viết mô tả sản phẩm: "${newProductName}". 
          Yêu cầu:
          1. Giọng văn sang trọng, tinh tế.
          2. Nêu bật phom dáng và chất liệu.
          3. Tối đa 3-4 câu.
          4. Không dùng icon, không dùng tiêu đề.`;

          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          if (response.text) {
              setNewProductDescription(response.text.trim());
              setProductFeedback('✨ AI đã viết xong mô tả!');
          }
      } catch (error) {
          setProductFeedback('❌ Lỗi kết nối AI.');
      } finally {
          setIsGeneratingAI(false);
          setTimeout(() => setProductFeedback(''), 3000);
      }
  };

  const handlePrintTag = (product: Product) => {
      const printWindow = window.open('', '', 'width=400,height=600');
      if (!printWindow) return;

      const productUrl = `${window.location.origin}/?product=${product.id}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(productUrl)}`;

      printWindow.document.write(`
        <html>
        <head>
          <title>Mã vạch - ${product.sku}</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
                font-family: 'Arial', sans-serif; width: 50mm; height: 30mm; 
                margin: 0; padding: 2mm; box-sizing: border-box; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                border: 1px solid #f0f0f0;
            }
            .brand { font-size: 7px; font-weight: bold; letter-spacing: 1px; color: #00695C; margin-bottom: 1mm; }
            .content { display: flex; width: 100%; align-items: center; gap: 3mm; }
            .qr-box { width: 14mm; height: 14mm; }
            .qr-box img { width: 100%; height: 100%; }
            .info { flex: 1; display: flex; flex-direction: column; text-align: left; }
            .name { font-size: 7px; font-weight: 700; height: 16px; overflow: hidden; color: #111; }
            .sku { font-size: 6px; color: #666; margin-top: 0.5mm; }
            .price { font-size: 9px; font-weight: 900; margin-top: 1mm; color: #000; border-top: 0.5px solid #eee; padding-top: 0.5mm; }
          </style>
        </head>
        <body>
          <div class="brand">SIGMA VIE • BOUTIQUE</div>
          <div class="content">
            <div class="qr-box"><img src="${qrImageUrl}" /></div>
            <div class="info">
                <div class="name">${product.name.toUpperCase()}</div>
                <div class="sku">SKU: ${product.sku}</div>
                <div class="price">${product.price}</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handlePrintAllTags = () => {
      const activeProducts = products.filter(p => p.status === 'active');
      if (activeProducts.length === 0) return;

      const printWindow = window.open('', '', 'width=600,height=800');
      if (!printWindow) return;

      let tagsHtml = '';
      activeProducts.forEach(product => {
          const productUrl = `${window.location.origin}/?product=${product.id}`;
          const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(productUrl)}`;
          tagsHtml += `
            <div class="tag">
                <div class="brand">SIGMA VIE • BOUTIQUE</div>
                <div class="content">
                    <div class="qr-box"><img src="${qrImageUrl}" /></div>
                    <div class="info">
                        <div class="name">${product.name.toUpperCase()}</div>
                        <div class="sku">SKU: ${product.sku}</div>
                        <div class="price">${product.price}</div>
                    </div>
                </div>
            </div>
          `;
      });

      printWindow.document.write(`
        <html>
        <head>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { margin: 0; padding: 0; }
            .tag { 
                width: 50mm; height: 30mm; padding: 2mm; box-sizing: border-box; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                page-break-after: always; font-family: sans-serif;
            }
            .brand { font-size: 7px; font-weight: bold; letter-spacing: 1px; color: #00695C; margin-bottom: 1mm; }
            .content { display: flex; width: 100%; align-items: center; gap: 3mm; }
            .qr-box { width: 14mm; height: 14mm; }
            .qr-box img { width: 100%; height: 100%; }
            .info { flex: 1; display: flex; flex-direction: column; }
            .name { font-size: 7px; font-weight: 700; height: 16px; overflow: hidden; }
            .sku { font-size: 6px; color: #666; }
            .price { font-size: 9px; font-weight: 900; margin-top: 1mm; border-top: 0.5px solid #eee; }
          </style>
        </head>
        <body>
          ${tagsHtml}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductDescription || !newProductImage) {
      setProductFeedback('⚠️ Vui lòng điền đủ thông tin và chọn ảnh.');
      return;
    }
    const data = {
      name: newProductName, price: newProductPrice, importPrice: '0₫', description: newProductDescription,
      imageUrl: newProductImage, sku: newProductSku || `SIG-${Date.now().toString().slice(-6)}`, 
      brand: 'Sigma Vie', category: newProductCategory || 'Chung', status: newProductStatus,
      sizes: newProductSizes.split(',').map(s => s.trim()).filter(s => s),
      colors: newProductColors.split(',').map(s => s.trim()).filter(s => s)
    };

    if (editingProduct) updateProduct({ ...editingProduct, ...data, stock: editingProduct.stock });
    else addProduct({ ...data, stock: 0 });
    
    refreshData(); setIsAddingProduct(false); setEditingProduct(null);
    setProductFeedback('✅ Đã lưu sản phẩm thành công!');
    setTimeout(() => setProductFeedback(''), 3000);
  };

  const handleDeleteProduct = async (id: number, name: string) => {
      if (confirm(`Xóa sản phẩm "${name}"?`)) {
          const res = await deleteProduct(id);
          if (res.success) { setProducts(p => p.filter(x => x.id !== id)); setProductFeedback('🗑️ Đã xóa.'); }
          else setProductFeedback('❌ Lỗi xóa.');
          setTimeout(() => setProductFeedback(''), 3000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Kho hàng Boutique</h2>
            <div className="flex gap-2">
                <button onClick={handlePrintAllTags} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all font-medium text-sm">
                    <PrinterIcon className="w-4 h-4" /> In tất cả tem
                </button>
                <button onClick={() => { setEditingProduct(null); setIsAddingProduct(true); }} className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg font-bold hover:bg-[#b89b31] shadow-md transition-all">
                    + Thêm sản phẩm
                </button>
            </div>
        </div>

        {isAddingProduct ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Tên sản phẩm</label>
                                <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 text-lg font-medium outline-none transition-all" placeholder="Ví dụ: Đầm Lụa Satin Cao Cấp" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Giá bán</label>
                                    <input type="text" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none" placeholder="1.200.000₫" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">SKU</label>
                                    <input type="text" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none" placeholder="Tự động" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Kích thước</label>
                                    <input type="text" value={newProductSizes} onChange={e => setNewProductSizes(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none" placeholder="S, M, L" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Màu sắc</label>
                                    <input type="text" value={newProductColors} onChange={e => setNewProductColors(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none" placeholder="Đen, Be" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">Mô tả (AI Hỗ trợ)</label>
                                    <button type="button" onClick={handleGenerateDescriptionAI} disabled={isGeneratingAI} className="text-[10px] bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-bold flex items-center gap-1 hover:bg-purple-200">
                                        <SparklesIcon className="w-3 h-3" /> {isGeneratingAI ? 'AI đang viết...' : 'AI Viết mô tả'}
                                    </button>
                                </div>
                                <textarea rows={4} value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ảnh sản phẩm</label>
                                <div className="flex items-center gap-4">
                                    <label className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] transition-all">
                                        <ImagePlus className="w-6 h-6 text-slate-300" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                    {newProductImage && <img src={newProductImage} className="w-24 h-24 object-cover rounded-xl shadow-lg" />}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                        <button type="button" onClick={() => setIsAddingProduct(false)} className="px-6 py-2 text-slate-500 font-bold">Hủy</button>
                        <button type="submit" className="px-10 py-3 bg-[#00695C] text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all">Lưu sản phẩm</button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group relative">
                        <div className="relative h-48 rounded-xl overflow-hidden mb-4">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                <button onClick={() => setSelectedQrProduct(product)} className="p-2 bg-white rounded-full text-slate-800 hover:scale-110 transition-all"><QrCodeIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleEditProduct(product)} className="p-2 bg-white rounded-full text-blue-600 hover:scale-110 transition-all"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-2 bg-white rounded-full text-red-600 hover:scale-110 transition-all"><Trash2Icon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <h3 className="font-bold text-slate-800 truncate mb-1">{product.name}</h3>
                        <div className="flex justify-between items-center">
                            <span className="text-[#00695C] font-black">{product.price}</span>
                            <button onClick={() => handlePrintTag(product)} className="text-slate-400 hover:text-[#D4AF37] p-1"><PrinterIcon className="w-4 h-4" /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {selectedQrProduct && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedQrProduct(null)}>
                <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center relative" onClick={e => e.stopPropagation()}>
                    <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm">Product QR Tag</h4>
                    <div className="p-4 bg-white border-2 border-[#D4AF37] rounded-2xl inline-block shadow-inner mb-6">
                        <QRCodeSVG value={`${window.location.origin}/?product=${selectedQrProduct.id}`} size={200} />
                    </div>
                    <p className="text-[10px] text-slate-400 mb-6 font-mono">SKU: {selectedQrProduct.sku}</p>
                    <button onClick={() => handlePrintTag(selectedQrProduct)} className="w-full bg-[#00695C] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                        <PrinterIcon className="w-4 h-4" /> In tem ngay
                    </button>
                </div>
            </div>
        )}

        {productFeedback && (
             <div className="fixed bottom-6 right-6 z-[70] px-6 py-3 bg-[#00695C] text-white rounded-full shadow-2xl font-bold animate-bounce border border-teal-700">
                 {productFeedback}
             </div>
        )}
    </div>
  );
};

export default ProductTab;
