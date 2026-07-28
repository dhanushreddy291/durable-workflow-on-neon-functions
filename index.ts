import { Hono } from "hono";
import { serve } from "inngest/hono";
import { inngest } from "./src/inngest/client";
import { functions } from "./src/inngest/functions";

const app = new Hono();

app.on(["GET", "PUT", "POST"], "/api/inngest",
  serve({
    client: inngest,
    functions,
  })
);

app.post("/api/events", async (c) => {
  const body = await c.req.json();
  const result = await inngest.send(body);
  return c.json({ ids: result.ids, status: 200 });
});

app.get("/", (c) => c.text("Example Inngest + Neon + Hono App"));

export default app;