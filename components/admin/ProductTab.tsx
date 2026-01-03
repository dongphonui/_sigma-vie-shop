
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories, addCategory, deleteCategory } from '../../utils/categoryStorage';
import { 
    SearchIcon, EditIcon, Trash2Icon, ImagePlus, QrCodeIcon, SparklesIcon, RefreshIcon, XIcon
} from '../Icons';

const ProductTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState<{msg: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [newProductSizes, setNewProductSizes] = useState('');
  const [newProductColors, setNewProductColors] = useState('');

  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('sigma_vie_products_update', handleUpdate);
    window.addEventListener('sigma_vie_categories_update', handleUpdate);
    return () => {
        window.removeEventListener('sigma_vie_products_update', handleUpdate);
        window.removeEventListener('sigma_vie_categories_update', handleUpdate);
    };
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !newProductCategory) {
        setNewProductCategory(categories[0].name);
    }
  }, [categories]);

  const showFeedback = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
      setProductFeedback({ msg, type });
      setTimeout(() => setProductFeedback(null), 5000);
  };

  const refreshData = () => {
      const p = getProducts();
      const c = getCategories();
      setProducts(p);
      setCategories(c);
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
          showFeedback('⚠️ Ảnh quá lớn (Tối đa 3MB).', 'error');
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result as string);
        showFeedback('✅ Đã nhận diện hình ảnh', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const resetProductForm = () => {
      setEditingProduct(null);
      setNewProductName('');
      setNewProductPrice('');
      setNewProductSku('');
      setNewProductDescription('');
      setNewProductImage(null);
      setNewProductSizes('');
      setNewProductColors('');
      setNewProductStatus('active');
      if (categories.length > 0) setNewProductCategory(categories[0].name);
  };

  const handleEditProduct = (product: Product) => {
      setEditingProduct(product);
      setNewProductName(product.name);
      setNewProductPrice(product.price.replace(/[^\d]/g, ''));
      setNewProductSku(product.sku);
      setNewProductCategory(product.category);
      setNewProductStatus(product.status);
      setNewProductDescription(product.description);
      setNewProductImage(product.imageUrl);
      setNewProductSizes(product.sizes?.join(', ') || '');
      setNewProductColors(product.colors?.join(', ') || '');
      setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (window.confirm(`Bạn muốn xóa "${productName}"?`)) {
      const res = await deleteProduct(productId);
      if (res.success) {
        showFeedback(`Đã xóa sản phẩm ${productName}`, 'success');
        refreshData();
      } else {
        showFeedback(`❌ Lỗi: ${res.message}`, 'error');
      }
    }
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          showFeedback('⚠️ Hãy nhập Tên sản phẩm trước.', 'info');
          return;
      }

      const apiKey = process.env.API_KEY;
      if (!apiKey || apiKey === "undefined" || apiKey === "") {
          showFeedback('❌ Lỗi: Web chưa nhận được API_KEY từ Vercel. Hãy Redeploy!', 'error');
          return;
      }

      setIsGeneratingAI(true);
      try {
          const ai = new GoogleGenAI({ apiKey: apiKey });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{
                  parts: [{
                      text: `Bạn là chuyên gia Content cho hãng Sigma Vie. Hãy viết 1 đoạn mô tả ngắn (3 câu), sang trọng cho: "${newProductName}". Ngôn ngữ: Tiếng Việt. Không icon.`
                  }]
              }]
          });
          
          if (response.text) {
              setNewProductDescription(response.text.trim());
              showFeedback('✨ AI đã viết xong!', 'success');
          } else {
              throw new Error("Empty Response");
          }
      } catch (error: any) {
          console.error("DEBUG AI:", error);
          const errorStr = JSON.stringify(error);
          let userMsg = "Lỗi kết nối AI.";
          
          if (errorStr.includes("leaked")) {
            userMsg = "Mã API bị lộ và bị Google khóa. Hãy tạo mã mới!";
          } else if (errorStr.includes("403")) {
            userMsg = "API Key không hợp lệ (403).";
          }
          
          showFeedback(`❌ ${userMsg}`, 'error');
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductImage) {
      showFeedback('⚠️ Vui lòng điền đủ Tên, Giá và Ảnh.', 'error');
      return;
    }

    setIsSaving(true);
    const formattedPrice = newProductPrice.includes('₫') 
        ? newProductPrice 
        : `${new Intl.NumberFormat('vi-VN').format(parseInt(newProductPrice))}₫`;

    const productData = {
      name: newProductName,
      price: formattedPrice,
      importPrice: '0₫',
      description: newProductDescription || 'Thời trang cao cấp Sigma Vie.',
      imageUrl: newProductImage,
      sku: newProductSku || `SIG-${Date.now().toString().slice(-6)}`,
      brand: 'Sigma Vie',
      category: newProductCategory || (categories.length > 0 ? categories[0].name : 'Chung'),
      status: newProductStatus,
      sizes: newProductSizes.split(',').map(s => s.trim()).filter(s => s),
      colors: newProductColors.split(',').map(s => s.trim()).filter(s => s)
    };

    try {
        if (editingProduct) {
            updateProduct({ ...editingProduct, ...productData, stock: editingProduct.stock });
            showFeedback('✅ Cập nhật thành công', 'success');
        } else {
            addProduct({ ...productData, stock: 0 });
            showFeedback('✅ Đã lưu sản phẩm mới', 'success');
        }
        
        setTimeout(() => {
            setIsAddingProduct(false);
            resetProductForm();
            refreshData();
            setIsSaving(false);
        }, 800);
    } catch (err) {
        showFeedback('❌ Lỗi hệ thống khi lưu.', 'error');
        setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up relative min-h-screen">
        <div className="fixed top-20 right-5 z-[200] flex flex-col gap-3 pointer-events-none w-full max-w-sm items-end">
            {productFeedback && (
                <div className={`pointer-events-auto px-5 py-4 rounded-xl shadow-2xl border-l-8 flex items-center gap-3 transition-all transform animate-slide-in-right
                    ${productFeedback.type === 'success' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 
                    productFeedback.type === 'error' ? 'bg-rose-50 border-rose-500 text-rose-800' : 'bg-blue-50 border-blue-500 text-blue-800'}`}>
                    <div className="flex-1 font-bold text-xs tracking-tight">{productFeedback.msg}</div>
                    <button onClick={() => setProductFeedback(null)} className="p-1 hover:bg-black/5 rounded-full"><XIcon className="w-3 h-3 opacity-50" /></button>
                </div>
            )}
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Kho hàng Sigma Vie</h2>
            <div className="flex gap-2">
                <button onClick={() => setIsManagingCategories(!isManagingCategories)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors">
                    {isManagingCategories ? 'Quay lại' : 'Loại hàng'}
                </button>
                <button onClick={() => { resetProductForm(); setIsAddingProduct(true); }} className="px-5 py-2 bg-[#D4AF37] text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-[#b89b31] shadow-lg transition-all">
                    + Thêm mới
                </button>
            </div>
        </div>

        {isManagingCategories ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100 animate-fade-in-up">
                <h3 className="font-bold mb-4 text-slate-700 uppercase text-xs tracking-widest">Danh mục sản phẩm</h3>
                <form onSubmit={(e) => { e.preventDefault(); if (newCatName) { addCategory({ name: newCatName }); setNewCatName(''); showFeedback('Đã thêm danh mục', 'success'); refreshData(); } }} className="flex gap-2 mb-6">
                    <input type="text" placeholder="Tên danh mục..." value={newCatName} onChange={e => setNewCatName(e.target.value)} className="border-2 border-slate-100 rounded-xl px-4 py-2 flex-1 outline-none focus:border-[#D4AF37]" required />
                    <button type="submit" className="bg-[#00695C] text-white px-6 py-2 rounded-xl font-bold">Thêm</button>
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map(cat => (
                        <div key={cat.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center group">
                            <span className="font-medium text-slate-700">{cat.name}</span>
                            <button onClick={() => deleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition-all"><Trash2Icon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        ) : isAddingProduct ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-fade-in-up max-w-5xl mx-auto">
                <form onSubmit={handleProductSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên sản phẩm *</label>
                                <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-3 text-lg font-bold outline-none transition-all" placeholder="Ví dụ: Áo Sơ Mi Lụa Satin" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giá bán (VNĐ) *</label>
                                    <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-3 outline-none font-black text-teal-700" placeholder="1250000" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Danh mục</label>
                                    <select value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-3 outline-none cursor-pointer font-bold text-slate-700">
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Kích thước</label>
                                    <input type="text" value={newProductSizes} onChange={e => setNewProductSizes(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-3 outline-none" placeholder="S, M, L, XL" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Màu sắc</label>
                                    <input type="text" value={newProductColors} onChange={e => setNewProductColors(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-3 outline-none" placeholder="Đen, Trắng, Be" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hình ảnh sản phẩm *</label>
                                <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                    <label className="w-24 h-24 bg-white border-2 border-slate-100 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] hover:text-[#D4AF37] transition-all group">
                                        <ImagePlus className="w-8 h-8 text-slate-300 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] mt-1 font-bold">Chọn ảnh</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                    {newProductImage ? (
                                        <div className="relative">
                                            <img src={newProductImage} className="w-24 h-24 object-cover rounded-xl shadow-md border-2 border-white" />
                                            <button type="button" onClick={() => setNewProductImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:scale-110 transition-transform"><XIcon className="w-3 h-3"/></button>
                                        </div>
                                    ) : (
                                        <div className="text-slate-400 text-[10px] font-medium leading-tight">Chưa chọn ảnh.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col h-full">
                            <div className="flex justify-between items-center mb-3">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả sản phẩm chuyên sâu</label>
                                <button 
                                    type="button" 
                                    onClick={handleGenerateDescriptionAI} 
                                    disabled={isGeneratingAI} 
                                    className={`text-[10px] px-4 py-2 rounded-full font-black flex items-center gap-2 transition-all shadow-md active:scale-95
                                        ${isGeneratingAI ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 hover:-translate-y-0.5'}`}
                                >
                                    {isGeneratingAI ? <RefreshIcon className="w-3 h-3 animate-spin" /> : <SparklesIcon className="w-3 h-3" />}
                                    {isGeneratingAI ? 'AI ĐANG VIẾT...' : 'AI VIẾT MÔ TẢ'}
                                </button>
                            </div>
                            <textarea 
                                ref={descriptionRef}
                                rows={12} 
                                value={newProductDescription} 
                                onChange={e => setNewProductDescription(e.target.value)} 
                                className="w-full flex-1 bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl p-5 text-sm leading-relaxed outline-none transition-all resize-none shadow-inner" 
                                placeholder="Hãy nhập tên sản phẩm và dùng AI để tạo nội dung..." 
                                required 
                            />
                            <p className="text-[10px] text-slate-400 mt-2 italic">* AI sẽ tự động viết nội dung thanh lịch dựa trên tên sản phẩm bạn nhập.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8 border-t border-slate-100">
                        <button type="button" onClick={() => { setIsAddingProduct(false); resetProductForm(); }} className="px-8 py-3 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-800 transition-colors">Bỏ qua</button>
                        <button type="submit" disabled={isSaving} className="px-12 py-3 bg-[#00695C] text-white rounded-full font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-900/20 hover:bg-[#004d40] hover:-translate-y-1 transition-all disabled:opacity-50">
                            {isSaving ? 'ĐANG LƯU...' : (editingProduct ? 'CẬP NHẬT' : 'LƯU VÀO KHO')}
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed font-bold">Chưa có sản phẩm nào.</div>}
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group relative hover:shadow-xl transition-all">
                        <div className="relative h-60 rounded-xl overflow-hidden mb-4 bg-slate-50">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                <button onClick={() => setSelectedQrProduct(product)} className="p-2.5 bg-white rounded-full text-slate-800 hover:scale-110 transition-all shadow-lg" title="Xem mã QR"><QrCodeIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleEditProduct(product)} className="p-2.5 bg-white rounded-full text-blue-600 hover:scale-110 transition-all shadow-lg" title="Chỉnh sửa"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-2.5 bg-white rounded-full text-red-600 hover:scale-110 transition-all shadow-lg" title="Xóa sản phẩm"><Trash2Icon className="w-5 h-5" /></button>
                            </div>
                        </div>
                        <div className="flex justify-between items-start mb-2">
                             <h3 className="font-bold text-slate-800 truncate flex-1 leading-tight">{product.name}</h3>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                            <span className="text-[#00695C] font-black text-lg">{product.price}</span>
                            <span className="text-[9px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full font-black uppercase tracking-tighter">{product.category}</span>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {selectedQrProduct && (
            <div className="fixed inset-0 bg-black/80 z-[110] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedQrProduct(null)}>
                <div className="bg-white rounded-3xl p-10 max-w-sm w-full text-center relative animate-fade-in-up shadow-2xl" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedQrProduct(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-800 transition-colors"><XIcon className="w-6 h-6"/></button>
                    <h4 className="font-black text-slate-800 mb-6 uppercase tracking-widest text-sm border-b pb-4">Product Identifier</h4>
                    <div className="p-4 bg-white border-4 border-slate-50 rounded-3xl inline-block shadow-inner mb-6">
                        <QRCodeSVG value={`${window.location.origin}/?product=${selectedQrProduct.id}`} size={220} />
                    </div>
                    <p className="text-[10px] text-slate-400 mb-6 font-mono font-bold">SERIAL: {selectedQrProduct.sku}</p>
                    <button onClick={() => {
                        const printWindow = window.open('', '', 'width=450,height=300');
                        if (printWindow) {
                            const productUrl = `${window.location.origin}/?product=${selectedQrProduct.id}`;
                            const qrImageUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(productUrl)}&choe=UTF-8`;
                            printWindow.document.write(`
                                <html><body onload="window.print();window.close();" style="text-align:center;font-family:Arial;padding:10px;">
                                    <h2 style="margin:0;font-size:14px;">SIGMA VIE</h2>
                                    <img src="${qrImageUrl}" style="width:120px;height:120px;margin:5px 0;">
                                    <p style="margin:0;font-size:10px;font-weight:bold;">${selectedQrProduct.name.toUpperCase()}</p>
                                    <p style="margin:0;font-size:12px;font-weight:900;">${selectedQrProduct.price}</p>
                                </body></html>
                            `);
                            printWindow.document.close();
                        }
                    }} className="w-full bg-[#00695C] text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-teal-900/20 hover:bg-[#004d40] transition-all">
                        In tem dán áo quần
                    </button>
                </div>
            </div>
        )}

        <style>{`
            @keyframes slide-in-right {
                from { opacity: 0; transform: translateX(50px); }
                to { opacity: 1; transform: translateX(0); }
            }
            .animate-slide-in-right {
                animation: slide-in-right 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
            }
        `}</style>
    </div>
  );
};

export default ProductTab;
