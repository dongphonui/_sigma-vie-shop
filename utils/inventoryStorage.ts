
import type { InventoryTransaction } from '../types';
import { fetchTransactionsFromDB, syncTransactionToDB } from './apiClient';

const STORAGE_KEY = 'sigma_vie_transactions';
let hasLoadedFromDB = false;

export const getTransactions = (): InventoryTransaction[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let localData = stored ? JSON.parse(stored) : [];

    if (!hasLoadedFromDB) {
        fetchTransactionsFromDB().then(dbTrans => {
            if (dbTrans && dbTrans.length > 0) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dbTrans));
                hasLoadedFromDB = true;
            }
        });
        hasLoadedFromDB = true;
    }

    return localData;
  } catch (error) {
    console.error("Failed to parse transactions", error);
    return [];
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
