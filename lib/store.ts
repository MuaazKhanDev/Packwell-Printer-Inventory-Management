import fs from "fs";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import postgres from "postgres";
import { recompute } from "@/lib/inventory";
import { createSeed } from "@/lib/seed";
import type { ActionResult, Database } from "@/lib/types";

const FILE = path.join(process.cwd(), "data", "inventory.json");

type Sql = ReturnType<typeof postgres>;

const globalStore = globalThis as unknown as { packwellSql?: Sql; packwellChain?: Promise<void> };

function databaseUrl() {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

function supabaseKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
}

function usesSupabaseApi() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && supabaseKey());
}

export function usesDatabase() {
  return databaseUrl().length > 0 || usesSupabaseApi();
}

function supabase(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const TABLE_HELP =
  "In Supabase, open SQL Editor, run the script in supabase/setup.sql, then reload this page.";

function sql() {
  if (!globalStore.packwellSql) {
    globalStore.packwellSql = postgres(databaseUrl(), {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }
  return globalStore.packwellSql;
}

function finish(db: Database) {
  if (!db.meta || !Array.isArray(db.items) || !Array.isArray(db.purchases) || !Array.isArray(db.movements) || !Array.isArray(db.suppliers)) {
    throw new Error("The inventory record is incomplete.");
  }
  const error = recompute(db);
  if (error) throw new Error(error);
  return db;
}

function readFileDb() {
  if (!fs.existsSync(FILE)) {
    const seed = createSeed();
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(seed, null, 2), "utf8");
    return seed;
  }
  let parsed: Database;
  try {
    parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Database;
  } catch {
    throw new Error("Could not read data/inventory.json. The file is not valid JSON.");
  }
  return finish(parsed);
}

function writeFileDb(db: Database) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), "utf8");
}

async function ensureTable() {
  await sql()`
    create table if not exists packwell_state (
      id int primary key,
      data jsonb not null
    )
  `;
}

async function readDatabase() {
  await ensureTable();
  const rows = await sql()`select data from packwell_state where id = 1`;
  if (rows.length === 0) {
    const seed = createSeed();
    await sql()`insert into packwell_state (id, data) values (1, ${sql().json(seed)})`;
    return seed;
  }
  return finish(rows[0].data as Database);
}

async function writeDatabase(db: Database) {
  await sql()`
    insert into packwell_state (id, data)
    values (1, ${sql().json(db)})
    on conflict (id) do update set data = excluded.data
  `;
}

async function readSupabase() {
  const client = supabase();
  const { data, error } = await client.from("packwell_state").select("data").eq("id", 1).maybeSingle();
  if (error) throw new Error(`${error.message} ${TABLE_HELP}`);
  if (!data) {
    const seed = createSeed();
    const inserted = await client.from("packwell_state").insert({ id: 1, data: seed });
    if (inserted.error) throw new Error(`${inserted.error.message} ${TABLE_HELP}`);
    return seed;
  }
  return finish(data.data as Database);
}

async function writeSupabase(db: Database) {
  const { error } = await supabase().from("packwell_state").upsert({ id: 1, data: db });
  if (error) throw new Error(`${error.message} ${TABLE_HELP}`);
}

export async function readDb() {
  noStore();
  if (usesSupabaseApi()) return readSupabase();
  if (databaseUrl()) return readDatabase();
  return readFileDb();
}

export function mutate(mutator: (db: Database) => ActionResult) {
  const chain = globalStore.packwellChain ?? Promise.resolve();
  const run = chain.then(async () => {
    if (usesSupabaseApi()) {
      const db = await readSupabase();
      const result = mutator(db);
      if (result.ok) await writeSupabase(db);
      return result;
    }
    if (!databaseUrl()) {
      const db = readFileDb();
      const result = mutator(db);
      if (result.ok) writeFileDb(db);
      return result;
    }
    await ensureTable();
    return sql().begin(async (tx) => {
      await tx`select id from packwell_state where id = 1 for update`;
      const rows = await tx`select data from packwell_state where id = 1`;
      const db = rows.length === 0 ? createSeed() : finish(rows[0].data as Database);
      const result = mutator(db);
      if (result.ok) {
        await tx`
          insert into packwell_state (id, data)
          values (1, ${tx.json(db)})
          on conflict (id) do update set data = excluded.data
        `;
      }
      return result;
    });
  });
  globalStore.packwellChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function writeShared(db: Database) {
  if (usesDatabase()) await writeDatabase(db);
  else writeFileDb(db);
}
