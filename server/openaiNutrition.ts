type UserProfile = {
  name: string;
  age: string;
  gender: string;
  goal: string;
  experienceLevel: string;
  gymType: string;
  daysPerWeek: string;
  workoutDuration: string;
  height: string;
  weight: string;
  bmi: number | null;
  bmiCategory: string;
  injuryOrPain: string;
  injuryDetail: string;
  confidenceLevel: string;
  dietPreference: "Vegetarian" | "Non-vegetarian" | "Eggetarian" | "Vegan";
  bodyGoal: "Lose weight slowly" | "Maintain weight" | "Gain muscle slowly";
};

type MacroTargets = {
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  waterLiters: number;
};

type NutritionPlan = {
  dietPreference: UserProfile["dietPreference"];
  bodyGoal: UserProfile["bodyGoal"];
  maintenanceCalories: number | null;
  targetCalories: number | null;
  macros: MacroTargets | null;
  meals: Array<{ label: string; value: string }>;
  workoutFood: {
    before: string;
    after: string;
    hydration: string;
  };
  note: string;
};

const nutritionPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["dietPreference", "bodyGoal", "maintenanceCalories", "targetCalories", "macros", "meals", "workoutFood", "note"],
  properties: {
    dietPreference: { type: "string", enum: ["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"] },
    bodyGoal: { type: "string", enum: ["Lose weight slowly", "Maintain weight", "Gain muscle slowly"] },
    maintenanceCalories: { type: ["number", "null"] },
    targetCalories: { type: ["number", "null"] },
    macros: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["protein", "carbs", "fats", "fiber", "waterLiters"],
      properties: {
        protein: { type: "number" },
        carbs: { type: "number" },
        fats: { type: "number" },
        fiber: { type: "number" },
        waterLiters: { type: "number" },
      },
    },
    meals: {
      type: "array",
      minItems: 4,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
    },
    workoutFood: {
      type: "object",
      additionalProperties: false,
      required: ["before", "after", "hydration"],
      properties: {
        before: { type: "string" },
        after: { type: "string" },
        hydration: { type: "string" },
      },
    },
    note: { type: "string" },
  },
};

const nutritionSystemPrompt = `You are GymBuddy's nutrition helper for Indian budget gym beginners.

Create simple, non-medical food guidance for the selected diet preference.

Rules:
- Return structured JSON only.
- Keep meals Indian, affordable, beginner-friendly, and easy to cook or buy near home/college/work.
- Respect the diet preference strictly.
- Respect the weekly body goal; food choices should support that direction without sounding extreme.
- Use the provided calorie and macro targets exactly; do not invent different numbers.
- Treat waterLiters as the user's daily water-drinking target. Do not explain the hidden fluid calculation.
- Keep each meal suggestion short and practical.
- Do not create a strict medical diet plan, disease treatment plan, supplement plan, or extreme deficit.
- Do not mention OpenAI, API, fallback, or model status.
- Add a gentle note that portions can be adjusted based on hunger, digestion, and progress.`;

function extractOutputText(payload: unknown) {
  const data = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (data.output_text) return data.output_text;
  return data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && content.text)
    .map((content) => content.text)
    .join("");
}

function normalizeNutritionPlan(plan: NutritionPlan, profile: UserProfile, targets: NutritionPlan): NutritionPlan {
  if (plan.dietPreference !== profile.dietPreference) {
    throw new Error("Nutrition plan did not respect diet preference");
  }
  if (plan.bodyGoal !== profile.bodyGoal) {
    throw new Error("Nutrition plan did not respect body goal");
  }

  if (!Array.isArray(plan.meals) || plan.meals.length < 4) {
    throw new Error("Nutrition plan returned too few meal choices");
  }

  return {
    ...plan,
    dietPreference: profile.dietPreference,
    bodyGoal: profile.bodyGoal,
    maintenanceCalories: targets.maintenanceCalories,
    targetCalories: targets.targetCalories,
    macros: targets.macros,
  };
}

export async function generateNutritionPlan(profile: UserProfile, targets: NutritionPlan, apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const supportsReasoning = model.startsWith("gpt-5") || model.startsWith("o");
  const requestBody: Record<string, unknown> = {
    model,
    max_output_tokens: 900,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: nutritionSystemPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              profile: {
                age: profile.age,
                gender: profile.gender,
                goal: profile.goal,
                experienceLevel: profile.experienceLevel,
                daysPerWeek: profile.daysPerWeek,
                workoutDuration: profile.workoutDuration,
                bmi: profile.bmi,
                bmiCategory: profile.bmiCategory,
                dietPreference: profile.dietPreference,
                bodyGoal: profile.bodyGoal,
              },
              targets: {
                maintenanceCalories: targets.maintenanceCalories,
                targetCalories: targets.targetCalories,
                macros: targets.macros,
              },
            }),
          },
        ],
      },
    ],
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "gymbuddy_nutrition_plan",
        strict: true,
        schema: nutritionPlanSchema,
      },
    },
  };

  if (supportsReasoning) {
    requestBody.reasoning = { effort: "low" };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = (payload as { error?: { message?: string } }).error?.message || "OpenAI nutrition request failed";
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI returned an empty nutrition plan");
  }

  return normalizeNutritionPlan(JSON.parse(outputText) as NutritionPlan, profile, targets);
}
