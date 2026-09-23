// src/services/api.ts

import { BillData } from '../types/pharmacy';

/**
 * Pharmacy API Service for communicating with backend store & database
 */
export const api = {
  /**
   * Save a completed bill to database
   * @param billData The bill data object
   * @param storeId The tenant store ID
   */
  createBill: async (billData: BillData, storeId: string = 'STORE-APEX01'): Promise<{ success: boolean; transaction: any }> => {
    const res = await fetch(`/api/store/${encodeURIComponent(storeId)}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(billData)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.error || errorData?.message || res.statusText || 'Database bill creation failed';
      throw new Error(message);
    }

    return res.json();
  },
  /**
   * Delete medicine record from backend database
   * @param medicineId The ID of the medicine to delete
   * @param storeId The tenant store ID
   */
  deleteMedicine: async (medicineId: string, storeId: string = 'STORE-APEX01'): Promise<{ success: boolean; deletedId: string }> => {
    const res = await fetch(`/api/store/${encodeURIComponent(storeId)}/inventory/${encodeURIComponent(medicineId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.error || errorData?.message || res.statusText || 'Database deletion failed';
      throw new Error(message);
    }

    const data = await res.json();
    return data;
  },

  /**
   * Fetch inventory items from database
   */
  getMedicines: async (storeId: string = 'STORE-APEX01') => {
    const res = await fetch(`/api/store/${encodeURIComponent(storeId)}/inventory`);
    if (!res.ok) {
      throw new Error(`Failed to load inventory from database: ${res.statusText}`);
    }
    return res.json();
  },

  /**
   * Update medicine in database
   */
  updateMedicine: async (medicineId: string, updates: any, storeId: string = 'STORE-APEX01') => {
    const res = await fetch(`/api/store/${encodeURIComponent(storeId)}/inventory/${encodeURIComponent(medicineId)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.error || errorData?.message || res.statusText || 'Database update failed';
      throw new Error(message);
    }

    return res.json();
  },

  /**
   * Create or add medicine to database
   */
  createMedicine: async (item: any, storeId: string = 'STORE-APEX01') => {
    const res = await fetch(`/api/store/${encodeURIComponent(storeId)}/inventory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(item)
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);
      const message = errorData?.error || errorData?.message || res.statusText || 'Database insert failed';
      throw new Error(message);
    }

    return res.json();
  }
};
