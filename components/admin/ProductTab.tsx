import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { GoogleGenAI } from "@google/genai";
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../../utils/categoryStorage';
import { 
    SearchIcon, EditIcon, Trash2Icon, ImagePlus, LightningIcon, QrCodeIcon, XIcon, SparklesIcon, PrinterIcon, CopyIcon
} from '../Icons';

const ProductTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Product Form
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductImportPrice, setNewProductImportPrice] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductStatus, setNewProductStatus] = useState<'active' | 'draft' | 'archived'>('active');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState<string | null>(null);
  const [productFeedback, setProductFeedback] = useState('');
  
  // Flash Sale
  const [newProductIsFlashSale, setNewProductIsFlashSale] = useState(false);
  const [newProductSalePrice, setNewProductSalePrice] = useState('');
  const [newProductFlashSaleStartTime, setNewProductFlashSaleStartTime] = useState('');
  const [newProductFlashSaleEndTime, setNewProductFlashSaleEndTime] = useState('');
  
  // Sizes/Colors
  const [newProductSizes, setNewProductSizes] = useState(''); 
  const [newProductColors, setNewProductColors] = useState('');

  // Filter
  const [productSearch, setProductSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Category Form
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  useEffect(() => {
    refreshData();
    const handleUpdate = () => {
        setProducts(getProducts());
    };
    window.addEventListener('sigma_vie_products_update', handleUpdate);
    return () => window.removeEventListener('sigma_vie_products_update', handleUpdate);
  }, []);

  const refreshData = () => {
      setProducts(getProducts());
      setCategories(getCategories());
  };

  const handleGenerateDescriptionAI = async () => {
      if (!newProductName) {
          setProductFeedback('Vui lòng nhập tên sản phẩm để AI có dữ liệu viết bài.');
          return;
      }

      setIsGeneratingAI(true);
      try {
          // Initialization of GoogleGenAI with API Key from process.env.API_KEY
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Bạn là một copywriter chuyên nghiệp trong lĩnh vực thời trang cao cấp cho thương hiệu Sigma Vie.
          Hãy viết một đoạn mô tả ngắn (khoảng 3-4 câu) cực kỳ lôi cuốn, sang trọng và đầy cảm hứng cho sản phẩm sau:
          Tên sản phẩm: ${newProductName}
          Danh mục: ${newProductCategory || 'Thời trang'}
          Phong cách: Thanh lịch, hiện đại, tối giản.
          Ngôn ngữ: Tiếng Việt.
          Đầu ra: Chỉ trả về đoạn văn mô tả, không thêm tiêu đề hay dấu ngoặc kép.`;

          // Using generateContent with model name and prompt
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });

          // Correctly extracting text output from GenerateContentResponse
          if (response.text) {
              setNewProductDescription(response.text.trim());
              setProductFeedback('✨ AI đã hoàn thành đoạn mô tả tuyệt vời cho bạn!');
          }
      } catch (error) {
          console.error("AI Error:", error);
          setProductFeedback('❌ Không thể kết nối AI. Vui lòng kiểm tra lại mạng.');
      } finally {
          setIsGeneratingAI(false);
          setTimeout(() => setProductFeedback(''), 4000);
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
          <title>Tem sản phẩm - ${product.name}</title>
          <style>
            @page { size: 50mm 30mm; margin: 0; }
            body { 
                font-family: 'Poppins', sans-serif; 
                width: 50mm; height: 30mm; 
                margin: 0; padding: 2mm; 
                box-sizing: border-box; 
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                border: 0.5px solid #eee;
            }
            .brand { font-size: 8px; font-weight: bold; color: #00695C; text-transform: uppercase; margin-bottom: 1mm; }
            .content { display: flex; width: 100%; align-items: center; gap: 2mm; }
            .qr-box { width: 15mm; height: 15mm; }
            .qr-box img { width: 100%; height: 100%; }
            .info { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
            .name { font-size: 7px; font-weight: 600; line-height: 1.1; height: 16px; overflow: hidden; }
            .sku { font-size: 6px; color: #666; margin-top: 1mm; }
            .price { font-size: 9px; font-weight: bold; margin-top: 2mm; color: #000; }
          </style>
        </head>
        <body>
          <div class="brand">Sigma Vie</div>
          <div class="content">
            <div class="qr-box">
                <img src="${qrImageUrl}" />
            </div>
            <div class="info">
                <div class="name">${product.name}</div>
                <div class="sku">SKU: ${product.sku}</div>
                <div class="price">${product.price}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
  };

  const handleCopyLink = (id: number) => {
      const url = `${window.location.origin}/?product=${id}`;
      navigator.clipboard.writeText(url);
      setProductFeedback('✅ Đã copy link sản phẩm!');
      setTimeout(() => setProductFeedback(''), 3000);
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProductImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditProduct = (product: Product) => {
      setEditingProduct(product);
      setNewProductName(product.name);
      setNewProductPrice(product.price);
      setNewProductImportPrice(product.importPrice);
      setNewProductSku(product.sku);
      setNewProductCategory(product.category);
      setNewProductBrand(product.brand);
      setNewProductStatus(product.status);
      setNewProductDescription(product.description);
      setNewProductImage(product.imageUrl);
      setNewProductIsFlashSale(product.isFlashSale || false);
      setNewProductSalePrice(product.salePrice || '');
      setNewProductSizes(product.sizes ? product.sizes.join(', ') : '');
      setNewProductColors(product.colors ? product.colors.join(', ') : '');
      
      const toLocalISO = (t?: number) => t ? new Date(t - new Date().getTimezoneOffset()*60000).toISOString().slice(0, 16) : '';
      setNewProductFlashSaleStartTime(toLocalISO(product.flashSaleStartTime));
      setNewProductFlashSaleEndTime(toLocalISO(product.flashSaleEndTime));

      setIsAddingProduct(true);
  };

  // Fix for: handleCancelProductEdit (missing)
  const handleCancelProductEdit = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductImportPrice('');
    setNewProductSku('');
    setNewProductCategory('');
    setNewProductBrand('');
    setNewProductStatus('active');
    setNewProductDescription('');
    setNewProductImage(null);
    setNewProductIsFlashSale(false);
    setNewProductSalePrice('');
    setNewProductFlashSaleStartTime('');
    setNewProductFlashSaleEndTime('');
    setNewProductSizes('');
    setNewProductColors('');
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductDescription || !newProductImage) {
      setProductFeedback('Vui lòng điền đủ thông tin & chọn ảnh.');
      return;
    }
    const data = {
      name: newProductName, price: newProductPrice, importPrice: newProductImportPrice || '0₫', description: newProductDescription,
      imageUrl: newProductImage, sku: newProductSku || `SIG-${Date.now()}`, brand: newProductBrand || 'Sigma Vie',
      category: newProductCategory || categories[0]?.name || 'Chung', status: newProductStatus,
      isFlashSale: newProductIsFlashSale, salePrice: newProductSalePrice,
      flashSaleStartTime: newProductFlashSaleStartTime ? new Date(newProductFlashSaleStartTime).getTime() : undefined,
      flashSaleEndTime: newProductFlashSaleEndTime ? new Date(newProductFlashSaleEndTime).getTime() : undefined,
      sizes: newProductSizes.split(',').map(s => s.trim()).filter(s => s),
      colors: newProductColors.split(',').map(s => s.trim()).filter(s => s)
    };

    if (editingProduct) updateProduct({ ...editingProduct, ...data, stock: editingProduct.stock });
    else addProduct({ ...data, stock: 0 });
    
    refreshData(); handleCancelProductEdit();
    setProductFeedback('✅ Đã lưu sản phẩm thành công!');
    setTimeout(() => setProductFeedback(''), 3000);
  };

  // Fix for: handleSaveCategory (missing)
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName) {
        if (editingCategory) {
            updateCategory({ id: editingCategory.id, name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Đã cập nhật danh mục.');
        } else {
            addCategory({ name: newCategoryName, description: newCategoryDesc });
            setProductFeedback('Thêm danh mục thành công.');
        }
        setNewCategoryName('');
        setNewCategoryDesc('');
        setEditingCategory(null);
        refreshData();
        setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  // Fix for: handleEditCategory (missing)
  const handleEditCategory = (category: Category) => {
      setEditingCategory(category);
      setNewCategoryName(category.name);
      setNewCategoryDesc(category.description || '');
  };

  // Fix for: handleDeleteCategory (missing)
  const handleDeleteCategory = (id: string) => {
      const category = categories.find(c => c.id === id);
      if (window.confirm(`Bạn có chắc muốn xóa danh mục "${category?.name}"? Sản phẩm thuộc danh mục này sẽ không bị xóa.`)) {
          deleteCategory(id);
          refreshData();
          if (editingCategory?.id === id) {
              setEditingCategory(null);
              setNewCategoryName('');
              setNewCategoryDesc('');
          }
      }
  };

  // Fix for: handleDeleteProduct (missing)
  const handleDeleteProduct = async (productId: number, productName: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${productName}" không?`)) {
      const result = await deleteProduct(productId);
      if (result.success) {
          setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
          if (editingProduct?.id === productId) {
              handleCancelProductEdit();
          }
          setProductFeedback(`Đã xóa sản phẩm "${productName}".`);
      } else {
          setProductFeedback(`Lỗi: ${result.message}`);
      }
      setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
        <div className="flex justify-end gap-3">
             <button onClick={() => setIsManagingCategories(!isManagingCategories)} className="text-[#00695C] border border-[#00695C] px-4 py-2 rounded hover:bg-teal-50">
                {isManagingCategories ? 'Quay lại Sản phẩm' : 'Quản lý Danh mục'}
            </button>
            <button onClick={() => { if (isAddingProduct) handleCancelProductEdit(); else setIsAddingProduct(true); }} className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31]">
                {isAddingProduct ? 'Hủy bỏ' : 'Thêm Sản phẩm Mới'}
            </button>
        </div>

        {isAddingProduct ? (
            <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-[#D4AF37]">
                <h3 className="text-xl font-bold text-gray-800 mb-6">{editingProduct ? 'Sửa sản phẩm' : 'Đưa sản phẩm lên kệ'}</h3>
                <form onSubmit={handleProductSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Tên sản phẩm *</label>
                            <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Ví dụ: Áo Blazer Nhung Luxury" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Danh mục</label>
                            <select value={newProductCategory} onChange={e => setNewProductCategory(e.target.value)} className="w-full border rounded px-3 py-2">
                                <option value="">Chọn danh mục</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Giá bán công khai *</label>
                            <input type="text" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="350.000₫" required />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Kích thước (Cách nhau bằng dấu phẩy)</label>
                            <input type="text" value={newProductSizes} onChange={e => setNewProductSizes(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="S, M, L, XL" />
                        </div>
                    </div>

                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-bold text-gray-700">Mô tả sản phẩm *</label>
                            <button 
                                type="button" 
                                onClick={handleGenerateDescriptionAI}
                                disabled={isGeneratingAI}
                                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-all shadow-sm ${isGeneratingAI ? 'bg-gray-100 text-gray-400' : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:scale-105 active:scale-95'}`}
                            >
                                {isGeneratingAI ? (
                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <SparklesIcon className="w-3 h-3" />
                                )}
                                {isGeneratingAI ? 'AI đang viết...' : 'Gợi ý bởi AI'}
                            </button>
                        </div>
                        <textarea 
                            rows={4} 
                            value={newProductDescription} 
                            onChange={e => setNewProductDescription(e.target.value)} 
                            className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-purple-400 transition-all ${isGeneratingAI ? 'opacity-50' : ''}`} 
                            placeholder="Nhập mô tả hoặc sử dụng Trợ lý AI ở trên..." 
                            required 
                        />
                    </div>

                    <div className="border-t pt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Ảnh sản phẩm</label>
                        <div className="flex items-center gap-4">
                            <label className="cursor-pointer bg-gray-50 border-2 border-dashed border-gray-300 hover:border-[#D4AF37] p-4 rounded-lg transition-colors flex flex-col items-center gap-2">
                                <ImagePlus className="w-6 h-6 text-gray-400" />
                                <span className="text-xs text-gray-500">Tải ảnh lên</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                            </label>
                            {newProductImage && <img src={newProductImage} className="h-20 w-20 object-cover rounded shadow-md border" />}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="submit" className="bg-[#00695C] text-white px-8 py-3 rounded-full font-bold hover:bg-[#004d40] shadow-lg">Lưu sản phẩm</button>
                    </div>
                </form>
            </div>
        ) : isManagingCategories ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Danh mục thời trang</h3>
                 <form onSubmit={handleSaveCategory} className="mb-6 flex gap-4">
                     <input type="text" placeholder="Tên danh mục" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="border rounded px-3 py-2 flex-1" required />
                     <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded font-bold">{editingCategory ? 'Cập nhật' : 'Thêm'}</button>
                 </form>
                 <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr><th className="p-3 text-left">Tên</th><th className="p-3 text-right">Thao tác</th></tr></thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id} className="border-b">
                                <td className="p-3 font-medium">{cat.name}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleEditCategory(cat)} className="text-blue-600 mr-3">Sửa</button>
                                    <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600">Xóa</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
            </div>
        ) : (
            <div className="bg-white rounded-xl shadow-md overflow-hidden border">
                <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                    <div className="relative w-64">
                        <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Tìm tên, SKU..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="pl-9 pr-4 py-2 w-full border rounded-md text-sm" />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Tổng cộng: {products.length} sản phẩm</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-white text-gray-600 uppercase text-[10px] font-bold tracking-wider">
                            <tr className="border-b">
                                <th className="px-6 py-4">Sản phẩm</th>
                                <th className="px-4 py-4">Giá bán</th>
                                <th className="px-4 py-4 text-center">In Tem</th>
                                <th className="px-4 py-4 text-center">QR Code</th>
                                <th className="px-4 py-4 text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {products
                                .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                                .map(product => (
                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={product.imageUrl} className="w-12 h-12 object-cover rounded-md shadow-sm border" />
                                            <div>
                                                <p className="font-bold text-gray-900">{product.name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">SKU: {product.sku}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-[#00695C]">{product.price}</td>
                                    <td className="px-4 py-4 text-center">
                                        <button 
                                            onClick={() => handlePrintTag(product)}
                                            className="p-2 bg-gray-100 rounded-full hover:bg-[#D4AF37] hover:text-white transition-all shadow-sm"
                                            title="In tem nhãn dán quần áo"
                                        >
                                            <PrinterIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <button onClick={() => setSelectedQrProduct(product)} className="p-2 bg-teal-50 text-[#00695C] rounded-full hover:bg-[#00695C] hover:text-white transition-all border border-teal-100">
                                            <QrCodeIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleCopyLink(product.id)} className="p-2 text-gray-400 hover:text-blue-600" title="Copy link"><CopyIcon className="w-4 h-4" /></button>
                                            <button onClick={() => handleEditProduct(product)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteProduct(product.id, product.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-md"><Trash2Icon className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {selectedQrProduct && (
            <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setSelectedQrProduct(null)}>
                <div className="bg-white rounded-2xl p-8 max-w-xs w-full text-center relative animate-fade-in" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setSelectedQrProduct(null)} className="absolute top-4 right-4 text-gray-400"><XIcon className="w-6 h-6" /></button>
                    <h4 className="font-bold text-gray-800 mb-4">{selectedQrProduct.name}</h4>
                    <div className="p-4 bg-white border-2 border-[#D4AF37] rounded-xl inline-block shadow-inner mb-6">
                        <QRCodeSVG value={`${window.location.origin}/?product=${selectedQrProduct.id}`} size={180} />
                    </div>
                    <p className="text-[10px] text-gray-400 mb-6 break-all">Link: {window.location.origin}/?product={selectedQrProduct.id}</p>
                    <button onClick={() => handlePrintTag(selectedQrProduct)} className="w-full bg-[#00695C] text-white py-2.5 rounded-lg font-bold flex items-center justify-center gap-2">
                        <PrinterIcon className="w-4 h-4" /> In Tem Nhãn
                    </button>
                </div>
            </div>
        )}

        {productFeedback && (
             <div className={`fixed bottom-6 right-6 z-[70] px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce border ${productFeedback.includes('❌') ? 'bg-red-500 text-white border-red-600' : 'bg-[#00695C] text-white border-teal-700'}`}>
                 {productFeedback}
             </div>
        )}
    </div>
  );
};

export default ProductTab;