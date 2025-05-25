import db from "./db";
import * as schema from "./db/schema";

let correct_guess = [];

const init = (nb_colors) => {
  for (let i = 0; i < nb_colors; i++) {
    correct_guess.push(Math.floor(Math.random() * nb_colors));
  }
};

const try_guess = async (answer) => {
  //TODO : check guess, write in into db, return the number of correct guesses
  const parsed = JSON.parse(answer);
  let nb_positions = 0;
  let nb_colors = 0;
  let correct_colors = [];
  for (let i = 0; i < correct_guess.length; i++) {
    const element = parsed[i];
    if (element == correct_guess[i]) {
      nb_positions += 1;
      correct_colors.push(element);
    }
  };
  for (let color in parsed) {
    if (!correct_colors.includes(color) && correct_guess.includes(color))
    {
      nb_colors += 1
    }
  };
  const data = {guess: answer,
    correct_positions: nb_positions,
    correct_colors: nb_colors};
  await db.insert(schema.guesses).values(data);
  return data;
};

const server = Bun.serve({
  port: 8080,
  routes: {
    "/api/status": new Response("OK"),

    "/api/start": {
      POST: async (req) => {
        const body = await req.json();
        init(body.nb_colors);
        return new Response(`Game started with ${body.nb_colors} colors`);
      },
    },

    "/api/guess": {
      POST: async (req) => {
        const body = await req.json();
        return Response.json(await try_guess(body.guess));
      },
    },

    "/api/posts": {
      GET: () => new Response("List posts"),
      POST: async (req) => {
        const body = await req.json();
        return Response.json({ created: true, ...body });
      },
    },

    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),

    "/blog/hello": Response.redirect("/blog/hello/world"),
  },

  // (optional) fallback for unmatched routes:
  // Required if Bun's version < 1.2.3
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Listening on ${server.url}`);
