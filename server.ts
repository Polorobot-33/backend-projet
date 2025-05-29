import db from "./db";
import * as schema from "./db/schema";

let sercet_code: number[] = [];
let guess_limit: number = 0;
let nb_guess: number = 0;

const init = async (nb_colors: number, nb_guesses: number) => {
  for (let i = 0; i < nb_colors; i++) {
    sercet_code.push(Math.floor(Math.random() * nb_colors));
  }
  guess_limit = nb_guesses;
  nb_guess = 0;
  await db.delete(schema.guesses);
};

const try_guess = async (answer: number[]) => {
  let nb_positions = 0;
  let nb_colors = 0;
  let correct_colors = [];
  for (let i = 0; i < sercet_code.length; i++) {
    const element = answer[i];
    if (element == sercet_code[i]) {
      nb_positions += 1;
      correct_colors.push(element);
    }
  }
  for (let color of answer) {
    if (!correct_colors.includes(color) && sercet_code.includes(color)) {
      nb_colors += 1;
    }
  }
  nb_guess += 1;
  const data = {
    id : nb_guess,
    guess: JSON.stringify(answer),
    correct_colors: nb_colors,
    correct_positions: nb_positions,
  };
  await db.insert(schema.guesses).values(data);
  const response = {
    data,
    message: `Keep trying ! You have ${guess_limit - nb_guess} guesses left.`,
  };
  if (nb_guess > guess_limit) {
    response.message = `You lost ! The correct code was : ${sercet_code}`;
  } else if (nb_positions == sercet_code.length) {
    response.message = `You won with ${nb_guess} guesses !`;
  }
  return response;
};

const server = Bun.serve({
  port: 8080,
  routes: {
    // {nb_colors = ..., nb_guesses = ...}
    "/api/start": {
      POST: async (req) => {
        const body = (await req.json()) as {
          nb_colors: number;
          nb_guesses: number;
        };
        await init(body.nb_colors, body.nb_guesses);
        return new Response(
          `Game started with ${body.nb_colors} colors and a maximum limit of ${body.nb_guesses} guesses.`
        );
      },
    },

    // {guess = '[1, 2, 3 ...]'}
    "/api/guess": {
      POST: async (req) => {
        const body = (await req.json()) as { guess: number[] };
        return Response.json(await try_guess(body.guess));
      },
    },

    "/api/status": {
      GET: async () => {
        const data = await db.select().from(schema.guesses);
        return Response.json(data);
      },
    },

    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  // (optional) fallback for unmatched routes:
  // Required if Bun's version < 1.2.3
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },
});

await db.delete(schema.guesses);

console.log(`Listening on ${server.url}`);
