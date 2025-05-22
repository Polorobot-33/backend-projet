import db from "./db";
import * as schema from "./db/schema";

console.log("hello script");

const guesses = await db.select().from(schema.guesses);

console.log(guesses);

console.log(await db.select().from(schema.guesses));