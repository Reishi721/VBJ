import { create } from "zustand";
import type { InventoryCategory, InventoryItem } from "../types";

interface InventoryStore {
  categories: InventoryCategory[];
  items: InventoryItem[];
  // Category actions
  addCategory: (c: Omit<InventoryCategory, "id" | "createdAt">) => void;
  updateCategory: (id: string, c: Partial<InventoryCategory>) => void;
  deleteCategory: (id: string) => void;
  // Item actions
  addItem: (i: Omit<InventoryItem, "id" | "createdAt" | "categoryName">) => void;
  updateItem: (id: string, i: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
}

const initialCategories: InventoryCategory[] = [
  { id: "cat-001", name: "Scaffolding Frame", description: "Rangka/frame scaffolding berbagai ukuran", color: "bg-blue-500", createdAt: "2025-01-01" },
  { id: "cat-002", name: "Cross Brace", description: "Pengunci silang scaffolding", color: "bg-violet-500", createdAt: "2025-01-01" },
  { id: "cat-003", name: "Papan Scaffold", description: "Papan kayu/besi untuk lantai scaffolding", color: "bg-amber-500", createdAt: "2025-01-01" },
  { id: "cat-004", name: "Jack Base & U-Head", description: "Kaki dan kepala ulir scaffolding", color: "bg-emerald-500", createdAt: "2025-01-01" },
  { id: "cat-005", name: "Aksesoris", description: "Coupling, pin, dan kelengkapan lainnya", color: "bg-rose-500", createdAt: "2025-01-01" },
];

const initialItems: InventoryItem[] = [
  { id: "inv-001", categoryId: "cat-001", categoryName: "Scaffolding Frame", name: "Frame 170cm", code: "SF-170", unit: "pcs", stock: 250, minStock: 50, condition: "good", location: "Gudang A - Rak 1", createdAt: "2025-01-10" },
  { id: "inv-002", categoryId: "cat-001", categoryName: "Scaffolding Frame", name: "Frame 190cm", code: "SF-190", unit: "pcs", stock: 180, minStock: 50, condition: "good", location: "Gudang A - Rak 2", createdAt: "2025-01-10" },
  { id: "inv-003", categoryId: "cat-001", categoryName: "Scaffolding Frame", name: "Frame 120cm", code: "SF-120", unit: "pcs", stock: 30, minStock: 40, condition: "good", location: "Gudang A - Rak 3", description: "Stok mendekati minimum", createdAt: "2025-01-10" },
  { id: "inv-004", categoryId: "cat-002", categoryName: "Cross Brace", name: "Cross Brace 183cm", code: "CB-183", unit: "pcs", stock: 400, minStock: 100, condition: "good", location: "Gudang A - Rak 4", createdAt: "2025-01-15" },
  { id: "inv-005", categoryId: "cat-002", categoryName: "Cross Brace", name: "Cross Brace 210cm", code: "CB-210", unit: "pcs", stock: 15, minStock: 50, condition: "good", location: "Gudang A - Rak 5", description: "Stok kritis!", createdAt: "2025-01-15" },
  { id: "inv-006", categoryId: "cat-003", categoryName: "Papan Scaffold", name: "Papan Kayu 230cm", code: "PK-230", unit: "lembar", stock: 120, minStock: 30, condition: "good", location: "Gudang B - Rak 1", createdAt: "2025-02-01" },
  { id: "inv-007", categoryId: "cat-003", categoryName: "Papan Scaffold", name: "Papan Besi 200cm", code: "PB-200", unit: "lembar", stock: 85, minStock: 20, condition: "good", location: "Gudang B - Rak 2", createdAt: "2025-02-01" },
  { id: "inv-008", categoryId: "cat-004", categoryName: "Jack Base & U-Head", name: "Jack Base 60cm", code: "JB-60", unit: "pcs", stock: 200, minStock: 50, condition: "good", location: "Gudang A - Rak 6", createdAt: "2025-02-10" },
  { id: "inv-009", categoryId: "cat-004", categoryName: "Jack Base & U-Head", name: "U-Head 60cm", code: "UH-60", unit: "pcs", stock: 190, minStock: 50, condition: "good", location: "Gudang A - Rak 7", createdAt: "2025-02-10" },
  { id: "inv-010", categoryId: "cat-004", categoryName: "Jack Base & U-Head", name: "Jack Base 40cm (Rusak)", code: "JB-40-D", unit: "pcs", stock: 12, minStock: 0, condition: "damaged", location: "Gudang C - Perbaikan", description: "Menunggu perbaikan", createdAt: "2025-03-01" },
  { id: "inv-011", categoryId: "cat-005", categoryName: "Aksesoris", name: "Swivel Coupler", code: "SC-001", unit: "pcs", stock: 500, minStock: 100, condition: "good", location: "Gudang A - Rak 8", createdAt: "2025-03-05" },
  { id: "inv-012", categoryId: "cat-005", categoryName: "Aksesoris", name: "Right Angle Coupler", code: "RAC-001", unit: "pcs", stock: 450, minStock: 100, condition: "good", location: "Gudang A - Rak 9", createdAt: "2025-03-05" },
];

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  categories: initialCategories,
  items: initialItems,

  addCategory: (c) =>
    set((state) => ({
      categories: [
        ...state.categories,
        { ...c, id: `cat-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] },
      ],
    })),

  updateCategory: (id, updates) =>
    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      // Sync categoryName in items
      items: state.items.map((i) =>
        i.categoryId === id && updates.name ? { ...i, categoryName: updates.name } : i
      ),
    })),

  deleteCategory: (id) =>
    set((state) => ({
      categories: state.categories.filter((c) => c.id !== id),
    })),

  addItem: (i) => {
    const cat = get().categories.find((c) => c.id === i.categoryId);
    set((state) => ({
      items: [
        ...state.items,
        {
          ...i,
          id: `inv-${Date.now()}`,
          categoryName: cat?.name ?? "",
          createdAt: new Date().toISOString().split("T")[0],
        },
      ],
    }));
  },

  updateItem: (id, updates) => {
    const cat = updates.categoryId ? get().categories.find((c) => c.id === updates.categoryId) : undefined;
    set((state) => ({
      items: state.items.map((i) =>
        i.id === id
          ? { ...i, ...updates, ...(cat ? { categoryName: cat.name } : {}) }
          : i
      ),
    }));
  },

  deleteItem: (id) =>
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
    })),
}));
