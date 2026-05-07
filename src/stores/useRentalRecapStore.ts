import { create } from "zustand";
import type { RentalRecap, RentalRecapColumn } from "../types";

interface RentalRecapStore {
  recaps: RentalRecap[];
  addRecap: (r: Omit<RentalRecap, "id" | "createdAt">) => string;
  updateRecap: (id: string, r: Partial<RentalRecap>) => void;
  deleteRecap: (id: string) => void;
  addColumn: (recapId: string, col: Omit<RentalRecapColumn, "id" | "order">) => void;
  removeColumn: (recapId: string, colId: string) => void;
  reorderColumns: (recapId: string, columns: RentalRecapColumn[]) => void;
}

export const useRentalRecapStore = create<RentalRecapStore>((set, get) => ({
  recaps: [],

  addRecap: (r) => {
    const id = `recap-${Date.now()}`;
    set((state) => ({
      recaps: [
        { ...r, id, createdAt: new Date().toISOString().split("T")[0] },
        ...state.recaps,
      ],
    }));
    return id;
  },

  updateRecap: (id, updates) =>
    set((state) => ({
      recaps: state.recaps.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),

  deleteRecap: (id) =>
    set((state) => ({ recaps: state.recaps.filter((r) => r.id !== id) })),

  addColumn: (recapId, col) =>
    set((state) => ({
      recaps: state.recaps.map((r) => {
        if (r.id !== recapId) return r;
        const maxOrder = r.columns.length > 0 ? Math.max(...r.columns.map((c) => c.order)) : -1;
        return {
          ...r,
          columns: [
            ...r.columns,
            { ...col, id: `col-${Date.now()}`, order: maxOrder + 1 },
          ],
        };
      }),
    })),

  removeColumn: (recapId, colId) =>
    set((state) => ({
      recaps: state.recaps.map((r) =>
        r.id === recapId
          ? { ...r, columns: r.columns.filter((c) => c.id !== colId) }
          : r
      ),
    })),

  reorderColumns: (recapId, columns) =>
    set((state) => ({
      recaps: state.recaps.map((r) =>
        r.id === recapId ? { ...r, columns } : r
      ),
    })),
}));
