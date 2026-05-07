import { create } from "zustand";

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface CompanySettings {
  name: string;
  tagline: string;
  addressLine1: string;
  addressLine2: string;
  phone: string;
  fax: string;
  logoUrl?: string;
}

export interface InvoiceSettings {
  remarks: string;
  managerName: string;
  managerTitle: string;
}

interface SettingsStore {
  company: CompanySettings;
  banks: BankAccount[];
  invoice: InvoiceSettings;
  updateCompany: (c: Partial<CompanySettings>) => void;
  updateInvoiceSettings: (i: Partial<InvoiceSettings>) => void;
  addBank: (b: Omit<BankAccount, "id">) => void;
  updateBank: (id: string, b: Partial<BankAccount>) => void;
  deleteBank: (id: string) => void;
}

const defaultCompany: CompanySettings = {
  name: "PT. VICTORY BERSATU JAYA ",
  tagline: "EXCELLENT SPIRIT IN BUSINESS",
  addressLine1: "Pusat Penjualan & Penyewaan Peralatan Scaffolding",
  addressLine2: "Batam - Indonesia",
  phone: "(0778) 416 1218, 0852 7437 1115 / 0813 7271 6698",
  fax: "victorybersatujaya@gmail.com",
  logoUrl: "/logo.png",
};


const defaultBanks: BankAccount[] = [
  {
    id: "bank-1",
    bankName: "Bank Panin",
    accountNumber: "5545000241",
    accountName: "CV. Victory Globalindo Jaya",
  },
];

const defaultInvoiceSettings: InvoiceSettings = {
  remarks: "Interest will be charged at (5%) five percent per month for overdue accounts. Goods sold are non-returnable claims for errors must be within two days after delivery.\nOnly make payment when the original invoice is presented.",
  managerName: "",
  managerTitle: "Marketing Manager",
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  company: defaultCompany,
  banks: defaultBanks,
  invoice: defaultInvoiceSettings,

  updateCompany: (updates) =>
    set((state) => ({ company: { ...state.company, ...updates } })),

  updateInvoiceSettings: (updates) =>
    set((state) => ({ invoice: { ...state.invoice, ...updates } })),

  addBank: (bank) =>
    set((state) => ({ banks: [...state.banks, { ...bank, id: `bank-${Date.now()}` }] })),

  updateBank: (id, updates) =>
    set((state) => ({
      banks: state.banks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  deleteBank: (id) =>
    set((state) => ({ banks: state.banks.filter((b) => b.id !== id) })),
}));
