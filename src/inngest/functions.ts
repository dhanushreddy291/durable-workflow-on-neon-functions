import { inngest } from "./client";
import { pool } from "../db";
import { generateText, isStepCount, tool } from "ai";
import { neon } from "@neon/ai-sdk-provider";
import z from "zod";

const webSearch = tool({
    description: "Search the web for up-to-date information, news, and real-time events.",
    inputSchema: z.object({
        query: z.string().describe("The search query string"),
    }),
    execute: async ({ query }) => {
        // Mock implementation: returns placeholder data for local testing.
        // Replace with a real search provider (e.g. Brave Search, Exa, Tavily) for production use.
        return {
            query,
            results: [
                `${query} is a leading technology company specializing in innovative solutions for modern businesses. They have a strong presence in the APAC region and are known for their cutting-edge products and services.`,
                `${query} is founded in ${Math.floor(Math.random() * 20 + 2000)} and has recently expanded into AI code sandbox environments. Their recent funding round raised $${Math.floor(Math.random() * 100 + 50)}M, signaling strong investor confidence.`,
            ],
        };
    },
});

export const processLeadWorkflow = inngest.createFunction(
    { id: "process-lead-workflow", retries: 3, triggers: [{ event: "app/lead.created" }] },
    async ({ event, step }) => {
        const { leadId, email, company } = event.data;

        // Step 1: Initialize record in Neon Postgres
        await step.run("save-lead-to-db", async () => {
            await pool.query(`
                INSERT INTO leads (id, email, company, status)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET status = $4
                `,
                [leadId, email, company, "processing"]
            );
            return { leadId, status: "processing" };
        });

        // Step 2: Research company using web search and generate summary
        const aiSummary = await step.run("generate-ai-summary", async () => {
            const { text } = await generateText({
                model: neon("gpt-oss-120b"),
                prompt: `Research the company "${company}" (contact: ${email}). Find information about their products, services, recent news, and market position. Then write a concise 2-sentence executive summary highlighting potential business opportunities and key insights.`,
                system: "You are a lead enrichment assistant. Provide information about companies based on your knowledge. Be concise and actionable.",
                tools: { webSearch },
                stopWhen: isStepCount(3)
            });
            return text;
        });

        // Step 3: Simulate a processing window with a durable sleep
        await step.sleep("wait-for-processing-window", "5s");

        // Step 4: Persist final result back to Postgres
        await step.run("complete-lead-processing", async () => {
            await pool.query(
                `UPDATE leads SET summary = $1, status = $2 WHERE id = $3`,
                [aiSummary, "completed", leadId]
            );
            return { leadId, status: "completed" };
        });

        return { success: true, leadId, summary: aiSummary };
    }
);

export const functions = [processLeadWorkflow];