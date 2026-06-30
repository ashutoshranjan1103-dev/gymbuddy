import { Apple, ArrowLeft, BarChart3, CalendarDays, CheckCircle2, ChevronRight, Cloud, Dumbbell, HeartPulse, LogOut, Mail, Sparkles, Timer, User, Wand2 } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase, type Session } from "./lib/supabase";

type Screen = "welcome" | "onboarding" | "loading" | "save-plan" | "weekly-plan" | "today-workout" | "check-in" | "adaptation" | "nutrition" | "progress" | "profile";

type BodyGoal = "Lose weight slowly" | "Maintain weight" | "Gain muscle slowly";

type UserProfile = {
  name: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  goal: "Lose fat" | "Build strength" | "Build muscle" | "General fitness";
  experienceLevel: "First time" | "Beginner" | "Restarting after break";
  gymType: "Basic gym" | "Highly equipped gym";
  daysPerWeek: "3 days" | "4 days" | "5 days";
  workoutDuration: "30 minutes" | "45 minutes" | "60 minutes";
  height: string;
  weight: string;
  bmi: number | null;
  bmiCategory: "Underweight range" | "Healthy range" | "Overweight range" | "Obese range" | "";
  injuryOrPain: "No pain" | "Knee" | "Shoulder" | "Back pain" | "Wrist" | "Other";
  injuryDetail: string;
  confidenceLevel: "Low" | "Medium" | "High";
  dietPreference: "Vegetarian" | "Non-vegetarian" | "Eggetarian" | "Vegan";
  bodyGoal: BodyGoal;
};

type Exercise = {
  id: string;
  muscleGroup: string;
  main: ExerciseOption;
  alternative: ExerciseOption;
};

type ExerciseOption = {
  name: string;
  equipment: string;
  sets: string;
  repsPerSet: string;
  weightGuide: string;
  restSeconds: number;
  demoLink: string;
  formCue: string;
};

type PlanActivity = {
  id: string;
  name: string;
  time: string;
  sets: string;
  reps: string;
  paceOrLoad: string;
  demoLink: string;
};

type DayPlan = {
  day: string;
  title: string;
  focus: string;
  isRestDay?: boolean;
  warmUp: PlanActivity[];
  exercises: Exercise[];
  coolDown: PlanActivity[];
};

type WeeklyPlan = {
  week: number;
  title: string;
  note: string;
  days: DayPlan[];
};

type NutritionMeal = {
  label: string;
  value: string;
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
  bodyGoal: BodyGoal;
  maintenanceCalories: number | null;
  targetCalories: number | null;
  macros: MacroTargets | null;
  meals: NutritionMeal[];
  workoutFood: {
    before: string;
    after: string;
    hydration: string;
  };
  note: string;
};

type WeightLogEntry = {
  id: string;
  date: string;
  weight: number;
  bmi: number | null;
  maintenanceCalories: number | null;
  targetCalories: number | null;
};

type ExerciseStatus = "Done" | "Partially done" | "Not done";
type ExerciseCompletion = Record<string, ExerciseStatus>;
type ExerciseSelection = Record<string, "main" | "alternative">;
type PlanSource = "idle" | "ai" | "fallback";
type NutritionSource = "idle" | "ai" | "fallback";
type AuthStatus = "checking" | "signed-in" | "signed-out" | "unconfigured";
type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error";
type CalendarDayStatus = "done" | "partial" | "missed" | "rest" | "pending";
type ReminderPermission = NotificationPermission | "unsupported";

type ReminderSettings = {
  enabled: boolean;
  hour: string;
  minute: string;
  period: "AM" | "PM";
  time?: string;
  lastSentKey: string;
};

type CalendarDayProgress = {
  dayNumber: number;
  title: string;
  percent: number;
  status: CalendarDayStatus;
  isRestDay: boolean;
  done: number;
  partial: number;
  total: number;
};

type WeekProgressSnapshot = {
  week: number;
  title: string;
  updatedAt: string;
  weeklyPercent: number;
  days: CalendarDayProgress[];
};

type MonthlyProgress = Record<string, WeekProgressSnapshot>;

type VideoTarget = {
  title: string;
  url: string;
};

type WorkoutCheckIn = {
  completionStatus: "Completed" | "Partly completed" | "Skipped";
  difficulty: "Easy" | "Manageable" | "Hard";
  painStatus: "No pain" | "Mild discomfort" | "Pain";
  painArea: "Not sure" | UserProfile["injuryOrPain"];
  confidence: "Low" | "Medium" | "High";
};

type RemoteAppState = {
  user_id: string;
  profile: UserProfile | null;
  weekly_plan: WeeklyPlan | null;
  exercise_completion: ExerciseCompletion | null;
  exercise_selection: ExerciseSelection | null;
  check_in: WorkoutCheckIn | null;
  adapted_plan: string | null;
  plan_profile_signature: string | null;
  current_week: number | null;
  updated_at: string | null;
};

const STORAGE_KEYS = {
  profile: "gymbuddy:user-profile",
  plan: "gymbuddy:weekly-plan",
  completion: "gymbuddy:exercise-completion",
  exerciseSelection: "gymbuddy:exercise-selection",
  checkIn: "gymbuddy:workout-check-in",
  adaptation: "gymbuddy:next-week-plan",
  aiPrompt: "gymbuddy:ai-week-one-prompt",
  planProfileSignature: "gymbuddy:plan-profile-signature",
  planSource: "gymbuddy:plan-source",
  aiError: "gymbuddy:ai-error",
  selectedDayIndex: "gymbuddy:selected-day-index",
  lastActiveScreen: "gymbuddy:last-active-screen",
  lastActiveDate: "gymbuddy:last-active-date",
  monthlyProgress: "gymbuddy:monthly-progress",
  reminderSettings: "gymbuddy:reminder-settings",
  nutritionPlan: "gymbuddy:nutrition-plan",
  nutritionSignature: "gymbuddy:nutrition-signature",
  nutritionSource: "gymbuddy:nutrition-source",
  nutritionError: "gymbuddy:nutrition-error",
  weightLog: "gymbuddy:weekly-weight-log",
};

const NUTRITION_TARGET_VERSION = "drink-water-standard-v3";

const initialReminderSettings: ReminderSettings = {
  enabled: false,
  hour: "",
  minute: "",
  period: "PM",
  lastSentKey: "",
};

const initialProfile: UserProfile = {
  name: "",
  age: "",
  gender: "Male",
  goal: "Build strength",
  experienceLevel: "Beginner",
  gymType: "Basic gym",
  daysPerWeek: "4 days",
  workoutDuration: "45 minutes",
  height: "",
  weight: "",
  bmi: null,
  bmiCategory: "",
  injuryOrPain: "No pain",
  injuryDetail: "",
  confidenceLevel: "Low",
  dietPreference: "Vegetarian",
  bodyGoal: "Maintain weight",
};

const initialCheckIn: WorkoutCheckIn = {
  completionStatus: "Completed",
  difficulty: "Manageable",
  painStatus: "No pain",
  painArea: "Not sure",
  confidence: "Medium",
};

const DEMO_SHORTS: Record<string, string> = {
  "Treadmill walk": "https://www.youtube.com/shorts/0nEo08l5xok",
  "Easy treadmill walk": "https://www.youtube.com/shorts/0nEo08l5xok",
  "Slow walk": "https://www.youtube.com/shorts/0nEo08l5xok",
  "Stationary Bike": "https://www.youtube.com/shorts/z99qyGHnFLI",
  "Bike or treadmill": "https://www.youtube.com/shorts/z99qyGHnFLI",
  "Wrist rotations": "https://www.youtube.com/shorts/hIFZobrkuC8",
  "Shoulder rolls": "https://www.youtube.com/shorts/A7kgx8gGmPA",
  "Arm circles": "https://www.youtube.com/shorts/scaEzppp2Kg",
  "Bodyweight squat": "https://www.youtube.com/shorts/Qgpxx1Bxmgs",
  "Goblet Squat": "https://www.youtube.com/shorts/lRYBbchqxtI",
  "Leg Press": "https://www.youtube.com/shorts/nDh_BlnLCGc",
  "Machine Chest Press": "https://www.youtube.com/shorts/0hiM3PE4f-Y",
  "Dumbbell Chest Press": "https://www.youtube.com/shorts/d33SDkfL1yQ",
  "Incline Push-up": "https://www.youtube.com/shorts/Mc-Kdwnx_M8",
  "Seated Cable Row": "https://www.youtube.com/shorts/8QuMq1GMMng",
  "One-arm Dumbbell Row": "https://www.youtube.com/shorts/aFtWSOruuhs",
  "Lat Pulldown": "https://www.youtube.com/shorts/oMJmAHRZXBk",
  "Machine Shoulder Press": "https://www.youtube.com/shorts/PM1hB_2xNBU",
  "Dumbbell Shoulder Press": "https://www.youtube.com/shorts/OLePvpxQEGk",
  "Dumbbell Lateral Raise": "https://www.youtube.com/shorts/eaM8JxEn6Ig",
  "Dumbbell Bicep Curl": "https://www.youtube.com/shorts/PuaJzTatIJM",
  "Triceps Pushdown": "https://www.youtube.com/shorts/leazgWMaSo8",
  "Forearm Plank": "https://www.youtube.com/shorts/9j8-dM55J0M",
  "Dead Bug": "https://www.youtube.com/shorts/zR1nT0huJ5k",
  "Glute Bridge": "https://www.youtube.com/shorts/R1OXPHRqehw",
  "Step-ups": "https://www.youtube.com/shorts/5ksu8nrdVIE",
  "Dumbbell Romanian Deadlift": "https://www.youtube.com/shorts/wiekN4aIJ0g",
  "Leg Curl Machine": "https://www.youtube.com/shorts/mDSpvNsBx1Y",
  "Leg Extension Machine": "https://www.youtube.com/shorts/N32sIi1ktv4",
  "Standing Calf Raise": "https://www.youtube.com/shorts/8sT7Ne3Kzwc",
  "Ab Crunch Machine": "https://www.youtube.com/shorts/mnRhbUB3Fjs",
  "Calf stretch": "https://www.youtube.com/shorts/sctiIx9iWFQ",
  "Hip flexor stretch": "https://www.youtube.com/shorts/coLwbVbw6yM",
  "Seated hamstring stretch": "https://www.youtube.com/shorts/sctiIx9iWFQ",
  "Doorway chest stretch": "https://www.youtube.com/shorts/_lBeMy0MKLY",
  "Deep breathing": "https://www.youtube.com/shorts/RXu1HOfsxII",
};

const FALLBACK_DEMO_SHORT = "https://www.youtube.com/shorts/Qgpxx1Bxmgs";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key) ?? readCookieStorage(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  const serializedValue = JSON.stringify(value);
  localStorage.setItem(key, serializedValue);
  writeCookieStorage(key, serializedValue);
}

function getCookieStorageName(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function readCookieStorage(key: string) {
  const cookieName = `${getCookieStorageName(key)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(cookieName));
  return cookie ? decodeURIComponent(cookie.slice(cookieName.length)) : null;
}

function writeCookieStorage(key: string, serializedValue: string) {
  const cookieName = getCookieStorageName(key);
  const encodedValue = encodeURIComponent(serializedValue);

  // Browser cookies are small. Keep full weekly plans in localStorage and mirror only lightweight resume data.
  if (encodedValue.length > 3600) {
    document.cookie = `${cookieName}=; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${cookieName}=${encodedValue}; Max-Age=15552000; Path=/; SameSite=Lax`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWeekStartKey(date = new Date()) {
  const localDate = new Date(date);
  const day = localDate.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  localDate.setDate(localDate.getDate() + mondayOffset);
  return getLocalDateKey(localDate);
}

function getNotificationPermission(): ReminderPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function isWorkoutDayComplete(day: DayPlan, completion: ExerciseCompletion) {
  return !day.isRestDay && day.exercises.length > 0 && day.exercises.every((exercise) => completion[exercise.id] === "Done");
}

function getNextWorkoutDayIndex(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return 0;
  const nextIncompleteWorkout = plan.days.findIndex((day) => !day.isRestDay && !isWorkoutDayComplete(day, completion));
  if (nextIncompleteWorkout >= 0) return nextIncompleteWorkout;
  const firstWorkout = plan.days.findIndex((day) => !day.isRestDay);
  return firstWorkout >= 0 ? firstWorkout : 0;
}

function getResumeDayIndex(plan: WeeklyPlan | null, completion: ExerciseCompletion, storedIndex: number) {
  if (!plan) return 0;
  const lastActiveDate = readStorage(STORAGE_KEYS.lastActiveDate, "");
  const safeStoredIndex = Number.isFinite(storedIndex) ? Math.min(Math.max(storedIndex, 0), plan.days.length - 1) : 0;
  return lastActiveDate === getTodayKey() ? safeStoredIndex : getNextWorkoutDayIndex(plan, completion);
}

function getInitialScreen(): Screen {
  const plan = readStorage<WeeklyPlan | null>(STORAGE_KEYS.plan, null);
  if (!plan) return "welcome";

  const lastActiveDate = readStorage(STORAGE_KEYS.lastActiveDate, "");
  const lastScreen = readStorage<Screen>(STORAGE_KEYS.lastActiveScreen, "weekly-plan");
  const sameDayResumeScreens: Screen[] = ["weekly-plan", "today-workout", "check-in", "adaptation", "nutrition", "progress", "profile", "save-plan"];

  if (lastActiveDate === getTodayKey() && sameDayResumeScreens.includes(lastScreen)) {
    return lastScreen;
  }

  return "weekly-plan";
}

function normalizeProfile(savedProfile: Partial<UserProfile>): UserProfile {
  if (!savedProfile.bmiCategory && !savedProfile.injuryOrPain) {
    return initialProfile;
  }

  const savedGymType = String(savedProfile.gymType ?? "");
  const savedWorkoutDuration = String(savedProfile.workoutDuration ?? "");
  const savedDaysPerWeek = String(savedProfile.daysPerWeek ?? "");
  const savedInjuryOrPain = String(savedProfile.injuryOrPain ?? "");

  return {
    ...initialProfile,
    ...savedProfile,
    name: savedProfile.name ?? "",
    age: savedProfile.age ?? "",
    gymType:
      savedGymType === "Basic"
        ? "Basic gym"
        : savedGymType === "Highly Equipped" || savedGymType === "Highly equipped gym"
          ? "Highly equipped gym"
          : initialProfile.gymType,
    workoutDuration:
      savedWorkoutDuration === "30 minutes"
        ? "30 minutes"
        : savedWorkoutDuration === "60 minutes" || savedWorkoutDuration === "75 minutes"
          ? "60 minutes"
          : initialProfile.workoutDuration,
    daysPerWeek: savedDaysPerWeek === "3 days" ? "3 days" : savedDaysPerWeek === "5 days" || savedDaysPerWeek === "6 days" ? "5 days" : initialProfile.daysPerWeek,
    bmiCategory: getBmiCategory(savedProfile.bmi ?? null),
    injuryOrPain: savedInjuryOrPain === "Back" ? "Back pain" : savedProfile.injuryOrPain ?? initialProfile.injuryOrPain,
    injuryDetail: savedProfile.injuryDetail ?? "",
    dietPreference: savedProfile.dietPreference ?? initialProfile.dietPreference,
    bodyGoal: savedProfile.bodyGoal ?? initialProfile.bodyGoal,
  };
}

function normalizeCheckIn(savedCheckIn: Partial<WorkoutCheckIn>): WorkoutCheckIn {
  return {
    ...initialCheckIn,
    ...savedCheckIn,
    painArea: savedCheckIn.painArea ?? "Not sure",
  };
}

function getProfileSignature(profile: UserProfile) {
  return JSON.stringify({
    name: profile.name.trim(),
    age: profile.age.trim(),
    gender: profile.gender,
    goal: profile.goal,
    experienceLevel: profile.experienceLevel,
    gymType: profile.gymType,
    daysPerWeek: profile.daysPerWeek,
    workoutDuration: profile.workoutDuration,
    height: profile.height,
    weight: profile.weight,
    injuryOrPain: profile.injuryOrPain,
    injuryDetail: profile.injuryOrPain === "Other" ? profile.injuryDetail.trim() : "",
    confidenceLevel: profile.confidenceLevel,
    dietPreference: profile.dietPreference,
  });
}

function getNutritionSignature(profile: UserProfile) {
  return JSON.stringify({
    age: profile.age.trim(),
    gender: profile.gender,
    goal: profile.goal,
    daysPerWeek: profile.daysPerWeek,
    workoutDuration: profile.workoutDuration,
    height: profile.height,
    weight: profile.weight,
    bmi: profile.bmi,
    bmiCategory: profile.bmiCategory,
    dietPreference: profile.dietPreference,
    bodyGoal: profile.bodyGoal,
    targetVersion: NUTRITION_TARGET_VERSION,
  });
}

function calculateBmi(heightCm: string, weightKg: string) {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!height || !weight) return null;
  const heightM = height / 100;
  return Number((weight / (heightM * heightM)).toFixed(1));
}

function getBmiCategory(bmi: number | null): UserProfile["bmiCategory"] {
  if (!bmi) return "";
  if (bmi < 18.5) return "Underweight range";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight range";
  return "Obese range";
}

function roundToNearest50(value: number) {
  return Math.round(value / 50) * 50;
}

function getActivityFactor(daysPerWeek: UserProfile["daysPerWeek"]) {
  if (daysPerWeek === "3 days") return 1.375;
  if (daysPerWeek === "5 days") return 1.55;
  return 1.45;
}

function calculateMaintenanceCalories(profile: UserProfile) {
  const age = Number(profile.age);
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  if (!age || !height || !weight) return null;

  const maleBmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const femaleBmr = 10 * weight + 6.25 * height - 5 * age - 161;
  const bmr = profile.gender === "Male" ? maleBmr : profile.gender === "Female" ? femaleBmr : (maleBmr + femaleBmr) / 2;
  return roundToNearest50(bmr * getActivityFactor(profile.daysPerWeek));
}

function calculateTargetCalories(profile: UserProfile) {
  const maintenance = calculateMaintenanceCalories(profile);
  if (!maintenance) return null;

  let adjustment = 0;
  if (profile.bodyGoal === "Lose weight slowly") {
    adjustment = profile.bmiCategory === "Underweight range" ? 0 : profile.bmiCategory === "Healthy range" ? -250 : -400;
  }
  if (profile.bodyGoal === "Gain muscle slowly") {
    adjustment = profile.bmiCategory === "Overweight range" || profile.bmiCategory === "Obese range" ? 100 : 250;
  }

  const minimum = profile.gender === "Female" ? 1200 : 1500;
  return Math.max(minimum, roundToNearest50(maintenance + adjustment));
}

function getRecommendedBodyGoal(profile: UserProfile): BodyGoal {
  if (profile.bmiCategory === "Underweight range") return "Gain muscle slowly";
  if (profile.bmiCategory === "Overweight range" || profile.bmiCategory === "Obese range") return "Lose weight slowly";
  if (profile.goal === "Build muscle") return "Gain muscle slowly";
  if (profile.goal === "Lose fat") return "Lose weight slowly";
  return "Maintain weight";
}

function getProteinTarget(profile: UserProfile) {
  const weight = Number(profile.weight);
  if (!weight) return null;
  return {
    low: Math.round(weight * 1.4),
    high: Math.round(weight * 1.8),
  };
}

function getDailyWaterToDrinkLiters(profile: UserProfile) {
  const beverageShare = 0.8;
  if (profile.gender === "Female") return Number((2.7 * beverageShare).toFixed(1));
  if (profile.gender === "Male") return Number((3.7 * beverageShare).toFixed(1));
  return Number((3.2 * beverageShare).toFixed(1));
}

function calculateMacroTargets(profile: UserProfile): MacroTargets | null {
  const targetCalories = calculateTargetCalories(profile);
  const weight = Number(profile.weight);
  if (!targetCalories || !weight) return null;

  const proteinMultiplier = profile.bodyGoal === "Maintain weight" ? 1.5 : 1.7;
  const protein = Math.round(weight * proteinMultiplier);
  const fats = Math.max(40, Math.round((targetCalories * 0.25) / 9));
  const carbCalories = Math.max(0, targetCalories - protein * 4 - fats * 9);
  const carbs = Math.round(carbCalories / 4);
  const fiber = profile.gender === "Female" ? 25 : 30;
  const waterLiters = getDailyWaterToDrinkLiters(profile);

  return { protein, carbs, fats, fiber, waterLiters };
}

function getNutritionMeals(preference: UserProfile["dietPreference"]) {
  const meals: Record<UserProfile["dietPreference"], NutritionMeal[]> = {
    Vegetarian: [
      { label: "Breakfast", value: "Poha/upma + curd, or paneer sandwich" },
      { label: "Lunch", value: "Dal + rice/roti + sabzi + curd" },
      { label: "Dinner", value: "Paneer/tofu bhurji + roti + salad" },
      { label: "Snack", value: "Fruit + curd, roasted chana, or peanut chikki" },
    ],
    "Non-vegetarian": [
      { label: "Breakfast", value: "Eggs + toast, or curd + oats" },
      { label: "Lunch", value: "Chicken/egg curry + rice/roti + salad" },
      { label: "Dinner", value: "Chicken/fish + roti + vegetables" },
      { label: "Snack", value: "Boiled eggs, curd, fruit, or roasted chana" },
    ],
    Eggetarian: [
      { label: "Breakfast", value: "2-3 eggs + toast, or egg bhurji + roti" },
      { label: "Lunch", value: "Dal + rice + curd + boiled eggs" },
      { label: "Dinner", value: "Egg curry + roti + vegetables" },
      { label: "Snack", value: "Omelette, curd, fruit, or sprouts chaat" },
    ],
    Vegan: [
      { label: "Breakfast", value: "Oats + soy milk, or besan chilla" },
      { label: "Lunch", value: "Dal/rajma/chole + rice + salad" },
      { label: "Dinner", value: "Tofu/soy chunks + roti + vegetables" },
      { label: "Snack", value: "Peanut chaat, sprouts, fruit, or soy milk" },
    ],
  };

  return meals[preference];
}

function createFallbackNutritionPlan(profile: UserProfile): NutritionPlan {
  return {
    dietPreference: profile.dietPreference,
    bodyGoal: profile.bodyGoal,
    maintenanceCalories: calculateMaintenanceCalories(profile),
    targetCalories: calculateTargetCalories(profile),
    macros: calculateMacroTargets(profile),
    meals: getNutritionMeals(profile.dietPreference),
    workoutFood: {
      before: "Banana, black coffee, or light poha 45-60 minutes before training.",
      after:
        profile.dietPreference === "Vegan"
          ? "Soy chunks, tofu, dal, or chana with rice/roti after training."
          : profile.dietPreference === "Non-vegetarian"
            ? "Eggs, chicken, fish, dal, or curd with rice/roti after training."
            : profile.dietPreference === "Eggetarian"
              ? "Eggs, dal, paneer, curd, or rice/roti after training."
              : "Paneer, dal, curd, tofu, rice, or roti after training.",
      hydration: `Drink about ${getDailyWaterToDrinkLiters(profile)} L water across the day. Sip during workouts instead of drinking all at once.`,
    },
    note: `${profile.bodyGoal} is applied gently for this week. Food choices are simple Indian options for beginners; adjust portions based on hunger, digestion, and progress.`,
  };
}

function getDemoLink(name: string, fallback = FALLBACK_DEMO_SHORT) {
  const directMatch = DEMO_SHORTS[name];
  if (directMatch) return directMatch;

  const normalizedName = name.toLowerCase();
  const fuzzyMatch = Object.entries(DEMO_SHORTS).find(([exerciseName]) => normalizedName.includes(exerciseName.toLowerCase()));
  return fuzzyMatch?.[1] ?? fallback;
}

function getYouTubeEmbedUrl(url: string): string {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([^?&/]+)/);
  const watchMatch = url.match(/[?&]v=([^?&/]+)/);
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&/]+)/);
  const shortUrlMatch = url.match(/youtu\.be\/([^?&/]+)/);
  const videoId = shortsMatch?.[1] ?? watchMatch?.[1] ?? embedMatch?.[1] ?? shortUrlMatch?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1` : getYouTubeEmbedUrl(FALLBACK_DEMO_SHORT);
}

function getWorkoutDurationMinutes(profile: UserProfile) {
  return Number.parseInt(profile.workoutDuration, 10) || 45;
}

function getCalendarStartDate() {
  const start = new Date();
  start.setHours(19, 0, 0, 0);
  if (start.getTime() < Date.now()) {
    start.setDate(start.getDate() + 1);
  }
  return start;
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function getActivitySummary(title: string, activities: PlanActivity[]) {
  if (!activities.length) return "";
  const lines = activities.map((activity) => {
    const detail = [activity.time, activity.sets, activity.reps, activity.paceOrLoad].filter(Boolean).join(" | ");
    return `- ${activity.name}${detail ? `: ${detail}` : ""}`;
  });
  return `${title}\n${lines.join("\n")}`;
}

function getExerciseSummary(exercises: Exercise[]) {
  if (!exercises.length) return "";
  const lines = exercises.map((exercise) => {
    const option = exercise.main;
    return `- ${option.name}: ${option.sets} sets x ${option.repsPerSet}, ${option.weightGuide}, rest ${option.restSeconds}s. Alternative: ${exercise.alternative.name}`;
  });
  return `Workout\n${lines.join("\n")}`;
}

function buildCalendarDescription(day: DayPlan) {
  return [
    day.focus,
    getActivitySummary("Warm-up", day.warmUp),
    getExerciseSummary(day.exercises),
    getActivitySummary("Cooldown", day.coolDown),
    "Open GymBuddy to check off each exercise.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function buildWorkoutCalendarFile(plan: WeeklyPlan, profile: UserProfile) {
  const calendarStart = getCalendarStartDate();
  const durationMinutes = getWorkoutDurationMinutes(profile);
  const events = plan.days
    .map((day, index) => ({ day, index }))
    .filter(({ day }) => !day.isRestDay && day.exercises.length > 0)
    .map(({ day, index }) => {
      const eventStart = new Date(calendarStart);
      eventStart.setDate(calendarStart.getDate() + index);
      const eventEnd = new Date(eventStart.getTime() + durationMinutes * 60 * 1000);
      const uid = `gymbuddy-week-${plan.week}-day-${index + 1}-${eventStart.getTime()}@gymbuddy.local`;

      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(eventStart)}`,
        `DTEND:${formatIcsDate(eventEnd)}`,
        `SUMMARY:${escapeIcsText(`GymBuddy: ${day.title}`)}`,
        `DESCRIPTION:${escapeIcsText(buildCalendarDescription(day))}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeIcsText("GymBuddy workout starts in 30 minutes")}`,
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GymBuddy//Workout Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(`GymBuddy Week ${plan.week}`)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function downloadWorkoutCalendar(plan: WeeklyPlan, profile: UserProfile) {
  const calendarFile = buildWorkoutCalendarFile(plan, profile);
  const blob = new Blob([calendarFile], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gymbuddy-week-${plan.week}-workouts.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildWeekOnePrompt(profile: UserProfile) {
  return `Create a beginner-safe Week 1 gym plan for GymBuddy.

User data:
Name: ${profile.name || "Not provided"}
Age: ${profile.age}
Gender: ${profile.gender}
Goal: ${profile.goal}
Experience level: ${profile.experienceLevel}
Gym type: ${profile.gymType}
Days per week: ${profile.daysPerWeek}
Workout duration: ${profile.workoutDuration}
Height: ${profile.height} cm
Weight: ${profile.weight} kg
BMI: ${profile.bmi ?? "Not available"}
BMI category: ${profile.bmiCategory || "Not available"}
Injury or pain: ${profile.injuryOrPain}
Injury detail: ${profile.injuryDetail || "None"}
Confidence level: ${profile.confidenceLevel}
Diet preference: ${profile.dietPreference}

Rules:
- Keep exercises beginner-friendly.
- Include warm-up, workout, cooldown, sets, reps, beginner weight guidance, rest timer seconds, demo links, and alternatives.
- Prefer safe machine or dumbbell movements.
- The alternative option must train the same or very similar muscle group as the main option. Example: chest press -> incline push-up is allowed; biceps curl -> lat pulldown is not allowed.
- For workout exercises only, prescribe 3 or 4 sets. Do not use 1 or 2 working sets.
- For workout exercises only, reps must stay between 8 and 12.
- Use this beginner progression for 3 sets: Set 1: 12 reps with lighter weight, Set 2: 10 reps with slightly higher weight if form is clean, Set 3: 8 reps with the heaviest clean suggested weight.
- If suggesting 4 sets, Set 4 must use the same weight and reps as Set 3: 8 reps.
- Avoid timed workout exercises like plank holds in the main workout list. Use rep-based core movements like Dead Bug or Ab Crunch Machine instead.
- Dumbbell guidance must only use these available dumbbells: 1 kg, 2 kg, 3 kg, 4 kg, 5 kg, 7.5 kg, 10 kg, 12.5 kg, 15 kg, 17.5 kg, 20 kg, 22.5 kg, 25 kg, 30 kg.
- Plate guidance must only use these available plates: 2.5 kg, 5 kg, 7.5 kg, 10 kg, 12.5 kg, 15 kg, 20 kg.
- Use discrete choices like "5 kg or 7.5 kg dumbbell", not unavailable numbers like 6 kg or 8 kg.
- For cable/machine stacks where exact kg is unknown, say "lightest stack setting" or "1-2 light stack plates" instead of inventing kg.
- For injury or pain, do not prescribe exercises that stress the affected body part. You are not a doctor or physiotherapist, so replace affected-area exercises with other-body-part exercises and include a stop-if-pain cue.
- If the pain area is unclear or "Other", avoid loaded training for that day and use light recovery only.
- Avoid advanced lifts and intense plans.
- Return structured JSON only.`;
}

function createFallbackPlan(profile: UserProfile): WeeklyPlan {
  const plannedDays = Number.parseInt(profile.daysPerWeek, 10) || 3;
  const demo = (name: string) => getDemoLink(name);
  const normalizeExerciseSets = (sets: string) => {
    const numericSets = Number.parseInt(sets, 10);
    if (!Number.isFinite(numericSets)) return "3";
    return String(Math.min(4, Math.max(3, numericSets)));
  };
  const getRepScheme = (sets: string) => (sets === "4" ? "Set 1: 12 reps, Set 2: 10 reps, Set 3: 8 reps, Set 4: 8 reps" : "Set 1: 12 reps, Set 2: 10 reps, Set 3: 8 reps");
  const getProgressionGuide = (weightGuide: string, sets: string) => {
    if (/bodyweight/i.test(weightGuide)) return "Bodyweight; keep all reps clean in the 8-12 range";
    const fourthSetNote = sets === "4" ? " Set 4: use the same weight and reps as Set 3." : "";
    return `${weightGuide}. Set 1: use the lighter suggested weight for 12 reps. Set 2: increase only if form is clean for 10 reps. Set 3: use the heaviest clean suggested weight for 8 reps.${fourthSetNote}`;
  };
  const activity = (
    id: string,
    name: string,
    time: string,
    sets: string,
    reps: string,
    paceOrLoad: string,
    query = name,
  ): PlanActivity => ({
    id,
    name,
    time,
    sets,
    reps,
    paceOrLoad,
    demoLink: demo(query),
  });
  const option = (
    name: string,
    equipment: string,
    sets: string,
    repsPerSet: string,
    weightGuide: string,
    restSeconds: number,
    formCue: string,
    query = name,
  ): ExerciseOption => {
    const normalizedSets = normalizeExerciseSets(sets);
    return {
      name,
      equipment,
      sets: normalizedSets,
      repsPerSet: getRepScheme(normalizedSets),
      weightGuide: getProgressionGuide(weightGuide, normalizedSets),
      restSeconds,
      demoLink: demo(query),
      formCue,
    };
  };
  const exercise = (id: string, muscleGroup: string, main: ExerciseOption, alternative: ExerciseOption): Exercise => ({
    id,
    muscleGroup,
    main,
    alternative,
  });
  const restDay = (day: string, title = "Rest Day", focus = "Recover so your next workout feels stronger."): DayPlan => ({
    day,
    title,
    focus,
    isRestDay: true,
    warmUp: [],
    exercises: [],
    coolDown: [
      activity(`${day.toLowerCase()}-walk`, "Slow walk", "10-20 min", "1", "-", "Easy pace"),
      activity(`${day.toLowerCase()}-breathing`, "Deep breathing", "2 min", "1", "8 slow breaths", "Relaxed"),
    ],
  });

  const commonWarmUp = [
    activity("warm-treadmill", "Treadmill walk", "5 min", "1", "-", "3-4 km/h"),
    activity("warm-wrist", "Wrist rotations", "45 sec", "1", "10 each side", "Bodyweight"),
    activity("warm-shoulder", "Shoulder rolls", "45 sec", "1", "10 forward + 10 backward", "Bodyweight"),
    activity("warm-squat", "Bodyweight squat", "2 min", "2", "10", "Bodyweight"),
  ];

  const commonCoolDown = [
    activity("cool-walk", "Slow walk", "3 min", "1", "-", "Very easy pace"),
    activity("cool-hamstring", "Seated hamstring stretch", "1 min", "1", "30 sec each side", "Gentle stretch"),
    activity("cool-chest", "Doorway chest stretch", "1 min", "1", "30 sec each side", "Gentle stretch"),
    activity("cool-breathing", "Deep breathing", "1 min", "1", "6 slow breaths", "Relaxed"),
  ];

  const fullBodySquatPush = (day: string): DayPlan => ({
    day,
    title: "Full Body (Squat & Push)",
    focus: "Squat and push focus while still touching back and core.",
    warmUp: commonWarmUp,
    exercises: [
      exercise(`${day}-squat`, "Quads & Hamstrings", option("Goblet Squat", "Dumbbell", "3", "10", "5 kg or 7.5 kg dumbbell", 60, "Chest tall and knees tracking over toes"), option("Leg Press", "Leg press machine", "3", "10", "Empty sled, or 2.5 kg or 5 kg plate each side", 60, "Control the lowering phase")),
      exercise(`${day}-chest`, "Chest", option("Machine Chest Press", "Chest press machine", "4", "10", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Keep shoulder blades gently back"), option("Incline Push-up", "Bench or box", "4", "8-10", "Bodyweight", 60, "Keep body straight")),
      exercise(`${day}-row`, "Back", option("Seated Cable Row", "Cable row", "3", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Pull elbows back and pause"), option("One-arm Dumbbell Row", "Dumbbell", "3", "10 each side", "5 kg or 7.5 kg dumbbell", 60, "Pull toward your pocket")),
      exercise(`${day}-shoulder`, "Shoulders", option("Machine Shoulder Press", "Shoulder press machine", "2", "10", "Lightest controlled setting", 60, "Do not arch your lower back"), option("Dumbbell Shoulder Press", "Dumbbells", "2", "10", "3-5 kg dumbbells", 60, "Press straight up")),
      exercise(`${day}-core`, "Core", option("Dead Bug", "Mat", "3", "10 each side", "Bodyweight", 45, "Keep lower back steady"), option("Ab Crunch Machine", "Abs machine", "3", "12", "Lightest stack setting", 45, "Crunch slowly")),
    ],
    coolDown: commonCoolDown,
  });

  const fullBodyHingePull = (day: string): DayPlan => ({
    day,
    title: "Full Body (Hinge & Pull)",
    focus: "Hinge and pull focus for hamstrings, back, and posture.",
    warmUp: commonWarmUp,
    exercises: [
      exercise(`${day}-hinge`, "Quads & Hamstrings", option("Dumbbell Romanian Deadlift", "Dumbbells", "3", "10", "5 kg dumbbells; use 7.5 kg only if controlled", 60, "Push hips back and keep back flat"), option("Leg Curl Machine", "Hamstring curl machine", "3", "10", "Lightest stack setting", 60, "Curl smoothly without swinging")),
      exercise(`${day}-lat`, "Back", option("Lat Pulldown", "Cable machine", "4", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Pull to upper chest"), option("Seated Cable Row", "Cable row", "4", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Sit tall and pull elbows back")),
      exercise(`${day}-chest`, "Chest", option("Machine Chest Press", "Chest press machine", "3", "10", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Press with control"), option("Dumbbell Chest Press", "Dumbbells", "3", "10", "5 kg or 7.5 kg dumbbells", 60, "Keep wrists stacked")),
      exercise(`${day}-biceps`, "Arms", option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "3-5 kg dumbbells", 45, "Keep elbows close"), option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "2 kg or 3 kg dumbbells", 45, "Use lighter dumbbells if form breaks")),
      exercise(`${day}-core`, "Core", option("Dead Bug", "Mat", "3", "10 each side", "Bodyweight", 45, "Move slowly"), option("Ab Crunch Machine", "Abs machine", "3", "12", "Lightest stack setting", 45, "Crunch slowly")),
    ],
    coolDown: commonCoolDown,
  });

  const fullBodyLungePress = (day: string): DayPlan => ({
    day,
    title: "Full Body (Lunge & Press)",
    focus: "Lunge pattern, pressing strength, shoulders, and core.",
    warmUp: commonWarmUp,
    exercises: [
      exercise(`${day}-lunge`, "Quads & Hamstrings", option("Step-ups", "Bench or box", "3", "10 each leg", "Bodyweight or 3-5 kg dumbbells", 60, "Step through the full foot"), option("Leg Press", "Leg press machine", "3", "10", "Empty sled, or 2.5 kg or 5 kg plate each side", 60, "Control every rep")),
      exercise(`${day}-press`, "Chest", option("Machine Chest Press", "Chest press machine", "3", "10", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Press without shrugging"), option("Incline Push-up", "Bench or box", "3", "8-10", "Bodyweight", 60, "Use a high bench if needed")),
      exercise(`${day}-row`, "Back", option("Seated Cable Row", "Cable row", "3", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Pause at the ribs"), option("One-arm Dumbbell Row", "Dumbbell", "3", "10 each side", "5 kg or 7.5 kg dumbbell", 60, "Keep back flat")),
      exercise(`${day}-shoulder`, "Shoulders", option("Dumbbell Shoulder Press", "Dumbbells", "3", "10", "3-5 kg dumbbells", 60, "Keep ribs down"), option("Machine Shoulder Press", "Shoulder press machine", "3", "10", "Lightest controlled setting", 60, "Move slowly")),
      exercise(`${day}-arms`, "Arms", option("Triceps Pushdown", "Cable machine", "2", "12", "Light stack setting", 45, "Keep elbows pinned"), option("Dumbbell Bicep Curl", "Dumbbells", "2", "12", "3-5 kg dumbbells", 45, "Avoid swinging")),
      exercise(`${day}-core`, "Core", option("Ab Crunch Machine", "Abs machine", "2", "12", "Light stack setting", 45, "Crunch slowly"), option("Dead Bug", "Mat", "2", "10 each side", "Bodyweight", 45, "Keep ribs down")),
    ],
    coolDown: commonCoolDown,
  });

  const upperBody = (day: string): DayPlan => ({
    day,
    title: "Upper Body",
    focus: "Chest, back, shoulders, arms.",
    warmUp: commonWarmUp,
    exercises: [
      exercise(`${day}-chest`, "Chest", option("Machine Chest Press", "Chest press machine", "3", "10", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Press smoothly"), option("Dumbbell Chest Press", "Dumbbells", "3", "10", "5 kg or 7.5 kg dumbbells", 60, "Keep wrists stacked")),
      exercise(`${day}-row`, "Back", option("Seated Cable Row", "Cable row", "3", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Pull elbows back"), option("Lat Pulldown", "Cable machine", "3", "10", "Lightest stack setting", 60, "Pull to upper chest")),
      exercise(`${day}-shoulder`, "Shoulders", option("Machine Shoulder Press", "Shoulder press machine", "2", "10", "Lightest controlled setting", 60, "Keep ribs down"), option("Dumbbell Lateral Raise", "Dumbbells", "2", "12", "2 kg, 3 kg, or 4 kg dumbbells", 45, "Lead with elbows")),
      exercise(`${day}-biceps`, "Arms", option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "3-5 kg dumbbells", 45, "Keep elbows close"), option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "2 kg or 3 kg dumbbells", 45, "Use lighter dumbbells if form breaks")),
      exercise(`${day}-triceps`, "Arms", option("Triceps Pushdown", "Cable machine", "3", "12", "Light stack setting", 45, "Keep elbows pinned"), option("Triceps Pushdown", "Cable machine", "3", "12", "Lightest stack setting", 45, "Use a rope or straight bar if available")),
    ],
    coolDown: commonCoolDown,
  });

  const lowerBody = (day: string): DayPlan => ({
    day,
    title: "Lower Body",
    focus: "Quads, hamstrings, calves, abs.",
    warmUp: commonWarmUp,
    exercises: [
      exercise(`${day}-quad`, "Quads & Hamstrings", option("Leg Press", "Leg press machine", "3", "10", "Empty sled, or 2.5 kg or 5 kg plate each side", 60, "Control the lowering phase"), option("Goblet Squat", "Dumbbell", "3", "10", "5 kg or 7.5 kg dumbbell", 60, "Chest tall")),
      exercise(`${day}-hamstring`, "Quads & Hamstrings", option("Dumbbell Romanian Deadlift", "Dumbbells", "3", "10", "5 kg dumbbells; use 7.5 kg only if controlled", 60, "Hips back"), option("Leg Curl Machine", "Hamstring curl machine", "3", "10", "Lightest stack setting", 60, "Curl smoothly")),
      exercise(`${day}-single-leg`, "Quads & Hamstrings", option("Step-ups", "Bench or box", "2", "10 each leg", "Bodyweight or 3-5 kg dumbbells", 60, "Step through the full foot"), option("Leg Extension Machine", "Leg extension machine", "2", "12", "Light stack setting", 60, "Do not kick fast")),
      exercise(`${day}-calves`, "Calves", option("Standing Calf Raise", "Dumbbells or calf machine", "3", "12", "Bodyweight or 3-5 kg dumbbells", 45, "Pause at the top"), option("Leg Press", "Leg press machine", "3", "12", "Very light calf press", 45, "Small controlled movement")),
      exercise(`${day}-core`, "Core", option("Ab Crunch Machine", "Abs machine", "3", "12", "Lightest stack setting", 45, "Move slowly"), option("Dead Bug", "Mat", "3", "10 each side", "Bodyweight", 45, "Keep ribs down")),
    ],
    coolDown: commonCoolDown,
  });

  const pushDay = (day: string): DayPlan => ({
    ...upperBody(day),
    title: "Push Day",
    focus: "Chest, shoulders, triceps.",
    exercises: [
      exercise(`${day}-chest`, "Chest", option("Machine Chest Press", "Chest press machine", "4", "10", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Press smoothly"), option("Dumbbell Chest Press", "Dumbbells", "4", "10", "5 kg or 7.5 kg dumbbells", 60, "Keep wrists stacked")),
      exercise(`${day}-pushup`, "Chest", option("Incline Push-up", "Bench or box", "3", "8-10", "Bodyweight", 60, "Keep body straight"), option("Machine Chest Press", "Chest press machine", "3", "10", "Light setting", 60, "Do not shrug")),
      exercise(`${day}-shoulder`, "Shoulders", option("Machine Shoulder Press", "Shoulder press machine", "3", "10", "Lightest controlled setting", 60, "Keep ribs down"), option("Dumbbell Shoulder Press", "Dumbbells", "3", "10", "3-5 kg dumbbells", 60, "Press straight up")),
      exercise(`${day}-lateral`, "Shoulders", option("Dumbbell Lateral Raise", "Dumbbells", "2", "12", "2 kg, 3 kg, or 4 kg dumbbells", 45, "Lead with elbows"), option("Machine Shoulder Press", "Shoulder press machine", "2", "10", "Light setting", 45, "Slow reps")),
      exercise(`${day}-triceps`, "Arms", option("Triceps Pushdown", "Cable machine", "3", "12", "Light stack setting", 45, "Keep elbows pinned"), option("Triceps Pushdown", "Cable machine", "3", "12", "Lightest stack setting", 45, "Use a rope or straight bar if available")),
    ],
  });

  const pullDay = (day: string): DayPlan => ({
    ...upperBody(day),
    title: "Pull Day",
    focus: "Back and biceps.",
    exercises: [
      exercise(`${day}-lat`, "Back", option("Lat Pulldown", "Cable machine", "4", "10", "Lightest stack setting", 60, "Pull to upper chest"), option("Seated Cable Row", "Cable row", "4", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Sit tall")),
      exercise(`${day}-row`, "Back", option("Seated Cable Row", "Cable row", "4", "10", "Lightest stack setting or 1-2 light stack plates", 60, "Pause at ribs"), option("One-arm Dumbbell Row", "Dumbbell", "4", "10 each side", "5 kg or 7.5 kg dumbbell", 60, "Pull toward pocket")),
      exercise(`${day}-rear-row`, "Back", option("One-arm Dumbbell Row", "Dumbbell", "3", "10 each side", "5 kg or 7.5 kg dumbbell", 60, "Keep back flat"), option("Lat Pulldown", "Cable machine", "3", "10", "Lightest stack setting", 60, "Move slowly")),
      exercise(`${day}-biceps`, "Arms", option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "3-5 kg dumbbells", 45, "Avoid swinging"), option("Dumbbell Bicep Curl", "Dumbbells", "3", "12", "2 kg or 3 kg dumbbells", 45, "Use lighter dumbbells if form breaks")),
      exercise(`${day}-core`, "Core", option("Dead Bug", "Mat", "3", "10 each side", "Bodyweight", 45, "Slow and controlled"), option("Ab Crunch Machine", "Abs machine", "3", "12", "Lightest stack setting", 45, "Crunch slowly")),
    ],
  });

  const legsDay = (day: string): DayPlan => ({
    ...lowerBody(day),
    title: "Legs Day",
    focus: "Quads, hamstrings, calves.",
  });

  const upperTechniqueDay = (day: string): DayPlan => ({
    ...upperBody(day),
    title: "Upper Body (Form Practice)",
    focus: "Practice clean form with lighter weights.",
  });

  const lowerCoreDay = (day: string): DayPlan => ({
    ...lowerBody(day),
    title: "Lower Body & Core",
    focus: "Lower body volume plus core stability.",
  });

  const calendarByDays: Record<number, DayPlan[]> = {
    3: [fullBodySquatPush("Day 1"), restDay("Day 2"), fullBodyHingePull("Day 3"), restDay("Day 4"), fullBodyLungePress("Day 5"), restDay("Day 6"), restDay("Day 7")],
    4: [upperBody("Day 1"), lowerBody("Day 2"), restDay("Day 3"), upperBody("Day 4"), lowerBody("Day 5"), restDay("Day 6"), restDay("Day 7")],
    5: [pushDay("Day 1"), pullDay("Day 2"), legsDay("Day 3"), restDay("Day 4", "Rest Day", "Crucial for nervous system recovery."), upperTechniqueDay("Day 5"), lowerCoreDay("Day 6"), restDay("Day 7")],
  };

  const days = calendarByDays[plannedDays] ?? calendarByDays[3];

  return applySafetyGuardrails({
    week: 1,
    title: "Week 1: Learn the Basics",
    note: `Made for a ${profile.experienceLevel.toLowerCase()} training ${profile.daysPerWeek.toLowerCase()} for ${profile.workoutDuration.toLowerCase()} in a ${profile.gymType.toLowerCase()}. Weekly target: chest/back/thighs 10-12 sets, shoulders/arms 6-8 sets, core 4-6 sets.`,
    days,
  }, profile.injuryOrPain);
}

function createSafeOption(name: string, equipment: string, weightGuide: string, restSeconds: number, formCue: string): ExerciseOption {
  return {
    name,
    equipment,
    sets: "3",
    repsPerSet: "Set 1: 12 reps, Set 2: 10 reps, Set 3: 8 reps",
    weightGuide: /bodyweight/i.test(weightGuide)
      ? "Bodyweight; keep all reps clean in the 8-12 range"
      : `${weightGuide}. Set 1: lighter weight for 12 reps. Set 2: increase only if form is clean for 10 reps. Set 3: heaviest clean suggested weight for 8 reps.`,
    restSeconds,
    demoLink: getDemoLink(name),
    formCue,
  };
}

function createSafetyExercise(id: string, muscleGroup: string, main: ExerciseOption, alternative: ExerciseOption): Exercise {
  return { id, muscleGroup, main, alternative };
}

function getSafetyReplacementExercises(day: DayPlan, area: WorkoutCheckIn["painArea"]): Exercise[] {
  const safeId = day.day.toLowerCase().replace(/\s+/g, "-");

  if (area === "Knee") {
    return [
      createSafetyExercise(`${safeId}-safe-chest`, "Chest", createSafeOption("Machine Chest Press", "Chest press machine", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Back supported and stop if pain appears"), createSafeOption("Incline Push-up", "Bench or box", "Bodyweight", 60, "Use a high bench and keep body straight")),
      createSafetyExercise(`${safeId}-safe-back`, "Back", createSafeOption("Seated Cable Row", "Cable row", "Lightest stack setting or 1-2 light stack plates", 60, "Sit tall and pull smoothly"), createSafeOption("Lat Pulldown", "Cable machine", "Lightest stack setting", 60, "Pull to upper chest without leaning back")),
      createSafetyExercise(`${safeId}-safe-arms`, "Arms", createSafeOption("Dumbbell Bicep Curl", "Dumbbells", "3-5 kg dumbbells", 45, "Keep elbows close"), createSafeOption("Dumbbell Bicep Curl", "Dumbbells", "2 kg or 3 kg dumbbells", 45, "Use lighter dumbbells if form breaks")),
    ];
  }

  if (area === "Shoulder" || area === "Wrist") {
    return [
      createSafetyExercise(`${safeId}-safe-legcurl`, "Quads & Hamstrings", createSafeOption("Leg Curl Machine", "Hamstring curl machine", "Lightest stack setting", 60, "Move slowly and avoid gripping hard"), createSafeOption("Leg Extension Machine", "Leg extension machine", "Lightest stack setting", 60, "Smooth reps without kicking")),
      createSafetyExercise(`${safeId}-safe-legpress`, "Quads & Hamstrings", createSafeOption("Leg Press", "Leg press machine", "Empty sled, or 2.5 kg or 5 kg plate each side", 60, "Back supported and hands relaxed"), createSafeOption("Standing Calf Raise", "Calf machine", "Bodyweight or lightest controlled setting", 45, "Pause at the top")),
      createSafetyExercise(`${safeId}-safe-core`, "Core", createSafeOption("Ab Crunch Machine", "Abs machine", "Lightest stack setting", 45, "Move slowly without pulling with arms"), createSafeOption("Dead Bug", "Mat", "Bodyweight", 45, "Keep ribs down")),
    ];
  }

  if (area === "Back pain") {
    return [
      createSafetyExercise(`${safeId}-safe-chest`, "Chest", createSafeOption("Machine Chest Press", "Chest press machine", "2.5 kg or 5 kg plate each side if plate-loaded", 60, "Keep back fully supported"), createSafeOption("Incline Push-up", "Bench or box", "Bodyweight", 60, "Use a high bench and stop if back discomfort appears")),
      createSafetyExercise(`${safeId}-safe-legext`, "Quads & Hamstrings", createSafeOption("Leg Extension Machine", "Leg extension machine", "Lightest stack setting", 60, "Back supported and move slowly"), createSafeOption("Leg Curl Machine", "Hamstring curl machine", "Lightest stack setting", 60, "Keep hips still")),
      createSafetyExercise(`${safeId}-safe-arms`, "Arms", createSafeOption("Triceps Pushdown", "Cable machine", "Lightest stack setting", 45, "Stand tall without leaning"), createSafeOption("Triceps Pushdown", "Cable machine", "Lightest stack setting", 45, "Use a rope or straight bar if available")),
    ];
  }

  return [];
}

function exerciseAffectsPainArea(exercise: Exercise, area: WorkoutCheckIn["painArea"]) {
  if (area === "Not sure" || area === "Other") return true;
  const text = `${exercise.muscleGroup} ${exercise.main.name} ${exercise.alternative.name}`.toLowerCase();

  if (area === "Knee") return /quad|hamstring|calf|squat|leg press|step-up|leg extension|lunge|calf/i.test(text);
  if (area === "Shoulder") return /chest|back|shoulder|arms|press|push-up|row|pulldown|lateral raise|triceps|curl/i.test(text);
  if (area === "Wrist") return /dumbbell|curl|push-up|press|row|pulldown|triceps|grip/i.test(text);
  if (area === "Back pain") return /back|hinge|romanian|row|pulldown|dead bug|crunch|squat|leg press/i.test(text);
  return false;
}

function applySafetyGuardrails(plan: WeeklyPlan, area: WorkoutCheckIn["painArea"]): WeeklyPlan {
  if (!area || area === "No pain") return plan;

  const nextDays = plan.days.map((day) => {
    if (day.isRestDay || !day.exercises.some((exercise) => exerciseAffectsPainArea(exercise, area))) return day;

    const safeExercises = getSafetyReplacementExercises(day, area);
    if (!safeExercises.length) {
      return {
        ...day,
        title: "Safety Reset",
        focus: "Pain area is unclear, so skip loaded training today and choose light recovery. Stop if pain continues.",
        isRestDay: true,
        exercises: [],
      };
    }

    return {
      ...day,
      title: `${day.title} (Safety Adjusted)`,
      focus: `Avoiding ${area.toLowerCase()} stress. Train other areas only and stop if pain appears.`,
      exercises: safeExercises,
    };
  });

  return {
    ...plan,
    note: `${plan.note} Safety guardrail active: exercises that may stress ${area.toLowerCase()} were replaced with safer alternatives for other body parts.`,
    days: nextDays,
  };
}

function getWorkoutRecommendation(goal: UserProfile["goal"], experienceLevel: UserProfile["experienceLevel"]) {
  let days: UserProfile["daysPerWeek"] = "4 days";
  let duration: UserProfile["workoutDuration"] = "45 minutes";

  if (experienceLevel === "First time") {
    days = goal === "Lose fat" ? "4 days" : "3 days";
    duration = goal === "General fitness" ? "30 minutes" : "45 minutes";
  }

  if (experienceLevel === "Beginner") {
    days = goal === "Lose fat" ? "5 days" : "4 days";
    duration = goal === "Build muscle" ? "60 minutes" : "45 minutes";
  }

  if (experienceLevel === "Restarting after break") {
    days = goal === "General fitness" ? "3 days" : "4 days";
    duration = goal === "General fitness" ? "30 minutes" : "45 minutes";
  }

  return { days, duration };
}

function createAdaptedPlan(checkIn: WorkoutCheckIn, completedCount: number) {
  if (checkIn.painStatus !== "No pain") {
    return checkIn.painArea === "Not sure"
      ? "Next week will avoid loaded training until the pain area is clear. Keep movement light and stop if pain continues."
      : `Next week will avoid exercises that may stress ${checkIn.painArea.toLowerCase()} and train other areas instead. Stop if pain continues.`;
  }
  if (checkIn.completionStatus === "Skipped" || completedCount < 2) {
    return "Next week will be simpler: fewer exercises, easier movements, and the same weights.";
  }
  if (checkIn.difficulty === "Hard" || checkIn.confidence === "Low") {
    return "Next week will repeat the same structure with more demo support and no extra volume.";
  }
  return "Next week will increase slightly: one extra set for the first main exercise and 2-5 more minutes of easy cardio.";
}

function getNextWeekStrategy(plan: WeeklyPlan | null, completion: ExerciseCompletion, checkIn: WorkoutCheckIn) {
  const progress = getWeeklyProgress(plan, completion);

  if (checkIn.painStatus !== "No pain") {
    return {
      mode: "deload" as const,
      note: `Week ${(plan?.week ?? 1) + 1} avoids exercises that may stress ${checkIn.painArea === "Not sure" ? "the painful area" : checkIn.painArea.toLowerCase()}. This is not medical advice; stop if pain continues.`,
    };
  }

  if (progress.percent < 50 || checkIn.completionStatus === "Skipped") {
    return {
      mode: "repeat" as const,
      note: `Week ${(plan?.week ?? 1) + 1} repeats the same structure because completion was ${progress.percent}%. The goal is consistency before adding volume.`,
    };
  }

  if (progress.percent < 80 || checkIn.difficulty === "Hard" || checkIn.confidence === "Low") {
    return {
      mode: "hold" as const,
      note: `Week ${(plan?.week ?? 1) + 1} keeps volume stable because the week was still challenging. Focus on better form and smoother reps.`,
    };
  }

  return {
    mode: "progress" as const,
    note: `Week ${(plan?.week ?? 1) + 1} increases slightly because completion was ${progress.percent}% with manageable feedback. Add a small amount of volume while keeping form clean.`,
  };
}

function adjustNumericSetValue(value: string, delta: number) {
  const numericValue = Number.parseInt(value, 10);
  if (!Number.isFinite(numericValue)) return value;
  return String(Math.min(4, Math.max(3, numericValue + delta)));
}

function adaptExerciseOption(option: ExerciseOption, mode: ReturnType<typeof getNextWeekStrategy>["mode"], shouldProgress: boolean): ExerciseOption {
  if (mode === "deload") {
    return {
      ...option,
      sets: adjustNumericSetValue(option.sets, -1),
      weightGuide: `${option.weightGuide}; use a lighter, pain-free load`,
      formCue: `${option.formCue}. Stop if pain appears.`,
    };
  }

  if (mode === "progress" && shouldProgress) {
    return {
      ...option,
      sets: adjustNumericSetValue(option.sets, 1),
      weightGuide: `${option.weightGuide}; increase only if last week felt controlled`,
    };
  }

  return option;
}

function createNextWeekPlan(currentPlan: WeeklyPlan, completion: ExerciseCompletion, checkIn: WorkoutCheckIn, profile: UserProfile): WeeklyPlan {
  const strategy = getNextWeekStrategy(currentPlan, completion, checkIn);
  const nextWeek = currentPlan.week + 1;

  const nextPlan = {
    ...currentPlan,
    week: nextWeek,
    title: `Week ${nextWeek}: ${strategy.mode === "progress" ? "Build Slightly" : strategy.mode === "deload" ? "Recover and Rebuild" : "Lock In Consistency"}`,
    note: strategy.note,
    days: currentPlan.days.map((day) => {
      if (day.isRestDay) {
        return {
          ...day,
          focus: strategy.mode === "deload" ? "Recover fully. Keep movement light and pain-free." : day.focus,
        };
      }

      return {
        ...day,
        exercises: day.exercises.map((exercise, index) => ({
          ...exercise,
          id: `w${nextWeek}-${exercise.id}`,
          main: adaptExerciseOption(exercise.main, strategy.mode, index < 2),
          alternative: adaptExerciseOption(exercise.alternative, strategy.mode, index < 2),
        })),
      };
    }),
  };

  const safetyArea = checkIn.painStatus !== "No pain" ? checkIn.painArea : profile.injuryOrPain;
  return applySafetyGuardrails(nextPlan, safetyArea);
}

async function requestAiWeekOnePlan(profile: UserProfile) {
  const response = await fetch("/api/generate-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });

  const payload = (await response.json()) as { plan?: WeeklyPlan; error?: string };
  if (!response.ok || !payload.plan) {
    throw new Error(payload.error || "AI plan generation failed");
  }
  return payload.plan;
}

async function requestAiNutritionPlan(profile: UserProfile, fallbackPlan: NutritionPlan) {
  const response = await fetch("/api/generate-nutrition", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, targets: fallbackPlan }),
  });

  const payload = (await response.json()) as { nutritionPlan?: NutritionPlan; error?: string };
  if (!response.ok || !payload.nutritionPlan) {
    throw new Error(payload.error || "AI nutrition generation failed");
  }

  return payload.nutritionPlan;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getDayProgress(day: DayPlan, completion: ExerciseCompletion) {
  if (day.isRestDay || day.exercises.length === 0) {
    return { total: 0, done: 0, partial: 0, skipped: 0, percent: 0, isComplete: false };
  }

  const done = day.exercises.filter((exercise) => completion[exercise.id] === "Done").length;
  const partial = day.exercises.filter((exercise) => completion[exercise.id] === "Partially done").length;
  const skipped = day.exercises.filter((exercise) => completion[exercise.id] === "Not done").length;
  const progressUnits = done + partial * 0.5;
  const percent = Math.round((progressUnits / day.exercises.length) * 100);

  return {
    total: day.exercises.length,
    done,
    partial,
    skipped,
    percent,
    isComplete: done === day.exercises.length,
  };
}

function getWeeklyProgress(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  const workoutDays = plan?.days.filter((day) => !day.isRestDay) ?? [];
  const totalExercises = workoutDays.reduce((sum, day) => sum + day.exercises.length, 0);
  const doneExercises = workoutDays.reduce((sum, day) => sum + day.exercises.filter((exercise) => completion[exercise.id] === "Done").length, 0);
  const partialExercises = workoutDays.reduce((sum, day) => sum + day.exercises.filter((exercise) => completion[exercise.id] === "Partially done").length, 0);
  const progressUnits = doneExercises + partialExercises * 0.5;
  const percent = totalExercises ? Math.round((progressUnits / totalExercises) * 100) : 0;

  return {
    workoutDays: workoutDays.length,
    totalExercises,
    doneExercises,
    partialExercises,
    percent,
  };
}

function getRemainingWorkoutDays(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  return plan?.days.filter((day) => !day.isRestDay && !isWorkoutDayComplete(day, completion)).length ?? 0;
}

function getReminderTargetDay(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return null;
  return plan.days.find((day) => !day.isRestDay && !isWorkoutDayComplete(day, completion)) ?? null;
}

function getPartiallyStartedDay(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return null;
  return plan.days.find((day) => {
    if (day.isRestDay || isWorkoutDayComplete(day, completion)) return false;
    const progress = getDayProgress(day, completion);
    return progress.done > 0 || progress.partial > 0;
  }) ?? null;
}

function getProgressNudge(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return "Create your weekly plan first, then GymBuddy can remind you.";

  const weekly = getWeeklyProgress(plan, completion);
  const remainingDays = getRemainingWorkoutDays(plan, completion);
  const nextDay = getReminderTargetDay(plan, completion);
  const partialDay = getPartiallyStartedDay(plan, completion);

  if (remainingDays === 0) return "Week complete. Keep the momentum going into the next plan.";
  if (weekly.percent === 0 && nextDay) return `${nextDay.day} is waiting. Start small and just complete the warm-up first.`;
  if (partialDay) return `Continue ${partialDay.day} or move to your next planned workout. Keep the week moving without rushing.`;
  if (weekly.percent < 50 && nextDay) return `${remainingDays} workout days left. Next up: ${nextDay.day} - ${nextDay.title}.`;
  if (weekly.percent < 80) return `You are at ${weekly.percent}%. One steady session can push the week forward.`;
  return `Strong week: ${weekly.percent}% done. Finish the last pieces without rushing.`;
}

function normalizeReminderSettings(settings: Partial<ReminderSettings>): ReminderSettings {
  if (settings.hour || settings.minute) {
    return {
      ...initialReminderSettings,
      ...settings,
      hour: String(settings.hour ?? "").slice(0, 2),
      minute: String(settings.minute ?? "").slice(0, 2),
      period: settings.period === "AM" ? "AM" : "PM",
    };
  }

  if (settings.time) {
    const [rawHour, rawMinute] = settings.time.split(":").map(Number);
    const period = rawHour >= 12 ? "PM" : "AM";
    const hour12 = rawHour % 12 || 12;
    return {
      ...initialReminderSettings,
      ...settings,
      hour: String(hour12),
      minute: String(Number.isFinite(rawMinute) ? rawMinute : 0).padStart(2, "0"),
      period,
    };
  }

  return { ...initialReminderSettings, ...settings };
}

function getReminderTimeParts(settings: ReminderSettings) {
  const hour = Number.parseInt(settings.hour, 10);
  const minute = Number.parseInt(settings.minute, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const hours24 = settings.period === "AM" ? hour % 12 : hour === 12 ? 12 : hour + 12;
  return { hours: hours24, minutes: minute };
}

function getReminderTimeLabel(settings: ReminderSettings) {
  const timeParts = getReminderTimeParts(settings);
  if (!timeParts) return "set time";
  const hour = Number.parseInt(settings.hour, 10);
  return `${hour}:${String(timeParts.minutes).padStart(2, "0")} ${settings.period}`;
}

function buildReminderBody(plan: WeeklyPlan, completion: ExerciseCompletion) {
  const nextDay = getReminderTargetDay(plan, completion);
  const weekly = getWeeklyProgress(plan, completion);
  if (!nextDay) return `Week ${plan.week} is complete. Open GymBuddy to review your progress.`;
  return `${nextDay.day}: ${nextDay.title}. Current week progress: ${weekly.percent}%. Walk into the gym with a plan.`;
}

function getWeekProgressKey(week: number) {
  return `week-${week}`;
}

function getCalendarStatus(day: DayPlan, progress: ReturnType<typeof getDayProgress>): CalendarDayStatus {
  if (day.isRestDay) return "rest";
  if (progress.isComplete) return "done";
  if (progress.done > 0 || progress.partial > 0) return "partial";
  if (progress.skipped > 0) return "missed";
  return "pending";
}

function buildWeekProgressSnapshot(plan: WeeklyPlan, completion: ExerciseCompletion): WeekProgressSnapshot {
  const weekly = getWeeklyProgress(plan, completion);

  return {
    week: plan.week,
    title: plan.title,
    updatedAt: new Date().toISOString(),
    weeklyPercent: weekly.percent,
    days: plan.days.map((day, index) => {
      const progress = getDayProgress(day, completion);
      return {
        dayNumber: index + 1,
        title: day.title,
        percent: progress.percent,
        status: getCalendarStatus(day, progress),
        isRestDay: Boolean(day.isRestDay),
        done: progress.done,
        partial: progress.partial,
        total: progress.total,
      };
    }),
  };
}

function upsertMonthlyProgress(history: MonthlyProgress, plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return history;
  return {
    ...history,
    [getWeekProgressKey(plan.week)]: buildWeekProgressSnapshot(plan, completion),
  };
}

function getMonthWeekNumbers(currentWeek: number) {
  const monthStart = Math.floor((Math.max(1, currentWeek) - 1) / 4) * 4 + 1;
  return [monthStart, monthStart + 1, monthStart + 2, monthStart + 3];
}

function App() {
  const [screen, setScreen] = useState<Screen>(() => getInitialScreen());
  const [screenHistory, setScreenHistory] = useState<Screen[]>([]);
  const [profile, setProfile] = useState<UserProfile>(() => {
    const savedProfile = readStorage<Partial<UserProfile>>(STORAGE_KEYS.profile, {});
    return normalizeProfile(savedProfile);
  });
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(() => readStorage<WeeklyPlan | null>(STORAGE_KEYS.plan, null));
  const [completion, setCompletion] = useState<ExerciseCompletion>(() => readStorage(STORAGE_KEYS.completion, {}));
  const [exerciseSelection, setExerciseSelection] = useState<ExerciseSelection>(() => readStorage(STORAGE_KEYS.exerciseSelection, {}));
  const [checkIn, setCheckIn] = useState<WorkoutCheckIn>(() => normalizeCheckIn(readStorage<Partial<WorkoutCheckIn>>(STORAGE_KEYS.checkIn, initialCheckIn)));
  const [adaptedPlan, setAdaptedPlan] = useState(() => readStorage(STORAGE_KEYS.adaptation, ""));
  const [planSource, setPlanSource] = useState<PlanSource>(() => readStorage<PlanSource>(STORAGE_KEYS.planSource, "idle"));
  const [aiError, setAiError] = useState(() => readStorage(STORAGE_KEYS.aiError, ""));
  const [monthlyProgress, setMonthlyProgress] = useState<MonthlyProgress>(() => readStorage(STORAGE_KEYS.monthlyProgress, {}));
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(() => normalizeReminderSettings(readStorage<Partial<ReminderSettings>>(STORAGE_KEYS.reminderSettings, initialReminderSettings)));
  const [nutritionPlan, setNutritionPlan] = useState<NutritionPlan | null>(() => readStorage<NutritionPlan | null>(STORAGE_KEYS.nutritionPlan, null));
  const [nutritionSource, setNutritionSource] = useState<NutritionSource>(() => readStorage<NutritionSource>(STORAGE_KEYS.nutritionSource, "idle"));
  const [nutritionError, setNutritionError] = useState(() => readStorage(STORAGE_KEYS.nutritionError, ""));
  const [isNutritionLoading, setIsNutritionLoading] = useState(false);
  const [weightLog, setWeightLog] = useState<WeightLogEntry[]>(() => readStorage<WeightLogEntry[]>(STORAGE_KEYS.weightLog, []));
  const [notificationPermission, setNotificationPermission] = useState<ReminderPermission>(() => getNotificationPermission());
  const [activeVideo, setActiveVideo] = useState<VideoTarget | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const localPlan = readStorage<WeeklyPlan | null>(STORAGE_KEYS.plan, null);
    const localCompletion = readStorage<ExerciseCompletion>(STORAGE_KEYS.completion, {});
    return getResumeDayIndex(localPlan, localCompletion, readStorage(STORAGE_KEYS.selectedDayIndex, 0));
  });
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(isSupabaseConfigured ? "checking" : "unconfigured");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncMessage, setSyncMessage] = useState("Local save is active.");
  const [lastSyncedAt, setLastSyncedAt] = useState("");
  const [cloudLoadedFor, setCloudLoadedFor] = useState("");

  const todaysPlan = weeklyPlan?.days[selectedDayIndex] ?? weeklyPlan?.days[0] ?? null;
  const resumeDayIndex = useMemo(() => getResumeDayIndex(weeklyPlan, completion, selectedDayIndex), [completion, selectedDayIndex, weeklyPlan]);
  const resumeDay = weeklyPlan?.days[resumeDayIndex] ?? weeklyPlan?.days[0] ?? null;
  const completedCount = Object.values(completion).filter((status) => status === "Done").length;
  const showBottomNav = Boolean(weeklyPlan) && !["welcome", "onboarding", "loading", "save-plan"].includes(screen);
  const activeMainTab = screen === "nutrition" ? "nutrition" : screen === "progress" ? "progress" : screen === "profile" ? "profile" : "exercise";

  useEffect(() => {
    const bmi = calculateBmi(profile.height, profile.weight);
    const bmiCategory = getBmiCategory(bmi);
    setProfile((current) => (current.bmi === bmi && current.bmiCategory === bmiCategory ? current : { ...current, bmi, bmiCategory }));
  }, [profile.height, profile.weight]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.profile, profile);
  }, [profile]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.selectedDayIndex, selectedDayIndex);
  }, [selectedDayIndex]);

  useEffect(() => {
    if (["welcome", "onboarding", "loading"].includes(screen)) return;
    writeStorage(STORAGE_KEYS.lastActiveScreen, screen);
    writeStorage(STORAGE_KEYS.lastActiveDate, getTodayKey());
  }, [screen]);

  const saveCloudState = useCallback(
    async (successMessage = "Saved to Supabase.") => {
      if (!supabase || !session?.user.id) {
        setSyncStatus(isSupabaseConfigured ? "idle" : "error");
        setSyncMessage(isSupabaseConfigured ? "Sign in to save this plan online." : "Add Supabase URL and publishable key to enable cloud save.");
        return false;
      }

      setSyncStatus("saving");

      try {
        const payload = {
          user_id: session.user.id,
          profile,
          weekly_plan: weeklyPlan,
          exercise_completion: completion,
          exercise_selection: exerciseSelection,
          check_in: checkIn,
          adapted_plan: adaptedPlan,
          plan_profile_signature: readStorage(STORAGE_KEYS.planProfileSignature, ""),
          current_week: weeklyPlan?.week ?? 1,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("user_app_state").upsert(payload, { onConflict: "user_id" });
        if (error) throw error;

        setSyncStatus("saved");
        setSyncMessage(successMessage);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
        return true;
      } catch {
        setSyncStatus("error");
        setSyncMessage("Could not save to Supabase. Local save is still active.");
        return false;
      }
    },
    [adaptedPlan, checkIn, completion, exerciseSelection, profile, session?.user.id, weeklyPlan],
  );

  const loadCloudState = useCallback(
    async (userId: string) => {
      if (!supabase) return;

      setSyncStatus("loading");
      setSyncMessage("Loading your saved GymBuddy plan...");

      try {
        const { data, error } = await supabase.from("user_app_state").select("*").eq("user_id", userId).maybeSingle();
        if (error) throw error;

        const remote = data as RemoteAppState | null;

        if (remote?.profile) {
          const nextProfile = normalizeProfile(remote.profile);
          setProfile(nextProfile);
          writeStorage(STORAGE_KEYS.profile, nextProfile);
        }

        if (remote?.weekly_plan) {
          setWeeklyPlan(remote.weekly_plan);
          writeStorage(STORAGE_KEYS.plan, remote.weekly_plan);
          setSelectedDayIndex(0);
          setScreen("weekly-plan");
          setScreenHistory([]);
        }

        if (remote?.exercise_completion) {
          setCompletion(remote.exercise_completion);
          writeStorage(STORAGE_KEYS.completion, remote.exercise_completion);
        }

        if (remote?.exercise_selection) {
          setExerciseSelection(remote.exercise_selection);
          writeStorage(STORAGE_KEYS.exerciseSelection, remote.exercise_selection);
        }

        if (remote?.check_in) {
          const nextCheckIn = normalizeCheckIn(remote.check_in);
          setCheckIn(nextCheckIn);
          writeStorage(STORAGE_KEYS.checkIn, nextCheckIn);
        }

        if (remote?.adapted_plan) {
          setAdaptedPlan(remote.adapted_plan);
          writeStorage(STORAGE_KEYS.adaptation, remote.adapted_plan);
        }

        if (remote?.plan_profile_signature) {
          writeStorage(STORAGE_KEYS.planProfileSignature, remote.plan_profile_signature);
        }

        if (!remote) {
          const localProfile = normalizeProfile(readStorage<Partial<UserProfile>>(STORAGE_KEYS.profile, {}));
          const localPlan = readStorage<WeeklyPlan | null>(STORAGE_KEYS.plan, null);
          const localCompletion = readStorage<ExerciseCompletion>(STORAGE_KEYS.completion, {});
          const localExerciseSelection = readStorage<ExerciseSelection>(STORAGE_KEYS.exerciseSelection, {});
          const localCheckIn = normalizeCheckIn(readStorage<Partial<WorkoutCheckIn>>(STORAGE_KEYS.checkIn, initialCheckIn));
          const localAdaptedPlan = readStorage(STORAGE_KEYS.adaptation, "");

          setProfile(localProfile);
          setWeeklyPlan(localPlan);
          setCompletion(localCompletion);
          setExerciseSelection(localExerciseSelection);
          setCheckIn(localCheckIn);
          setAdaptedPlan(localAdaptedPlan);
          setSelectedDayIndex(0);

          if (localPlan) {
            setScreen("save-plan");
            setScreenHistory([]);
          }
        }

        setCloudLoadedFor(userId);
        setSyncStatus("saved");
        setSyncMessage(remote ? "Loaded your saved GymBuddy data." : "Email confirmed. Your local plan is ready to sync.");
        setLastSyncedAt(remote?.updated_at ? new Date(remote.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
      } catch {
        setCloudLoadedFor(userId);
        setSyncStatus("error");
        setSyncMessage("Could not load Supabase data. Local save is still active.");
      }
    },
    [],
  );

  useEffect(() => {
    if (!supabase) {
      setAuthStatus("unconfigured");
      return;
    }

    let isActive = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isActive) return;
      setSession(data.session);
      setAuthStatus(data.session ? "signed-in" : "signed-out");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthStatus(nextSession ? "signed-in" : "signed-out");
      if (!nextSession) {
        setCloudLoadedFor("");
        setSyncStatus("idle");
        setSyncMessage("Signed out. Local save is still active on this device.");
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user.id || cloudLoadedFor === session.user.id) return;
    void loadCloudState(session.user.id);
  }, [cloudLoadedFor, loadCloudState, session?.user.id]);

  useEffect(() => {
    if (!supabase || !session?.user.id || cloudLoadedFor !== session.user.id) return;
    const syncTimer = window.setTimeout(() => {
      void saveCloudState("Saved to Supabase.");
    }, 1000);

    return () => window.clearTimeout(syncTimer);
  }, [cloudLoadedFor, saveCloudState, session?.user.id]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.reminderSettings, reminderSettings);
  }, [reminderSettings]);

  useEffect(() => {
    if (screen !== "nutrition") return;
    void refreshNutritionPlan(profile);
  }, [profile.age, profile.bmi, profile.bmiCategory, profile.bodyGoal, profile.daysPerWeek, profile.dietPreference, profile.gender, profile.goal, profile.height, profile.weight, screen]);

  useEffect(() => {
    if (!weeklyPlan || !reminderSettings.enabled || notificationPermission !== "granted") return;
    if (!getReminderTargetDay(weeklyPlan, completion)) return;
    const timeParts = getReminderTimeParts(reminderSettings);
    if (!timeParts) return;

    const now = new Date();
    const reminderAt = new Date();
    reminderAt.setHours(timeParts.hours, timeParts.minutes, 0, 0);

    const reminderTimeKey = `${timeParts.hours}:${String(timeParts.minutes).padStart(2, "0")}`;
    const todayReminderKey = `${getLocalDateKey(reminderAt)}-${reminderTimeKey}`;
    if (reminderAt.getTime() <= now.getTime() || reminderSettings.lastSentKey === todayReminderKey) {
      reminderAt.setDate(reminderAt.getDate() + 1);
    }

    const timer = window.setTimeout(() => {
      if (!getReminderTargetDay(weeklyPlan, completion)) return;

      new Notification("GymBuddy workout reminder", {
        body: buildReminderBody(weeklyPlan, completion),
        tag: "gymbuddy-workout-reminder",
      });

      setReminderSettings((current) => ({
        ...current,
        lastSentKey: `${getLocalDateKey(new Date())}-${reminderTimeKey}`,
      }));
    }, reminderAt.getTime() - now.getTime());

    return () => window.clearTimeout(timer);
  }, [completion, notificationPermission, reminderSettings, weeklyPlan]);

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function refreshNutritionPlan(nextProfile = profile, forceRefresh = false) {
    const finalProfile = {
      ...nextProfile,
      bmi: calculateBmi(nextProfile.height, nextProfile.weight),
      bmiCategory: getBmiCategory(calculateBmi(nextProfile.height, nextProfile.weight)),
    };
    const signature = getNutritionSignature(finalProfile);
    const cachedSignature = readStorage(STORAGE_KEYS.nutritionSignature, "");
    const cachedPlan = readStorage<NutritionPlan | null>(STORAGE_KEYS.nutritionPlan, null);

    if (!forceRefresh && cachedPlan && cachedSignature === signature) {
      setNutritionPlan(cachedPlan);
      return;
    }

    const fallbackPlan = createFallbackNutritionPlan(finalProfile);
    setNutritionPlan(fallbackPlan);
    setNutritionSource("fallback");
    setNutritionError("");
    setIsNutritionLoading(true);
    writeStorage(STORAGE_KEYS.nutritionPlan, fallbackPlan);
    writeStorage(STORAGE_KEYS.nutritionSignature, signature);
    writeStorage(STORAGE_KEYS.nutritionSource, "fallback");
    writeStorage(STORAGE_KEYS.nutritionError, "");

    try {
      const aiNutritionPlan = await requestAiNutritionPlan(finalProfile, fallbackPlan);
      setNutritionPlan(aiNutritionPlan);
      setNutritionSource("ai");
      writeStorage(STORAGE_KEYS.nutritionPlan, aiNutritionPlan);
      writeStorage(STORAGE_KEYS.nutritionSource, "ai");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nutrition generation failed";
      setNutritionError(message);
      writeStorage(STORAGE_KEYS.nutritionError, message);
    } finally {
      setIsNutritionLoading(false);
    }
  }

  function handleDietPreferenceChange(dietPreference: UserProfile["dietPreference"]) {
    const nextProfile = { ...profile, dietPreference };
    setProfile(nextProfile);
    writeStorage(STORAGE_KEYS.profile, nextProfile);
    void refreshNutritionPlan(nextProfile, true);
  }

  function handleBodyGoalChange(bodyGoal: BodyGoal) {
    const nextProfile = { ...profile, bodyGoal };
    setProfile(nextProfile);
    writeStorage(STORAGE_KEYS.profile, nextProfile);
    void refreshNutritionPlan(nextProfile, true);
  }

  function handleWeeklyWeightLog(weightKg: string) {
    const numericWeight = Number(weightKg);
    if (!Number.isFinite(numericWeight) || numericWeight < 20 || numericWeight > 250) return false;

    const cleanWeight = Number(numericWeight.toFixed(1));
    const nextBmi = calculateBmi(profile.height, String(cleanWeight));
    const nextProfile = {
      ...profile,
      weight: String(cleanWeight),
      bmi: nextBmi,
      bmiCategory: getBmiCategory(nextBmi),
    };
    const entry: WeightLogEntry = {
      id: getWeekStartKey(),
      date: getLocalDateKey(),
      weight: cleanWeight,
      bmi: nextBmi,
      maintenanceCalories: calculateMaintenanceCalories(nextProfile),
      targetCalories: calculateTargetCalories(nextProfile),
    };
    const nextWeightLog = [entry, ...weightLog.filter((item) => item.id !== entry.id)].slice(0, 12);

    setProfile(nextProfile);
    setWeightLog(nextWeightLog);
    writeStorage(STORAGE_KEYS.profile, nextProfile);
    writeStorage(STORAGE_KEYS.weightLog, nextWeightLog);
    void refreshNutritionPlan(nextProfile, true);
    return true;
  }

  async function handleEnableReminders() {
    const currentPermission = getNotificationPermission();
    setNotificationPermission(currentPermission);

    if (currentPermission === "unsupported") return;

    const nextPermission = currentPermission === "default" ? await Notification.requestPermission() : currentPermission;
    setNotificationPermission(nextPermission);

    if (nextPermission === "granted") {
      setReminderSettings((current) => ({ ...current, enabled: true }));
    }
  }

  function handleDisableReminders() {
    setReminderSettings((current) => ({ ...current, enabled: false }));
  }

  function handleReminderTimeChange(nextTime: Pick<ReminderSettings, "hour" | "minute" | "period">) {
    setReminderSettings((current) => ({ ...current, ...nextTime, lastSentKey: "" }));
  }

  async function handleEmailSignIn(email: string) {
    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Add Supabase URL and publishable key first.");
      return false;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setSyncStatus("error");
      setSyncMessage("Enter an email address first.");
      return false;
    }

    setSyncStatus("loading");
    setSyncMessage("Sending secure email link...");
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: window.location.origin,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setSyncStatus("error");
      setSyncMessage(`Email link could not be sent: ${error.message}`);
      return false;
    }

    setSyncStatus("saved");
    setSyncMessage("Email link sent. Open it on this same browser/device to back up your plan.");
    return true;
  }

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  function goToScreen(nextScreen: Screen) {
    setScreenHistory((history) => [...history, screen]);
    setScreen(nextScreen);
  }

  function goBack() {
    const previousScreen = screenHistory[screenHistory.length - 1];
    if (!previousScreen) return;
    setScreenHistory((history) => history.slice(0, -1));
    setScreen(previousScreen);
  }

  async function handleGeneratePlan(event: FormEvent) {
    event.preventDefault();
    if (!profile.height || !profile.weight) return;

    const finalProfile = {
      ...profile,
      bmi: calculateBmi(profile.height, profile.weight),
      bmiCategory: getBmiCategory(calculateBmi(profile.height, profile.weight)),
      injuryDetail: profile.injuryOrPain === "Other" ? profile.injuryDetail : "",
    };
    const prompt = buildWeekOnePrompt(finalProfile);
    const fallbackPlan = createFallbackPlan(finalProfile);
    const profileSignature = getProfileSignature(finalProfile);
    const cachedSignature = readStorage(STORAGE_KEYS.planProfileSignature, "");
    const cachedPlan = readStorage<WeeklyPlan | null>(STORAGE_KEYS.plan, null);

    if (cachedPlan && cachedSignature === profileSignature) {
      setProfile(finalProfile);
      setWeeklyPlan(cachedPlan);
      const nextDayIndex = getResumeDayIndex(cachedPlan, completion, selectedDayIndex);
      setSelectedDayIndex(nextDayIndex);
      writeStorage(STORAGE_KEYS.profile, finalProfile);
      writeStorage(STORAGE_KEYS.aiPrompt, prompt);
      setScreen(session?.user.id ? "weekly-plan" : "save-plan");
      return;
    }

    setProfile(finalProfile);
    setCompletion({});
    setExerciseSelection({});
    setSelectedDayIndex(0);
    writeStorage(STORAGE_KEYS.profile, finalProfile);
    writeStorage(STORAGE_KEYS.completion, {});
    writeStorage(STORAGE_KEYS.exerciseSelection, {});
    writeStorage(STORAGE_KEYS.aiPrompt, prompt);
    goToScreen("loading");

    const startedAt = Date.now();
    let nextPlan = fallbackPlan;
    let nextSource: PlanSource = "fallback";
    let nextAiError = "";

    try {
      nextPlan = await requestAiWeekOnePlan(finalProfile);
      nextSource = "ai";
    } catch (error) {
      nextPlan = fallbackPlan;
      nextAiError = error instanceof Error ? error.message : "AI plan generation failed";
    }

    const remainingLoadingTime = Math.max(0, 1400 - (Date.now() - startedAt));
    await wait(remainingLoadingTime);
    setWeeklyPlan(nextPlan);
    setPlanSource(nextSource);
    setAiError(nextAiError);
    const nextMonthlyProgress = upsertMonthlyProgress({}, nextPlan, {});
    setMonthlyProgress(nextMonthlyProgress);
    writeStorage(STORAGE_KEYS.plan, nextPlan);
    writeStorage(STORAGE_KEYS.planSource, nextSource);
    writeStorage(STORAGE_KEYS.aiError, nextAiError);
    writeStorage(STORAGE_KEYS.planProfileSignature, profileSignature);
    writeStorage(STORAGE_KEYS.monthlyProgress, nextMonthlyProgress);
    setScreen(session?.user.id ? "weekly-plan" : "save-plan");
  }

  function updateExerciseStatus(id: string, status: ExerciseStatus) {
    const next = { ...completion, [id]: status };
    setCompletion(next);
    writeStorage(STORAGE_KEYS.completion, next);
    const nextMonthlyProgress = upsertMonthlyProgress(monthlyProgress, weeklyPlan, next);
    setMonthlyProgress(nextMonthlyProgress);
    writeStorage(STORAGE_KEYS.monthlyProgress, nextMonthlyProgress);
  }

  function chooseExerciseOption(id: string, selectedOption: "main" | "alternative") {
    const next = { ...exerciseSelection, [id]: selectedOption };
    setExerciseSelection(next);
    writeStorage(STORAGE_KEYS.exerciseSelection, next);
  }

  function handleSaveCheckIn() {
    const nextPlan = createAdaptedPlan(checkIn, completedCount);
    setAdaptedPlan(nextPlan);
    writeStorage(STORAGE_KEYS.checkIn, checkIn);
    writeStorage(STORAGE_KEYS.adaptation, nextPlan);
    goToScreen("adaptation");
  }

  function handleGenerateNextWeek() {
    if (!weeklyPlan) return;
    const nextPlan = createNextWeekPlan(weeklyPlan, completion, checkIn, profile);
    const nextMessage = getNextWeekStrategy(weeklyPlan, completion, checkIn).note;
    const nextMonthlyProgress = upsertMonthlyProgress(
      upsertMonthlyProgress(monthlyProgress, weeklyPlan, completion),
      nextPlan,
      {},
    );

    setWeeklyPlan(nextPlan);
    setCompletion({});
    setExerciseSelection({});
    setAdaptedPlan(nextMessage);
    setSelectedDayIndex(0);
    setMonthlyProgress(nextMonthlyProgress);
    writeStorage(STORAGE_KEYS.plan, nextPlan);
    writeStorage(STORAGE_KEYS.completion, {});
    writeStorage(STORAGE_KEYS.exerciseSelection, {});
    writeStorage(STORAGE_KEYS.adaptation, nextMessage);
    writeStorage(STORAGE_KEYS.selectedDayIndex, 0);
    writeStorage(STORAGE_KEYS.monthlyProgress, nextMonthlyProgress);
    setScreen("weekly-plan");
  }

  function openDay(dayIndex: number) {
    setSelectedDayIndex(dayIndex);
    writeStorage(STORAGE_KEYS.selectedDayIndex, dayIndex);
    goToScreen("today-workout");
  }

  function navigateMainTab(tab: "exercise" | "nutrition" | "progress" | "profile") {
    if (tab === "exercise") setScreen("weekly-plan");
    if (tab === "nutrition") setScreen("nutrition");
    if (tab === "progress") setScreen("progress");
    if (tab === "profile") setScreen("profile");
  }

  return (
    <main className="gb-theme min-h-[100dvh] bg-[#0F172A] p-0 text-[#FFFFFF] sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-0 bg-[#1E293B] shadow-none sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2rem] sm:border sm:border-slate-700 sm:shadow-2xl sm:shadow-slate-950/60">
        {screen !== "welcome" && screen !== "loading" && screen !== "onboarding" && screenHistory.length > 0 && (
          <button
            className="mx-4 mt-4 w-fit rounded-full bg-[#EAF7F6] px-4 py-2 text-sm font-bold text-teal-900 sm:mx-5 sm:mt-5"
            onClick={goBack}
            type="button"
          >
            Back
          </button>
        )}

        {screen === "welcome" && <WelcomeScreen onStart={() => goToScreen("onboarding")} />}
        {screen === "onboarding" && (
          <OnboardingScreen profile={profile} updateProfile={updateProfile} onBack={goBack} onSubmit={handleGeneratePlan} />
        )}
        {screen === "loading" && <LoadingScreen />}
        {screen === "save-plan" && (
          <SavePlanScreen
            authStatus={authStatus}
            syncMessage={syncMessage}
            syncStatus={syncStatus}
            userEmail={session?.user.email ?? ""}
            onEmailSignIn={handleEmailSignIn}
            onManualSync={() => void saveCloudState("Saved to Supabase.")}
            onSkip={() => setScreen("weekly-plan")}
          />
        )}
        {screen === "weekly-plan" && (
          <WeeklyPlanScreen
            plan={weeklyPlan}
            profile={profile}
            completion={completion}
            onOpenDay={openDay}
            resumeDay={resumeDay}
            onStartWorkout={() => openDay(resumeDayIndex)}
          />
        )}
        {screen === "today-workout" && todaysPlan && (
          <TodayWorkoutScreen
            day={todaysPlan}
            completion={completion}
            exerciseSelection={exerciseSelection}
            onChooseExerciseOption={chooseExerciseOption}
            onUpdateExerciseStatus={updateExerciseStatus}
            onOpenVideo={setActiveVideo}
            onBackToWeek={() => setScreen("weekly-plan")}
            onCheckIn={() => goToScreen("check-in")}
          />
        )}
        {screen === "check-in" && (
          <CheckInScreen checkIn={checkIn} setCheckIn={setCheckIn} onSave={handleSaveCheckIn} />
        )}
        {screen === "adaptation" && (
          <AdaptationScreen
            adaptedPlan={adaptedPlan}
            checkIn={checkIn}
            completedCount={completedCount}
            currentWeek={weeklyPlan?.week ?? 1}
            weeklyPercent={getWeeklyProgress(weeklyPlan, completion).percent}
            onGenerateNextWeek={handleGenerateNextWeek}
            onRestart={() => goToScreen("weekly-plan")}
          />
        )}
        {screen === "nutrition" && (
          <NutritionScreen
            isLoading={isNutritionLoading}
            nutritionPlan={nutritionPlan}
            profile={profile}
            weightLog={weightLog}
            onBodyGoalChange={handleBodyGoalChange}
            onDietPreferenceChange={handleDietPreferenceChange}
            onLogWeight={handleWeeklyWeightLog}
            onRefresh={() => void refreshNutritionPlan(profile, true)}
          />
        )}
        {screen === "progress" && (
          <ProgressScreen
            completion={completion}
            monthlyProgress={monthlyProgress}
            notificationPermission={notificationPermission}
            plan={weeklyPlan}
            reminderSettings={reminderSettings}
            onDisableReminders={handleDisableReminders}
            onEnableReminders={handleEnableReminders}
            onReminderTimeChange={handleReminderTimeChange}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            authStatus={authStatus}
            lastSyncedAt={lastSyncedAt}
            profile={profile}
            syncMessage={syncMessage}
            syncStatus={syncStatus}
            userEmail={session?.user.email ?? ""}
            onEmailSignIn={handleEmailSignIn}
            onManualSync={() => void saveCloudState("Saved to Supabase.")}
            onSignOut={handleSignOut}
          />
        )}

        {showBottomNav && <BottomNav activeTab={activeMainTab} onNavigate={navigateMainTab} />}

        {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
      </div>
    </main>
  );
}

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex min-h-[100dvh] flex-col justify-between p-5 sm:min-h-[calc(100vh-2.5rem)] sm:p-6">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#40B5AD] text-slate-950">
          <Dumbbell size={25} />
        </div>
        <div>
          <p className="text-xl font-black text-slate-950">GymBuddy</p>
          <p className="text-sm font-semibold text-teal-800">Your Personalized Gym Trainer</p>
        </div>
      </div>

      <div className="space-y-5">
        <p className="w-fit rounded-full bg-[#EAF7F6] px-4 py-2 text-sm font-black text-teal-900">Beginner-friendly</p>
        <h1 className="text-[2.55rem] font-black leading-[0.95] tracking-tight text-slate-950 sm:text-5xl">Walk in confident. Train with a plan</h1>
        <p className="text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
          Get a simple plan built around your goal, gym, time, and confidence so you always know what to do next.
        </p>
      </div>

      <button
        className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 py-3 text-base font-black text-slate-950 shadow-xl shadow-teal-200 transition active:scale-[0.99] sm:min-h-14 sm:text-lg"
        onClick={onStart}
        type="button"
      >
        Start My Plan
        <ChevronRight size={22} />
      </button>
    </section>
  );
}

function OnboardingScreen({
  profile,
  updateProfile,
  onBack,
  onSubmit,
}: {
  profile: UserProfile;
  updateProfile: <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [profileStepReady, setProfileStepReady] = useState(false);
  const onboardingTopRef = useRef<HTMLDivElement | null>(null);
  const bmiLabel = useMemo(() => {
    if (!profile.bmi) return "BMI appears here after height and weight";
    return `BMI: ${profile.bmi} - ${profile.bmiCategory}`;
  }, [profile.bmi, profile.bmiCategory]);

  const canSubmit = onboardingStep === 2 && profileStepReady && Boolean(profile.height && profile.weight);
  const recommendation = useMemo(
    () => getWorkoutRecommendation(profile.goal, profile.experienceLevel),
    [profile.goal, profile.experienceLevel],
  );
  const stepLabel = onboardingStep === 1 ? "Step 1 of 2: Training basics" : "Step 2 of 2: Personal profile";

  useEffect(() => {
    onboardingTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (onboardingStep === 2) {
      setProfileStepReady(false);
      const timer = window.setTimeout(() => setProfileStepReady(true), 650);
      return () => window.clearTimeout(timer);
    }
    setProfileStepReady(false);
  }, [onboardingStep]);

  function moveToProfileStep() {
    setOnboardingStep(2);
  }

  return (
    <form className="flex flex-1 flex-col" onSubmit={onSubmit}>
      <div ref={onboardingTopRef} className="flex flex-1 flex-col gap-4 p-4 pb-3 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-4">
        <button
          className="w-fit rounded-full bg-[#EAF7F6] px-4 py-2 text-sm font-bold text-teal-900"
          onClick={() => (onboardingStep === 1 ? onBack() : setOnboardingStep(1))}
          type="button"
        >
          Back
        </button>
        <ScreenTitle icon={<Sparkles size={22} />} title="Quick Setup" subtitle="Set up your profile in seconds. GymBuddy personalizes the rest." />

        <p className="rounded-full bg-[#EAF7F6] px-3 py-2 text-center text-xs font-black uppercase tracking-wide text-teal-900">
          {stepLabel}
        </p>

        <div className="flex items-center gap-2">
          <div className={`h-2 flex-1 rounded-full ${onboardingStep === 1 ? "bg-[#40B5AD]" : "bg-[#CDEDEB]"}`} />
          <div className={`h-2 flex-1 rounded-full ${onboardingStep === 2 ? "bg-[#40B5AD]" : "bg-[#CDEDEB]"}`} />
        </div>

        {onboardingStep === 1 ? (
          <>
            <ChipGroup
              columns="grid-cols-2"
              label="What is your main goal?"
              options={["Lose fat", "Build strength", "Build muscle", "General fitness"]}
              value={profile.goal}
              onChange={(value) => updateProfile("goal", value as UserProfile["goal"])}
            />

            <ChipGroup
              columns="grid-cols-3"
              label="Your gym experience"
              options={["First time", "Beginner", "Restarting after break"]}
              value={profile.experienceLevel}
              onChange={(value) => updateProfile("experienceLevel", value as UserProfile["experienceLevel"])}
            />

            <ChipGroup
              columns="grid-cols-2"
              label="Where do you train?"
              options={["Basic gym", "Highly equipped gym"]}
              value={profile.gymType}
              onChange={(value) => updateProfile("gymType", value as UserProfile["gymType"])}
            />

            <ChipGroup
              columns="grid-cols-3"
              helper="* Recommended for you"
              label="Days you can workout"
              options={["3 days", "4 days", "5 days"]}
              recommendedOption={recommendation.days}
              value={profile.daysPerWeek}
              onChange={(value) => updateProfile("daysPerWeek", value as UserProfile["daysPerWeek"])}
            />

            <ChipGroup
              columns="grid-cols-3"
              helper="* Recommended for you"
              label="Time per workout"
              options={["30 minutes", "45 minutes", "60 minutes"]}
              recommendedOption={recommendation.duration}
              value={profile.workoutDuration}
              onChange={(value) => updateProfile("workoutDuration", value as UserProfile["workoutDuration"])}
            />
          </>
        ) : (
          <>
            <section className="grid gap-3 rounded-3xl border border-teal-100 bg-white p-4">
              <TextField
                label="Name"
                placeholder="Your name"
                value={profile.name}
                onChange={(value) => updateProfile("name", value)}
              />
              <NumberField
                label="Age"
                placeholder="Your age"
                required={false}
                suffix="years"
                value={profile.age}
                onChange={(value) => updateProfile("age", value)}
              />
              <ChipGroup
                columns="grid-cols-3"
                label="Gender"
                options={["Male", "Female", "Other"]}
                value={profile.gender}
                onChange={(value) => updateProfile("gender", value as UserProfile["gender"])}
              />
              <ChipGroup
                columns="grid-cols-2"
                label="Diet preference"
                options={["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"]}
                value={profile.dietPreference}
                onChange={(value) => updateProfile("dietPreference", value as UserProfile["dietPreference"])}
              />
            </section>

            <section className="grid gap-3 rounded-3xl border border-teal-100 bg-white p-4">
              <h2 className="text-[15px] font-black text-slate-900">Your body info</h2>
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Height" suffix="cm" value={profile.height} onChange={(value) => updateProfile("height", value)} />
                <NumberField label="Weight" suffix="kg" value={profile.weight} onChange={(value) => updateProfile("weight", value)} />
              </div>
              <div className="rounded-2xl border border-teal-100 bg-[#EAF7F6] p-3">
                <p className="text-sm font-bold text-slate-700">{bmiLabel}</p>
              </div>
            </section>

            <ChipGroup
              columns="grid-cols-3"
              label="Any injury or pain?"
              options={["No pain", "Knee", "Shoulder", "Back pain", "Wrist", "Other"]}
              value={profile.injuryOrPain}
              onChange={(value) => updateProfile("injuryOrPain", value as UserProfile["injuryOrPain"])}
            />

            {profile.injuryOrPain === "Other" && (
              <label className="grid gap-2">
                <span className="text-[15px] font-black text-slate-800">Mention pain or injury</span>
                <input
                  className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold outline-none focus:border-[#2F9F98] focus:ring-4 focus:ring-teal-100"
                  placeholder="Mention pain or injury"
                  value={profile.injuryDetail}
                  onChange={(event) => updateProfile("injuryDetail", event.target.value)}
                />
              </label>
            )}

            <ChipGroup
              columns="grid-cols-3"
              label="How confident do you feel today?"
              options={["Low", "Medium", "High"]}
              value={profile.confidenceLevel}
              onChange={(value) => updateProfile("confidenceLevel", value as UserProfile["confidenceLevel"])}
            />
          </>
        )}
      </div>

      <div className="sticky bottom-0 mt-auto border-t border-slate-200 bg-white/95 p-4 shadow-[0_-16px_40px_rgba(64,181,173,0.14)] backdrop-blur sm:p-5">
        <p className="mb-3 text-center text-xs font-bold text-slate-500">
          {onboardingStep === 1 ? "Takes 15 seconds. You can change this later." : "Confirm height and weight to generate your plan."}
        </p>
        {onboardingStep === 1 ? (
          <button
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 text-base font-black text-slate-950 shadow-xl shadow-teal-200 sm:min-h-14"
            onClick={moveToProfileStep}
            type="button"
          >
            Continue
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 text-base font-black text-slate-950 shadow-xl shadow-teal-200 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none sm:min-h-14"
            disabled={!canSubmit}
            type="submit"
          >
            Generate My Week 1 Plan
            <Wand2 size={20} />
          </button>
        )}
      </div>
    </form>
  );
}

function LoadingScreen() {
  const messages = [
    "Matching exercises to your gym type",
    "Keeping it beginner-friendly",
    "Adding alternatives if machines are busy",
  ];

  return (
    <section className="flex min-h-[100dvh] flex-col justify-center gap-5 p-5 text-center sm:min-h-[calc(100vh-2.5rem)] sm:gap-6 sm:p-6">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#40B5AD] text-slate-950 shadow-xl shadow-teal-200">
        <Sparkles className="animate-pulse" size={30} />
      </div>
      <div>
        <h1 className="text-2xl font-black leading-tight text-slate-950 sm:text-3xl">Building your Week 1 plan...</h1>
        <p className="mt-3 leading-7 text-slate-600">A simple start, built around your gym and comfort level.</p>
      </div>
      <div className="grid gap-3 text-left">
        {messages.map((message) => (
          <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-[#EAF7F6] p-4" key={message}>
            <CheckCircle2 className="text-teal-700" size={20} />
            <span className="font-bold text-slate-800">{message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SavePlanScreen({
  authStatus,
  syncStatus,
  syncMessage,
  userEmail,
  onEmailSignIn,
  onManualSync,
  onSkip,
}: {
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  syncMessage: string;
  userEmail: string;
  onEmailSignIn: (email: string) => Promise<boolean>;
  onManualSync: () => void;
  onSkip: () => void;
}) {
  const isSignedIn = authStatus === "signed-in";
  const isBusy = authStatus === "checking" || syncStatus === "loading" || syncStatus === "saving";

  return (
    <section className="flex min-h-[100dvh] flex-col gap-4 p-4 sm:min-h-[calc(100vh-2.5rem)] sm:gap-5 sm:p-5">
      <ScreenTitle icon={<Cloud size={22} />} title="Save Your Plan" subtitle="Keep your profile, workouts, and progress ready when you come back." />

      <div className="rounded-3xl border border-[#334155] bg-[#273449] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Plan ready</p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
          {isSignedIn ? "Your GymBuddy account is connected" : "Save now, train without restarting"}
        </h2>
        <p className="mt-3 leading-7 text-[#CBD5E1]">
          {isSignedIn
            ? `Signed in${userEmail ? ` as ${userEmail}` : ""}. Sync your latest plan before opening Week 1.`
            : "Your plan is already saved on this device. Email backup is optional for safer recovery."}
        </p>
      </div>

      <p className={`rounded-2xl px-4 py-3 text-sm font-bold ${syncStatus === "error" ? "bg-red-500/15 text-red-200" : "bg-[#0F172A] text-[#CBD5E1]"}`}>
        {syncMessage}
      </p>

      {authStatus === "unconfigured" ? (
        <div className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4 sm:p-5">
          <p className="text-lg font-black text-white">Supabase is not connected yet</p>
          <p className="mt-2 leading-7 text-[#CBD5E1]">
            Add these two values in `.env.local`, restart the server, and this screen will show email backup.
          </p>
          <p className="mt-4 rounded-2xl bg-[#0F172A] p-4 font-mono text-xs leading-6 text-[#CBD5E1]">
            VITE_SUPABASE_URL
            <br />
            VITE_SUPABASE_PUBLISHABLE_KEY
          </p>
        </div>
      ) : isSignedIn ? (
        <button
          className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 font-black text-white disabled:opacity-60 sm:min-h-14"
          disabled={isBusy}
          onClick={onManualSync}
          type="button"
        >
          <Cloud size={20} />
          Sync My Plan
        </button>
      ) : (
        <div className="grid gap-3">
          <EmailLinkBackupForm
            disabled={isBusy}
            onSendLink={onEmailSignIn}
          />
        </div>
      )}

      <button
        className="mt-auto flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-[#F97316] px-5 font-black text-white sm:min-h-14"
        onClick={onSkip}
        type="button"
      >
        View My Week 1 Plan
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function EmailLinkBackupForm({
  disabled,
  onSendLink,
}: {
  disabled: boolean;
  onSendLink: (email: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  async function sendLink() {
    const sent = await onSendLink(email);
    if (sent) setLinkSent(true);
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div>
        <p className="text-sm font-black text-white">Add email backup</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#CBD5E1]">No password needed. We will send a secure link to back up this device-saved plan.</p>
      </div>
      <input
        className="min-h-12 rounded-2xl border border-[#334155] bg-[#0F172A] px-4 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#3B82F6]"
        inputMode="email"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-4 text-sm font-black text-white disabled:opacity-60"
        disabled={disabled}
        onClick={sendLink}
        type="button"
      >
        <Mail size={18} />
        {linkSent ? "Resend email link" : "Send email link"}
      </button>

      {linkSent && (
        <p className="rounded-2xl bg-[#0F172A] p-3 text-xs font-bold leading-5 text-[#CBD5E1]">
          Open the link on this same browser/device. Your profile and progress are also saved locally, so you can continue even before backup is complete.
        </p>
      )}
    </div>
  );
}

function WeeklyPlanScreen({
  plan,
  profile,
  completion,
  resumeDay,
  onOpenDay,
  onStartWorkout,
}: {
  plan: WeeklyPlan | null;
  profile: UserProfile;
  completion: ExerciseCompletion;
  resumeDay: DayPlan | null;
  onOpenDay: (dayIndex: number) => void;
  onStartWorkout: () => void;
}) {
  const resumeProgress = resumeDay ? getDayProgress(resumeDay, completion) : null;
  const dayCardRefs = useRef<Array<HTMLDivElement | null>>([]);

  function jumpToDay(index: number) {
    dayCardRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:gap-5 sm:p-5 sm:pt-4">
      <ScreenTitle icon={<Wand2 size={22} />} title="Your Week 1 Plan" subtitle="Built from your goal, gym, time, and confidence." />
      <div className="rounded-3xl bg-gradient-to-br from-[#40B5AD] to-[#9EDCD8] p-4 text-slate-950 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-teal-950">Week 1 plan ready</p>
        <h2 className="mt-2 text-2xl font-black">{plan?.title ?? "Create your plan first"}</h2>
        <p className="mt-3 leading-7 text-slate-700">{plan?.note}</p>
      </div>

      {resumeDay && (
        <button
          aria-label={`Open ${resumeDay.day}`}
          className="group rounded-3xl border border-[#334155] bg-[#273449] p-4 text-left transition active:scale-[0.99] sm:p-5"
          onClick={onStartWorkout}
          type="button"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Resume</p>
              <h2 className="mt-2 text-2xl font-black text-white">
                {resumeDay.isRestDay ? `${resumeDay.day}: Recovery` : `${resumeDay.day}: ${resumeDay.title}`}
              </h2>
            </div>
            <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#0F172A] text-[#F97316] transition group-active:translate-x-0.5">
              <ChevronRight size={22} />
            </span>
          </div>
          <p className="mt-2 font-semibold leading-6 text-[#CBD5E1]">
            {resumeDay.isRestDay
              ? "Today is a recovery day. Tap to open light mobility."
              : resumeProgress
                ? `${resumeProgress.done}/${resumeProgress.total} exercises done. Tap to continue.`
                : "Tap to continue from where you left off."}
          </p>
          {!resumeDay.isRestDay && resumeProgress && <ProgressBar percent={resumeProgress.percent} />}
        </button>
      )}

      {plan && <CalendarExportCard plan={plan} profile={profile} />}

      {plan && <DayChipNavigator completion={completion} days={plan.days} onSelectDay={jumpToDay} />}

      <div className="grid gap-3">
        {plan?.days.map((day, index) => (
          <div
            key={day.day}
            ref={(element) => {
              dayCardRefs.current[index] = element;
            }}
          >
            <DayPlanCard
              completion={completion}
              day={day}
              gymType={profile.gymType}
              onOpen={() => onOpenDay(index)}
            />
          </div>
        ))}
      </div>

      <button className="mb-3 mt-1 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 font-black text-white shadow-xl shadow-blue-950/20 sm:mb-4 sm:mt-2 sm:min-h-14" onClick={onStartWorkout} type="button">
        {resumeDay?.isRestDay ? "Open Recovery Day" : `Continue ${resumeDay?.day ?? "Workout"}`}
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function DayChipNavigator({ days, completion, onSelectDay }: { days: DayPlan[]; completion: ExerciseCompletion; onSelectDay: (dayIndex: number) => void }) {
  return (
    <section className="sticky top-0 z-10 -mx-4 border-y border-[#334155] bg-[#1E293B]/95 px-4 py-2.5 backdrop-blur sm:-mx-5 sm:px-5 sm:py-3">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((day, index) => {
          const progress = getDayProgress(day, completion);
          const isDone = progress.isComplete;
          const isPartial = progress.done > 0 || progress.partial > 0;
          const statusDotClass = day.isRestDay ? "bg-[#64748B]" : isDone ? "bg-[#22C55E]" : isPartial ? "bg-[#F97316]" : "bg-[#3B82F6]";

          return (
            <button
              className="flex min-w-[74px] flex-col items-center justify-center rounded-2xl border border-[#334155] bg-[#273449] px-3 py-2 text-white transition active:scale-[0.98]"
              key={day.day}
              onClick={() => onSelectDay(index)}
              type="button"
            >
              <span className="text-xs font-black">{day.day.replace("Day ", "D")}</span>
              <span className={`mt-1 h-2 w-2 rounded-full ${statusDotClass}`} />
              <span className="mt-1 text-[10px] font-bold text-[#CBD5E1]">{day.isRestDay ? "Rest" : `${progress.percent}%`}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CalendarExportCard({ plan, profile }: { plan: WeeklyPlan; profile: UserProfile }) {
  return (
    <div className="rounded-2xl border border-[#334155] bg-[#0F172A] p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#273449] text-[#CBD5E1]">
          <CalendarDays size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Optional</p>
          <h3 className="mt-1 text-sm font-black text-white">Add workouts to calendar</h3>
        </div>
      </div>
      <button
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#334155] bg-[#1E293B] px-4 text-sm font-black text-[#CBD5E1]"
        onClick={() => downloadWorkoutCalendar(plan, profile)}
        type="button"
      >
        <CalendarDays size={18} />
        Download calendar file
      </button>
      <div className="mt-2 text-[11px] font-bold leading-5 text-[#94A3B8]">
        After download: open Google Calendar on desktop &gt; Other calendars + &gt; Import &gt; choose this file.
      </div>
    </div>
  );
}

function DayPlanCard({
  day,
  gymType,
  completion,
  onOpen,
}: {
  day: DayPlan;
  gymType: UserProfile["gymType"];
  completion: ExerciseCompletion;
  onOpen: () => void;
}) {
  const progress = getDayProgress(day, completion);

  return (
    <button
      className={`flex min-h-[184px] w-full flex-col rounded-3xl border p-4 text-left shadow-sm transition active:scale-[0.99] ${
        day.isRestDay ? "border-[#334155] bg-[#273449]" : "border-[#334155] bg-[#1E293B]"
      }`}
      onClick={onOpen}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-sm font-black ${day.isRestDay ? "text-[#CBD5E1]" : "text-[#F97316]"}`}>{day.day}</p>
          <h3 className="mt-1 text-lg font-black text-[#FFFFFF]">{day.title}</h3>
        </div>
        {progress.isComplete ? (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#22C55E] text-white">
            <CheckCircle2 size={18} />
          </span>
        ) : (
          <span className="rounded-full border border-[#334155] bg-[#0F172A] px-3 py-1 text-xs font-black text-[#F97316]">{day.isRestDay ? "Recovery" : gymType}</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 min-h-12 leading-6 text-[#CBD5E1]">{day.focus}</p>
      {day.isRestDay ? (
        <div className="mt-auto rounded-2xl bg-[#0F172A] px-3 py-3">
          <p className="text-xs font-black text-[#CBD5E1]">Rest day</p>
        </div>
      ) : (
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs font-black text-[#F97316]">
            <span>{progress.done}/{progress.total} done</span>
            <span>{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>
      )}
    </button>
  );
}

function TodayWorkoutScreen({
  day,
  completion,
  exerciseSelection,
  onChooseExerciseOption,
  onUpdateExerciseStatus,
  onOpenVideo,
  onBackToWeek,
  onCheckIn,
}: {
  day: DayPlan;
  completion: ExerciseCompletion;
  exerciseSelection: ExerciseSelection;
  onChooseExerciseOption: (id: string, selectedOption: "main" | "alternative") => void;
  onUpdateExerciseStatus: (id: string, status: ExerciseStatus) => void;
  onOpenVideo: (video: VideoTarget) => void;
  onBackToWeek: () => void;
  onCheckIn: () => void;
}) {
  if (day.isRestDay) {
    return (
      <section className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:gap-5 sm:p-5 sm:pt-4">
        <WorkoutBackButton onClick={onBackToWeek} />
        <ScreenTitle icon={<HeartPulse size={22} />} title="Recovery Day" subtitle={`${day.day}: ${day.title}`} />
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-lg font-black text-slate-950">{day.focus}</p>
          <p className="mt-2 leading-7 text-slate-600">Keep it light today. Rest is part of the plan, especially for beginners.</p>
        </div>
        <WorkoutSection title="Optional recovery" subtitle="Only do this if your body feels fresh.">
          {day.coolDown.map((activity) => (
            <ActivityCard activity={activity} key={activity.id} onOpenVideo={onOpenVideo} />
          ))}
        </WorkoutSection>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:gap-5 sm:p-5 sm:pt-4">
      <WorkoutBackButton onClick={onBackToWeek} />
      <ScreenTitle icon={<Dumbbell size={22} />} title="Today's Workout" subtitle={`${day.day}: ${day.title}`} />

      <WorkoutSection title="Warm-up" subtitle="Do these first so your body feels ready.">
        {day.warmUp.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} onOpenVideo={onOpenVideo} />
        ))}
      </WorkoutSection>

      <div className="grid gap-3">
        {day.exercises.map((exercise) => (
          <ExerciseCard
            completionStatus={completion[exercise.id] ?? "Not done"}
            exercise={exercise}
            key={exercise.id}
            selectedOption={exerciseSelection[exercise.id] ?? "main"}
            onChooseOption={(selectedOption) => onChooseExerciseOption(exercise.id, selectedOption)}
            onOpenVideo={onOpenVideo}
            onUpdateStatus={(status) => onUpdateExerciseStatus(exercise.id, status)}
          />
        ))}
      </div>

      <WorkoutSection title="Cooldown" subtitle="Bring your heart rate down and recover better.">
        {day.coolDown.map((activity) => (
          <ActivityCard activity={activity} key={activity.id} onOpenVideo={onOpenVideo} />
        ))}
      </WorkoutSection>

      <button className="mt-auto flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 font-black text-slate-950 shadow-xl shadow-teal-200 sm:min-h-14" onClick={onCheckIn} type="button">
        Finish Workout
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function WorkoutSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="text-sm font-semibold text-slate-500">{subtitle}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ActivityCard({ activity, onOpenVideo }: { activity: PlanActivity; onOpenVideo: (video: VideoTarget) => void }) {
  const demoLink = getDemoLink(activity.name, activity.demoLink);

  return (
    <article className="rounded-3xl border border-teal-100 bg-[#EAF7F6] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{activity.name}</h3>
          <p className="mt-1 text-sm font-bold text-slate-600">
            {activity.time} | {activity.sets} set | {activity.reps}
          </p>
          <p className="mt-1 text-sm font-semibold text-teal-800">{activity.paceOrLoad}</p>
        </div>
        <button
          className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-teal-900"
          onClick={() => onOpenVideo({ title: activity.name, url: demoLink })}
          type="button"
        >
          Demo
        </button>
      </div>
    </article>
  );
}

function WorkoutBackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="flex min-h-11 w-fit items-center gap-2 rounded-full border border-[#334155] bg-[#273449] px-4 text-sm font-black text-[#CBD5E1] transition active:scale-[0.98]"
      onClick={onClick}
      type="button"
    >
      <ArrowLeft size={18} />
      Weekly schedule
    </button>
  );
}

function ExerciseCard({
  exercise,
  selectedOption,
  completionStatus,
  onChooseOption,
  onOpenVideo,
  onUpdateStatus,
}: {
  exercise: Exercise;
  selectedOption: "main" | "alternative";
  completionStatus: ExerciseStatus;
  onChooseOption: (selectedOption: "main" | "alternative") => void;
  onOpenVideo: (video: VideoTarget) => void;
  onUpdateStatus: (status: ExerciseStatus) => void;
}) {
  const activeOption = exercise[selectedOption];
  const activeDemoLink = getDemoLink(activeOption.name, activeOption.demoLink);
  const isTimeBased = /\b(sec|min|seconds|minutes)\b/i.test(activeOption.repsPerSet);
  const isBodyweightOnly = /bodyweight/i.test(activeOption.weightGuide) && !/\bkg|plate|stack|dumbbell|machine|cable\b/i.test(activeOption.weightGuide);
  const effortInputClass = `mt-4 grid ${isBodyweightOnly ? "grid-cols-2" : "grid-cols-3"} gap-2`;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-teal-800">{exercise.muscleGroup}</p>
          <h3 className="mt-1 text-lg font-black text-slate-950">{activeOption.name}</h3>
          <p className="mt-1 font-semibold text-slate-500">{activeOption.equipment}</p>
        </div>
        <button
          className="rounded-2xl bg-[#EAF7F6] px-3 py-2 text-sm font-black text-teal-900"
          onClick={() => onOpenVideo({ title: activeOption.name, url: activeDemoLink })}
          type="button"
        >
          Demo
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1">
        <button
          className={`min-h-10 rounded-xl text-sm font-black ${selectedOption === "main" ? "bg-[#40B5AD] text-slate-950 shadow-sm" : "text-slate-500"}`}
          onClick={() => onChooseOption("main")}
          type="button"
        >
          Main
        </button>
        <button
          className={`min-h-10 rounded-xl text-sm font-black ${selectedOption === "alternative" ? "bg-[#40B5AD] text-slate-950 shadow-sm" : "text-slate-500"}`}
          onClick={() => onChooseOption("alternative")}
          type="button"
        >
          Alternative
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MetricTile label="Sets" value={activeOption.sets} />
        <MetricTile label={isTimeBased ? "Time" : "Reps"} value={activeOption.repsPerSet} />
        <MetricTile label="Rest" value={`${activeOption.restSeconds}s`} />
      </div>

      <p className="mt-3 rounded-2xl bg-[#EAF7F6] p-3 text-sm font-bold text-slate-700">Weight guide: {activeOption.weightGuide}</p>
      <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">Form cue: {activeOption.formCue}</p>

      <div className={effortInputClass}>
        {!isBodyweightOnly && <input className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="kg/plate" inputMode="decimal" />}
        <input className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder="sets" inputMode="numeric" />
        <input className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold" placeholder={isTimeBased ? "time" : "reps"} inputMode={isTimeBased ? "text" : "numeric"} />
      </div>

      <button className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-teal-50 px-3 text-sm font-black text-teal-900" type="button">
        <Timer size={16} />
        Rest timer: {activeOption.restSeconds} sec
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {(["Done", "Partially done", "Not done"] as ExerciseStatus[]).map((status) => (
          <button
            className={`min-h-11 rounded-2xl px-2 text-[11px] font-black leading-tight ${
              completionStatus === status ? "bg-[#40B5AD] text-slate-950 shadow-md shadow-teal-100" : "bg-slate-100 text-slate-600"
            }`}
            key={status}
            onClick={() => onUpdateStatus(status)}
            type="button"
          >
            {status}
          </button>
        ))}
      </div>
    </article>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#334155] bg-[#273449] p-3">
      <p className="text-xs font-black text-[#CBD5E1]">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#334155]">
      <div className="h-full rounded-full bg-[#22C55E] transition-all" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function ProgressScreen({
  plan,
  completion,
  monthlyProgress,
  reminderSettings,
  notificationPermission,
  onEnableReminders,
  onDisableReminders,
  onReminderTimeChange,
}: {
  plan: WeeklyPlan | null;
  completion: ExerciseCompletion;
  monthlyProgress: MonthlyProgress;
  reminderSettings: ReminderSettings;
  notificationPermission: ReminderPermission;
  onEnableReminders: () => void;
  onDisableReminders: () => void;
  onReminderTimeChange: (time: Pick<ReminderSettings, "hour" | "minute" | "period">) => void;
}) {
  const weekly = getWeeklyProgress(plan, completion);
  const [view, setView] = useState<"weekly" | "daily">("weekly");

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-20 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-24">
      <ScreenTitle
        icon={<BarChart3 size={22} />}
        title={view === "weekly" ? "Progress" : "Daily Progress"}
        subtitle={view === "weekly" ? "This week first, month view below." : "Your day-by-day workout completion."}
      />

      {view === "weekly" ? (
        <>
          <button
            className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4 text-left text-white shadow-xl shadow-black/15 transition active:scale-[0.99] sm:p-5"
            onClick={() => setView("daily")}
            type="button"
          >
            <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">This week</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-4xl font-black sm:text-5xl">{weekly.percent}%</h2>
              <p className="pb-2 text-sm font-black text-[#CBD5E1]">{weekly.doneExercises}/{weekly.totalExercises} exercises done</p>
            </div>
            <ProgressBar percent={weekly.percent} />
            <p className="mt-4 text-sm font-black text-[#CBD5E1]">Tap to view daily progress</p>
          </button>

          <div className="grid grid-cols-3 gap-3">
            <MetricTile label="Workout days" value={String(weekly.workoutDays)} />
            <MetricTile label="Partial" value={String(weekly.partialExercises)} />
            <MetricTile label="Done" value={String(weekly.doneExercises)} />
          </div>

          <WorkoutReminderCard
            completion={completion}
            notificationPermission={notificationPermission}
            plan={plan}
            reminderSettings={reminderSettings}
            onDisable={onDisableReminders}
            onEnable={onEnableReminders}
            onTimeChange={onReminderTimeChange}
          />

          <MonthlyProgressCalendar completion={completion} history={monthlyProgress} plan={plan} />
        </>
      ) : (
        <section className="grid gap-3">
          <button className="w-fit rounded-full bg-[#273449] px-4 py-2 text-sm font-black text-[#F97316]" onClick={() => setView("weekly")} type="button">
            Back to week
          </button>
          {plan?.days.map((day) => {
            const progress = getDayProgress(day, completion);
            return (
              <article className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4" key={day.day}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[#F97316]">{day.day}</p>
                    <h3 className="mt-1 font-black text-white">{day.title}</h3>
                  </div>
                  {progress.isComplete && <CheckCircle2 className="text-emerald-500" size={24} />}
                </div>
                {day.isRestDay ? (
                  <p className="mt-3 text-sm font-bold text-[#CBD5E1]">Recovery day</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-bold text-[#CBD5E1]">
                      {progress.done} done, {progress.partial} partial, {progress.total - progress.done - progress.partial} left
                    </p>
                    <ProgressBar percent={progress.percent} />
                  </>
                )}
              </article>
            );
          })}
        </section>
      )}
    </section>
  );
}

function WorkoutReminderCard({
  plan,
  completion,
  reminderSettings,
  notificationPermission,
  onEnable,
  onDisable,
  onTimeChange,
}: {
  plan: WeeklyPlan | null;
  completion: ExerciseCompletion;
  reminderSettings: ReminderSettings;
  notificationPermission: ReminderPermission;
  onEnable: () => void;
  onDisable: () => void;
  onTimeChange: (time: Pick<ReminderSettings, "hour" | "minute" | "period">) => void;
}) {
  const nudge = getProgressNudge(plan, completion);
  const remainingDays = getRemainingWorkoutDays(plan, completion);
  const isUnsupported = notificationPermission === "unsupported";
  const isDenied = notificationPermission === "denied";
  const isEnabled = reminderSettings.enabled && notificationPermission === "granted";
  const hasValidTime = Boolean(getReminderTimeParts(reminderSettings));

  return (
    <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#F97316] text-white">
          <Timer size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Smart reminder</p>
          <h3 className="mt-1 text-xl font-black text-white">{isEnabled ? `On at ${getReminderTimeLabel(reminderSettings)}` : "Turn on workout nudges"}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#CBD5E1]">{nudge}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-[#0F172A] p-3 text-sm font-bold leading-6 text-[#CBD5E1]">
        {remainingDays === 0 ? "No reminder needed right now. Your workout days are complete for this week." : `${remainingDays} workout day${remainingDays === 1 ? "" : "s"} still open this week.`}
      </div>

      <div className="mt-4 grid grid-cols-[72px_72px_76px] justify-between gap-2">
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-[#CBD5E1]">Hour</span>
          <input
            className="h-10 rounded-xl border border-[#334155] bg-[#273449] px-2 text-center text-base font-black text-white outline-none focus:border-[#3B82F6]"
            inputMode="numeric"
            maxLength={2}
            placeholder="HH"
            value={reminderSettings.hour}
            onChange={(event) => onTimeChange({ ...reminderSettings, hour: event.target.value.replace(/\D/g, "").slice(0, 2) })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-[#CBD5E1]">Minute</span>
          <input
            className="h-10 rounded-xl border border-[#334155] bg-[#273449] px-2 text-center text-base font-black text-white outline-none focus:border-[#3B82F6]"
            inputMode="numeric"
            maxLength={2}
            placeholder="MM"
            value={reminderSettings.minute}
            onChange={(event) => onTimeChange({ ...reminderSettings, minute: event.target.value.replace(/\D/g, "").slice(0, 2) })}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[11px] font-black text-[#CBD5E1]">AM/PM</span>
          <select
            className="h-10 rounded-xl border border-[#334155] bg-[#273449] px-2 text-sm font-black text-white outline-none focus:border-[#3B82F6]"
            value={reminderSettings.period}
            onChange={(event) => onTimeChange({ ...reminderSettings, period: event.target.value as ReminderSettings["period"] })}
          >
            <option>AM</option>
            <option>PM</option>
          </select>
        </label>
      </div>

      {!hasValidTime && (
        <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-xs font-bold leading-5 text-[#CBD5E1]">
          Enter a valid time, for example 7, 30, PM.
        </p>
      )}

      {isUnsupported && (
        <p className="mt-4 rounded-2xl bg-[#0F172A] p-3 text-xs font-bold leading-5 text-[#CBD5E1]">
          Browser notifications are not available here. In-app nudges will still show in Progress.
        </p>
      )}

      {isDenied && (
        <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-xs font-bold leading-5 text-red-200">
          Notifications are blocked in this browser. Enable site notifications in browser settings to use reminders.
        </p>
      )}

      <button
        className={`mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-black ${
          isEnabled ? "border border-[#334155] bg-[#273449] text-[#CBD5E1]" : "bg-[#22C55E] text-white"
        }`}
        disabled={isUnsupported || isDenied || remainingDays === 0 || !hasValidTime}
        onClick={isEnabled ? onDisable : onEnable}
        type="button"
      >
        {isEnabled ? "Turn Off Reminder" : "Turn On Reminder"}
      </button>

      <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-xs font-bold leading-5 text-[#CBD5E1]">
        Keep notifications allowed so GymBuddy can remind you at your chosen time.
      </p>
    </section>
  );
}

function MonthlyProgressCalendar({ plan, completion, history }: { plan: WeeklyPlan | null; completion: ExerciseCompletion; history: MonthlyProgress }) {
  const currentWeek = plan?.week ?? 1;
  const weekNumbers = getMonthWeekNumbers(currentWeek);
  const liveSnapshot = plan ? buildWeekProgressSnapshot(plan, completion) : null;
  const monthLabel = `Weeks ${weekNumbers[0]}-${weekNumbers[3]}`;

  function getSnapshot(weekNumber: number) {
    if (liveSnapshot?.week === weekNumber) return liveSnapshot;
    return history[getWeekProgressKey(weekNumber)];
  }

  return (
    <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Month calendar</p>
          <h3 className="mt-1 text-xl font-black text-white">{monthLabel}</h3>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#3B82F6] text-white">
          <CalendarDays size={22} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[52px_repeat(7,minmax(0,1fr))] gap-2 text-center">
        <div />
        {["D1", "D2", "D3", "D4", "D5", "D6", "D7"].map((label) => (
          <p className="text-[11px] font-black text-[#CBD5E1]" key={label}>{label}</p>
        ))}

        {weekNumbers.map((weekNumber) => {
          const snapshot = getSnapshot(weekNumber);
          return (
            <div className="contents" key={weekNumber}>
              <div className="flex min-h-11 items-center justify-center rounded-2xl bg-[#273449] text-xs font-black text-white">
                W{weekNumber}
              </div>
              {Array.from({ length: 7 }, (_, index) => {
                const day = snapshot?.days[index];
                return <CalendarDayCell day={day} key={`${weekNumber}-${index}`} />;
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-[#CBD5E1]">
        <CalendarLegendDot className="bg-[#22C55E]" label="Done" />
        <CalendarLegendDot className="bg-[#F97316]" label="Partial" />
        <CalendarLegendDot className="bg-[#334155]" label="Rest" />
        <CalendarLegendDot className="border border-[#334155] bg-[#273449]" label="Upcoming" />
      </div>
    </section>
  );
}

function CalendarDayCell({ day }: { day?: CalendarDayProgress }) {
  const baseClass = "flex min-h-11 items-center justify-center rounded-2xl border text-xs font-black transition";

  if (!day) {
    return <div className={`${baseClass} border-[#334155] bg-[#273449]/60 text-[#64748B]`}>-</div>;
  }

  const statusClass: Record<CalendarDayStatus, string> = {
    done: "border-[#22C55E] bg-[#22C55E] text-[#052E16]",
    partial: "border-[#F97316] bg-[#F97316] text-white",
    missed: "border-[#EF4444] bg-[#EF4444] text-white",
    rest: "border-[#334155] bg-[#334155] text-[#CBD5E1]",
    pending: "border-[#334155] bg-[#273449] text-[#CBD5E1]",
  };

  const label: Record<CalendarDayStatus, string> = {
    done: "✓",
    partial: `${day.percent}%`,
    missed: "!",
    rest: "R",
    pending: "•",
  };

  return (
    <div aria-label={`Day ${day.dayNumber}: ${day.title}, ${day.status}`} className={`${baseClass} ${statusClass[day.status]}`} title={`${day.title} - ${day.percent}%`}>
      {label[day.status]}
    </div>
  );
}

function CalendarLegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function NutritionScreen({
  profile,
  nutritionPlan,
  isLoading,
  weightLog,
  onBodyGoalChange,
  onDietPreferenceChange,
  onLogWeight,
  onRefresh,
}: {
  profile: UserProfile;
  nutritionPlan: NutritionPlan | null;
  isLoading: boolean;
  weightLog: WeightLogEntry[];
  onBodyGoalChange: (bodyGoal: BodyGoal) => void;
  onDietPreferenceChange: (dietPreference: UserProfile["dietPreference"]) => void;
  onLogWeight: (weightKg: string) => boolean;
  onRefresh: () => void;
}) {
  const [weightInput, setWeightInput] = useState(profile.weight);
  const [weightMessage, setWeightMessage] = useState("");
  const plan = nutritionPlan ?? createFallbackNutritionPlan(profile);
  const calorieDelta = plan.maintenanceCalories && plan.targetCalories ? plan.targetCalories - plan.maintenanceCalories : 0;
  const deltaLabel = calorieDelta === 0 ? "Maintain" : calorieDelta > 0 ? `+${calorieDelta} kcal` : `${calorieDelta} kcal`;
  const bodyGoalOptions: BodyGoal[] = ["Lose weight slowly", "Maintain weight", "Gain muscle slowly"];
  const dietOptions: UserProfile["dietPreference"][] = ["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"];
  const latestLog = weightLog[0];
  const recommendedBodyGoal = getRecommendedBodyGoal(profile);

  useEffect(() => {
    setWeightInput(profile.weight);
  }, [profile.weight]);

  function submitWeightLog(event: FormEvent) {
    event.preventDefault();
    const saved = onLogWeight(weightInput);
    setWeightMessage(saved ? "Weight saved. Calories updated from your latest check-in." : "Enter a realistic weight in kg.");
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-20 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-24">
      <ScreenTitle icon={<Apple size={22} />} title="Nutrition" subtitle="Simple food guidance to support your workouts." />

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">This week&apos;s body goal</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#CBD5E1]">We&apos;ll adjust your calorie target gently.</p>
          </div>
          <button
            className="rounded-2xl border border-[#334155] bg-[#0F172A] px-3 py-2 text-xs font-black text-white disabled:opacity-60"
            disabled={isLoading}
            onClick={onRefresh}
            type="button"
          >
            Refresh
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {bodyGoalOptions.map((option) => {
            const isSelected = profile.bodyGoal === option;
            const isRecommended = recommendedBodyGoal === option;
            return (
              <button
                className={`flex min-h-12 items-center justify-between gap-2 rounded-2xl border px-3 text-left text-sm font-black transition ${
                  isSelected
                    ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-lg shadow-blue-950/30"
                    : "border-[#334155] bg-[#273449] text-[#CBD5E1]"
                }`}
                key={option}
                onClick={() => onBodyGoalChange(option)}
                type="button"
              >
                <span>{option}</span>
                {isRecommended && (
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${isSelected ? "bg-white/20 text-white" : "bg-[#0F172A] text-[#F97316]"}`}>
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {isLoading && <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-sm font-bold text-[#CBD5E1]">Updating food choices for this week...</p>}
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Weekly weight check-in</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#CBD5E1]">Log once a week. Your calories adjust from the latest weight.</p>
        <form className="mt-4 grid grid-cols-[1fr_auto] gap-2" onSubmit={submitWeightLog}>
          <label className="relative">
            <span className="sr-only">Current weight in kg</span>
            <input
              className="min-h-12 w-full rounded-2xl border border-[#334155] bg-[#0F172A] px-4 pr-10 text-base font-black text-white outline-none focus:border-[#3B82F6] focus:ring-4 focus:ring-blue-500/15"
              inputMode="decimal"
              min="20"
              max="250"
              placeholder="Weight"
              step="0.1"
              type="number"
              value={weightInput}
              onChange={(event) => {
                setWeightInput(event.target.value);
                setWeightMessage("");
              }}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black text-[#CBD5E1]">kg</span>
          </label>
          <button className="min-h-12 rounded-2xl bg-[#3B82F6] px-5 text-sm font-black text-white disabled:opacity-60" disabled={isLoading} type="submit">
            Save
          </button>
        </form>
        {weightMessage && <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-sm font-bold text-[#CBD5E1]">{weightMessage}</p>}
        {latestLog && (
          <div className="mt-4 rounded-2xl bg-[#273449] p-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#CBD5E1]">Latest check-in</p>
            <p className="mt-1 text-sm font-black text-white">
              {latestLog.weight} kg on {latestLog.date}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-[#CBD5E1]">
              BMI {latestLog.bmi ?? "-"} | Target {latestLog.targetCalories ? `${latestLog.targetCalories} kcal` : "-"}
            </p>
          </div>
        )}
        {weightLog.length > 1 && (
          <div className="mt-3 rounded-2xl border border-[#334155] bg-[#0F172A] p-3">
            <p className="text-[11px] font-black uppercase tracking-wide text-[#64748B]">Recent records</p>
            {weightLog.slice(1, 4).map((entry) => (
              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[#94A3B8]" key={entry.id}>
                <span>{entry.date}</span>
                <span>{entry.weight} kg</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="rounded-3xl border border-[#334155] bg-[#273449] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Daily calorie estimate</p>
        {plan.maintenanceCalories && plan.targetCalories ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricTile label="Maintenance" value={`${plan.maintenanceCalories} kcal`} />
              <MetricTile label="Target" value={`${plan.targetCalories} kcal`} />
            </div>
            <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-sm font-bold leading-6 text-[#CBD5E1]">
              Goal adjustment: {deltaLabel}. This is an estimate, not a medical diet plan.
            </p>
          </>
        ) : (
          <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-sm font-bold leading-6 text-[#CBD5E1]">
            Add age, height, and weight in Profile/Onboarding to estimate calories.
          </p>
        )}
      </div>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Diet preference</p>
        <p className="mt-1 text-sm font-semibold text-[#CBD5E1]">Meals change around this choice.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {dietOptions.map((option) => {
            const isSelected = profile.dietPreference === option;
            return (
              <button
                className={`min-h-12 rounded-2xl border px-3 text-sm font-black transition ${
                  isSelected
                    ? "border-[#3B82F6] bg-[#3B82F6] text-white shadow-lg shadow-blue-950/30"
                    : "border-[#334155] bg-[#273449] text-[#CBD5E1]"
                }`}
                key={option}
                onClick={() => onDietPreferenceChange(option)}
                type="button"
              >
                {option}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Daily targets</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricTile label="Protein" value={plan.macros ? `${plan.macros.protein} g` : "-"} />
          <MetricTile label="Carbs" value={plan.macros ? `${plan.macros.carbs} g` : "-"} />
          <MetricTile label="Fats" value={plan.macros ? `${plan.macros.fats} g` : "-"} />
          <MetricTile label="Fiber" value={plan.macros ? `${plan.macros.fiber} g` : "-"} />
          <MetricTile label="Water" value={plan.macros ? `${plan.macros.waterLiters} L` : "-"} />
          <MetricTile label="Diet" value={plan.dietPreference} />
        </div>
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Simple meals</p>
        <div className="mt-3 grid gap-3">
          {plan.meals.map((meal) => (
            <div className="rounded-2xl bg-[#273449] p-3" key={meal.label}>
              <p className="text-xs font-black text-[#CBD5E1]">{meal.label}</p>
              <p className="mt-1 text-sm font-bold leading-6 text-white">{meal.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Workout food</p>
        <div className="mt-3 grid gap-3">
          <div className="rounded-2xl bg-[#273449] p-3">
            <p className="text-xs font-black text-[#CBD5E1]">Before gym</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white">{plan.workoutFood.before}</p>
          </div>
          <div className="rounded-2xl bg-[#273449] p-3">
            <p className="text-xs font-black text-[#CBD5E1]">After gym</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white">{plan.workoutFood.after}</p>
          </div>
          <div className="rounded-2xl bg-[#0F172A] p-3">
            <p className="text-xs font-black text-[#CBD5E1]">Hydration</p>
            <p className="mt-1 text-sm font-bold leading-6 text-white">{plan.workoutFood.hydration}</p>
          </div>
        </div>
      </section>

      <p className="rounded-3xl border border-[#334155] bg-[#0F172A] p-4 text-sm font-bold leading-6 text-[#CBD5E1]">
        {plan.note}
      </p>
    </section>
  );
}

function ProfileScreen({
  profile,
  authStatus,
  syncStatus,
  syncMessage,
  lastSyncedAt,
  userEmail,
  onEmailSignIn,
  onManualSync,
  onSignOut,
}: {
  profile: UserProfile;
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  syncMessage: string;
  lastSyncedAt: string;
  userEmail: string;
  onEmailSignIn: (email: string) => Promise<boolean>;
  onManualSync: () => void;
  onSignOut: () => void;
}) {
  const isSignedIn = authStatus === "signed-in";
  const isBusy = authStatus === "checking" || syncStatus === "loading" || syncStatus === "saving";

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-20 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-24">
      <ScreenTitle icon={<User size={22} />} title="Profile" subtitle="Your plan is personalized from these details." />

      <div className="rounded-3xl bg-[#EAF7F6] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-teal-800">GymBuddy profile</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{profile.name || "Beginner Athlete"}</h2>
        <p className="mt-2 font-bold text-slate-600">{profile.goal} | {profile.experienceLevel}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile label="Age" value={profile.age || "-"} />
        <MetricTile label="Gender" value={profile.gender} />
        <MetricTile label="Gym" value={profile.gymType.replace(" gym", "")} />
        <MetricTile label="Days" value={profile.daysPerWeek} />
        <MetricTile label="Time" value={profile.workoutDuration} />
        <MetricTile label="Confidence" value={profile.confidenceLevel} />
        <MetricTile label="Diet" value={profile.dietPreference} />
        <MetricTile label="Body goal" value={profile.bodyGoal.replace(" slowly", "")} />
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-500">Body info</p>
        <p className="mt-2 text-lg font-black text-slate-950">
          {profile.height || "-"} cm | {profile.weight || "-"} kg
        </p>
        <p className="mt-1 font-bold text-slate-600">BMI: {profile.bmi ?? "-"} {profile.bmiCategory ? `- ${profile.bmiCategory}` : ""}</p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-black text-slate-500">Injury or pain</p>
        <p className="mt-2 font-bold text-slate-800">{profile.injuryOrPain}{profile.injuryDetail ? ` - ${profile.injuryDetail}` : ""}</p>
      </div>

      <div className="rounded-3xl border border-[#334155] bg-[#273449] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#3B82F6] text-white">
            <Cloud size={22} />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Cloud save</p>
            <h2 className="mt-1 text-xl font-black text-white">
              {authStatus === "unconfigured" ? "Connect Supabase" : isSignedIn ? "Plan saved online" : "Save your plan"}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-[#CBD5E1]">
              {authStatus === "unconfigured"
                ? "Add your Supabase URL and publishable key to enable login and cloud progress."
                : isSignedIn
                  ? `Signed in${userEmail ? ` as ${userEmail}` : ""}. ${lastSyncedAt ? `Last sync ${lastSyncedAt}.` : "Sync is active."}`
                  : "Progress is saved on this device. Add email backup only if you want cloud recovery."}
            </p>
          </div>
        </div>

        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${syncStatus === "error" ? "bg-red-500/15 text-red-200" : "bg-[#0F172A] text-[#CBD5E1]"}`}>
          {syncMessage}
        </p>

        {authStatus === "unconfigured" ? (
          <div className="mt-4 rounded-2xl border border-[#334155] bg-[#0F172A] p-4">
            <p className="text-sm font-black text-white">Required env vars</p>
            <p className="mt-2 font-mono text-xs leading-6 text-[#CBD5E1]">
              VITE_SUPABASE_URL
              <br />
              VITE_SUPABASE_PUBLISHABLE_KEY
            </p>
          </div>
        ) : isSignedIn ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-4 text-sm font-black text-white disabled:opacity-60"
              disabled={isBusy}
              onClick={onManualSync}
              type="button"
            >
              <Cloud size={18} />
              Sync now
            </button>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#334155] bg-[#1E293B] px-4 text-sm font-black text-white"
              onClick={onSignOut}
              type="button"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3">
            <EmailLinkBackupForm
              disabled={isBusy}
              onSendLink={onEmailSignIn}
            />
          </div>
        )}
      </div>

    </section>
  );
}

function BottomNav({
  activeTab,
  onNavigate,
}: {
  activeTab: "exercise" | "nutrition" | "progress" | "profile";
  onNavigate: (tab: "exercise" | "nutrition" | "progress" | "profile") => void;
}) {
  const items = [
    { id: "exercise" as const, label: "Exercise", icon: Dumbbell },
    { id: "nutrition" as const, label: "Nutrition", icon: Apple },
    { id: "progress" as const, label: "Progress", icon: BarChart3 },
    { id: "profile" as const, label: "Profile", icon: User },
  ];

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-black sm:min-h-16 sm:gap-1 sm:text-[11px] ${index > 0 ? "border-l border-slate-200" : ""} ${isActive ? "bg-[#EAF7F6] text-teal-900" : "text-slate-500"}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            <Icon size={20} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function VideoModal({ video, onClose }: { video: VideoTarget; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-4 py-5 backdrop-blur-sm">
      <section className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-slate-950/30">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-teal-800">Form demo</p>
            <h2 className="text-lg font-black leading-tight text-slate-950">{video.title}</h2>
          </div>
          <button className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="mx-auto max-h-[72vh] w-full max-w-[19rem] bg-slate-950">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-[9/16] h-full max-h-[72vh] w-full"
            src={getYouTubeEmbedUrl(video.url)}
            title={`${video.title} demo`}
          />
        </div>
      </section>
    </div>
  );
}

function CheckInScreen({
  checkIn,
  setCheckIn,
  onSave,
}: {
  checkIn: WorkoutCheckIn;
  setCheckIn: (checkIn: WorkoutCheckIn) => void;
  onSave: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:gap-5 sm:p-5 sm:pt-4">
      <ScreenTitle icon={<HeartPulse size={22} />} title="Workout Check-In" subtitle="Quick answers so next week can adjust." />
      <SelectField label="Did you complete today&apos;s workout?" value={checkIn.completionStatus} onChange={(value) => setCheckIn({ ...checkIn, completionStatus: value as WorkoutCheckIn["completionStatus"] })} options={["Completed", "Partly completed", "Skipped"]} />
      <SelectField label="How difficult was it?" value={checkIn.difficulty} onChange={(value) => setCheckIn({ ...checkIn, difficulty: value as WorkoutCheckIn["difficulty"] })} options={["Easy", "Manageable", "Hard"]} />
      <SelectField
        label="Any pain?"
        value={checkIn.painStatus}
        onChange={(value) => setCheckIn({ ...checkIn, painStatus: value as WorkoutCheckIn["painStatus"], painArea: value === "No pain" ? "Not sure" : checkIn.painArea })}
        options={["No pain", "Mild discomfort", "Pain"]}
      />
      {checkIn.painStatus !== "No pain" && (
        <SelectField
          label="Where did you feel it?"
          value={checkIn.painArea}
          onChange={(value) => setCheckIn({ ...checkIn, painArea: value as WorkoutCheckIn["painArea"] })}
          options={["Not sure", "Knee", "Shoulder", "Back pain", "Wrist", "Other"]}
        />
      )}
      <SelectField label="Confidence for next workout" value={checkIn.confidence} onChange={(value) => setCheckIn({ ...checkIn, confidence: value as WorkoutCheckIn["confidence"] })} options={["Low", "Medium", "High"]} />
      <button className="mt-auto flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 font-black text-slate-950 shadow-xl shadow-teal-200 sm:min-h-14" onClick={onSave} type="button">
        Save Check-In
        <CheckCircle2 size={20} />
      </button>
    </section>
  );
}

function AdaptationScreen({
  adaptedPlan,
  checkIn,
  completedCount,
  currentWeek,
  weeklyPercent,
  onGenerateNextWeek,
  onRestart,
}: {
  adaptedPlan: string;
  checkIn: WorkoutCheckIn;
  completedCount: number;
  currentWeek: number;
  weeklyPercent: number;
  onGenerateNextWeek: () => void;
  onRestart: () => void;
}) {
  const nextWeek = currentWeek + 1;

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pt-3 sm:gap-5 sm:p-5 sm:pt-4">
      <ScreenTitle icon={<Sparkles size={22} />} title="Next Week Adaptation" subtitle="Based on your completion rate and check-in." />
      <div className="rounded-3xl bg-[#F97316] p-4 text-[#FFFFFF] sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-cyan-100">Week {currentWeek} summary</p>
        <h2 className="mt-2 text-4xl font-black sm:text-5xl">{weeklyPercent}%</h2>
        <p className="mt-1 font-semibold text-blue-100">{completedCount} exercises marked done</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricTile label="Difficulty" value={checkIn.difficulty} />
        <MetricTile label="Pain" value={checkIn.painStatus === "No pain" ? "No pain" : `${checkIn.painStatus}: ${checkIn.painArea}`} />
        <MetricTile label="Confidence" value={checkIn.confidence} />
      </div>

      <div className="rounded-3xl border border-slate-700 bg-[#1E293B] p-4 sm:p-5">
        <p className="text-sm font-black text-[#FB923C]">What changes in Week {nextWeek}</p>
        <p className="mt-2 text-lg font-bold leading-8 text-[#FFFFFF]">{adaptedPlan}</p>
      </div>

      <button className="flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#22C55E] px-5 font-black text-[#FFFFFF] shadow-xl shadow-emerald-950/30 sm:min-h-14" onClick={onGenerateNextWeek} type="button">
        Generate Week {nextWeek}
        <ChevronRight size={20} />
      </button>

      <button className="mt-auto flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-[#1E293B] px-5 font-black text-[#FFFFFF] sm:min-h-14" onClick={onRestart} type="button">
        Back To Weekly Plan
      </button>
    </section>
  );
}

function ScreenTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <header className="flex items-start gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#40B5AD] text-slate-950 sm:h-11 sm:w-11">{icon}</div>
      <div>
        <h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm leading-5 text-slate-600 sm:text-base sm:leading-6">{subtitle}</p>
      </div>
    </header>
  );
}

function ChipGroup({
  label,
  options,
  value,
  onChange,
  helper,
  recommendedOption,
  columns = "grid-cols-2",
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  recommendedOption?: string;
  columns?: string;
}) {
  return (
    <div className="grid gap-2.5 sm:gap-3">
      <p className="text-sm font-black leading-tight text-slate-900 sm:text-[15px]">{label}</p>
      <div className={`grid ${columns} gap-2`}>
        {options.map((option) => {
          const isSelected = value === option;
          const isRecommended = recommendedOption === option;
          return (
            <button
              className={`min-h-11 rounded-2xl border px-2.5 py-2 text-[12px] font-black leading-tight transition sm:min-h-12 sm:text-[12.5px] ${
                isSelected
                  ? "border-[#2F9F98] bg-[#40B5AD] text-slate-950 shadow-lg shadow-teal-200"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              key={option}
              onClick={() => onChange(option)}
              type="button"
            >
              <span>{option}</span>
              {isRecommended && <span className="ml-1">*</span>}
            </button>
          );
        })}
      </div>
      {helper && <p className="text-xs font-bold text-teal-800">{helper}</p>}
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <select
        className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-900 outline-none focus:border-[#2F9F98] focus:ring-4 focus:ring-teal-100"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        aria-label={label}
        className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 font-semibold text-slate-900 outline-none focus:border-[#2F9F98] focus:ring-4 focus:ring-teal-100"
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  placeholder,
  required = true,
  suffix,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <div className="flex min-h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 focus-within:border-[#2F9F98] focus-within:ring-4 focus-within:ring-teal-100">
        <input
          aria-label={label}
          className="w-full bg-transparent font-semibold text-slate-900 outline-none"
          inputMode="decimal"
          min="1"
          placeholder={placeholder}
          required={required}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-sm font-black text-slate-400">{suffix}</span>
      </div>
    </label>
  );
}

export default App;
