import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { generateNutritionPlan } from "./server/openaiNutrition";
import { generateWeekOnePlan } from "./server/openaiPlan";

function gymBuddyApiPlugin(apiKey?: string): Plugin {
  return {
    name: "gymbuddy-api",
    configureServer(server) {
      server.middlewares.use("/api/generate-plan", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");

        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
          }

          const payload = JSON.parse(body) as { profile?: Parameters<typeof generateWeekOnePlan>[0] };
          if (!payload.profile) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: "Missing user profile" }));
            return;
          }

          const plan = await generateWeekOnePlan(payload.profile, apiKey);
          response.statusCode = 200;
          response.end(JSON.stringify({ plan }));
        } catch (error) {
          response.statusCode = 500;
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Plan generation failed",
            }),
          );
        }
      });

      server.middlewares.use("/api/generate-nutrition", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");

        if (request.method !== "POST") {
          response.statusCode = 405;
          response.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          let body = "";
          for await (const chunk of request) {
            body += chunk;
          }

          const payload = JSON.parse(body) as {
            profile?: Parameters<typeof generateNutritionPlan>[0];
            targets?: Parameters<typeof generateNutritionPlan>[1];
          };
          if (!payload.profile || !payload.targets) {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: "Missing nutrition inputs" }));
            return;
          }

          const nutritionPlan = await generateNutritionPlan(payload.profile, payload.targets, apiKey);
          response.statusCode = 200;
          response.end(JSON.stringify({ nutritionPlan }));
        } catch (error) {
          response.statusCode = 500;
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : "Nutrition generation failed",
            }),
          );
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), gymBuddyApiPlugin(env.OPENAI_API_KEY || process.env.OPENAI_API_KEY)],
  };
});
