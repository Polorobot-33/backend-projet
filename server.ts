import db from "./db";
import * as schema from "./db/schema";

let secret_code: number[] = [];
let current_guess: number = 0;
let max_colors: number = 0;
let max_guesses: number = 0;
let max_slots: number = 0;

//initiates a new game
const init = async (
  nb_colors: number,
  nb_slots: number,
  nb_guesses: number
) => {
  secret_code = [];
  for (let i = 0; i < nb_slots; i++) {
    secret_code.push(Math.floor(Math.random() * nb_colors));
  }
  current_guess = 0;
  max_guesses = nb_guesses;
  max_colors = nb_colors;
  max_slots = nb_slots;
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
  const secret_code_colors = [...secret_code];

  //check for correct positions
  for (let i = 0; i < secret_code.length; i++) {
    const element = answer[i];
    if (element == undefined) continue;
    if (element == secret_code[i]) {
      nb_positions += 1;
      secret_code_colors.splice(secret_code.indexOf(element), 1);
    }
  }

  //check for correct colors
  for (let i = 0; i < secret_code.length; i++) {
    const element = answer[i];
    if (element == undefined) continue;
    if (element != secret_code[i] && secret_code_colors.includes(element)) {
      nb_colors += 1;
      secret_code_colors.splice(secret_code.indexOf(element), 1);
    }
  }

  //create a response
  current_guess += 1;
  const data = {
    id: current_guess,
    guess: JSON.stringify(answer),
    correct_colors: nb_colors,
    correct_positions: nb_positions,
  };
  await db.insert(schema.guesses).values(data);
  const response = {
    data,
    message: `Keep trying ! You have ${
      max_guesses - current_guess
    } guesses left.`,
  };
  if (current_guess >= max_guesses) {
    response.message = `You lost ! The correct code was : ${secret_code}`;
  } else if (nb_positions == secret_code.length) {
    response.message = `You won with ${current_guess} guesses !`;
  }
  return response;
};

//security headers
const addCors = (res: Response) => {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  return res;
};

//delete previous game before starting a new one
await db.delete(schema.guesses);

//main server routing
const server = Bun.serve({
  port: 8080,
  routes: {
    // {nb_colors = ..., nb_guesses = ..., nb_slots = ...}
    "/api/start": {
      POST: async (req) => {
        try {
          const body = (await req.json()) as {
            nb_colors: number;
            nb_guesses: number;
            nb_slots: number;
          };
          if (!Number.isInteger(body.nb_colors) || body.nb_colors < 0)
            throw "nb_colors must be a positive integer";
          if (!Number.isInteger(body.nb_guesses) || body.nb_guesses < 0)
            throw "nb_guesses must be a positive integer";
          if (!Number.isInteger(body.nb_slots) || body.nb_slots < 0) {
            throw "nb_slots must be a positive integer";
          }
          await init(body.nb_colors, body.nb_slots, body.nb_guesses);
          return addCors(
            new Response(
              `Game started with ${body.nb_colors} colors, ${body.nb_slots} slots and a maximum limit of ${body.nb_guesses} guesses.`
            )
          );
        } catch (error) {
          return addCors(new Response("Invalid request : " + error));
        }
      },
    },

    // {guess = '[1, 2, 3 ...]'}
    "/api/guess": {
      POST: async (req) => {
        try {
          const body = (await req.json()) as { guess: number[] };
          if (!Array.isArray(body.guess)) throw "guess must be an array";
          if (body.guess.length != max_slots)
            throw `guess must have a lenght of ${max_slots}`;
          if (
            !body.guess.every(Number.isInteger) ||
            !body.guess.every((x) => x >= 1 && x <= max_colors)
          )
            throw `guess must contain integers between 0 and ${max_colors}`;
          return addCors(Response.json(await try_guess(body.guess)));
        } catch (error) {
          return addCors(new Response("Invalid request : " + error));
        }
      },
    },

    "/api/status": {
      GET: async () => {
        const data = await db.select().from(schema.guesses);
        return addCors(Response.json(data));
      },
    },

    "/*": addCors(Response.json({ message: "Not found" }, { status: 404 })),
  }
});

console.log(`Listening on ${server.url}`);
