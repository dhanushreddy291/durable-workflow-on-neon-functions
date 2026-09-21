import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  branch: (branch) => {
    if (branch.isDefault) { return {}; }
    if (!branch.exists) { return { ttl: "7d" }; }
    return {};
  },
  preview: {
    functions: {
      inngest: {
        name: "Inngest Workflow Endpoint",
        source: "./index.ts",
        env: {
          INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY!,
          INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY!,
        },
      }
    },
    aiGateway: true
  },
});