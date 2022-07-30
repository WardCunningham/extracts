import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
await serve(async (_req) => {
  try {
    await new Promise (resolve => setInterval(resolve,1000))
  } catch (e) {
    console.log(e)
  }
  return new Response("Hello World!", {
    headers: { "content-type": "text/plain" },
  });
});