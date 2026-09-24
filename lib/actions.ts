"use server";

import { revalidatePath } from "next/cache";
import { CATEGORY_NAMES, REASONS, UNITS } from "@/lib/constants";
import { recompute, suggestSku } from "@/lib/inventory";
import { createSeed, emptyDatabase } from "@/lib/seed";
import { mutate } from "@/lib/store";
import type {
  ActionResult,
  Database,
  Item,
  ItemInput,
  Movement,
  MovementInput,
  Purchase,
  PurchaseInput,
  SupplierInput,
} from "@/lib/types";

function uid(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function round3(value: number) {
  return Math.round(value * 1000) / 1000;
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function clean(value: string, max: number) {
  return value.trim().slice(0, max);
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

async function commit(mutator: (db: Database) => ActionResult): Promise<ActionResult> {
  try {
    const result = await mutate(mutator);
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch {
    return {
      ok: false,
      error: "Could not save. Check that this folder is writable and try again.",
    };
  }
}

function touch(db: Database, itemIds: Array<string | null | undefined>) {
  const now = new Date().toISOString();
  for (const itemId of new Set(itemIds.filter((id): id is string => Boolean(id)))) {
    const item = db.items.find((entry) => entry.id === itemId);
    if (item) item.updatedAt = now;
  }
}

function validateDate(date: string) {
  if (!isDate(date)) return "Enter a valid date.";
  if (date > todayISO()) return "Use today's date or an earlier one. Stock is recorded when it arrives or is used.";
  return null;
}

function validatePurchase(db: Database, input: PurchaseInput) {
  const item = db.items.find((entry) => entry.id === input.itemId);
  if (!item) return "Choose an item.";
  if (!db.suppliers.some((entry) => entry.id === input.supplierId)) return "Choose a supplier.";
  const dateError = validateDate(input.date);
  if (dateError) return dateError;
  if (!(input.quantity > 0) || input.quantity > 1_000_000) return "Quantity must be greater than zero.";
  if (!(input.unitPrice >= 0) || input.unitPrice > 100_000_000) return "Enter a unit price of zero or more.";
  return null;
}

export async function saveItem(id: string | null, input: ItemInput): Promise<ActionResult> {
  return commit((db) => {
    const name = clean(input.name, 80);
    if (name.length < 2) return { ok: false, error: "Enter the item name." };

    const existing = id ? db.items.find((entry) => entry.id === id) : undefined;
    if (id && !existing) return { ok: false, error: "That item no longer exists." };

    let sku = clean(input.sku, 20).toUpperCase();
    if (!sku && !existing) sku = suggestSku(db);
    if (!/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(sku)) {
      return { ok: false, error: "Use 2–20 letters, numbers, and hyphens for the SKU." };
    }
    if (db.items.some((entry) => entry.id !== id && entry.sku.toUpperCase() === sku)) {
      return { ok: false, error: "That SKU is already used." };
    }

    if (!CATEGORY_NAMES.includes(input.category)) return { ok: false, error: "Choose a category." };
    if (!(UNITS as readonly string[]).includes(input.unit)) return { ok: false, error: "Choose a unit." };
    if (!(input.reorderLevel >= 0) || input.reorderLevel > 1_000_000) {
      return { ok: false, error: "Reorder level must be zero or more." };
    }

    const supplierId = input.supplierId || null;
    if (supplierId && !db.suppliers.some((entry) => entry.id === supplierId)) {
      return { ok: false, error: "Choose a supplier from the list." };
    }

    const now = new Date().toISOString();
    let item: Item;
    if (existing) {
      item = existing;
      Object.assign(existing, {
        name,
        sku,
        category: input.category,
        unit: input.unit,
        location: clean(input.location, 40),
        reorderLevel: round3(input.reorderLevel),
        supplierId,
        description: clean(input.description, 400),
        updatedAt: now,
      });
    } else {
      item = {
        id: uid("item"),
        sku,
        name,
        category: input.category,
        unit: input.unit,
        location: clean(input.location, 40),
        reorderLevel: round3(input.reorderLevel),
        supplierId,
        description: clean(input.description, 400),
        quantityOnHand: 0,
        averageCost: 0,
        lastPurchasePrice: 0,
        lastPurchaseDate: null,
        createdAt: now,
        updatedAt: now,
      };
      db.items.push(item);
    }

    if (!existing && input.opening && input.opening.quantity > 0) {
      const openingError = validatePurchase(db, {
        itemId: item.id,
        supplierId: input.supplierId,
        date: input.opening.date,
        quantity: round3(input.opening.quantity),
        unitPrice: round2(input.opening.unitPrice),
        invoiceNo: clean(input.opening.invoiceNo, 40),
        notes: clean(input.opening.notes, 400),
      });
      if (openingError) return { ok: false, error: openingError };
      if (!supplierId) return { ok: false, error: "Choose the supplier for this opening purchase." };

      db.purchases.push({
        id: uid("pur"),
        itemId: item.id,
        supplierId,
        date: input.opening.date,
        quantity: round3(input.opening.quantity),
        unitPrice: round2(input.opening.unitPrice),
        invoiceNo: clean(input.opening.invoiceNo, 40),
        notes: clean(input.opening.notes, 400) || "Opening stock.",
        createdAt: now,
      });
    }

    const stockError = recompute(db);
    if (stockError) return { ok: false, error: stockError };
    return { ok: true };
  });
}

export async function deleteItem(id: string): Promise<ActionResult> {
  return commit((db) => {
    if (!db.items.some((entry) => entry.id === id)) {
      return { ok: false, error: "That item no longer exists." };
    }
    db.items = db.items.filter((entry) => entry.id !== id);
    db.purchases = db.purchases.filter((entry) => entry.itemId !== id);
    db.movements = db.movements.filter((entry) => entry.itemId !== id);
    return { ok: true };
  });
}

export async function savePurchase(id: string | null, input: PurchaseInput): Promise<ActionResult> {
  return commit((db) => {
    const payload: PurchaseInput = {
      ...input,
      quantity: round3(input.quantity),
      unitPrice: round2(input.unitPrice),
      invoiceNo: clean(input.invoiceNo, 40),
      notes: clean(input.notes, 400),
    };
    const validation = validatePurchase(db, payload);
    if (validation) return { ok: false, error: validation };

    const existing = id ? db.purchases.find((entry) => entry.id === id) : undefined;
    if (id && !existing) return { ok: false, error: "That purchase no longer exists." };
    const previousItemId = existing?.itemId ?? null;

    if (existing) {
      Object.assign(existing, payload);
    } else {
      const created: Purchase = {
        id: uid("pur"),
        ...payload,
        createdAt: new Date().toISOString(),
      };
      db.purchases.push(created);
    }

    const stockError = recompute(db);
    if (stockError) return { ok: false, error: stockError };
    touch(db, [payload.itemId, previousItemId]);
    return { ok: true };
  });
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  return commit((db) => {
    const existing = db.purchases.find((entry) => entry.id === id);
    if (!existing) return { ok: false, error: "That purchase no longer exists." };
    db.purchases = db.purchases.filter((entry) => entry.id !== id);
    const stockError = recompute(db);
    if (stockError) return { ok: false, error: stockError };
    touch(db, [existing.itemId]);
    return { ok: true };
  });
}

export async function saveMovement(id: string | null, input: MovementInput): Promise<ActionResult> {
  return commit((db) => {
    const item = db.items.find((entry) => entry.id === input.itemId);
    if (!item) return { ok: false, error: "Choose an item." };
    const dateError = validateDate(input.date);
    if (dateError) return { ok: false, error: dateError };
    const quantity = round3(input.quantity);
    if (!(quantity > 0) || quantity > 1_000_000) {
      return { ok: false, error: "Quantity must be greater than zero." };
    }
    if (input.direction !== "in" && input.direction !== "out") {
      return { ok: false, error: "Choose whether stock is coming in or going out." };
    }
    const reason = clean(input.reason, 40);
    if (!(REASONS as readonly string[]).includes(reason)) {
      return { ok: false, error: "Choose a reason." };
    }

    const existing = id ? db.movements.find((entry) => entry.id === id) : undefined;
    if (id && !existing) return { ok: false, error: "That stock movement no longer exists." };
    const previousItemId = existing?.itemId ?? null;
    const now = new Date().toISOString();

    const next: Movement = {
      id: existing?.id ?? uid("mov"),
      itemId: input.itemId,
      date: input.date,
      direction: input.direction,
      quantity,
      reason,
      reference: clean(input.reference, 40),
      notes: clean(input.notes, 400),
      createdAt: existing?.createdAt ?? now,
    };

    if (existing) Object.assign(existing, next);
    else db.movements.push(next);

    const stockError = recompute(db);
    if (stockError) return { ok: false, error: stockError };
    touch(db, [input.itemId, previousItemId]);
    return { ok: true };
  });
}

export async function deleteMovement(id: string): Promise<ActionResult> {
  return commit((db) => {
    const existing = db.movements.find((entry) => entry.id === id);
    if (!existing) return { ok: false, error: "That stock movement no longer exists." };
    db.movements = db.movements.filter((entry) => entry.id !== id);
    const stockError = recompute(db);
    if (stockError) return { ok: false, error: stockError };
    touch(db, [existing.itemId]);
    return { ok: true };
  });
}

export async function saveSupplier(id: string | null, input: SupplierInput): Promise<ActionResult> {
  return commit((db) => {
    const name = clean(input.name, 80);
    if (name.length < 2) return { ok: false, error: "Enter the supplier name." };
    const existing = id ? db.suppliers.find((entry) => entry.id === id) : undefined;
    if (id && !existing) return { ok: false, error: "That supplier no longer exists." };

    const fields = {
      name,
      contact: clean(input.contact, 80),
      phone: clean(input.phone, 40),
      email: clean(input.email, 80),
      address: clean(input.address, 160),
      notes: clean(input.notes, 400),
    };

    if (existing) Object.assign(existing, fields);
    else {
      db.suppliers.push({
        id: uid("sup"),
        ...fields,
        createdAt: new Date().toISOString(),
      });
    }
    return { ok: true };
  });
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  return commit((db) => {
    if (!db.suppliers.some((entry) => entry.id === id)) {
      return { ok: false, error: "That supplier no longer exists." };
    }
    const used =
      db.purchases.some((entry) => entry.supplierId === id) ||
      db.items.some((entry) => entry.supplierId === id);
    if (used) {
      return {
        ok: false,
        error: "This supplier is still used by items or purchases. Reassign those first.",
      };
    }
    db.suppliers = db.suppliers.filter((entry) => entry.id !== id);
    return { ok: true };
  });
}

export async function dismissNotice(): Promise<ActionResult> {
  return commit((db) => {
    db.meta.noticeDismissed = true;
    return { ok: true };
  });
}

export async function startFresh(): Promise<ActionResult> {
  return commit((db) => {
    const blank = emptyDatabase();
    db.meta = blank.meta;
    db.items = [];
    db.suppliers = [];
    db.purchases = [];
    db.movements = [];
    return { ok: true };
  });
}

export async function restoreSample(): Promise<ActionResult> {
  return commit((db) => {
    const seed = createSeed();
    db.meta = seed.meta;
    db.items = seed.items;
    db.suppliers = seed.suppliers;
    db.purchases = seed.purchases;
    db.movements = seed.movements;
    return { ok: true };
  });
}
