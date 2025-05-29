import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const guesses = sqliteTable("guesses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  guess: text("guess"),
  correct_colors: integer("correct_colors"),
  correct_positions: integer("correct_positions"),
});
