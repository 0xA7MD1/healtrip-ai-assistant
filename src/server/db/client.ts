import "server-only";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Defaults to the SQLite file bundled with the deployment. The same code works against a
// hosted libSQL/Turso database by setting DATABASE_URL — no query changes needed.
const client = createClient({
  url: process.env.DATABASE_URL ?? "file:data/healtrip.db",
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
