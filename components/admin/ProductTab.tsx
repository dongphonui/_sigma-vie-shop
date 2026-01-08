import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories, addCategory, deleteCategory } from '../../utils/categoryStorage';
import { 
    SearchIcon, EditIcon, Trash2Icon, ImagePlus, QrCodeIcon, SparklesIcon, RefreshIcon, XIcon, LightningIcon
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
  }, []);

  const refreshData = () => {
      setProducts(getProducts());
      setCategories(getCategories());
  };

  // Fixed: Added handleEditProduct method
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

  // Fixed: Added handleDeleteProduct method
  const handleDeleteProduct = async (id: number, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" không?`)) {
        await deleteProduct(id);
        refreshData();
        setFeedback({ msg: `Đã xóa sản phẩm "${name}".`, type: 'success' });
        setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          alert('Vui lòng nhập tên sản phẩm để AI lấy cảm hứng.');
          return;
      }

      setIsGeneratingAI(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: [{
                  parts: [{
                      text: `Bạn là chuyên gia thời trang cao cấp. Hãy viết mô tả sản phẩm sang trọng cho: "${newProductName}". Văn phong thanh lịch, giới hạn 3 câu.`
                  }]
              }]
          });
          
          if (response.text) {
              setNewProductDescription(response.text.trim());
          }
      } catch (error) {
          console.error("AI Error:", error);
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductImage) return;
    
    setIsSaving(true);
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
    
    setIsSaving(false);
    setIsAddingProduct(false);
    setEditingProduct(null);
    refreshData();
    setFeedback({ msg: '✅ Đã cập nhật kho hàng.', type: 'success' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-black text-slate-800 uppercase">Quản lý kho Sigma</h2>
            <button onClick={() => { setEditingProduct(null); setIsAddingProduct(true); }} className="bg-[#D4AF37] text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-[#b89b31]">
                + Thêm sản phẩm
            </button>
        </div>

        {feedback && (
            <div className={`p-4 rounded-lg text-center font-bold ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {feedback.msg}
            </div>
        )}

        {isAddingProduct ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl animate-fade-in-up border border-slate-100">
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên sản phẩm *</label>
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2 font-bold outline-none transition-all" required />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Giá bán (VNĐ) *</label>
                            <input type="number" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] focus:bg-white rounded-xl px-4 py-2 font-bold outline-none" required />
                        </div>
                    </div>
                    
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mô tả sản phẩm</label>
                            <button type="button" onClick={handleGenerateDescriptionAI} disabled={isGeneratingAI} className="text-[10px] bg-purple-600 text-white px-3 py-1 rounded-full font-bold flex items-center gap-1">
                                {isGeneratingAI ? 'Đang viết...' : <><SparklesIcon className="w-3 h-3"/> AI VIẾT MÔ TẢ</>}
                            </button>
                        </div>
                        <textarea value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} rows={4} className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#D4AF37] rounded-xl p-4 text-sm font-medium outline-none" />
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button type="button" onClick={() => setIsAddingProduct(false)} className="px-6 py-2 text-slate-400 font-bold uppercase text-xs">Hủy</button>
                        <button type="submit" disabled={isSaving} className="bg-[#00695C] text-white px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg">
                            {isSaving ? 'ĐANG LƯU...' : 'LƯU SẢN PHẨM'}
                        </button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 group hover:shadow-lg transition-all">
                        <img src={p.imageUrl} className="w-full h-48 object-cover rounded-xl mb-4" />
                        <h3 className="font-bold text-slate-800 truncate">{p.name}</h3>
                        <p className="text-[#00695C] font-black">{p.price}</p>
                        <div className="mt-4 flex gap-2">
                            <button onClick={() => handleEditProduct(p)} className="flex-1 bg-slate-50 py-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><EditIcon className="w-4 h-4 mx-auto"/></button>
                            <button onClick={() => handleDeleteProduct(p.id, p.name)} className="flex-1 bg-slate-50 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"><Trash2Icon className="w-4 h-4 mx-auto"/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );
};

export default ProductTab;