import { generateWeekOnePlan } from "../server/openaiPlan";

type RequestLike = {
  method?: string;
  body?: { profile?: unknown };
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
    if (!profile || typeof profile !== "object") {
      response.status(400).json({ error: "Missing user profile" });
      return;
    }

    const plan = await generateWeekOnePlan(profile as Parameters<typeof generateWeekOnePlan>[0]);
    response.status(200).json({ plan });
  } catch (error) {
    response.status(500).json({
      error: error instanceof Error ? error.message : "Plan generation failed",
    });
  }
}
