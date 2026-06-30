import { generateNutritionPlan } from "../server/openaiNutrition";

type RequestLike = {
  method?: string;
  body?: { profile?: unknown; targets?: unknown };
};

type ResponseLike = {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

export default async function handler(request: RequestLike, response: ResponseLike) {
  response.setHeader?.("Cache-Control", "no-store");

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const profile = request.body?.profile;
    const targets = request.body?.targets;
    if (!profile || typeof profile !== "object" || !targets || typeof targets !== "object") {
      response.status(400).json({ error: "Missing nutrition inputs" });
      return;
    }

    const nutritionPlan = await generateNutritionPlan(
      profile as Parameters<typeof generateNutritionPlan>[0],
      targets as Parameters<typeof generateNutritionPlan>[1],
    );
    response.status(200).json({ nutritionPlan });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Nutrition generation failed",
    });
  }
}
