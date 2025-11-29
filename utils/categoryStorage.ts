
import type { Category } from '../types';
import { fetchCategoriesFromDB, syncCategoryToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_categories';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', name: 'Áo khoác', description: 'Các loại áo khoác, blazer, trench coat' },
  { id: 'cat_2', name: 'Áo sơ mi', description: 'Áo sơ mi, áo kiểu, blouse' },
  { id: 'cat_3', name: 'Quần', description: 'Quần tây, quần jean, quần short' },
  { id: 'cat_4', name: 'Áo len', description: 'Áo len, cardigan' },
  { id: 'cat_5', name: 'Giày dép', description: 'Giày cao gót, bốt, sandal' },
  { id: 'cat_6', name: 'Phụ kiện', description: 'Túi xách, trang sức, khăn choàng' },
  { id: 'cat_7', name: 'Váy', description: 'Váy liền, chân váy' },
];

let hasLoadedFromDB = false;

export const getCategories = (): Category[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = [];

    if (stored) {
      localData = JSON.parse(stored);
    } else {
      localData = DEFAULT_CATEGORIES;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CATEGORIES));
    }

    if (!hasLoadedFromDB) {
        fetchCategoriesFromDB().then(dbCategories => {
            if (dbCategories && dbCategories.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbCategories));
                hasLoadedFromDB = true;
            }
        });
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    console.error("Failed to parse categories", error);
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
  
  syncCategoryToDB(newCategory);

  return newCategory;
};

export const updateCategory = (updatedCategory: Category): void => {
  const categories = getCategories();
  const index = categories.findIndex(c => c.id === updatedCategory.id);
  if (index !== -1) {
    categories[index] = updatedCategory;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    
    syncCategoryToDB(updatedCategory);
  }
};

export const deleteCategory = (id: string): void => {
  const categories = getCategories();
  const updated = categories.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  // Note: Delete API not implemented in demo scope, data remains in DB
};
