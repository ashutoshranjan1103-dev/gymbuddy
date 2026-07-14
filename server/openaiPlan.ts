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
  dietPreference: string;
};

const weeklyPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: ["week", "title", "note", "days"],
  properties: {
    week: { type: "number" },
    title: { type: "string" },
    note: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "title", "focus", "isRestDay", "warmUp", "exercises", "coolDown"],
        properties: {
          day: { type: "string" },
          title: { type: "string" },
          focus: { type: "string" },
          isRestDay: { type: "boolean" },
          warmUp: {
            type: "array",
            items: { $ref: "#/$defs/activity" },
          },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["id", "muscleGroup", "main", "alternative"],
              properties: {
                id: { type: "string" },
                muscleGroup: { type: "string" },
                main: { $ref: "#/$defs/exerciseOption" },
                alternative: { $ref: "#/$defs/exerciseOption" },
              },
            },
          },
          coolDown: {
            type: "array",
            items: { $ref: "#/$defs/activity" },
          },
        },
      },
    },
  },
  $defs: {
    activity: {
      type: "object",
      additionalProperties: false,
      required: ["id", "name", "time", "sets", "reps", "paceOrLoad", "demoLink"],
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        time: { type: "string" },
        sets: { type: "string" },
        reps: { type: "string" },
        paceOrLoad: { type: "string" },
        demoLink: { type: "string" },
      },
    },
    exerciseOption: {
      type: "object",
      additionalProperties: false,
      required: ["name", "equipment", "sets", "repsPerSet", "weightGuide", "restSeconds", "demoLink", "formCue"],
      properties: {
        name: { type: "string" },
        equipment: { type: "string" },
        sets: { type: "string" },
        repsPerSet: { type: "string" },
        weightGuide: { type: "string" },
        restSeconds: { type: "number" },
        demoLink: { type: "string" },
        formCue: { type: "string" },
      },
    },
  },
};

const allowedExerciseLibrary = [
  "Treadmill walk | https://www.youtube.com/shorts/0nEo08l5xok",
  "Stationary Bike | https://www.youtube.com/shorts/z99qyGHnFLI",
  "Cycling | https://www.youtube.com/shorts/z99qyGHnFLI",
  "Cross trainer or treadmill | https://www.youtube.com/shorts/0nEo08l5xok",
  "Wrist rotations | https://www.youtube.com/shorts/hIFZobrkuC8",
  "Shoulder rolls | https://www.youtube.com/shorts/A7kgx8gGmPA",
  "Arm circles | https://www.youtube.com/shorts/scaEzppp2Kg",
  "Bodyweight squat | https://www.youtube.com/shorts/Qgpxx1Bxmgs",
  "Goblet Squat | https://www.youtube.com/shorts/lRYBbchqxtI",
  "Leg Press | https://www.youtube.com/shorts/nDh_BlnLCGc",
  "Machine Chest Press | https://www.youtube.com/shorts/0hiM3PE4f-Y",
  "Dumbbell Chest Press | https://www.youtube.com/shorts/d33SDkfL1yQ",
  "Incline Push-up | https://www.youtube.com/shorts/Mc-Kdwnx_M8",
  "Seated Cable Row | https://www.youtube.com/shorts/8QuMq1GMMng",
  "One-arm Dumbbell Row | https://www.youtube.com/shorts/aFtWSOruuhs",
  "Lat Pulldown | https://www.youtube.com/shorts/oMJmAHRZXBk",
  "Machine Shoulder Press | https://www.youtube.com/shorts/PM1hB_2xNBU",
  "Dumbbell Shoulder Press | https://www.youtube.com/shorts/OLePvpxQEGk",
  "Dumbbell Lateral Raise | https://www.youtube.com/shorts/eaM8JxEn6Ig",
  "Dumbbell Bicep Curl | https://www.youtube.com/shorts/PuaJzTatIJM",
  "Triceps Pushdown | https://www.youtube.com/shorts/leazgWMaSo8",
  "Forearm Plank | https://www.youtube.com/shorts/9j8-dM55J0M",
  "Dead Bug | https://www.youtube.com/shorts/zR1nT0huJ5k",
  "Glute Bridge | https://www.youtube.com/shorts/R1OXPHRqehw",
  "Step-ups | https://www.youtube.com/shorts/5ksu8nrdVIE",
  "Dumbbell Romanian Deadlift | https://www.youtube.com/shorts/wiekN4aIJ0g",
  "Leg Curl Machine | https://www.youtube.com/shorts/mDSpvNsBx1Y",
  "Leg Extension Machine | https://www.youtube.com/shorts/N32sIi1ktv4",
  "Standing Calf Raise | https://www.youtube.com/shorts/8sT7Ne3Kzwc",
  "Ab Crunch Machine | https://www.youtube.com/shorts/mnRhbUB3Fjs",
  "Calf stretch | https://www.youtube.com/shorts/7SO6QzfBRaE",
  "Hip stretch | https://www.youtube.com/shorts/o7CVX39LIaA",
  "Hip flexor stretch | https://www.youtube.com/shorts/Mh1FgwOVQB4",
  "Quad stretch | https://www.youtube.com/shorts/cVqb6UdfIpM",
  "Seated hamstring stretch | https://www.youtube.com/shorts/sctiIx9iWFQ",
  "Doorway chest stretch | https://www.youtube.com/shorts/CiIshHzAkQQ",
  "Full body stretch | https://www.youtube.com/shorts/rcUFPu65AwU",
  "Deep breathing | https://www.youtube.com/shorts/h1h0T-vCpOM",
].join("\n");

const allowedDumbbellKgValues = new Set([1, 2, 3, 4, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 30]);
const allowedPlateKgValues = new Set([2.5, 5, 7.5, 10, 12.5, 15, 20]);

const systemPrompt = `You are GymBuddy, a beginner-safe gym plan generator for Indian budget gym beginners.

Outcome: create only a Week 1 workout plan that helps the user walk into the gym with a clear plan.

Rules:
- Keep the plan beginner-friendly, confidence-building, and safe.
- Match plan difficulty to goal, confidence, experience, gym type, available days, and workout duration.
- Return exactly 7 calendar days: Day 1 through Day 7.
- Include exactly the number of workout days requested by the user and mark all remaining days as rest days with isRestDay true.
- Use these split patterns exactly:
  - 3 days: Day 1 Full Body (Squat & Push), Day 2 Rest, Day 3 Full Body (Hinge & Pull), Day 4 Rest, Day 5 Full Body (Lunge & Press), Day 6 Rest, Day 7 Rest.
  - 4 days: Day 1 Upper Body, Day 2 Lower Body, Day 3 Rest, Day 4 Upper Body, Day 5 Lower Body, Day 6 Rest, Day 7 Rest.
  - 5 days: Day 1 Push Day, Day 2 Pull Day, Day 3 Legs Day, Day 4 Rest for nervous system recovery, Day 5 Upper Body form practice, Day 6 Lower Body & Core, Day 7 Rest.
- For workout days, set isRestDay false. For rest days, set isRestDay true, use empty exercises, and include optional light recovery in cooldown only.
- Weekly set targets across workout days: chest 10-12 sets, back 10-12 sets, quads and hamstrings 10-12 sets, shoulders 6-8 sets, arms 6-8 sets, core 4-6 sets.
- Every day must include warm-up, workout exercises, and cooldown.
- Warm-up and cooldown must include exact time, reps, sets, pace/load, and a YouTube Shorts demo link.
- Every workout exercise must include one main option and one alternative option for busy machines.
- The alternative option must train the same or very similar muscle group as the main option. Example: chest press -> incline push-up is allowed; biceps curl -> lat pulldown is not allowed.
- Every main and alternative option must include equipment, sets, reps per set, beginner weight guidance, rest seconds, form cue, and a YouTube Shorts demo link.
- For workout exercises only, prescribe 3 or 4 sets. Do not use 1 or 2 working sets.
- For workout exercises only, reps must stay between 8 and 12.
- Use this beginner progression for 3 sets: Set 1: 12 reps with lighter weight, Set 2: 10 reps with slightly higher weight if form is clean, Set 3: 8 reps with the heaviest clean suggested weight.
- If suggesting 4 sets, Set 4 must use the same weight and reps as Set 3: 8 reps.
- Avoid timed workout exercises like plank holds in the main workout list. Use rep-based core movements like Dead Bug or Ab Crunch Machine instead.
- Weight guidance must be conservative, beginner-safe, and match real gym equipment.
- Dumbbell guidance must only use these available dumbbells: 1 kg, 2 kg, 3 kg, 4 kg, 5 kg, 7.5 kg, 10 kg, 12.5 kg, 15 kg, 17.5 kg, 20 kg, 22.5 kg, 25 kg, 30 kg.
- Plate guidance must only use these available plates: 2.5 kg, 5 kg, 7.5 kg, 10 kg, 12.5 kg, 15 kg, 20 kg.
- Use discrete choices like "5 kg or 7.5 kg dumbbell", not unavailable numbers like 6 kg or 8 kg.
- For cable/machine stacks where exact kg is unknown, say "lightest stack setting" or "1-2 light stack plates" instead of inventing kg.
- For injury or pain, do not prescribe exercises that stress the affected body part. You are not a doctor or physiotherapist, so replace affected-area exercises with other-body-part exercises and include a stop-if-pain cue.
- If the pain area is unclear or "Other", avoid loaded training for that day and use light recovery only.
- Use only common beginner gym exercises from the allowed library below.
- Do not suggest technical movements such as TRX, rings, kettlebell-only drills, battle ropes, sled push, farmer carry, suitcase carry, Pallof press, barbell deadlift, clean, snatch, burpee, box jump, or advanced free-weight lifts.
- Use the exact exercise names and demo links from this allowed library whenever possible.
- Do not include diet, calories, social features, subscription language, or advanced analytics.
- Do not include medical diagnosis.

Allowed exercise and demo library:
${allowedExerciseLibrary}`;

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

function validateAvailableWeights(plan: { days?: Array<{ exercises?: Array<{ main?: { weightGuide?: string }; alternative?: { weightGuide?: string } }> }> }) {
  const invalidGuides: string[] = [];

  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises ?? []) {
      for (const option of [exercise.main, exercise.alternative]) {
        const weightGuide = option?.weightGuide ?? "";
        const lowerGuide = weightGuide.toLowerCase();
        const allowedValues = lowerGuide.includes("dumbbell")
          ? allowedDumbbellKgValues
          : lowerGuide.includes("plate")
            ? allowedPlateKgValues
            : new Set([...allowedDumbbellKgValues, ...allowedPlateKgValues]);
        const kgMatches = weightGuide.matchAll(/(\d+(?:\.\d+)?)\s*kg/gi);
        for (const match of kgMatches) {
          const value = Number(match[1]);
          if (!allowedValues.has(value)) {
            invalidGuides.push(weightGuide);
            break;
          }
        }
      }
    }
  }

  if (invalidGuides.length) {
    throw new Error(`AI returned unavailable gym weight guidance: ${invalidGuides[0]}`);
  }
}

function validateExercisePrescription(plan: { days?: Array<{ exercises?: Array<{ main?: { sets?: string; repsPerSet?: string }; alternative?: { sets?: string; repsPerSet?: string } }> }> }) {
  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises ?? []) {
      for (const option of [exercise.main, exercise.alternative]) {
        const sets = Number.parseInt(option?.sets ?? "", 10);
        if (sets !== 3 && sets !== 4) {
          throw new Error(`AI returned invalid set count: ${option?.sets}`);
        }

        const repsText = option?.repsPerSet ?? "";
        const explicitRepNumbers = Array.from(repsText.matchAll(/(\d+)\s*reps?/gi)).map((match) => Number(match[1]));
        const repNumbers = explicitRepNumbers.length ? explicitRepNumbers : Array.from(repsText.matchAll(/\d+/g)).map((match) => Number(match[0]));
        if (!repNumbers.length || repNumbers.some((rep) => rep < 8 || rep > 12)) {
          throw new Error(`AI returned reps outside 8-12: ${repsText}`);
        }

        const expectedScheme = sets === 4 ? [12, 10, 8, 8] : [12, 10, 8];
        const actualScheme = repNumbers.slice(-expectedScheme.length);
        if (actualScheme.length !== expectedScheme.length || actualScheme.some((rep, index) => rep !== expectedScheme[index])) {
          throw new Error(`AI returned invalid rep progression: ${repsText}`);
        }
      }
    }
  }
}

const exerciseTargetByName: Record<string, string> = {
  "Goblet Squat": "legs",
  "Leg Press": "legs",
  "Step-ups": "legs",
  "Leg Curl Machine": "legs",
  "Leg Extension Machine": "legs",
  "Standing Calf Raise": "calves",
  "Machine Chest Press": "chest",
  "Dumbbell Chest Press": "chest",
  "Incline Push-up": "chest",
  "Seated Cable Row": "back",
  "One-arm Dumbbell Row": "back",
  "Lat Pulldown": "back",
  "Machine Shoulder Press": "shoulders",
  "Dumbbell Shoulder Press": "shoulders",
  "Dumbbell Lateral Raise": "shoulders",
  "Dumbbell Bicep Curl": "arms",
  "Triceps Pushdown": "arms",
  "Dead Bug": "core",
  "Ab Crunch Machine": "core",
};

const similarTargets: Record<string, string[]> = {
  legs: ["legs", "calves"],
  calves: ["calves", "legs"],
  chest: ["chest"],
  back: ["back"],
  shoulders: ["shoulders"],
  arms: ["arms"],
  core: ["core"],
};

function getExerciseTarget(name = "") {
  return exerciseTargetByName[name] ?? "";
}

function validateAlternativeTargets(plan: { days?: Array<{ exercises?: Array<{ main?: { name?: string }; alternative?: { name?: string } }> }> }) {
  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises ?? []) {
      const mainTarget = getExerciseTarget(exercise.main?.name);
      const alternativeTarget = getExerciseTarget(exercise.alternative?.name);
      if (mainTarget && alternativeTarget && !similarTargets[mainTarget]?.includes(alternativeTarget)) {
        throw new Error(`AI returned mismatched alternative: ${exercise.main?.name} -> ${exercise.alternative?.name}`);
      }
    }
  }
}

function exerciseTouchesPainArea(exercise: { muscleGroup?: string; main?: { name?: string }; alternative?: { name?: string } }, painArea: string) {
  const text = `${exercise.muscleGroup ?? ""} ${exercise.main?.name ?? ""} ${exercise.alternative?.name ?? ""}`.toLowerCase();
  if (painArea === "Knee") return /quad|hamstring|calf|squat|leg press|step-up|leg extension|lunge|calf/i.test(text);
  if (painArea === "Shoulder") return /chest|back|shoulder|arms|press|push-up|row|pulldown|lateral raise|triceps|curl/i.test(text);
  if (painArea === "Wrist") return /dumbbell|curl|push-up|press|row|pulldown|triceps|grip/i.test(text);
  if (painArea === "Back pain") return /back|hinge|romanian|row|pulldown|dead bug|crunch|squat|leg press/i.test(text);
  if (painArea === "Other") return true;
  return false;
}

function validateInjuryGuardrails(
  plan: { days?: Array<{ exercises?: Array<{ muscleGroup?: string; main?: { name?: string }; alternative?: { name?: string } }> }> },
  profile: UserProfile,
) {
  if (!profile.injuryOrPain || profile.injuryOrPain === "No pain") return;

  for (const day of plan.days ?? []) {
    for (const exercise of day.exercises ?? []) {
      if (exerciseTouchesPainArea(exercise, profile.injuryOrPain)) {
        throw new Error(`AI returned exercise that may stress ${profile.injuryOrPain}: ${exercise.main?.name}`);
      }
    }
  }
}

export async function generateWeekOnePlan(profile: UserProfile, apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const supportsReasoning = model.startsWith("gpt-5") || model.startsWith("o");
  const requestBody: Record<string, unknown> = {
    model,
    max_output_tokens: 5200,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: JSON.stringify({
              name: profile.name || "Not provided",
              age: profile.age || "Not provided",
              gender: profile.gender,
              goal: profile.goal,
              experienceLevel: profile.experienceLevel,
              gymType: profile.gymType,
              daysPerWeek: profile.daysPerWeek,
              workoutDuration: profile.workoutDuration,
              heightCm: profile.height,
              weightKg: profile.weight,
              bmi: profile.bmi,
              bmiCategory: profile.bmiCategory,
              injuryOrPain: profile.injuryOrPain,
              injuryDetail: profile.injuryDetail || "None",
              confidenceLevel: profile.confidenceLevel,
              dietPreference: profile.dietPreference,
            }),
          },
        ],
      },
    ],
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: "gymbuddy_week_one_plan",
        strict: true,
        schema: weeklyPlanSchema,
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
    const message = (payload as { error?: { message?: string } }).error?.message || "OpenAI request failed";
    throw new Error(message);
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    throw new Error("OpenAI returned an empty plan");
  }

  const plan = JSON.parse(outputText);
  validateAvailableWeights(plan);
  validateExercisePrescription(plan);
  validateAlternativeTargets(plan);
  validateInjuryGuardrails(plan, profile);
  return plan;
}
