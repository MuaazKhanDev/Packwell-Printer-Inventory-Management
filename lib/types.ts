export type Item = {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  description: string;
  location: string;
  reorderLevel: number;
  supplierId: string | null;
  quantityOnHand: number;
  averageCost: number;
  lastPurchasePrice: number;
  lastPurchaseDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type Purchase = {
  id: string;
  itemId: string;
  supplierId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  invoiceNo: string;
  notes: string;
  createdAt: string;
};

export type Movement = {
  id: string;
  itemId: string;
  date: string;
  direction: "in" | "out";
  quantity: number;
  reason: string;
  reference: string;
  notes: string;
  createdAt: string;
};

export type Meta = {
  usingSample: boolean;
  noticeDismissed: boolean;
};

export type Database = {
  meta: Meta;
  items: Item[];
  suppliers: Supplier[];
  purchases: Purchase[];
  movements: Movement[];
};

export type ActionResult = { ok: true } | { ok: false; error: string };

export type ItemInput = {
  name: string;
  sku: string;
  category: string;
  unit: string;
  location: string;
  reorderLevel: number;
  supplierId: string;
  description: string;
  opening: {
    quantity: number;
    unitPrice: number;
    date: string;
    invoiceNo: string;
    notes: string;
  } | null;
};

export type PurchaseInput = {
  itemId: string;
  supplierId: string;
  date: string;
  quantity: number;
  unitPrice: number;
  invoiceNo: string;
  notes: string;
};

export type MovementInput = {
  itemId: string;
  date: string;
  direction: "in" | "out";
  quantity: number;
  reason: string;
  reference: string;
  notes: string;
};

export type SupplierInput = {
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
};

export type LedgerRow = {
  id: string;
  date: string;
  createdAt: string;
  source: "purchase" | "movement";
  direction: "in" | "out";
  quantity: number;
  unitPrice: number | null;
  balance: number;
  label: string;
  party: string;
  note: string;
};
