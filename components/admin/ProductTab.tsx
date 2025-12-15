
import React, { useState, useEffect } from 'react';
import type { Product, Category } from '../../types';
import { getProducts, addProduct, deleteProduct, updateProduct } from '../../utils/productStorage';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../../utils/categoryStorage';
import { 
    SearchIcon, EditIcon, Trash2Icon, ImagePlus, LightningIcon 
} from '../Icons';

const ProductTab: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  
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
  }, []);

  const refreshData = () => {
      setProducts(getProducts());
      setCategories(getCategories());
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProductImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toLocalISOString = (date: Date) => {
      const tzOffset = date.getTimezoneOffset() * 60000;
      return (new Date(date.getTime() - tzOffset)).toISOString().slice(0, 16);
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
      
      setNewProductFlashSaleStartTime(product.flashSaleStartTime ? toLocalISOString(new Date(product.flashSaleStartTime)) : '');
      setNewProductFlashSaleEndTime(product.flashSaleEndTime ? toLocalISOString(new Date(product.flashSaleEndTime)) : '');

      setIsAddingProduct(true);
  };

  const resetProductForm = () => {
      setNewProductName(''); setNewProductPrice(''); setNewProductImportPrice(''); setNewProductSku('');
      setNewProductCategory(''); setNewProductBrand(''); setNewProductStatus('active'); setNewProductDescription('');
      setNewProductImage(null); setNewProductIsFlashSale(false); setNewProductSalePrice('');
      setNewProductFlashSaleStartTime(''); setNewProductFlashSaleEndTime(''); setNewProductSizes(''); setNewProductColors('');
  };

  const handleCancelProductEdit = () => { setIsAddingProduct(false); setEditingProduct(null); resetProductForm(); };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName || !newProductPrice || !newProductDescription || !newProductImage) {
      setProductFeedback('Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }
    const commonData = {
      name: newProductName, price: newProductPrice, importPrice: newProductImportPrice || '0₫', description: newProductDescription,
      imageUrl: newProductImage, sku: newProductSku || `GEN-${Date.now()}`, brand: newProductBrand || 'Sigma Vie',
      category: newProductCategory || (categories.length > 0 ? categories[0].name : 'Chung'), status: newProductStatus,
      isFlashSale: newProductIsFlashSale, salePrice: newProductSalePrice,
      flashSaleStartTime: newProductFlashSaleStartTime ? new Date(newProductFlashSaleStartTime).getTime() : undefined,
      flashSaleEndTime: newProductFlashSaleEndTime ? new Date(newProductFlashSaleEndTime).getTime() : undefined,
      sizes: newProductSizes ? newProductSizes.split(',').map(s => s.trim()).filter(s => s) : [],
      colors: newProductColors ? newProductColors.split(',').map(s => s.trim()).filter(s => s) : []
    };

    if (editingProduct) {
        updateProduct({ ...editingProduct, ...commonData, stock: editingProduct.stock });
        setProductFeedback('Cập nhật sản phẩm thành công!');
    } else {
        addProduct({ ...commonData, stock: 0 });
        setProductFeedback('Thêm sản phẩm thành công!');
    }
    refreshData(); handleCancelProductEdit();
    setTimeout(() => setProductFeedback(''), 3000);
  };
  
  const handleDeleteProduct = (productId: number, productName: string) => {
    if (window.confirm(`Xóa sản phẩm "${productName}"?`)) {
      deleteProduct(productId);
      setProducts(currentProducts => currentProducts.filter(p => p.id !== productId));
      if (editingProduct?.id === productId) handleCancelProductEdit();
      setProductFeedback(`Đã xóa sản phẩm.`);
      setTimeout(() => setProductFeedback(''), 3000);
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName) {
        if (editingCategory) updateCategory({ id: editingCategory.id, name: newCategoryName, description: newCategoryDesc });
        else addCategory({ name: newCategoryName, description: newCategoryDesc });
        setNewCategoryName(''); setNewCategoryDesc(''); setEditingCategory(null); refreshData();
    }
  };
  const handleEditCategory = (c: Category) => { setEditingCategory(c); setNewCategoryName(c.name); setNewCategoryDesc(c.description || ''); };
  const handleDeleteCategory = (id: string) => { if(confirm('Xóa danh mục?')) { deleteCategory(id); refreshData(); }};
  const handleCancelEdit = () => { setEditingCategory(null); setNewCategoryName(''); setNewCategoryDesc(''); };

  return (
    <div className="space-y-6 animate-fade-in-up">
        {/* Toggle Category Manager */}
        <div className="flex justify-end">
             <button 
                onClick={() => setIsManagingCategories(!isManagingCategories)}
                className="text-[#00695C] border border-[#00695C] px-4 py-2 rounded hover:bg-teal-50"
            >
                {isManagingCategories ? 'Quay lại Quản lý Sản phẩm' : 'Quản lý Danh mục'}
            </button>
        </div>

        {isManagingCategories ? (
            <div className="bg-white p-6 rounded-lg shadow-md">
                 <h3 className="text-lg font-bold text-gray-800 mb-4">Quản lý Danh mục</h3>
                 <form onSubmit={handleSaveCategory} className="mb-6 flex gap-4">
                     <input 
                        type="text" 
                        placeholder="Tên danh mục" 
                        value={newCategoryName} 
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="border rounded px-3 py-2 flex-1"
                        required
                     />
                     <input 
                        type="text" 
                        placeholder="Mô tả" 
                        value={newCategoryDesc} 
                        onChange={(e) => setNewCategoryDesc(e.target.value)}
                        className="border rounded px-3 py-2 flex-1"
                     />
                     <button type="submit" className="bg-[#D4AF37] text-white px-4 py-2 rounded font-bold hover:bg-[#b89b31]">
                         {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                     </button>
                     {editingCategory && (
                         <button type="button" onClick={handleCancelEdit} className="bg-gray-300 text-gray-700 px-4 py-2 rounded">Hủy</button>
                     )}
                 </form>

                 <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-500">
                        <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Tên</th>
                                <th className="px-4 py-3">Mô tả</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat) => (
                                <tr key={cat.id} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-mono">{cat.id}</td>
                                    <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                                    <td className="px-4 py-3">{cat.description}</td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleEditCategory(cat)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            </div>
        ) : (
            <>
                {/* Product List & Form */}
                <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex gap-4">
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Tìm kiếm..." 
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                className="pl-9 pr-4 py-2 border rounded-md focus:ring-[#D4AF37] focus:border-[#D4AF37] w-64"
                            />
                        </div>
                        <select 
                            value={filterStatus} 
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="border rounded-md px-3 py-2"
                        >
                            <option value="all">Tất cả trạng thái</option>
                            <option value="active">Đang bán</option>
                            <option value="draft">Nháp</option>
                            <option value="archived">Lưu trữ</option>
                        </select>
                    </div>
                    <button 
                        onClick={() => { 
                            if (isAddingProduct) {
                                handleCancelProductEdit();
                            } else {
                                resetProductForm();
                                setEditingProduct(null);
                                setIsAddingProduct(true);
                            }
                        }}
                        className="bg-[#D4AF37] text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-[#b89b31]"
                    >
                        {isAddingProduct ? 'Quay lại danh sách' : 'Thêm sản phẩm'}
                    </button>
                </div>

                {isAddingProduct ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold text-gray-800 mb-6">{editingProduct ? 'Chỉnh sửa Sản phẩm' : 'Thêm Sản phẩm Mới'}</h3>
                        <form onSubmit={handleProductSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
                                    <input type="text" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                                    <input type="text" value={newProductSku} onChange={(e) => setNewProductSku(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Tự động tạo nếu để trống" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán *</label>
                                    <input type="text" value={newProductPrice} onChange={(e) => setNewProductPrice(e.target.value)} className="w-full border rounded px-3 py-2" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Giá nhập (Vốn)</label>
                                    <input type="text" value={newProductImportPrice} onChange={(e) => setNewProductImportPrice(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                                    <select value={newProductCategory} onChange={(e) => setNewProductCategory(e.target.value)} className="w-full border rounded px-3 py-2">
                                        <option value="">-- Chọn danh mục --</option>
                                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
                                    <input type="text" value={newProductBrand} onChange={(e) => setNewProductBrand(e.target.value)} className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước (Size)</label>
                                        <input 
                                            type="text" 
                                            value={newProductSizes} 
                                            onChange={(e) => setNewProductSizes(e.target.value)} 
                                            className="w-full border rounded px-3 py-2" 
                                            placeholder="S, M, L (cách nhau bởi dấu phẩy)" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Màu sắc (Color)</label>
                                        <input 
                                            type="text" 
                                            value={newProductColors} 
                                            onChange={(e) => setNewProductColors(e.target.value)} 
                                            className="w-full border rounded px-3 py-2" 
                                            placeholder="Đen, Trắng, Đỏ (cách nhau bởi dấu phẩy)" 
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                                    <select value={newProductStatus} onChange={(e) => setNewProductStatus(e.target.value as any)} className="w-full border rounded px-3 py-2">
                                        <option value="active">Đang bán</option>
                                        <option value="draft">Nháp</option>
                                        <option value="archived">Lưu trữ</option>
                                    </select>
                                </div>
                            </div>
                            
                            {/* FLASH SALE SETTINGS */}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={newProductIsFlashSale} 
                                        onChange={(e) => setNewProductIsFlashSale(e.target.checked)} 
                                        className="w-4 h-4 text-red-600 rounded"
                                    />
                                    <span className="font-bold text-red-700 flex items-center gap-1"><LightningIcon className="w-4 h-4"/> Bật Flash Sale</span>
                                </label>
                                {newProductIsFlashSale && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Giá khuyến mãi *</label>
                                            <input type="text" value={newProductSalePrice} onChange={(e) => setNewProductSalePrice(e.target.value)} className="w-full border rounded px-3 py-2 border-red-300" placeholder="VD: 1,500,000đ" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
                                            <input type="datetime-local" value={newProductFlashSaleStartTime} onChange={(e) => setNewProductFlashSaleStartTime(e.target.value)} className="w-full border rounded px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
                                            <input type="datetime-local" value={newProductFlashSaleEndTime} onChange={(e) => setNewProductFlashSaleEndTime(e.target.value)} className="w-full border rounded px-3 py-2" />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                                <textarea rows={4} value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} className="w-full border rounded px-3 py-2" required />
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh sản phẩm *</label>
                                <div className="flex items-center gap-4">
                                    <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded inline-flex items-center">
                                        <ImagePlus className="w-4 h-4 mr-2" />
                                        <span>Chọn ảnh</span>
                                        <input id="image-upload" type="file" className="hidden" accept="image/*" onChange={handleProductImageUpload} />
                                    </label>
                                    {newProductImage && (
                                        <img src={newProductImage} alt="Preview" className="h-16 w-16 object-cover rounded border" />
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={handleCancelProductEdit} className="bg-gray-200 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-300">Hủy</button>
                                <button type="submit" className="bg-[#D4AF37] text-white px-6 py-2 rounded font-bold hover:bg-[#b89b31]">{editingProduct ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <table className="min-w-full text-sm text-left text-gray-500">
                            <thead className="bg-gray-100 text-gray-700 uppercase font-medium">
                                <tr>
                                    <th className="px-4 py-3">Sản phẩm</th>
                                    <th className="px-4 py-3">Giá</th>
                                    <th className="px-4 py-3">Tồn kho</th>
                                    <th className="px-4 py-3">Danh mục</th>
                                    <th className="px-4 py-3">Trạng thái</th>
                                    <th className="px-4 py-3 text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {products
                                    .filter(p => 
                                        (filterStatus === 'all' || p.status === filterStatus) &&
                                        (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                                    )
                                    .map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                                <div>
                                                    <p className="font-medium text-gray-900">{product.name}</p>
                                                    <p className="text-xs text-gray-500">{product.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.isFlashSale ? (
                                                <div>
                                                    <span className="text-red-600 font-bold block">{product.salePrice}</span>
                                                    <span className="text-xs text-gray-400 line-through">{product.price}</span>
                                                </div>
                                            ) : (
                                                product.price
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {product.sizes?.length || product.colors?.length ? (
                                                <div className="text-xs">
                                                    <span className="font-bold text-[#00695C]">Tổng: {product.stock}</span>
                                                    <div className="text-gray-500 mt-1">
                                                        {product.sizes?.length > 0 && <span>{product.sizes.length} Size</span>}
                                                        {product.sizes?.length > 0 && product.colors?.length > 0 && <span>, </span>}
                                                        {product.colors?.length > 0 && <span>{product.colors.length} Màu</span>}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${product.stock < 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                    {product.stock}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{product.category}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                                ${product.status === 'active' ? 'bg-green-100 text-green-700' : 
                                                  product.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                                                {product.status === 'active' ? 'Đang bán' : product.status === 'draft' ? 'Nháp' : 'Lưu trữ'}
                                            </span>
                                            {product.isFlashSale && <span className="ml-1 text-xs text-red-500 font-bold">⚡</span>}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button onClick={() => handleEditProduct(product)} className="text-blue-600 hover:text-blue-800 mr-2"><EditIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDeleteProduct(product.id, product.name)} className="text-red-600 hover:text-red-800"><Trash2Icon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </>
        )}
        {productFeedback && (
             <div className={`mt-4 p-3 rounded text-center font-medium animate-pulse ${productFeedback.includes('Lỗi') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                 {productFeedback}
             </div>
        )}
    </div>
  );
};

export default ProductTab;
