
import type { InventoryTransaction } from '../types';
import { fetchTransactionsFromDB, syncTransactionToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_transactions';
let hasLoadedFromDB = false;

export const getTransactions = (): InventoryTransaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData: InventoryTransaction[] = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        hasLoadedFromDB = true;
        fetchTransactionsFromDB().then(dbTrans => {
            if (dbTrans && Array.isArray(dbTrans)) {
                // --- LOGIC HỢP NHẤT (SMART MERGE) ---
                const serverIdSet = new Set(dbTrans.map((t: any) => String(t.id)));
                
                const unsavedLocalTrans = localData.filter(t => !serverIdSet.has(String(t.id)));
                
                if (unsavedLocalTrans.length > 0) {
                    console.log(`Đang đồng bộ ${unsavedLocalTrans.length} giao dịch kho...`);
                    unsavedLocalTrans.forEach(t => syncTransactionToDB(t));
                }

                const mergedTrans = [...dbTrans, ...unsavedLocalTrans];
                mergedTrans.sort((a, b) => b.timestamp - a.timestamp);

                localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedTrans));
            }
        }).catch(err => console.error("Lỗi tải Inventory:", err));
    }

    return localData;
  } catch (error) {
    console.error("Failed to parse transactions", error);
    return [];
  }
};

// Hàm đồng bộ thủ công
export const syncAllTransactionsToServer = async (): Promise<boolean> => {
    try {
        const trans = getTransactions();
        const promises = trans.map(t => syncTransactionToDB(t));
        await Promise.all(promises);
        return true;
    } catch (e) {
        return false;
    }
};

export const addTransaction = (transaction: Omit<InventoryTransaction, 'id' | 'timestamp'>): void => {
  const transactions = getTransactions();
  const newTransaction: InventoryTransaction = {
    ...transaction,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
  };
  
  const updated = [newTransaction, ...transactions];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  
  // Sync to DB
  syncTransactionToDB(newTransaction);
};
