
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories } from '../../utils/categoryStorage';
import { 
    EditIcon, Trash2Icon, ImagePlus, SparklesIcon, XIcon, RefreshIcon
} from '../Icons';

const ProductTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Cảnh báo nếu ảnh quá lớn
        if (file.size > 5 * 1024 * 1024) {
            alert('Ảnh quá lớn (vượt quá 5MB). Vui lòng chọn ảnh nhẹ hơn.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result as string;
            img.onload = () => {
                // Nén ảnh bằng Canvas nếu cần (giữ max width 1200px)
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 1200;
                if (width > max) {
                    height *= max / width;
                    width = max;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                setNewProductImage(canvas.toDataURL('image/jpeg', 0.8));
            };
        };
        reader.readAsDataURL(file);
    }
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          alert('Vui lòng nhập tên sản phẩm.');
          return;
      }
      setIsGeneratingAI(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{ parts: [{ text: `Viết mô tả sản phẩm thời trang sang trọng, ngắn gọn cho: "${newProductName}".` }] }]
          });
          if (response.text) setNewProductDescription(response.text.trim());
      } catch (error) {
          console.error("AI Error:", error);
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleEditProduct = (p: Product) => {
      setEditingProduct(p);
      setNewProductName(p.name);
      setNewProductPrice(p.price.replace(/[^0-9]/g, ''));
      setNewProductSku(p.sku);
      setNewProductCategory(p.category);
      setNewProductStatus(p.status);
      setNewProductDescription(p.description);
      setNewProductImage(p.imageUrl);
      setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (window.confirm(`Xóa sản phẩm "${name}"?`)) {
        await deleteProduct(id);
        refreshData();
        setFeedback({ msg: 'Đã xóa sản phẩm.', type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductImage) {
        setFeedback({ msg: 'Vui lòng điền đủ thông tin và ảnh.', type: 'error' });
        return;
    }
    
    setIsSaving(true);
    setFeedback(null);
    
    try {
        const productData = {
          name: newProductName,
          price: newProductPrice.includes('₫') ? newProductPrice : `${new Intl.NumberFormat('vi-VN').format(parseInt(newProductPrice))}₫`,
          importPrice: '0₫',
          description: newProductDescription,
          imageUrl: newProductImage,
          sku: newProductSku || `SIG-${Date.now().toString().slice(-6)}`,
          brand: 'Sigma Vie',
          category: newProductCategory || 'Bộ sưu tập',
          status: newProductStatus,
          stock: editingProduct ? editingProduct.stock : 0
        };

        if (editingProduct) {
            await updateProduct({ ...editingProduct, ...productData });
        } else {
            await addProduct(productData);
        }
        
        setIsAddingProduct(false);
        setEditingProduct(null);
        refreshData();
        setFeedback({ msg: '✅ Lưu sản phẩm thành công!', type: 'success' });
    } catch (err: any) {
        console.error("Submit error:", err);
        setFeedback({ msg: `❌ Lỗi: ${err.message || 'Không thể kết nối server'}`, type: 'error' });
    } finally {
        setIsSaving(false);
        setTimeout(() => setFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Kho hàng Sigma</h2>
            <button onClick={() => { setEditingProduct(null); resetForm(); setIsAddingProduct(true); }} className="bg-[#D4AF37] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#b89b31] transition-all">
                + Thêm sản phẩm
            </button>
        </div>

        {feedback && (
            <div className={`p-4 rounded-2xl text-center font-bold animate-float-up shadow-sm border ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {feedback.msg}
            </div>
        )}

        {isAddingProduct ? (
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl animate-float-up border border-slate-100">
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên sản phẩm *</label>
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-5 py-3 font-bold outline-none transition-all" required />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giá bán (VNĐ) *</label>
                            <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl px-5 py-3 font-bold outline-none transition-all" required />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả sản phẩm</label>
                                <button type="button" onClick={handleGenerateDescriptionAI} disabled={isGeneratingAI} className="text-[9px] bg-purple-600 text-white px-3 py-1 rounded-full font-black flex items-center gap-1 hover:bg-purple-700 transition-all">
                                    {isGeneratingAI ? <RefreshIcon className="w-3 h-3 animate-spin"/> : <SparklesIcon className="w-3 h-3"/>} AI VIẾT MÔ TẢ
                                </button>
                            </div>
                            <textarea value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} rows={5} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-2xl p-5 text-sm font-medium outline-none transition-all" />
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ảnh sản phẩm *</label>
                            <div className="relative h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center overflow-hidden group cursor-pointer hover:border-[#D4AF37] transition-all">
                                {newProductImage ? (
                                    <>
                                        <img src={newProductImage} className="w-full h-full object-cover" />
                                        <button type="button" onClick={() => setNewProductImage(null)} className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><XIcon className="w-4 h-4"/></button>
                                    </>
                                ) : (
                                    <label className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
                                        <ImagePlus className="w-8 h-8 text-slate-300 mb-2" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Tải ảnh lên</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                        <button type="button" onClick={() => setIsAddingProduct(false)} className="px-8 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-800 transition-all">Hủy bỏ</button>
                        <button type="submit" disabled={isSaving} className="bg-[#111827] text-white px-12 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2">
                            {isSaving ? <RefreshIcon className="w-4 h-4 animate-spin"/> : null} {isSaving ? 'ĐANG LƯU...' : 'LƯU SẢN PHẨM'}
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-50 group hover:shadow-2xl transition-all duration-500 animate-float-up">
                        <div className="relative h-64 rounded-2xl overflow-hidden mb-5">
                            <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                            <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black text-slate-900 uppercase shadow-sm">{p.category}</div>
                        </div>
                        <h3 className="font-black text-slate-800 truncate mb-1 uppercase tracking-tight text-sm">{p.name}</h3>
                        <p className="text-[#00695C] font-black text-lg mb-4">{p.price}</p>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                            <button onClick={() => handleEditProduct(p)} className="flex-1 bg-slate-50 py-3 rounded-xl text-blue-600 hover:bg-blue-100 transition-all"><EditIcon className="w-5 h-5 mx-auto"/></button>
                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="flex-1 bg-slate-50 py-3 rounded-xl text-rose-600 hover:bg-rose-100 transition-all"><Trash2Icon className="w-5 h-5 mx-auto"/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  function resetForm() {
    setNewProductName('');
    setNewProductPrice('');
    setNewProductSku('');
    setNewProductDescription('');
    setNewProductImage(null);
  }
};

export default ProductTab;
