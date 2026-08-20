import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@weddingos/db";

function getConnectionString(): string {
  if (process.env.APP_DATABASE_URL) {
    return process.env.APP_DATABASE_URL;
  }
  if (process.env.APP_DATABASE_DEVELOPMENT) {
    return process.env.APP_DATABASE_DEVELOPMENT;
  }
  throw new Error(
    "Database configuration is required. Set either APP_DATABASE_URL or APP_DATABASE_DEVELOPMENT.",
  );
}

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | undefined;

function initDb(): Db {
  const connectionString = getConnectionString();
  // Neon pooler endpoints (contain "-pooler.") don't support prepared statements
  const isPooler = connectionString.includes("-pooler.");
  const client = postgres(connectionString, {
    max: parseInt(process.env.DB_POOL_MAX || "10"),
    idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || "20"),
    connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || "10"),
    prepare: !isPooler,
    max_lifetime: 60 * 30,
    onnotice:
      process.env.NODE_ENV === "development" ? undefined : () => {},
  });
  return drizzle(client, { schema });
}

// Lazy initialization: connection created on first use
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    if (!_db) _db = initDb();
    const value = Reflect.get(_db, prop, _db);
    return typeof value === "function" ? value.bind(_db) : value;
  },
});