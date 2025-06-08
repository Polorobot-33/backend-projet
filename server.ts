import db from "./db";
import * as schema from "./db/schema";

let secret_code: number[] = [];
let guess_limit: number = 0;
let nb_guess: number = 0;

//initiates a new game with nb_colors colors and nb_guesses guesses
const init = async (nb_colors: number, nb_slots: number, nb_guesses: number) => {
  secret_code = [];
  for (let i = 0; i < nb_slots; i++) {
    secret_code.push(Math.floor(Math.random() * nb_colors));
  }
  guess_limit = nb_guesses;
  nb_guess = 0;
  await db.delete(schema.guesses);
};

/* 
 * Processes a trial from the user
 * Returns the response : 
 * - id of the guess
 * - trial that was sent
 * - number of correct colors
 * - number of correct positions
 * - message indicating the status of the game (playing with n guess left, win or lose)
*/
const try_guess = async (answer: number[]) => {
  let nb_positions = 0;
  let nb_colors = 0;
  let correct_colors = [];
  
  // for (let i = 0; i < secret_code.length; i++) {
  //   const element = answer[i];
  //   if (element == secret_code[i]) {
  //     nb_positions += 1;
  //     correct_colors.push(element);
  //   }
  // }
  // for (let color of answer) {
  //   if (!correct_colors.includes(color) && secret_code.includes(color)) {
  //     nb_colors += 1;
  //   }
  // }
  let secret_code_tmp = [...secret_code];
  for (let i = 0; i < secret_code.length; i++) {
    const element = answer[i];
    if(element == undefined) continue;

    if (element == secret_code[i]) {
      nb_positions += 1;
      correct_colors.push(element);
      secret_code_tmp.splice(secret_code.indexOf(element), 1);
    }
  }
  for (let i = 0; i < secret_code.length; i++) {
    const element = answer[i];
    if(element == undefined) continue;

    if (element != secret_code[i] && secret_code_tmp.includes(element)) {
      nb_colors += 1;
      secret_code_tmp.splice(secret_code.indexOf(element), 1);
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
  if (nb_guess >= guess_limit) {
    response.message = `You lost ! The correct code was : ${secret_code}`;
  } else if (nb_positions == secret_code.length) {
    response.message = `You won with ${nb_guess} guesses !`;
  }
  return response;
};

//main server routing
const server = Bun.serve({
  port: 8080,
  routes: {
    // {nb_colors = ..., nb_guesses = ...}
    "/api/start": {
      POST: async (req) => {
        const body = (await req.json()) as {
          nb_colors: number;
          nb_guesses: number;
          nb_slots: number;
        };
        await init(body.nb_colors, body.nb_slots, body.nb_guesses);
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
