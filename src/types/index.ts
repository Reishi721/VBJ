export interface Marketing {
  id: string;
  name: string;
  phone: string;
  email: string;
  position: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface CustomerProject {
  id: string;
  customerId: string;
  name: string;
  location: string;
  status: "active" | "completed" | "pending" | "cancelled";
  startDate: string;
  endDate?: string;
  description?: string;
  recipientName?: string;
  recipientPhone?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email?: string;
  address: string;
  marketingId: string;
  marketingName?: string;
  projects: CustomerProject[];
  status: "active" | "inactive";
  createdAt: string;
}

export interface InventoryCategory {
  id: string;
  name: string;
  description?: string;
  color: string;   // tailwind bg color class, e.g. "bg-blue-500"
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  code: string;         // kode/SKU
  unit: string;         // satuan: pcs, unit, set, dll
  stock: number;
  minStock: number;     // stok minimum (untuk alert)
  condition: "good" | "damaged" | "maintenance";
  location?: string;    // lokasi penyimpanan
  description?: string;
  createdAt: string;
}

// ─── Surat Jalan ──────────────────────────────────────────────────────────────

export interface SuratJalanItem {
  inventoryId: string;
  inventoryCode: string;
  inventoryName: string;
  unit: string;
  qty: number;
  note?: string;
}

export interface SuratJalan {
  id: string;
  number: string;           // Nomor surat jalan, e.g. SJ-2026-001
  type: "pengiriman" | "pengembalian"; // jenis surat jalan
  date: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  projectName?: string;
  recipientName: string;
  recipientPhone?: string;
  deliveryAddress: string;
  driverName: string;
  vehiclePlate: string;
  items: SuratJalanItem[];
  status: "draft" | "sent" | "delivered" | "cancelled";
  notes?: string;
  createdAt: string;
}

// ─── Rekapan Penyewa ──────────────────────────────────────────────────────────

export interface RentalRecapColumn {
  id: string;
  inventoryId: string;
  inventoryName: string;
  inventoryCode: string;
  unit: string;
  order: number;           // urutan kolom (drag & drop)
}

export interface RentalRecap {
  id: string;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  projectId?: string;
  projectName?: string;
  columns: RentalRecapColumn[]; // kolom item yang ingin ditampilkan
  notes?: string;
  createdAt: string;
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface InvoiceLineItem {
  description: string;       // nama/deskripsi barang atau pekerjaan
  inventoryCode?: string;
  qty: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  rentalDays?: number;       // untuk invoice detail (invoice kecil)
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled";

export interface Invoice {
  id: string;
  number: string;            // INV-2026-001
  summaryDescription: string; // Deskripsi untuk invoice ringkasan (misal: "Sewa Scaffolding Periode April")
  date: string;
  dueDate: string;
  poNumber?: string;
  billingCycle?: string;     // Tagihan Ke
  customerId: string;
  customerName: string;
  customerAddress?: string;
  projectId?: string;
  projectName?: string;
  upName?: string;           // UP / PIC
  upPhone?: string;          // Tel / Fax PIC
  items: InvoiceLineItem[];
  subtotal: number;
  transportFee?: number;     // Transport PP
  depositFee?: number;       // Jaminan
  discount: number;          // nominal diskon
  tax: number;               // persen PPN (0 / 11)
  taxAmount: number;
  total: number;
  paidAmount: number;        // sudah dibayar
  remainingAmount: number;   // sisa
  status: InvoiceStatus;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: "transfer" | "cash" | "check";
  date: string;
  reference?: string;        // nomor referensi / bukti transfer
  notes?: string;
  createdAt: string;
}
