
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
  
  // Product Form State
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

  // Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

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

  const refreshData = () => {
      const p = getProducts();
      const c = getCategories();
      setProducts(p);
      setCategories(c);
      if (c.length > 0 && !newProductCategory) {
          setNewProductCategory(c[0].name);
      }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
          setProductFeedback('⚠️ Ảnh quá lớn (Tối đa 2MB)');
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProductImage(reader.result as string);
        setProductFeedback('✅ Đã tải ảnh lên');
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
      setProductFeedback('');
  };

  const handleEditProduct = (product: Product) => {
      setEditingProduct(product);
      setNewProductName(product.name);
      setNewProductPrice(product.price);
      setNewProductSku(product.sku);
      setNewProductCategory(product.category);
      setNewProductStatus(product.status);
      setNewProductDescription(product.description);
      setNewProductImage(product.imageUrl);
      setNewProductSizes(product.sizes?.join(', ') || '');
      setNewProductColors(product.colors?.join(', ') || '');
      setIsAddingProduct(true);
  };

  // Fix error: Add missing handleDeleteProduct function
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" không?`)) {
      const res = await deleteProduct(productId);
      if (res.success) {
        setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
        if (editingProduct?.id === productId) {
            setIsAddingProduct(false);
            setEditingProduct(null);
            resetProductForm();
        }
        setProductFeedback(`✅ Đã xóa sản phẩm "${productName}".`);
      } else {
        setProductFeedback(`❌ ${res.message}`);
      }
      setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          setProductFeedback('⚠️ Vui lòng nhập tên sản phẩm.');
          return;
      }
      setIsGeneratingAI(true);
      try {
          // Fix Gemini API initialization: use correct constructor and named parameter
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          // Fix Gemini API generateContent: use ai.models.generateContent with model and contents
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Viết mô tả ngắn sang trọng cho sản phẩm thời trang: ${newProductName}. Phom dáng hiện đại, chất liệu cao cấp.`
          });
          // Fix Gemini API response: access .text property directly
          if (response.text) {
              setNewProductDescription(response.text.trim());
              setProductFeedback('✨ AI đã viết mô tả!');
          }
      } catch (error) {
          setProductFeedback('❌ Lỗi AI. Vui lòng kiểm tra API Key.');
      } finally {
          setIsGeneratingAI(false);
      }
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductImage) {
      setProductFeedback('⚠️ Vui lòng điền Tên, Giá và chọn Ảnh.');
      return;
    }

    const productData = {
      name: newProductName,
      price: newProductPrice.includes('₫') ? newProductPrice : `${newProductPrice}₫`,
      importPrice: '0₫',
      description: newProductDescription,
      imageUrl: newProductImage,
      sku: newProductSku || `SIG-${Date.now().toString().slice(-6)}`,
      brand: 'Sigma Vie',
      category: newProductCategory || 'Chung',
      status: newProductStatus,
      sizes: newProductSizes.split(',').map(s => s.trim()).filter(s => s),
      colors: newProductColors.split(',').map(s => s.trim()).filter(s => s)
    };

    if (editingProduct) {
        updateProduct({ ...editingProduct, ...productData, stock: editingProduct.stock });
        setProductFeedback('✅ Đã cập nhật sản phẩm!');
    } else {
        addProduct({ ...productData, stock: 0 });
        setProductFeedback('✅ Đã thêm sản phẩm mới!');
    }
    
    refreshData();
    setTimeout(() => {
        setIsAddingProduct(false);
        resetProductForm();
    }, 1000);
  };

  const handlePrintTag = (product: Product) => {
      const printWindow = window.open('', '', 'width=400,height=600');
      if (!printWindow) return;
      const productUrl = `${window.location.origin}/?product=${product.id}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(productUrl)}`;
      printWindow.document.write(`
        <html><head><style>
            @page { size: 50mm 30mm; margin: 0; }
            body { font-family: sans-serif; width: 50mm; height: 30mm; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2mm; box-sizing: border-box; }
            .brand { font-size: 7px; font-weight: bold; color: #00695C; margin-bottom: 1mm; }
            .content { display: flex; width: 100%; align-items: center; gap: 2mm; }
            .qr { width: 15mm; height: 15mm; }
            .info { flex: 1; text-align: left; }
            .name { font-size: 7px; font-weight: bold; height: 16px; overflow: hidden; }
            .sku { font-size: 6px; color: #666; }
            .price { font-size: 9px; font-weight: 900; margin-top: 1mm; }
        </style></head><body>
          <div class="brand">SIGMA VIE BOUTIQUE</div>
          <div class="content">
            <img class="qr" src="${qrImageUrl}" />
            <div class="info">
                <div class="name">${product.name.toUpperCase()}</div>
                <div class="sku">SKU: ${product.sku}</div>
                <div class="price">${product.price}</div>
            </div>
          </div>
          <script>window.onload=function(){window.print();window.close();}</script>
        </body></html>
      `);
      printWindow.document.close();
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newCatName) return;
      addCategory({ name: newCatName, description: newCatDesc });
      setNewCatName(''); setNewCatDesc('');
      setProductFeedback('✅ Đã thêm danh mục!');
      refreshData();
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800">Quản lý Sản phẩm</h2>
            <div className="flex gap-2">
                <button onClick={() => setIsManagingCategories(!isManagingCategories)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200">
                    {isManagingCategories ? 'Quay lại' : 'Quản lý Danh mục'}
                </button>
                <button onClick={() => { resetProductForm(); setIsAddingProduct(true); }} className="px-4 py-2 bg-[#D4AF37] text-white rounded-lg font-bold hover:bg-[#b89b31] shadow-md">
                    + Thêm sản phẩm
                </button>
            </div>
        </div>

        {isManagingCategories ? (
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-100">
                <h3 className="font-bold mb-4">Danh mục hiện có</h3>
                <form onSubmit={handleCategorySubmit} className="flex gap-2 mb-6">
                    <input type="text" placeholder="Tên danh mục mới" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="border rounded-lg px-3 py-2 flex-1" required />
                    <button type="submit" className="bg-[#00695C] text-white px-4 py-2 rounded-lg font-bold">Thêm</button>
                </form>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {categories.map(cat => (
                        <div key={cat.id} className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                            <span className="font-medium text-sm">{cat.name}</span>
                            <button onClick={() => deleteCategory(cat.id)} className="text-red-400 hover:text-red-600"><Trash2Icon className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        ) : isAddingProduct ? (
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1">Tên sản phẩm *</label>
                                <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 text-lg font-medium outline-none" placeholder="Nhập tên sản phẩm..." required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Giá bán *</label>
                                    <input type="text" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none" placeholder="1.200.000" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Danh mục</label>
                                    <select value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-[#D4AF37] py-2 outline-none">
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Size (S, M, L...)</label>
                                    <input type="text" value={newProductSizes} onChange={e => setNewProductSizes(e.target.value)} className="w-full border-b-2 border-slate-100 py-2 outline-none" placeholder="Cách nhau bằng dấu phẩy" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase mb-1">Màu sắc</label>
                                    <input type="text" value={newProductColors} onChange={e => setNewProductColors(e.target.value)} className="w-full border-b-2 border-slate-100 py-2 outline-none" placeholder="Đen, Trắng..." />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="flex justify-between items-center mb-1">
                                    <label className="block text-xs font-black text-slate-400 uppercase">Mô tả (AI Hỗ trợ)</label>
                                    <button type="button" onClick={handleGenerateDescriptionAI} disabled={isGeneratingAI} className="text-[10px] bg-purple-100 text-purple-600 px-2 py-1 rounded-full font-bold flex items-center gap-1">
                                        <SparklesIcon className="w-3 h-3" /> {isGeneratingAI ? 'AI đang viết...' : 'AI Viết mô tả'}
                                    </button>
                                </div>
                                <textarea rows={4} value={newProductDescription} onChange={e => setNewProductDescription(e.target.value)} className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#D4AF37] outline-none" required />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-2">Ảnh sản phẩm *</label>
                                <div className="flex items-center gap-4">
                                    <label className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-[#D4AF37] transition-all">
                                        <ImagePlus className="w-6 h-6 text-slate-300" />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                    {newProductImage && <img src={newProductImage} className="w-24 h-24 object-cover rounded-xl shadow-lg border" />}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button type="button" onClick={() => { setIsAddingProduct(false); resetProductForm(); }} className="px-6 py-2 text-slate-500 font-bold">Hủy</button>
                        <button type="submit" className="px-10 py-3 bg-[#00695C] text-white rounded-full font-bold shadow-lg">Lưu sản phẩm</button>
                    </div>
                </form>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.length === 0 && (
                    <div className="col-span-full py-20 text-center text-slate-400 bg-white rounded-xl border border-dashed">
                        Chưa có sản phẩm nào. Hãy bấm "Thêm sản phẩm" để bắt đầu.
                    </div>
                )}
                {products.map(product => (
                    <div key={product.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 group relative">
                        <div className="relative h-48 rounded-xl overflow-hidden mb-4">
                            <img src={product.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-500" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                                <button onClick={() => setSelectedQrProduct(product)} className="p-2 bg-white rounded-full text-slate-800"><QrCodeIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleEditProduct(product)} className="p-2 bg-white rounded-full text-blue-600"><EditIcon className="w-5 h-5" /></button>
                                <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-2 bg-white rounded-full text-red-600"><Trash2Icon className="w-5 h-5" /></button>
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
