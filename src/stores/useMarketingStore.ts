import { create } from "zustand";
import type { Marketing } from "../types";

interface MarketingStore {
  marketings: Marketing[];
  addMarketing: (m: Omit<Marketing, "id" | "createdAt">) => void;
  updateMarketing: (id: string, m: Partial<Marketing>) => void;
  deleteMarketing: (id: string) => void;
}

const initialMarketings: Marketing[] = [
  { id: "mkt-001", name: "Andi Pratama", phone: "081234567890", email: "andi@scaffoldpro.com", position: "Senior Marketing", status: "active", createdAt: "2025-01-15" },
  { id: "mkt-002", name: "Siti Nurhaliza", phone: "081298765432", email: "siti@scaffoldpro.com", position: "Marketing Executive", status: "active", createdAt: "2025-03-20" },
  { id: "mkt-003", name: "Budi Santoso", phone: "081355667788", email: "budi@scaffoldpro.com", position: "Junior Marketing", status: "active", createdAt: "2025-06-10" },
  { id: "mkt-004", name: "Dewi Lestari", phone: "081477889900", email: "dewi@scaffoldpro.com", position: "Marketing Manager", status: "active", createdAt: "2024-08-05" },
  { id: "mkt-005", name: "Rudi Hermawan", phone: "081599001122", email: "rudi@scaffoldpro.com", position: "Marketing Executive", status: "inactive", createdAt: "2024-11-22" },
];

export const useMarketingStore = create<MarketingStore>((set) => ({
  marketings: initialMarketings,
  addMarketing: (m) =>
    set((state) => ({
      marketings: [
        ...state.marketings,
        { ...m, id: `mkt-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0] },
      ],
    })),
  updateMarketing: (id, updates) =>
    set((state) => ({
      marketings: state.marketings.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  deleteMarketing: (id) =>
    set((state) => ({
      marketings: state.marketings.filter((m) => m.id !== id),
    })),
}));
