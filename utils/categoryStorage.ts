
import type { Category } from '../types';
import { fetchCategoriesFromDB, syncCategoryToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Váy & Đầm', description: 'Thời trang váy đầm dự tiệc và dạo phố' },
  { id: 'cat_2', name: 'Áo Sơ Mi', description: 'Áo sơ mi công sở, lụa satin' },
  { id: 'cat_3', name: 'Quần & Chân Váy', description: 'Quần tây, chân váy bút chì' },
  { id: 'cat_4', name: 'Áo Khoác', description: 'Blazer, Trench Coat, Jacket' },
  { id: 'cat_5', name: 'Phụ Kiện', description: 'Túi xách, trang sức cao cấp' },
];

let hasLoadedFromDB = false;

export const getCategories = (): Category[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData: Category[] = [];

    if (stored) {
      try {
        localData = JSON.parse(stored);
      } catch (e) {
        localData = DEFAULT_CATEGORIES;
      }
    } else {
      localData = DEFAULT_CATEGORIES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        fetchCategoriesFromDB().then(dbCategories => {
            if (dbCategories && dbCategories.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCategories));
                window.dispatchEvent(new Event('sigma_vie_categories_update'));
            }
        }).catch(() => {
            console.warn("Dùng danh mục mặc định (Offline)");
        });
    }

    return localData.length > 0 ? localData : DEFAULT_CATEGORIES;
  } catch (error) {
    return DEFAULT_CATEGORIES;
  }
};

export const addCategory = (category: Omit<Category, 'id'>): Category => {
  const categories = getCategories();
  const newCategory: Category = {
    ...category,
    id: `cat_${Date.now()}`,
  };
  const updated = [...categories, newCategory];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('sigma_vie_categories_update'));
  syncCategoryToDB(newCategory);
  return newCategory;
};

export const updateCategory = (updatedCategory: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index !== -1) {
    categories[index] = updatedCategory;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    window.dispatchEvent(new Event('sigma_vie_categories_update'));
    syncCategoryToDB(updatedCategory);
  }
};

export const deleteCategory = (id: string): void => {
  const categories = getCategories();
  const updated = categories.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('sigma_vie_categories_update'));
};
