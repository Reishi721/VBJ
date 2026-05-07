import { create } from "zustand";
import type { Customer, CustomerProject } from "../types";

interface CustomerStore {
  customers: Customer[];
  addCustomer: (c: Omit<Customer, "id" | "createdAt" | "projects">) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addProject: (customerId: string, p: Omit<CustomerProject, "id" | "customerId" | "createdAt">) => void;
  updateProject: (customerId: string, projectId: string, p: Partial<CustomerProject>) => void;
  deleteProject: (customerId: string, projectId: string) => void;
}

const initialCustomers: Customer[] = [
  {
    id: "cust-001", name: "PT Pembangunan Jaya", company: "PT Pembangunan Jaya", phone: "021-5551234",
    email: "info@pbjaya.co.id", address: "Jl. Sudirman No. 45, Jakarta Selatan", marketingId: "mkt-001", marketingName: "Andi Pratama",
    status: "active", createdAt: "2025-02-10",
    projects: [
      { id: "prj-001", customerId: "cust-001", name: "Proyek Mall Sudirman", location: "Jl. Sudirman, Jakarta", status: "active", startDate: "2026-01-15", description: "Pembangunan mall 5 lantai", createdAt: "2026-01-10" },
      { id: "prj-002", customerId: "cust-001", name: "Renovasi Kantor Pusat", location: "Jl. Gatot Subroto, Jakarta", status: "completed", startDate: "2025-06-01", endDate: "2025-12-15", description: "Renovasi gedung kantor utama", createdAt: "2025-05-20" },
    ],
  },
  {
    id: "cust-002", name: "CV Makmur Abadi", company: "CV Makmur Abadi", phone: "021-5559876",
    email: "admin@makmurabadi.com", address: "Jl. TB Simatupang No. 12, Jakarta Timur", marketingId: "mkt-002", marketingName: "Siti Nurhaliza",
    status: "active", createdAt: "2025-04-05",
    projects: [
      { id: "prj-003", customerId: "cust-002", name: "Gedung Perkantoran BSD", location: "BSD City, Tangerang", status: "active", startDate: "2026-02-01", description: "Pembangunan gedung perkantoran 8 lantai", createdAt: "2026-01-20" },
    ],
  },
  {
    id: "cust-003", name: "Bpk. Budi Santoso", phone: "081234000111",
    email: "budi.s@gmail.com", address: "Jl. Melati No. 7, Depok", marketingId: "mkt-003", marketingName: "Budi Santoso",
    status: "active", createdAt: "2025-08-12",
    projects: [
      { id: "prj-004", customerId: "cust-003", name: "Renovasi Rumah Pribadi", location: "Depok, Jawa Barat", status: "completed", startDate: "2026-03-01", endDate: "2026-04-10", description: "Renovasi rumah tinggal 2 lantai", createdAt: "2026-02-25" },
    ],
  },
  {
    id: "cust-004", name: "PT Konstruksi Utama", company: "PT Konstruksi Utama", phone: "021-5553333",
    email: "ops@konstruksiutama.co.id", address: "Jl. Raya Bekasi KM 25, Bekasi", marketingId: "mkt-004", marketingName: "Dewi Lestari",
    status: "active", createdAt: "2024-10-18",
    projects: [
      { id: "prj-005", customerId: "cust-004", name: "Jembatan Tol Cikampek", location: "Cikampek, Jawa Barat", status: "active", startDate: "2025-09-01", description: "Proyek jembatan tol seksi 3", createdAt: "2025-08-15" },
      { id: "prj-006", customerId: "cust-004", name: "Fly Over Karawang", location: "Karawang, Jawa Barat", status: "pending", startDate: "2026-06-01", description: "Pembangunan fly over", createdAt: "2026-04-01" },
      { id: "prj-007", customerId: "cust-004", name: "Underpass Cikarang", location: "Cikarang, Jawa Barat", status: "completed", startDate: "2024-11-01", endDate: "2025-07-30", description: "Pembangunan underpass", createdAt: "2024-10-20" },
    ],
  },
  {
    id: "cust-005", name: "CV Indah Karya", company: "CV Indah Karya", phone: "021-5554444",
    email: "cv.indahkarya@gmail.com", address: "Jl. Raya Bogor No. 88, Bogor", marketingId: "mkt-001", marketingName: "Andi Pratama",
    status: "active", createdAt: "2025-11-30",
    projects: [
      { id: "prj-008", customerId: "cust-005", name: "Apartemen Green Lake", location: "Tangerang, Banten", status: "active", startDate: "2026-03-01", description: "Tower 2 apartemen", createdAt: "2026-02-15" },
    ],
  },
];

export const useCustomerStore = create<CustomerStore>((set) => ({
  customers: initialCustomers,
  addCustomer: (c) =>
    set((state) => ({
      customers: [
        ...state.customers,
        { ...c, id: `cust-${Date.now()}`, createdAt: new Date().toISOString().split("T")[0], projects: [] },
      ],
    })),
  updateCustomer: (id, updates) =>
    set((state) => ({
      customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  deleteCustomer: (id) =>
    set((state) => ({
      customers: state.customers.filter((c) => c.id !== id),
    })),
  addProject: (customerId, p) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              projects: [
                ...c.projects,
                { ...p, id: `prj-${Date.now()}`, customerId, createdAt: new Date().toISOString().split("T")[0] },
              ],
            }
          : c
      ),
    })),
  updateProject: (customerId, projectId, updates) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? {
              ...c,
              projects: c.projects.map((p) => (p.id === projectId ? { ...p, ...updates } : p)),
            }
          : c
      ),
    })),
  deleteProject: (customerId, projectId) =>
    set((state) => ({
      customers: state.customers.map((c) =>
        c.id === customerId
          ? { ...c, projects: c.projects.filter((p) => p.id !== projectId) }
          : c
      ),
    })),
}));
