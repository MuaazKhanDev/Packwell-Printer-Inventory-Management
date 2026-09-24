import fs from "fs";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";
import { recompute } from "@/lib/inventory";
import { createSeed } from "@/lib/seed";
import type { ActionResult, Database } from "@/lib/types";

const FILE = path.join(process.cwd(), "data", "inventory.json");

let chain: Promise<void> = Promise.resolve();

function persist(db: Database) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), "utf8");
}

function load(): Database {
  if (!fs.existsSync(FILE)) {
    const seed = createSeed();
    persist(seed);
    return seed;
  }

  let parsed: Database;
  try {
    parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Database;
  } catch {
    throw new Error("Could not read data/inventory.json. The file is not valid JSON.");
  }

  if (!parsed.meta || !Array.isArray(parsed.items)) {
    throw new Error("data/inventory.json is missing the inventory records.");
  }

  const error = recompute(parsed);
  if (error) throw new Error(error);
  return parsed;
}

export function readDb() {
  noStore();
  return load();
}

export function mutate(mutator: (db: Database) => ActionResult) {
  const run = chain.then(() => {
    const db = load();
    const result = mutator(db);
    if (result.ok) persist(db);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
