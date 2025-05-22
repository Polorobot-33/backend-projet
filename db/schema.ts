import {sqliteTable, text, integer} from "drizzle-orm/sqlite-core";

export const guesses = sqliteTable("guesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guess: text("guess"),
  result: text("result"),
});