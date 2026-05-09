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

// ─── Supir & Helper ─────────────────────────────────────────────────────────
export interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export interface Helper {
  id: string;
  name: string;
  phone?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
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

export interface SuratJalanHelper {
  helperId?: string;
  helperName: string;
  role?: string;
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
  driverId?: string;
  ritaseSupir?: number;
  helpers?: SuratJalanHelper[];
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

// ─── Purchase Order ───────────────────────────────────────────────────────────

export interface PurchaseOrderItem {
  id?: string;
  inventoryId?: string;
  inventoryCode: string;
  inventoryName: string;
  unit: string;
  qtyOrdered: number;
  qtyReceived: number;
  unitPrice: number;
  subtotal: number;
  note?: string;
}

export type POStatus = "draft" | "ordered" | "partial" | "completed" | "cancelled";

export interface PurchaseOrder {
  id: string;
  number: string;           // PO-2026-001
  date: string;
  supplierName: string;
  supplierPhone?: string;
  supplierAddress?: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  notes?: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
}

// ─── Stock Log ───────────────────────────────────────────────────────────────

export interface StockLog {
  id: string;
  inventoryId: string;
  inventoryCode: string;
  inventoryName: string;
  changeType: "po_receive" | "po_edit" | "manual_in" | "manual_out" | "sj_out" | "sj_in" | "adjustment";
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  referenceId?: string;
  referenceType?: string;
  referenceNumber?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

// ─── Delivery List (Daftar Kebutuhan Pengiriman) ─────────────────────────────

export interface DeliveryListItem {
  id: string;
  deliveryListId: string;
  inventoryId?: string;
  inventoryCode: string;
  inventoryName: string;
  unit: string;
  qtyNeeded: number;       // total qty dibutuhkan
  qtySent: number;          // total qty sudah dikirim
}

export interface DeliveryListShipment {
  id: string;
  deliveryListId: string;
  deliveryListItemId: string;
  suratJalanId: string;
  suratJalanNumber: string;
  qtyShipped: number;
  shipDate: string;
  createdAt: string;
}

export type DeliveryListStatus = "active" | "completed" | "cancelled";

export interface DeliveryList {
  id: string;
  customerId: string;
  customerName: string;
  projectId?: string;
  projectName?: string;
  title: string;            // e.g. "Order 50 Set Frame 170"
  orderQty: number;         // jumlah set yang dipesan
  unitLabel: string;        // "set", "paket", etc.
  status: DeliveryListStatus;
  notes?: string;
  items: DeliveryListItem[];
  shipments: DeliveryListShipment[];
  createdAt: string;
}

// ─── Surat Perjanjian ─────────────────────────────────────────────────────────

export interface PihakPertama {
  id: string;
  name: string;
  address: string;
  phone: string;
  position: string;
  isDefault: boolean;
  createdAt: string;
}

export interface RentalPriceList {
  id: string;
  inventoryId: string;
  inventoryName: string;
  inventoryCode: string;
  categoryId?: string;
  categoryName?: string;
  hargaGanti: number;   // harga ganti rugi per satuan
  hargaSewa: number;    // harga sewa per bulan
  satuan: string;       // pc, set, bting, dll
}

export interface SuratPerjanjianItem {
  id?: string;
  inventoryId?: string;
  inventoryName: string;
  inventoryCode: string;
  categoryId?: string;
  categoryName?: string;
  hargaGanti: number;
  hargaSewa: number;
  satuan: string;
  qty: number;
  jumlah: number;       // qty * hargaSewa
  itemOrder: number;
  note?: string;
}

export type SuratPerjanjianStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface SuratPerjanjian {
  id: string;
  number: string;
  date: string;
  pihakPertamaId?: string;
  pihakPertamaName: string;
  pihakPertamaAddress: string;
  pihakPertamaPhone: string;
  pihakPertamaPosition: string;
  customerId?: string;
  customerName: string;
  customerAddress: string;
  customerPhone?: string;
  customerFax?: string;
  customerWakil?: string;
  projectLocation?: string;
  lamaSewa?: string;
  pembayaranSelanjutnya?: string;
  caraPembayaran: string;
  transportFee: number;
  uangJaminan: number;
  total: number;
  status: SuratPerjanjianStatus;
  notes?: string;
  items: SuratPerjanjianItem[];
  createdAt: string;
}
