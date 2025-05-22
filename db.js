import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

// 'db.sqlite' = le chemin vers le fichier SQLite
const sqlite = new Database("db.sqlite");
const db = drizzle(sqlite);

export default db;