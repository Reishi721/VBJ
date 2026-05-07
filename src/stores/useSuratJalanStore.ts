import { create } from "zustand";
import type { SuratJalan } from "../types";

interface SuratJalanStore {
  suratJalans: SuratJalan[];
  nextNumber: number;
  generateNumber: () => string;
  addSuratJalan: (s: Omit<SuratJalan, "id" | "number" | "createdAt">) => void;
  updateSuratJalan: (id: string, s: Partial<SuratJalan>) => void;
  updateStatus: (id: string, status: SuratJalan["status"]) => void;
  deleteSuratJalan: (id: string) => void;
}

const initialData: SuratJalan[] = [
  {
    id: "sj-001",
    number: "SJ-2026-001",
    type: "pengiriman",
    date: "2026-04-10",
    customerId: "cust-001",
    customerName: "PT Pembangunan Jaya",
    projectId: "prj-001",
    projectName: "Proyek Mall Sudirman",
    recipientName: "Budi Santoso",
    recipientPhone: "081234567890",
    deliveryAddress: "Jl. Sudirman No. 45, Jakarta Selatan",
    driverName: "Agus Salim",
    vehiclePlate: "B 1234 ABC",
    status: "delivered",
    notes: "Dikirim pagi hari, kondisi barang baik",
    createdAt: "2026-04-10",
    items: [
      { inventoryId: "inv-001", inventoryCode: "SF-170", inventoryName: "Frame 170cm", unit: "pcs", qty: 50 },
      { inventoryId: "inv-004", inventoryCode: "CB-183", inventoryName: "Cross Brace 183cm", unit: "pcs", qty: 100 },
      { inventoryId: "inv-008", inventoryCode: "JB-60", inventoryName: "Jack Base 60cm", unit: "pcs", qty: 50 },
      { inventoryId: "inv-011", inventoryCode: "SC-001", inventoryName: "Swivel Coupler", unit: "pcs", qty: 200 },
    ],
  },
  {
    id: "sj-002",
    number: "SJ-2026-002",
    type: "pengiriman",
    date: "2026-04-15",
    customerId: "cust-002",
    customerName: "CV Makmur Abadi",
    projectId: "prj-003",
    projectName: "Gedung Perkantoran BSD",
    recipientName: "Rudi Hartono",
    recipientPhone: "081298765432",
    deliveryAddress: "BSD City, Tangerang",
    driverName: "Rony Susanto",
    vehiclePlate: "B 5678 DEF",
    status: "sent",
    createdAt: "2026-04-15",
    items: [
      { inventoryId: "inv-002", inventoryCode: "SF-190", inventoryName: "Frame 190cm", unit: "pcs", qty: 80 },
      { inventoryId: "inv-006", inventoryCode: "PK-230", inventoryName: "Papan Kayu 230cm", unit: "lembar", qty: 40 },
      { inventoryId: "inv-009", inventoryCode: "UH-60", inventoryName: "U-Head 60cm", unit: "pcs", qty: 80 },
    ],
  },
  {
    id: "sj-003",
    number: "SJ-2026-003",
    type: "pengembalian",
    date: "2026-04-20",
    customerId: "cust-004",
    customerName: "PT Konstruksi Utama",
    projectId: "prj-005",
    projectName: "Jembatan Tol Cikampek",
    recipientName: "Hendra Wijaya",
    deliveryAddress: "Cikampek, Jawa Barat",
    driverName: "Wahyu Pratama",
    vehiclePlate: "B 9999 GHI",
    status: "draft",
    notes: "Menunggu konfirmasi jam pengiriman",
    createdAt: "2026-04-20",
    items: [
      { inventoryId: "inv-001", inventoryCode: "SF-170", inventoryName: "Frame 170cm", unit: "pcs", qty: 120 },
      { inventoryId: "inv-004", inventoryCode: "CB-183", inventoryName: "Cross Brace 183cm", unit: "pcs", qty: 240 },
      { inventoryId: "inv-008", inventoryCode: "JB-60", inventoryName: "Jack Base 60cm", unit: "pcs", qty: 120 },
      { inventoryId: "inv-009", inventoryCode: "UH-60", inventoryName: "U-Head 60cm", unit: "pcs", qty: 120 },
      { inventoryId: "inv-012", inventoryCode: "RAC-001", inventoryName: "Right Angle Coupler", unit: "pcs", qty: 300 },
    ],
  },
];

export const useSuratJalanStore = create<SuratJalanStore>((set, get) => ({
  suratJalans: initialData,
  nextNumber: 4,

  generateNumber: () => {
    const year = new Date().getFullYear();
    const n = get().nextNumber;
    return `SJ-${year}-${String(n).padStart(3, "0")}`;
  },

  addSuratJalan: (s) => {
    const number = get().generateNumber();
    set((state) => ({
      suratJalans: [
        { ...s, id: `sj-${Date.now()}`, number, createdAt: new Date().toISOString().split("T")[0] },
        ...state.suratJalans,
      ],
      nextNumber: state.nextNumber + 1,
    }));
  },

  updateSuratJalan: (id, updates) =>
    set((state) => ({
      suratJalans: state.suratJalans.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  updateStatus: (id, status) =>
    set((state) => ({
      suratJalans: state.suratJalans.map((s) => (s.id === id ? { ...s, status } : s)),
    })),

  deleteSuratJalan: (id) =>
    set((state) => ({
      suratJalans: state.suratJalans.filter((s) => s.id !== id),
    })),
}));
