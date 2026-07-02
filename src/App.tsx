import {
  Apple,
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Droplet,
  Dumbbell,
  Flame,
  HeartPulse,
  House,
  LogOut,
  Mail,
  Pause,
  Play,
  Plus,
  Sparkles,
  Timer,
  User,
  Utensils,
  Wand2,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase, type Session } from "./lib/supabase";

type Screen = "welcome" | "onboarding" | "loading" | "save-plan" | "home" | "weekly-plan" | "today-workout" | "check-in" | "adaptation" | "nutrition" | "progress" | "profile";
type MainTab = "home" | "exercise" | "nutrition" | "progress";

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

type MealStyle = "North Indian" | "South Indian" | "Quick Budget";

type MealSpotlight = {
  title: string;
  style: MealStyle;
  image: string;
  tag: string;
  subtitle: string;
  prepTime: string;
  videoId: string;
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

type WorkoutSectionKey = "warmUp" | "workout" | "coolDown";

type WorkoutSectionLog = {
  startedAt: string;
  stoppedAt: string;
  elapsedSeconds: number;
  runningSince: string;
};

type DailyWorkoutLog = {
  day: string;
  beforeWeight: string;
  afterWeight: string;
  sections: Record<WorkoutSectionKey, WorkoutSectionLog>;
  itemTimers: Record<string, WorkoutSectionLog>;
  setLogs: Record<string, SetPerformanceLog[]>;
};

type WorkoutLogs = Record<string, DailyWorkoutLog>;

type AuthMode = "sign-up" | "sign-in";

type SetPerformanceLog = {
  weight: string;
  reps: string;
  duration: string;
};

type ExercisePerformanceRow = {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string;
  day: string;
  sets: SetPerformanceLog[];
  totalReps: number;
  bestWeight: number;
  volume: number;
};

type WorkoutQueueItem =
  | { id: string; section: "Warm-up" | "Cooldown"; kind: "activity"; activity: PlanActivity }
  | { id: string; section: "Exercise"; kind: "exercise"; exercise: Exercise };

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
  nutrition_plan: NutritionPlan | null;
  water_intake: Record<string, number> | null;
  protein_intake: Record<string, number> | null;
  weight_log: WeightLogEntry[] | null;
  workout_logs: WorkoutLogs | null;
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
  smartNotifications: "gymbuddy:smart-notifications",
  nutritionPlan: "gymbuddy:nutrition-plan",
  nutritionSignature: "gymbuddy:nutrition-signature",
  nutritionSource: "gymbuddy:nutrition-source",
  nutritionError: "gymbuddy:nutrition-error",
  waterIntake: "gymbuddy:water-intake",
  proteinIntake: "gymbuddy:protein-intake",
  weightLog: "gymbuddy:weekly-weight-log",
  workoutLogs: "gymbuddy:workout-logs",
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
  const trackableItems = [...day.warmUp, ...day.exercises, ...day.coolDown];
  return !day.isRestDay && trackableItems.length > 0 && trackableItems.every((item) => getCompletionStatus(completion, day, item.id) === "Done");
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
  const lastScreen = readStorage<Screen>(STORAGE_KEYS.lastActiveScreen, "home");
  const sameDayResumeScreens: Screen[] = ["home", "weekly-plan", "today-workout", "check-in", "adaptation", "nutrition", "progress", "profile", "save-plan"];

  if (lastActiveDate === getTodayKey() && sameDayResumeScreens.includes(lastScreen)) {
    return lastScreen;
  }

  return "home";
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

const VALUE_RULES = {
  age: { min: 16, max: 60 },
  height: { min: 135, max: 215 },
  weight: { min: 30, max: 150 },
};

function cleanAlphabetName(value: string) {
  return value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ");
}

function isAlphabetName(value: string) {
  return /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(value.trim());
}

function hasAllowedDecimalPlaces(value: string, maxDecimalPlaces: number) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return false;
  const decimalPart = trimmedValue.split(".")[1];
  return !decimalPart || decimalPart.length <= maxDecimalPlaces;
}

function isNumberInRange(value: string, min: number, max: number, maxDecimalPlaces?: number) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return false;
  return maxDecimalPlaces === undefined || hasAllowedDecimalPlaces(value, maxDecimalPlaces);
}

function isWholeNumberInRange(value: string, min: number, max: number) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function getOnboardingFieldErrors(profile: UserProfile) {
  return {
    name: isAlphabetName(profile.name) ? "" : "Enter your name using alphabet letters only.",
    age: isWholeNumberInRange(profile.age, VALUE_RULES.age.min, VALUE_RULES.age.max) ? "" : "Enter age from 16 to 60.",
    height: isNumberInRange(profile.height, VALUE_RULES.height.min, VALUE_RULES.height.max, 2) ? "" : "Enter height from 135 to 215 cm, up to 2 decimals.",
    weight: isNumberInRange(profile.weight, VALUE_RULES.weight.min, VALUE_RULES.weight.max, 2) ? "" : "Enter weight from 30 to 150 kg, up to 2 decimals.",
  };
}

function isValidOnboardingProfile(profile: UserProfile) {
  return Object.values(getOnboardingFieldErrors(profile)).every((error) => !error);
}

function calculateBmi(heightCm: string, weightKg: string) {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (
    !isNumberInRange(heightCm, VALUE_RULES.height.min, VALUE_RULES.height.max, 2) ||
    !isNumberInRange(weightKg, VALUE_RULES.weight.min, VALUE_RULES.weight.max, 2)
  ) {
    return null;
  }
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

function getLatestLoggedWeight(weightLog: WeightLogEntry[]) {
  const latestEntry = [...weightLog]
    .filter((entry) => Number.isFinite(entry.weight))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  return latestEntry?.weight ?? null;
}

function getProfileWithLoggedWeight(profile: UserProfile, weightLog: WeightLogEntry[]) {
  const latestWeight = getLatestLoggedWeight(weightLog);
  if (!latestWeight) return profile;

  const weight = String(latestWeight);
  const bmi = calculateBmi(profile.height, weight);
  return {
    ...profile,
    weight,
    bmi,
    bmiCategory: getBmiCategory(bmi),
  };
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

function getPostWorkoutFood(profile: UserProfile) {
  if (profile.dietPreference === "Vegan") {
    return "Soy chunks, tofu, dal, chana, or plant protein with rice/roti after training.";
  }
  if (profile.dietPreference === "Non-vegetarian") {
    return "Eggs, whey, chicken, fish, paneer, curd, or dal with rice/roti after training.";
  }
  if (profile.dietPreference === "Eggetarian") {
    return "Eggs, whey, paneer, curd, dal, or tofu with rice/roti after training.";
  }
  return "Paneer, whey, curd, dal, tofu, or soy chunks with rice/roti after training.";
}

function applyProteinWorkoutFood(plan: NutritionPlan, profile: UserProfile): NutritionPlan {
  return {
    ...plan,
    workoutFood: {
      ...plan.workoutFood,
      after: getPostWorkoutFood(profile),
    },
  };
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
      after: getPostWorkoutFood(profile),
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

function getCompletionKey(day: DayPlan, itemId: string) {
  return `${day.day}:${itemId}`;
}

function getCompletionStatus(completion: ExerciseCompletion, day: DayPlan, itemId: string): ExerciseStatus | undefined {
  return completion[getCompletionKey(day, itemId)];
}

function normalizeCompletionForPlan(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return completion;

  const legacyKeys = new Set(Object.keys(completion).filter((key) => !key.includes(":")));
  if (!legacyKeys.size) return completion;

  let changed = false;
  const next = Object.fromEntries(
    Object.entries(completion).filter(([key]) => {
      if (!key.includes(":")) {
        changed = true;
        return false;
      }

      const baseKey = key.slice(key.indexOf(":") + 1);
      if (legacyKeys.has(baseKey)) {
        changed = true;
        return false;
      }

      return true;
    }),
  ) as ExerciseCompletion;

  return changed ? next : completion;
}

function createEmptySectionLog(): WorkoutSectionLog {
  return { startedAt: "", stoppedAt: "", elapsedSeconds: 0, runningSince: "" };
}

function normalizeSectionLog(section?: Partial<WorkoutSectionLog>): WorkoutSectionLog {
  return {
    startedAt: section?.startedAt ?? "",
    stoppedAt: section?.stoppedAt ?? "",
    elapsedSeconds: Number(section?.elapsedSeconds ?? 0),
    runningSince: section?.runningSince ?? "",
  };
}

function createDefaultWorkoutLog(day: DayPlan | null, fallbackWeight = ""): DailyWorkoutLog {
  return {
    day: day?.day ?? "",
    beforeWeight: fallbackWeight,
    afterWeight: "",
    sections: {
      warmUp: createEmptySectionLog(),
      workout: createEmptySectionLog(),
      coolDown: createEmptySectionLog(),
    },
    itemTimers: {},
    setLogs: {},
  };
}

function getWorkoutLog(logs: WorkoutLogs, day: DayPlan | null, fallbackWeight = "") {
  const fallbackLog = createDefaultWorkoutLog(day, fallbackWeight);
  if (!day) return fallbackLog;
  const savedLog = logs[day.day];
  if (!savedLog) return fallbackLog;

  const savedSections = savedLog.sections ?? fallbackLog.sections;
  const savedTimers = savedLog.itemTimers ?? {};

  return {
    ...fallbackLog,
    ...savedLog,
    sections: {
      warmUp: normalizeSectionLog(savedSections.warmUp),
      workout: normalizeSectionLog(savedSections.workout),
      coolDown: normalizeSectionLog(savedSections.coolDown),
    },
    itemTimers: Object.fromEntries(Object.entries(savedTimers).map(([id, timer]) => [id, normalizeSectionLog(timer)])),
    setLogs: savedLog.setLogs ?? {},
  };
}

function formatClockTime(value: string) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

function getSectionElapsedSeconds(section: WorkoutSectionLog, now = Date.now()) {
  const runningSeconds = section.runningSince ? Math.max(0, Math.round((now - new Date(section.runningSince).getTime()) / 1000)) : 0;
  return section.elapsedSeconds + runningSeconds;
}

function getLoggedSecondsForItems(log: DailyWorkoutLog, itemIds: string[], now = Date.now()) {
  return itemIds.reduce((sum, itemId) => sum + getSectionElapsedSeconds(getItemTimer(log, itemId), now), 0);
}

function getWorkoutActivitySummary(day: DayPlan | null, log: DailyWorkoutLog, completion: ExerciseCompletion) {
  const warmUpSeconds = day ? getLoggedSecondsForItems(log, day.warmUp.map((activity) => activity.id)) : 0;
  const workoutSeconds = day ? getLoggedSecondsForItems(log, day.exercises.map((exercise) => exercise.id)) : 0;
  const coolDownSeconds = day ? getLoggedSecondsForItems(log, day.coolDown.map((activity) => activity.id)) : 0;
  const activeSeconds = warmUpSeconds + workoutSeconds + coolDownSeconds;
  const completedRestSeconds =
    day?.exercises.reduce((sum, exercise) => {
      const status = getCompletionStatus(completion, day, exercise.id);
      if (status !== "Done" && status !== "Partially done") return sum;
      return sum + exercise.main.restSeconds;
    }, 0) ?? 0;

  return {
    activeSeconds,
    coolDownSeconds,
    restSeconds: completedRestSeconds,
    warmUpSeconds,
    workoutSeconds,
  };
}

function getWorkoutQueue(day: DayPlan): WorkoutQueueItem[] {
  return [
    ...day.warmUp.map((activity) => ({ id: activity.id, section: "Warm-up" as const, kind: "activity" as const, activity })),
    ...day.exercises.map((exercise) => ({ id: exercise.id, section: "Exercise" as const, kind: "exercise" as const, exercise })),
    ...day.coolDown.map((activity) => ({ id: activity.id, section: "Cooldown" as const, kind: "activity" as const, activity })),
  ];
}

function getItemTimer(log: DailyWorkoutLog, itemId: string) {
  return log.itemTimers[itemId] ?? createEmptySectionLog();
}

function parseSetCount(sets: string) {
  const match = sets.match(/\d+/);
  return match ? Math.min(6, Math.max(1, Number(match[0]))) : 3;
}

function parseSuggestedReps(reps: string) {
  const match = reps.match(/\d+/);
  return match ? String(match[0]) : "";
}

function normalizeSetLogs(logs: SetPerformanceLog[] | undefined, option: ExerciseOption, includeWeight: boolean) {
  const targetCount = parseSetCount(option.sets);
  const baseReps = parseSuggestedReps(option.repsPerSet);
  const rows = [...(logs ?? [])];
  while (rows.length < targetCount) rows.push({ weight: includeWeight ? "" : "Bodyweight", reps: baseReps, duration: "" });
  return rows.slice(0, Math.max(targetCount, rows.length));
}

function getLoggedSetSummary(logs: SetPerformanceLog[] | undefined, isTimeBased: boolean, includeWeight: boolean) {
  const validRows = (logs ?? []).filter((set) => set.reps || set.weight || set.duration);
  if (!validRows.length) return "No sets logged yet";
  const totalReps = validRows.reduce((sum, set) => sum + (Number(set.reps) || 0), 0);
  const bestWeight = includeWeight ? Math.max(...validRows.map((set) => Number(set.weight) || 0)) : 0;
  if (isTimeBased) return `${validRows.length} sets logged`;
  if (includeWeight && bestWeight > 0) return `${validRows.length} sets | best ${bestWeight} kg | ${totalReps} reps`;
  return `${validRows.length} sets | ${totalReps} reps`;
}

function getExercisePerformanceRows(plan: WeeklyPlan | null, workoutLogs: WorkoutLogs, exerciseSelection: ExerciseSelection = {}, completion: ExerciseCompletion = {}): ExercisePerformanceRow[] {
  if (!plan) return [];

  return plan.days.flatMap((day) => getDayExercisePerformanceRows(day, workoutLogs[day.day], exerciseSelection, completion));
}

function getDayExercisePerformanceRows(day: DayPlan, log: DailyWorkoutLog | undefined, exerciseSelection: ExerciseSelection = {}, completion: ExerciseCompletion = {}): ExercisePerformanceRow[] {
  if (!log?.setLogs) return [];

  return day.exercises.flatMap((exercise) => {
    const status = getCompletionStatus(completion, day, exercise.id);
    if (status !== "Done" && status !== "Partially done") return [];

    const setLogs = (log.setLogs[exercise.id] ?? []).filter((set) => set.weight || set.reps || set.duration);
    if (!setLogs.length) return [];

    const selectedOption = exercise[exerciseSelection[exercise.id] ?? "main"];
    const totalReps = setLogs.reduce((sum, set) => sum + (Number(set.reps) || 0), 0);
    const bestWeight = Math.max(0, ...setLogs.map((set) => Number(set.weight) || 0));
    const volume = setLogs.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);

    return [
      {
        exerciseId: exercise.id,
        exerciseName: selectedOption.name,
        muscleGroup: exercise.muscleGroup,
        day: day.day,
        sets: setLogs,
        totalReps,
        bestWeight,
        volume,
      },
    ];
  });
}

function getDayProgress(day: DayPlan, completion: ExerciseCompletion) {
  const trackableItems = [...day.warmUp, ...day.exercises, ...day.coolDown];

  if (day.isRestDay || trackableItems.length === 0) {
    return { total: 0, done: 0, partial: 0, skipped: 0, percent: 0, isComplete: false };
  }

  const done = trackableItems.filter((item) => getCompletionStatus(completion, day, item.id) === "Done").length;
  const partial = trackableItems.filter((item) => getCompletionStatus(completion, day, item.id) === "Partially done").length;
  const skipped = trackableItems.filter((item) => getCompletionStatus(completion, day, item.id) === "Not done").length;
  const progressUnits = done + partial * 0.5;
  const percent = Math.round((progressUnits / trackableItems.length) * 100);

  return {
    total: trackableItems.length,
    done,
    partial,
    skipped,
    percent,
    isComplete: done === trackableItems.length,
  };
}

function getWeeklyProgress(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  const workoutDays = plan?.days.filter((day) => !day.isRestDay) ?? [];
  const dayProgress = workoutDays.map((day) => getDayProgress(day, completion));
  const totalItems = dayProgress.reduce((sum, progress) => sum + progress.total, 0);
  const doneItems = dayProgress.reduce((sum, progress) => sum + progress.done, 0);
  const partialItems = dayProgress.reduce((sum, progress) => sum + progress.partial, 0);
  const progressUnits = doneItems + partialItems * 0.5;
  const percent = totalItems ? Math.round((progressUnits / totalItems) * 100) : 0;

  return {
    workoutDays: workoutDays.length,
    totalExercises: totalItems,
    doneExercises: doneItems,
    partialExercises: partialItems,
    totalItems,
    doneItems,
    partialItems,
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
  if (!plan) return "Create your plan";

  const weekly = getWeeklyProgress(plan, completion);
  const remainingDays = getRemainingWorkoutDays(plan, completion);
  const nextDay = getReminderTargetDay(plan, completion);
  const partialDay = getPartiallyStartedDay(plan, completion);

  if (remainingDays === 0) return "Week complete";
  if (weekly.percent === 0 && nextDay) return `Start ${nextDay.day}`;
  if (partialDay) return `Finish ${partialDay.day}.`;
  if (weekly.percent < 50 && nextDay) return `${remainingDays} workouts left. Next: ${nextDay.day}.`;
  if (weekly.percent < 80) return `${weekly.percent}% done`;
  return `${weekly.percent}% done`;
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
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLogs>(() => readStorage<WorkoutLogs>(STORAGE_KEYS.workoutLogs, {}));
  const [waterLog, setWaterLog] = useState<Record<string, number>>(() => readStorage<Record<string, number>>(STORAGE_KEYS.waterIntake, {}));
  const [proteinLog, setProteinLog] = useState<Record<string, number>>(() => readStorage<Record<string, number>>(STORAGE_KEYS.proteinIntake, {}));
  const [notificationPermission, setNotificationPermission] = useState<ReminderPermission>(() => getNotificationPermission());
  const [smartNotificationsEnabled, setSmartNotificationsEnabled] = useState(() => readStorage(STORAGE_KEYS.smartNotifications, false));
  const [headerToast, setHeaderToast] = useState("");
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
  const todaysWorkoutLog = getWorkoutLog(workoutLogs, todaysPlan, profile.weight);
  const todaysActivitySummary = getWorkoutActivitySummary(todaysPlan, todaysWorkoutLog, completion);
  const resumeDayIndex = useMemo(() => getResumeDayIndex(weeklyPlan, completion, selectedDayIndex), [completion, selectedDayIndex, weeklyPlan]);
  const resumeDay = weeklyPlan?.days[resumeDayIndex] ?? weeklyPlan?.days[0] ?? null;
  const completedCount = Object.values(completion).filter((status) => status === "Done").length;
  const showBottomNav = Boolean(weeklyPlan) && !["welcome", "onboarding", "loading", "save-plan"].includes(screen);
  const showAppHeader = Boolean(weeklyPlan) && !["welcome", "onboarding", "loading", "save-plan"].includes(screen);
  const activeMainTab: MainTab = screen === "nutrition" ? "nutrition" : screen === "progress" ? "progress" : screen === "weekly-plan" || screen === "today-workout" || screen === "check-in" || screen === "adaptation" ? "exercise" : "home";
  const headerSubtitle = getHeaderSubtitle(screen);

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

  useEffect(() => {
    const normalizedCompletion = normalizeCompletionForPlan(weeklyPlan, completion);
    if (normalizedCompletion === completion) return;

    setCompletion(normalizedCompletion);
    writeStorage(STORAGE_KEYS.completion, normalizedCompletion);
    const nextMonthlyProgress = upsertMonthlyProgress(monthlyProgress, weeklyPlan, normalizedCompletion);
    setMonthlyProgress(nextMonthlyProgress);
    writeStorage(STORAGE_KEYS.monthlyProgress, nextMonthlyProgress);
  }, [completion, monthlyProgress, weeklyPlan]);

  useEffect(() => {
    if (!headerToast) return;
    const timer = window.setTimeout(() => setHeaderToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [headerToast]);

  const saveCloudState = useCallback(
    async (successMessage = "Saved online.") => {
      if (!supabase || !session?.user.id) {
        setSyncStatus(isSupabaseConfigured ? "idle" : "error");
        setSyncMessage(isSupabaseConfigured ? "Sign in to save this plan online." : "Online save is not available right now.");
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
          nutrition_plan: nutritionPlan,
          water_intake: waterLog,
          protein_intake: proteinLog,
          weight_log: weightLog,
          workout_logs: workoutLogs,
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
        setSyncMessage("Could not save online. Device save is still active.");
        return false;
      }
    },
    [adaptedPlan, checkIn, completion, exerciseSelection, nutritionPlan, profile, proteinLog, session?.user.id, waterLog, weeklyPlan, weightLog, workoutLogs],
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
          setScreen("home");
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

        if (remote?.nutrition_plan) {
          setNutritionPlan(remote.nutrition_plan);
          writeStorage(STORAGE_KEYS.nutritionPlan, remote.nutrition_plan);
        }

        if (remote?.water_intake) {
          setWaterLog(remote.water_intake);
          writeStorage(STORAGE_KEYS.waterIntake, remote.water_intake);
        }

        if (remote?.protein_intake) {
          setProteinLog(remote.protein_intake);
          writeStorage(STORAGE_KEYS.proteinIntake, remote.protein_intake);
        }

        if (remote?.weight_log) {
          setWeightLog(remote.weight_log);
          writeStorage(STORAGE_KEYS.weightLog, remote.weight_log);
        }

        if (remote?.workout_logs) {
          setWorkoutLogs(remote.workout_logs);
          writeStorage(STORAGE_KEYS.workoutLogs, remote.workout_logs);
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
        setSyncMessage(remote ? "Loaded your saved GymBuddy data." : "Signed in. Your device-saved plan is ready.");
        setLastSyncedAt(remote?.updated_at ? new Date(remote.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
      } catch {
        setCloudLoadedFor(userId);
        setSyncStatus("error");
        setSyncMessage("Could not load online data. Device save is still active.");
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
        setSyncMessage("");
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
      void saveCloudState("Saved online.");
    }, 1000);

    return () => window.clearTimeout(syncTimer);
  }, [cloudLoadedFor, saveCloudState, session?.user.id]);

  useEffect(() => {
    if (screen !== "nutrition") return;
    void refreshNutritionPlan(profile);
  }, [profile.age, profile.bmi, profile.bmiCategory, profile.bodyGoal, profile.daysPerWeek, profile.dietPreference, profile.gender, profile.goal, profile.height, profile.weight, screen, weightLog]);

  function updateProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function logWaterIntake(ml: number) {
    const todayKey = getLocalDateKey();
    const nutritionProfile = getProfileWithLoggedWeight(profile, weightLog);
    const waterGoal = nutritionPlan?.macros?.waterLiters ?? getDailyWaterToDrinkLiters(nutritionProfile);
    const currentAmount = Number(waterLog[todayKey] ?? 0);
    const nextAmount = Number(Math.min(waterGoal, currentAmount + ml / 1000).toFixed(2));
    const nextLog = { ...waterLog, [todayKey]: nextAmount };
    setWaterLog(nextLog);
    writeStorage(STORAGE_KEYS.waterIntake, nextLog);
  }

  function logProteinIntake(grams: number) {
    const todayKey = getLocalDateKey();
    const currentAmount = Number(proteinLog[todayKey] ?? 0);
    const nextAmount = Math.max(0, Math.round(currentAmount + grams));
    const nextLog = { ...proteinLog, [todayKey]: nextAmount };
    setProteinLog(nextLog);
    writeStorage(STORAGE_KEYS.proteinIntake, nextLog);
  }

  async function refreshNutritionPlan(nextProfile = profile, forceRefresh = false, nutritionWeightLog = weightLog) {
    const nutritionProfile = getProfileWithLoggedWeight(nextProfile, nutritionWeightLog);
    const finalProfile = {
      ...nutritionProfile,
      bmi: calculateBmi(nutritionProfile.height, nutritionProfile.weight),
      bmiCategory: getBmiCategory(calculateBmi(nutritionProfile.height, nutritionProfile.weight)),
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
      const proteinFocusedPlan = applyProteinWorkoutFood(aiNutritionPlan, finalProfile);
      setNutritionPlan(proteinFocusedPlan);
      setNutritionSource("ai");
      writeStorage(STORAGE_KEYS.nutritionPlan, proteinFocusedPlan);
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

  function handleProfileUpdate(nextProfile: UserProfile) {
    const cleanProfile = {
      ...nextProfile,
      name: cleanAlphabetName(nextProfile.name).trim(),
    };
    const nextBmi = calculateBmi(cleanProfile.height, cleanProfile.weight);
    const updatedProfile = {
      ...cleanProfile,
      bmi: nextBmi,
      bmiCategory: getBmiCategory(nextBmi),
    };

    setProfile(updatedProfile);
    writeStorage(STORAGE_KEYS.profile, updatedProfile);
    setSyncStatus("saved");
    setSyncMessage("Profile updated");
    void refreshNutritionPlan(updatedProfile, true);
  }

  function handleWeeklyWeightLog(weightKg: string) {
    const numericWeight = Number(weightKg);
    if (!isNumberInRange(weightKg, VALUE_RULES.weight.min, VALUE_RULES.weight.max, 2)) return false;

    const cleanWeight = Number(numericWeight.toFixed(2));
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
    void refreshNutritionPlan(nextProfile, true, nextWeightLog);
    return true;
  }

  function updateWorkoutLog(day: DayPlan, updater: (current: DailyWorkoutLog) => DailyWorkoutLog) {
    setWorkoutLogs((current) => {
      const nextLog = updater(getWorkoutLog(current, day, profile.weight));
      const next = { ...current, [day.day]: nextLog };
      writeStorage(STORAGE_KEYS.workoutLogs, next);
      return next;
    });
  }

  function applyLoggedBodyWeight(weightValue: string) {
    if (!isNumberInRange(weightValue, VALUE_RULES.weight.min, VALUE_RULES.weight.max, 2)) return;

    const cleanWeight = Number(Number(weightValue).toFixed(2));
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
    void refreshNutritionPlan(nextProfile, true, nextWeightLog);
  }

  function updateWorkoutWeight(day: DayPlan, key: "beforeWeight" | "afterWeight", value: string) {
    const currentLog = getWorkoutLog(workoutLogs, day, profile.weight);
    updateWorkoutLog(day, (current) => ({ ...current, [key]: value }));

    if (key === "afterWeight" || !currentLog.afterWeight) applyLoggedBodyWeight(value);
  }

  function toggleWorkoutItemTimer(day: DayPlan, itemId: string) {
    setWorkoutLogs((currentLogs) => {
      const now = new Date().toISOString();
      const nowTime = new Date(now).getTime();
      const dayLog = getWorkoutLog(currentLogs, day, profile.weight);
      const timer = getItemTimer(dayLog, itemId);
      const wasRunning = Boolean(timer.runningSince);

      const pausedLogs = Object.fromEntries(
        Object.entries({ ...currentLogs, [day.day]: dayLog }).map(([dayKey, savedLog]) => [
          dayKey,
          {
            ...savedLog,
            itemTimers: Object.fromEntries(
              Object.entries(savedLog.itemTimers ?? {}).map(([timerItemId, itemTimer]) => [
                timerItemId,
                itemTimer.runningSince
                  ? {
                      ...itemTimer,
                      stoppedAt: now,
                      elapsedSeconds: getSectionElapsedSeconds(itemTimer, nowTime),
                      runningSince: "",
                    }
                  : itemTimer,
              ]),
            ),
          },
        ]),
      );

      const nextDayLog = pausedLogs[day.day];
      const nextLogs = {
        ...pausedLogs,
        [day.day]: {
          ...nextDayLog,
          itemTimers: {
            ...nextDayLog.itemTimers,
            [itemId]: wasRunning
              ? getItemTimer(nextDayLog, itemId)
              : {
                  ...getItemTimer(nextDayLog, itemId),
                  startedAt: timer.startedAt || now,
                  stoppedAt: "",
                  runningSince: now,
                },
          },
        },
      };

      writeStorage(STORAGE_KEYS.workoutLogs, nextLogs);
      return nextLogs;
    });
  }

  function updateExerciseSetLog(day: DayPlan, exerciseId: string, setIndex: number, key: keyof SetPerformanceLog, value: string) {
    updateWorkoutLog(day, (current) => {
      const rows = [...(current.setLogs[exerciseId] ?? [])];
      while (rows.length <= setIndex) rows.push({ weight: "", reps: "", duration: "" });
      rows[setIndex] = { ...rows[setIndex], [key]: value };

      return {
        ...current,
        setLogs: {
          ...current.setLogs,
          [exerciseId]: rows,
        },
      };
    });
  }

  async function handleToggleSmartNotifications() {
    if (smartNotificationsEnabled) {
      setSmartNotificationsEnabled(false);
      writeStorage(STORAGE_KEYS.smartNotifications, false);
      setHeaderToast("Smart notification turned off");
      return;
    }

    const currentPermission = getNotificationPermission();
    setNotificationPermission(currentPermission);

    if (currentPermission === "unsupported") {
      setSyncStatus("error");
      setSyncMessage("Notifications are not available in this browser.");
      setHeaderToast("Notifications are not available");
      return;
    }

    const nextPermission = currentPermission === "default" ? await Notification.requestPermission() : currentPermission;
    setNotificationPermission(nextPermission);

    if (nextPermission === "granted") {
      setSmartNotificationsEnabled(true);
      writeStorage(STORAGE_KEYS.smartNotifications, true);
      setSyncStatus("saved");
      setSyncMessage("Notifications are on. GymBuddy can remind you from this browser.");
      setHeaderToast("Smart notification turned on");
    } else {
      setSmartNotificationsEnabled(false);
      writeStorage(STORAGE_KEYS.smartNotifications, false);
      setSyncStatus("idle");
      setSyncMessage("You can turn notifications on later from your browser settings.");
      setHeaderToast("Notifications blocked");
    }
  }

  async function handlePasswordAuth(email: string, password: string, mode: AuthMode) {
    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Online save is not available right now. Your plan is saved on this device.");
      return false;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 6) {
      setSyncStatus("error");
      setSyncMessage("Enter an email and a password with at least 6 characters.");
      return false;
    }

    setSyncStatus("loading");
    setSyncMessage(mode === "sign-up" ? "Creating your account..." : "Signing you in...");
    const { error } =
      mode === "sign-up"
        ? await supabase.auth.signUp({ email: cleanEmail, password })
        : await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return false;
    }

    setSyncStatus("saved");
    setSyncMessage(mode === "sign-up" ? "Signed up successfully" : "Signed in. Your plan can now sync online.");
    return true;
  }

  async function handlePasswordReset(email: string) {
    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Online save is not available right now.");
      return false;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setSyncStatus("error");
      setSyncMessage("Enter your email first.");
      return false;
    }

    setSyncStatus("loading");
    setSyncMessage("Sending reset link...");
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return false;
    }

    setSyncStatus("saved");
    setSyncMessage("Password reset link sent");
    return true;
  }

  async function handlePasswordUpdate(password: string) {
    if (!supabase) {
      setSyncStatus("error");
      setSyncMessage("Online save is not available right now.");
      return false;
    }

    if (password.length < 6) {
      setSyncStatus("error");
      setSyncMessage("Use at least 6 characters.");
      return false;
    }

    setSyncStatus("loading");
    setSyncMessage("Updating password...");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setSyncStatus("error");
      setSyncMessage(error.message);
      return false;
    }

    setSyncStatus("saved");
    setSyncMessage("Password updated");
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
    if (!isValidOnboardingProfile(profile)) return;

    const finalProfile = {
      ...profile,
      name: profile.name.trim(),
      age: profile.age.trim(),
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
      setScreen(session?.user.id ? "home" : "save-plan");
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
    setScreen(session?.user.id ? "home" : "save-plan");
  }

  function updateExerciseStatus(id: string, status: ExerciseStatus) {
    const next = { ...completion, [id]: status };
    setCompletion(next);
    writeStorage(STORAGE_KEYS.completion, next);
    const nextMonthlyProgress = upsertMonthlyProgress(monthlyProgress, weeklyPlan, next);
    setMonthlyProgress(nextMonthlyProgress);
    writeStorage(STORAGE_KEYS.monthlyProgress, nextMonthlyProgress);

    if (status === "Done") {
      const rawItemId = id.includes(":") ? id.slice(id.indexOf(":") + 1) : id;
      const now = new Date().toISOString();
      const nowTime = new Date(now).getTime();
      setWorkoutLogs((current) => {
        let changed = false;
        const nextLogs = Object.fromEntries(
          Object.entries(current).map(([dayKey, dayLog]) => {
            const timer = dayLog.itemTimers[rawItemId];
            if (!timer?.runningSince) return [dayKey, dayLog];
            changed = true;
            return [
              dayKey,
              {
                ...dayLog,
                itemTimers: {
                  ...dayLog.itemTimers,
                  [rawItemId]: {
                    ...timer,
                    stoppedAt: now,
                    elapsedSeconds: getSectionElapsedSeconds(timer, nowTime),
                    runningSince: "",
                  },
                },
              },
            ];
          }),
        );
        if (changed) writeStorage(STORAGE_KEYS.workoutLogs, nextLogs);
        return changed ? nextLogs : current;
      });
    }
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

  function navigateMainTab(tab: MainTab) {
    if (tab === "home") setScreen("home");
    if (tab === "exercise") setScreen("weekly-plan");
    if (tab === "nutrition") setScreen("nutrition");
    if (tab === "progress") setScreen("progress");
  }

  return (
    <main className="gb-theme min-h-[100dvh] bg-[#0F172A] p-0 text-[#FFFFFF] sm:px-4 sm:py-5">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden border-0 bg-[#1E293B] shadow-none sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2rem] sm:border sm:border-slate-700 sm:shadow-2xl sm:shadow-slate-950/60">
        {showAppHeader && (
          <AppHeader
            isNotificationOn={smartNotificationsEnabled}
            subtitle={headerSubtitle}
            toast={headerToast}
            onOpenProfile={() => {
              setScreen("profile");
            }}
            onToggleNotification={handleToggleSmartNotifications}
          />
        )}

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
            notificationPermission={notificationPermission}
            syncMessage={syncMessage}
            syncStatus={syncStatus}
            userEmail={session?.user.email ?? ""}
            onEnableNotifications={handleToggleSmartNotifications}
            onManualSync={() => void saveCloudState("Saved online.")}
            onPasswordAuth={handlePasswordAuth}
            onPasswordReset={handlePasswordReset}
            onSkip={() => setScreen("home")}
          />
        )}
        {screen === "home" && weeklyPlan && (
          <HomeScreen
            activitySummary={todaysActivitySummary}
            completion={completion}
            nutritionPlan={nutritionPlan}
            plan={weeklyPlan}
            proteinLog={proteinLog}
            profile={profile}
            resumeDayIndex={resumeDayIndex}
            waterLog={waterLog}
            onOpenExercise={() => navigateMainTab("exercise")}
            onOpenNutrition={() => navigateMainTab("nutrition")}
            onOpenProgress={() => navigateMainTab("progress")}
            onStartWorkout={openDay}
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
            log={todaysWorkoutLog}
            activitySummary={todaysActivitySummary}
            onChooseExerciseOption={chooseExerciseOption}
            onToggleItemTimer={toggleWorkoutItemTimer}
            onUpdateExerciseSetLog={updateExerciseSetLog}
            onUpdateWorkoutWeight={updateWorkoutWeight}
            onUpdateExerciseStatus={updateExerciseStatus}
            onOpenVideo={setActiveVideo}
            onBackToWeek={() => setScreen("weekly-plan")}
            onCheckIn={() => goToScreen("check-in")}
          />
        )}
        {screen === "check-in" && (
          <CheckInScreen
            activitySummary={todaysActivitySummary}
            day={todaysPlan}
            log={todaysWorkoutLog}
            checkIn={checkIn}
            setCheckIn={setCheckIn}
            onUpdateWorkoutWeight={updateWorkoutWeight}
            onSave={handleSaveCheckIn}
          />
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
            proteinLog={proteinLog}
            profile={profile}
            waterLog={waterLog}
            onDietPreferenceChange={handleDietPreferenceChange}
            onLogProtein={logProteinIntake}
            onLogWater={logWaterIntake}
          />
        )}
        {screen === "progress" && (
          <ProgressScreen
            completion={completion}
            exerciseSelection={exerciseSelection}
            monthlyProgress={monthlyProgress}
            plan={weeklyPlan}
            workoutLogs={workoutLogs}
            onOpenDay={openDay}
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
            onManualSync={() => void saveCloudState("Saved online.")}
            onPasswordAuth={handlePasswordAuth}
            onPasswordReset={handlePasswordReset}
            onPasswordUpdate={handlePasswordUpdate}
            onProfileUpdate={handleProfileUpdate}
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
  const fieldErrors = useMemo(() => getOnboardingFieldErrors(profile), [profile]);

  const canSubmit = onboardingStep === 2 && profileStepReady && isValidOnboardingProfile(profile);
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
              label="Body goal"
              options={["Lose weight slowly", "Maintain weight", "Gain muscle slowly"]}
              value={profile.bodyGoal}
              onChange={(value) => updateProfile("bodyGoal", value as UserProfile["bodyGoal"])}
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
                error={fieldErrors.name}
                helper="Only alphabet letters are accepted."
                label="Name"
                placeholder="Your name"
                value={profile.name}
                onChange={(value) => updateProfile("name", cleanAlphabetName(value))}
              />
              <NumberField
                error={fieldErrors.age}
                helper="Accepted range: 16 to 60 years."
                label="Age"
                max={VALUE_RULES.age.max}
                min={VALUE_RULES.age.min}
                placeholder="Your age"
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
                <NumberField
                  error={fieldErrors.height}
                  helper="135 to 215 cm, up to 2 decimals"
                  label="Height"
                  max={VALUE_RULES.height.max}
                  min={VALUE_RULES.height.min}
                  step="0.01"
                  suffix="cm"
                  value={profile.height}
                  onChange={(value) => updateProfile("height", value)}
                />
                <NumberField
                  error={fieldErrors.weight}
                  helper="30 to 150 kg, up to 2 decimals"
                  label="Weight"
                  max={VALUE_RULES.weight.max}
                  min={VALUE_RULES.weight.min}
                  step="0.01"
                  suffix="kg"
                  value={profile.weight}
                  onChange={(value) => updateProfile("weight", value)}
                />
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
  notificationPermission,
  syncStatus,
  syncMessage,
  userEmail,
  onEnableNotifications,
  onManualSync,
  onPasswordAuth,
  onPasswordReset,
  onSkip,
}: {
  authStatus: AuthStatus;
  notificationPermission: ReminderPermission;
  syncStatus: SyncStatus;
  syncMessage: string;
  userEmail: string;
  onEnableNotifications: () => void;
  onManualSync: () => void;
  onPasswordAuth: (email: string, password: string, mode: AuthMode) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<boolean>;
  onSkip: () => void;
}) {
  const isSignedIn = authStatus === "signed-in";
  const isBusy = authStatus === "checking" || syncStatus === "loading" || syncStatus === "saving";
  const canUseCloudSave = authStatus !== "unconfigured";
  const notificationsOn = notificationPermission === "granted";

  return (
    <section className="flex min-h-[100dvh] flex-col gap-4 p-4 pb-24 sm:min-h-[calc(100vh-2.5rem)] sm:gap-5 sm:p-5 sm:pb-24">
      <ScreenTitle icon={<Cloud size={22} />} title="Save Your Plan" subtitle="Keep your profile, workouts, and progress ready when you come back." />

      <div className="rounded-3xl border border-[#334155] bg-[#273449] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Plan ready</p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
          {isSignedIn ? "Your GymBuddy account is connected" : "Save now, train without restarting"}
        </h2>
        <p className="mt-3 leading-7 text-[#CBD5E1]">
          {isSignedIn
            ? `Signed in${userEmail ? ` as ${userEmail}` : ""}.`
            : "Saved on this device."}
        </p>
      </div>

      <NotificationPromptCard disabled={notificationsOn} notificationPermission={notificationPermission} onEnable={onEnableNotifications} />

      <SaveStatusRow
        canUseCloudSave={canUseCloudSave}
        isSignedIn={isSignedIn}
        message={syncMessage}
        status={syncStatus}
      />

      {isSignedIn ? (
        <button
          className="flex min-h-[3.25rem] items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 font-black text-white disabled:opacity-60 sm:min-h-14"
          disabled={isBusy}
          onClick={onManualSync}
          type="button"
        >
          <Cloud size={20} />
          Sync My Plan
        </button>
      ) : canUseCloudSave ? (
        <PasswordBackupForm disabled={isBusy} onAuth={onPasswordAuth} onResetPassword={onPasswordReset} />
      ) : (
        <div className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
          <SaveMiniItem icon={<CheckCircle2 size={18} />} label="Device save on" />
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

function SaveStatusRow({
  canUseCloudSave,
  isSignedIn,
  message,
  status,
}: {
  canUseCloudSave: boolean;
  isSignedIn: boolean;
  message: string;
  status: SyncStatus;
}) {
  if (status === "error" && message) {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-bold text-red-200">
        <Cloud size={18} />
        <span>{message}</span>
      </div>
    );
  }

  if (isSignedIn) {
    return <SaveMiniItem icon={<Cloud size={18} />} label={message || "Online save on"} />;
  }

  return <SaveMiniItem icon={<CheckCircle2 size={18} />} label={canUseCloudSave ? "Device save on" : "Saved on this device"} />;
}

function SaveMiniItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex min-h-12 items-center gap-3 rounded-2xl bg-[#0F172A] px-4 text-sm font-black text-[#CBD5E1]">
      <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#273449] text-[#22C55E]">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function NotificationPromptCard({
  disabled,
  notificationPermission,
  onEnable,
}: {
  disabled: boolean;
  notificationPermission: ReminderPermission;
  onEnable: () => void;
}) {
  const isDenied = notificationPermission === "denied";
  const isUnsupported = notificationPermission === "unsupported";

  if (disabled) {
    return (
      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Notifications on</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#CBD5E1]">GymBuddy can send workout nudges from this browser.</p>
      </section>
    );
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Workout nudges</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-[#CBD5E1]">
          Turn on notifications so GymBuddy can remind you to keep the week moving.
        </p>
      </div>
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-4 text-sm font-black text-white disabled:opacity-60"
        disabled={isDenied || isUnsupported}
        onClick={onEnable}
        type="button"
      >
        <Timer size={18} />
        Turn On Notifications
      </button>
      {(isDenied || isUnsupported) && <p className="text-xs font-bold leading-5 text-[#CBD5E1]">Notifications are not available right now. You can still use the plan normally.</p>}
    </div>
  );
}

function PasswordBackupForm({
  disabled,
  onAuth,
  onResetPassword,
}: {
  disabled: boolean;
  onAuth: (email: string, password: string, mode: AuthMode) => Promise<boolean>;
  onResetPassword: (email: string) => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [signedUpSuccessfully, setSignedUpSuccessfully] = useState(false);

  async function handleAuthSubmit() {
    const success = await onAuth(email, password, mode);
    if (success && mode === "sign-up") {
      setSignedUpSuccessfully(true);
      setMode("sign-in");
      setPassword("");
    }
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div>
        <p className="text-sm font-black text-white">{signedUpSuccessfully ? "Sign in" : mode === "sign-up" ? "Create account" : "Sign in"}</p>
        <p className="mt-1 text-sm font-semibold text-[#CBD5E1]">Email + password</p>
      </div>
      {signedUpSuccessfully && <p className="rounded-2xl bg-[#22C55E]/15 px-4 py-3 text-sm font-black text-[#86EFAC]">Signed up successfully</p>}
      {!signedUpSuccessfully && (
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#0F172A] p-1">
          <button className={`min-h-10 rounded-xl text-sm font-black ${mode === "sign-up" ? "bg-[#3B82F6] text-white" : "text-[#CBD5E1]"}`} onClick={() => setMode("sign-up")} type="button">
            Create
          </button>
          <button className={`min-h-10 rounded-xl text-sm font-black ${mode === "sign-in" ? "bg-[#3B82F6] text-white" : "text-[#CBD5E1]"}`} onClick={() => setMode("sign-in")} type="button">
            Sign in
          </button>
        </div>
      )}
      <input
        className="min-h-12 rounded-2xl border border-[#334155] bg-[#0F172A] px-4 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#3B82F6]"
        inputMode="email"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        className="min-h-12 rounded-2xl border border-[#334155] bg-[#0F172A] px-4 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#3B82F6]"
        minLength={6}
        placeholder="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button
        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-4 text-sm font-black text-white disabled:opacity-60"
        disabled={disabled}
        onClick={() => void handleAuthSubmit()}
        type="button"
      >
        <Mail size={18} />
        {mode === "sign-up" ? "Create Account" : "Sign In"}
      </button>
      {mode === "sign-in" && (
        <button
          className="min-h-10 text-sm font-black text-[#B3C5FF] disabled:opacity-60"
          disabled={disabled}
          onClick={() => void onResetPassword(email)}
          type="button"
        >
          Forgot password?
        </button>
      )}
    </div>
  );
}

function PasswordUpdateForm({ disabled, onUpdate }: { disabled: boolean; onUpdate: (password: string) => Promise<boolean> }) {
  const [password, setPassword] = useState("");

  async function updatePassword() {
    const didUpdate = await onUpdate(password);
    if (didUpdate) setPassword("");
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <p className="text-sm font-black text-white">Update password</p>
      <input
        className="min-h-12 rounded-2xl border border-[#334155] bg-[#0F172A] px-4 font-semibold text-white outline-none placeholder:text-slate-500 focus:border-[#3B82F6]"
        minLength={6}
        placeholder="New password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <button
        className="min-h-12 rounded-2xl bg-[#ABD600] px-4 text-sm font-black text-[#283500] disabled:opacity-60"
        disabled={disabled}
        onClick={() => void updatePassword()}
        type="button"
      >
        Save password
      </button>
    </div>
  );
}

function getHeaderSubtitle(screen: Screen) {
  if (screen === "home") return "Home";
  if (screen === "nutrition") return "Nutrition Coach";
  if (screen === "progress") return "Progress Check";
  if (screen === "profile") return "Profile";
  return "Workout Coach";
}

function AppHeader({
  isNotificationOn,
  subtitle,
  toast,
  onOpenProfile,
  onToggleNotification,
}: {
  isNotificationOn: boolean;
  subtitle: string;
  toast: string;
  onOpenProfile: () => void;
  onToggleNotification: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#334155] bg-[#0F172A]/95 px-4 py-3 backdrop-blur sm:px-5">
      <div className="relative flex min-h-12 items-center justify-between">
        <button
          className="grid h-11 w-11 place-items-center rounded-2xl text-[#CBD5E1] transition active:scale-[0.98]"
          onClick={onOpenProfile}
          type="button"
          aria-label="Open profile"
        >
          <User size={25} />
        </button>

        <div className="text-center">
          <p className="text-xl font-black leading-tight tracking-wide text-white">GymBuddy</p>
          <p className="text-[11px] font-black uppercase tracking-wide text-[#ABD600]">{subtitle}</p>
        </div>

        <button
          className={`grid h-11 w-11 place-items-center rounded-2xl transition active:scale-[0.98] ${isNotificationOn ? "text-[#ABD600]" : "text-[#CBD5E1]"}`}
          onClick={onToggleNotification}
          type="button"
          aria-label={isNotificationOn ? "Turn smart notifications off" : "Turn smart notifications on"}
        >
          <Bell fill={isNotificationOn ? "currentColor" : "none"} size={24} />
        </button>

      </div>

      {toast && (
        <div className="absolute left-1/2 top-[calc(100%+0.75rem)] z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-[#334155] bg-[#1E293B] px-4 py-3 text-center text-sm font-black text-white shadow-xl shadow-black/30">
          {toast}
        </div>
      )}
    </header>
  );
}

function HomeScreen({
  activitySummary,
  completion,
  nutritionPlan,
  plan,
  proteinLog,
  profile,
  resumeDayIndex,
  waterLog,
  onOpenExercise,
  onOpenNutrition,
  onOpenProgress,
  onStartWorkout,
}: {
  activitySummary: ReturnType<typeof getWorkoutActivitySummary>;
  completion: ExerciseCompletion;
  nutritionPlan: NutritionPlan | null;
  plan: WeeklyPlan;
  proteinLog: Record<string, number>;
  profile: UserProfile;
  resumeDayIndex: number;
  waterLog: Record<string, number>;
  onOpenExercise: () => void;
  onOpenNutrition: () => void;
  onOpenProgress: () => void;
  onStartWorkout: (dayIndex: number) => void;
}) {
  const weekly = getWeeklyProgress(plan, completion);
  const homeTarget = getHomeTargetDay(plan, resumeDayIndex);
  const targetDay = homeTarget.day;
  const targetProgress = targetDay ? getDayProgress(targetDay, completion) : null;
  const nutrition = nutritionPlan ?? createFallbackNutritionPlan(profile);
  const firstName = profile.name.trim().split(/\s+/)[0] || "Champ";
  const calories = nutrition.targetCalories ? `${nutrition.targetCalories}` : "--";
  const todayKey = getLocalDateKey();
  const proteinGoal = nutrition.macros?.protein ?? 0;
  const waterGoal = nutrition.macros?.waterLiters ?? 0;
  const loggedProtein = Number(proteinLog[todayKey] ?? 0);
  const loggedWater = Number(waterLog[todayKey] ?? 0);
  const protein = proteinGoal ? `${loggedProtein}/${proteinGoal}g` : "--";
  const water = waterGoal ? `${loggedWater.toFixed(1)}/${waterGoal.toFixed(1)}L` : "--";
  const proteinPercent = proteinGoal ? Math.min(100, Math.round((loggedProtein / proteinGoal) * 100)) : 0;
  const waterPercent = waterGoal ? Math.min(100, Math.round((loggedWater / waterGoal) * 100)) : 0;
  const workoutMinutes = getWorkoutDurationMinutes(profile);
  const goalPercent = targetDay?.isRestDay ? 100 : targetProgress ? targetProgress.percent : weekly.percent;
  const actionLabel = targetDay?.isRestDay ? "Review Recovery" : targetProgress && targetProgress.done + targetProgress.partial > 0 ? `Continue ${targetDay?.day ?? "Workout"}` : `Start ${targetDay?.day ?? "Workout"}`;

  return (
    <section className="flex flex-1 flex-col gap-4 bg-[#0F172A] p-4 pb-24 pt-4 sm:gap-5 sm:p-5 sm:pb-28 sm:pt-5">
      <div>
        <h1 className="text-3xl font-black leading-tight text-white">Hello, {firstName}</h1>
        <p className="mt-2 text-base font-semibold text-[#CBD5E1]">Walk in confident. Your plan is ready</p>
      </div>

      <button
        className="rounded-3xl border border-[#334155] bg-gradient-to-br from-[#1E293B] to-[#111827] p-5 text-left shadow-xl shadow-black/20 transition active:scale-[0.99]"
        onClick={() => (targetDay ? onStartWorkout(homeTarget.index) : onOpenExercise())}
        type="button"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-wide text-[#CBD5E1]">Today&apos;s goal</p>
          <span className="rounded-full bg-[#273449] px-3 py-1 text-xs font-black text-[#F97316]">{targetDay?.day ?? `Week ${plan.week}`}</span>
        </div>
        <div className="mt-6 flex flex-col items-center">
          <CircularProgress percent={goalPercent} />
          <h2 className="mt-4 text-center text-2xl font-black text-white">{targetDay?.title ?? "Week complete"}</h2>
          <p className="mt-1 text-center text-sm font-semibold text-[#CBD5E1]">
            {targetDay?.isRestDay ? "Recovery day. Keep it light." : targetProgress ? `${targetProgress.done}/${targetProgress.total} items done` : `${weekly.percent}% weekly progress`}
          </p>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <HomeStat value={calories} label="KCAL" />
          <HomeStat value={`${workoutMinutes}`} label="MIN" />
          <HomeStat value={`${weekly.percent}%`} label="WEEK" />
        </div>
      </button>

      <section className="rounded-3xl border border-[#334155] bg-[#111827] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-white">Today&apos;s Focus</h2>
          <button className="rounded-full bg-[#273449] px-3 py-2 text-[#CBD5E1] transition active:scale-[0.98]" onClick={onOpenProgress} type="button" aria-label="Open progress">
            <BarChart3 size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-3">
          <HomeProgressItem icon={<Dumbbell size={20} />} label="Workout" percent={goalPercent} value={targetProgress ? `${targetProgress.done}/${targetProgress.total}` : `${weekly.percent}%`} tone="blue" />
          <HomeProgressItem icon={<Utensils size={20} />} label="Protein goal" percent={proteinPercent} value={protein} tone="orange" onClick={onOpenNutrition} />
          <HomeProgressItem icon={<Droplet size={20} />} label="Water goal" percent={waterPercent} value={water} tone="cyan" onClick={onOpenNutrition} />
          <HomeProgressItem icon={<Timer size={20} />} label="Active" percent={Math.min(100, Math.round((activitySummary.activeSeconds / Math.max(1, workoutMinutes * 60)) * 100))} value={formatDuration(activitySummary.activeSeconds)} tone="green" />
        </div>
      </section>

      <section
        className="relative min-h-[230px] overflow-hidden rounded-3xl border border-[#334155] bg-[#111827] p-4 shadow-xl shadow-black/25"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(15,23,42,0.15), rgba(15,23,42,0.92)), url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-[#273449]/85 px-3 py-1 text-xs font-black text-[#CBD5E1] backdrop-blur">
          {profile.gymType}
        </div>
        <div className="flex h-full min-h-[198px] flex-col justify-end">
          <p className="text-sm font-black uppercase tracking-wide text-[#CBD5E1]">Recommended for you</p>
          <h2 className="mt-2 text-2xl font-black leading-tight text-white">{targetDay?.title ?? "Review your week"}</h2>
          <div className="mt-3 flex items-center gap-4 text-sm font-bold text-[#CBD5E1]">
            <span className="inline-flex items-center gap-1">
              <Timer size={16} />
              {workoutMinutes} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame size={16} />
              {calories} kcal target
            </span>
          </div>
          <button
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 text-base font-black text-white shadow-xl shadow-blue-950/30 transition active:scale-[0.98]"
            onClick={() => (targetDay ? onStartWorkout(homeTarget.index) : onOpenExercise())}
            type="button"
          >
            {actionLabel}
            <Play size={18} />
          </button>
        </div>
      </section>
    </section>
  );
}

function getHomeTargetDay(plan: WeeklyPlan, resumeDayIndex: number) {
  const safeIndex = Math.min(Math.max(resumeDayIndex, 0), plan.days.length - 1);
  return {
    day: plan.days[safeIndex] ?? null,
    index: safeIndex,
  };
}

function HomeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-black leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">{label}</p>
    </div>
  );
}

function CircularProgress({ percent }: { percent: number }) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="grid h-40 w-40 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#A3E635 ${safePercent * 3.6}deg, #334155 0deg)`,
      }}
    >
      <div className="grid h-28 w-28 place-items-center rounded-full bg-[#111827] text-center">
        <div>
          <p className="text-3xl font-black leading-none text-white">{safePercent}%</p>
          <p className="mt-1 text-sm font-black text-[#CBD5E1]">Complete</p>
        </div>
      </div>
    </div>
  );
}

function HomeProgressItem({
  icon,
  label,
  onClick,
  percent,
  tone,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  percent: number;
  tone: "blue" | "orange" | "cyan" | "green";
  value: string;
}) {
  const toneClass = {
    blue: "bg-[#3B82F6]/20 text-[#93C5FD]",
    orange: "bg-[#F97316]/20 text-[#FDBA74]",
    cyan: "bg-[#06B6D4]/20 text-[#67E8F9]",
    green: "bg-[#22C55E]/20 text-[#86EFAC]",
  }[tone];
  const barClass = {
    blue: "bg-[#3B82F6]",
    orange: "bg-[#F97316]",
    cyan: "bg-[#06B6D4]",
    green: "bg-[#22C55E]",
  }[tone];

  const content = (
    <>
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClass}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-base font-black text-white">{label}</span>
          <span className="shrink-0 text-sm font-black text-[#CBD5E1]">{value}</span>
        </span>
        <span className="mt-2 block h-2 overflow-hidden rounded-full bg-[#334155]">
          <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
        </span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button className="flex w-full items-center gap-3 rounded-2xl border border-[#1F2937] bg-[#1E293B] p-3 text-left transition active:scale-[0.99]" onClick={onClick} type="button">
        {content}
      </button>
    );
  }

  return <div className="flex items-center gap-3 rounded-2xl border border-[#1F2937] bg-[#1E293B] p-3">{content}</div>;
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
  const initialFocusedIndex = plan && resumeDay ? Math.max(0, plan.days.findIndex((day) => day.day === resumeDay.day)) : 0;
  const [focusedDayIndex, setFocusedDayIndex] = useState(initialFocusedIndex);
  const focusedDay = plan?.days[focusedDayIndex] ?? plan?.days[0] ?? null;

  useEffect(() => {
    if (!plan) return;
    setFocusedDayIndex((current) => Math.min(current, plan.days.length - 1));
  }, [plan]);

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-24 pt-3 sm:gap-5 sm:p-5 sm:pb-28 sm:pt-4">
      <ScreenTitle icon={<Wand2 size={22} />} title="Your Week 1 Plan" subtitle="Start with Day 1." />
      <div className="rounded-3xl border border-[#334155] bg-[#273449] p-4 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Week 1 ready</p>
            <h2 className="mt-2 text-2xl font-black leading-tight text-white">
              {profile.name ? `${profile.name}'s Week 1 Plan` : "Your Week 1 Plan"}
            </h2>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#0F172A] text-[#22C55E]">
            <CheckCircle2 size={22} />
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <PlanMiniChip label="Goal" value={profile.goal.replace("Build ", "")} />
          <PlanMiniChip label="Gym" value={profile.gymType.replace(" gym", "")} />
          <PlanMiniChip label="Time" value={profile.workoutDuration.replace(" minutes", "m")} />
        </div>
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
                ? `${resumeProgress.done}/${resumeProgress.total} items done. Tap to continue`
                : "Tap to continue from where you left off."}
          </p>
          {!resumeDay.isRestDay && resumeProgress && <ProgressBar percent={resumeProgress.percent} />}
        </button>
      )}

      {plan && <CalendarExportCard plan={plan} profile={profile} />}

      {plan && <DayChipNavigator activeIndex={focusedDayIndex} completion={completion} days={plan.days} onSelectDay={setFocusedDayIndex} />}

      {focusedDay && (
        <DayPlanCard
          completion={completion}
          day={focusedDay}
          gymType={profile.gymType}
          onOpen={() => onOpenDay(focusedDayIndex)}
        />
      )}

      <button className="mt-1 flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#3B82F6] px-5 font-black text-white shadow-xl shadow-blue-950/20 sm:mt-2 sm:min-h-14" onClick={onStartWorkout} type="button">
        {resumeDay?.isRestDay ? "Open Recovery Day" : `Continue ${resumeDay?.day ?? "Workout"}`}
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function PlanMiniChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#0F172A] px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className="truncate text-xs font-black text-white">{value}</p>
    </div>
  );
}

function DayChipNavigator({
  activeIndex,
  days,
  completion,
  onSelectDay,
}: {
  activeIndex: number;
  days: DayPlan[];
  completion: ExerciseCompletion;
  onSelectDay: (dayIndex: number) => void;
}) {
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
              className={`flex min-w-[74px] flex-col items-center justify-center rounded-2xl border px-3 py-2 text-white transition active:scale-[0.98] ${
                activeIndex === index ? "border-[#3B82F6] bg-[#3B82F6]" : "border-[#334155] bg-[#273449]"
              }`}
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
  log,
  activitySummary,
  onChooseExerciseOption,
  onToggleItemTimer,
  onUpdateExerciseSetLog,
  onUpdateWorkoutWeight,
  onUpdateExerciseStatus,
  onOpenVideo,
  onBackToWeek,
  onCheckIn,
}: {
  day: DayPlan;
  completion: ExerciseCompletion;
  exerciseSelection: ExerciseSelection;
  log: DailyWorkoutLog;
  activitySummary: ReturnType<typeof getWorkoutActivitySummary>;
  onChooseExerciseOption: (id: string, selectedOption: "main" | "alternative") => void;
  onToggleItemTimer: (day: DayPlan, itemId: string) => void;
  onUpdateExerciseSetLog: (day: DayPlan, exerciseId: string, setIndex: number, key: keyof SetPerformanceLog, value: string) => void;
  onUpdateWorkoutWeight: (day: DayPlan, key: "beforeWeight" | "afterWeight", value: string) => void;
  onUpdateExerciseStatus: (id: string, status: ExerciseStatus) => void;
  onOpenVideo: (video: VideoTarget) => void;
  onBackToWeek: () => void;
  onCheckIn: () => void;
}) {
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTimerTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const queue = getWorkoutQueue(day);
  const currentIndex = queue.findIndex((item) => getCompletionStatus(completion, day, item.id) !== "Done");
  const currentItem = currentIndex >= 0 ? queue[currentIndex] : null;
  const upcomingItem = currentIndex >= 0 ? queue[currentIndex + 1] : null;
  const dayProgress = getDayProgress(day, completion);
  const currentPosition = currentItem ? currentIndex + 1 : queue.length;

  if (day.isRestDay) {
    return (
      <section className="flex flex-1 flex-col gap-4 p-4 pb-24 pt-3 sm:gap-5 sm:p-5 sm:pb-28 sm:pt-4">
        <WorkoutBackButton onClick={onBackToWeek} />
        <ScreenTitle icon={<HeartPulse size={22} />} title="Recovery Day" subtitle={`${day.day}: ${day.title}`} />
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <p className="text-lg font-black text-slate-950">{day.focus}</p>
          <p className="mt-2 leading-7 text-slate-600">Keep it light today. Rest is part of the plan, especially for beginners.</p>
        </div>
        <SimpleWorkoutSection title="Optional recovery" subtitle="Only do this if your body feels fresh.">
          {day.coolDown.map((activity) => (
            <ActivityCard
              activity={activity}
              key={activity.id}
              status={getCompletionStatus(completion, day, activity.id) ?? "Not done"}
              timer={getItemTimer(log, activity.id)}
              onOpenVideo={onOpenVideo}
              onToggleTimer={() => onToggleItemTimer(day, activity.id)}
              onUpdateStatus={(status) => onUpdateExerciseStatus(getCompletionKey(day, activity.id), status)}
            />
          ))}
        </SimpleWorkoutSection>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-24 pt-3 sm:gap-5 sm:p-5 sm:pb-28 sm:pt-4">
      <WorkoutBackButton onClick={onBackToWeek} />
      <ScreenTitle icon={<Dumbbell size={22} />} title="Today's Workout" subtitle={`${day.day}: ${day.title}`} />

      <DailyWorkoutLogCard
        activitySummary={activitySummary}
        log={log}
        onWeightChange={(key, value) => onUpdateWorkoutWeight(day, key, value)}
      />

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Session progress</p>
            <h2 className="mt-1 text-xl font-black text-white">
              {currentItem ? `${currentPosition}/${queue.length}` : `${queue.length}/${queue.length}`}
            </h2>
          </div>
          <div className="rounded-2xl bg-[#0F172A] px-3 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">Progress</p>
            <p className="text-sm font-black text-[#ABD600]">{dayProgress.percent}%</p>
          </div>
        </div>
        <ProgressBar percent={dayProgress.percent} tone="green" />
        <p className="mt-2 text-xs font-black text-[#B3C5FF]">
          {dayProgress.done}/{dayProgress.total} done{dayProgress.partial > 0 ? ` | ${dayProgress.partial} partial` : ""}
        </p>
      </section>

      {currentItem ? (
        <section className="grid gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#ABD600]">Current</p>
            <h2 className="mt-1 text-2xl font-black text-white">{currentItem.section}</h2>
          </div>
          {currentItem.kind === "activity" ? (
            <ActivityCard
              activity={currentItem.activity}
              key={currentItem.id}
              status={getCompletionStatus(completion, day, currentItem.id) ?? "Not done"}
              timer={getItemTimer(log, currentItem.id)}
              onOpenVideo={onOpenVideo}
              onToggleTimer={() => onToggleItemTimer(day, currentItem.id)}
              onUpdateStatus={(status) => onUpdateExerciseStatus(getCompletionKey(day, currentItem.id), status)}
            />
          ) : (
            <ExerciseCard
              completionStatus={getCompletionStatus(completion, day, currentItem.id) ?? "Not done"}
              exercise={currentItem.exercise}
              key={currentItem.id}
              selectedOption={exerciseSelection[currentItem.id] ?? "main"}
              setLogs={log.setLogs[currentItem.id]}
              timer={getItemTimer(log, currentItem.id)}
              onChooseOption={(selectedOption) => onChooseExerciseOption(currentItem.id, selectedOption)}
              onOpenVideo={onOpenVideo}
              onToggleTimer={() => onToggleItemTimer(day, currentItem.id)}
              onUpdateSetLog={(setIndex, key, value) => onUpdateExerciseSetLog(day, currentItem.id, setIndex, key, value)}
              onUpdateStatus={(status) => onUpdateExerciseStatus(getCompletionKey(day, currentItem.id), status)}
            />
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-[#22C55E]/40 bg-[#12251B] p-5 text-center">
          <CheckCheck className="mx-auto text-[#86EFAC]" size={30} />
          <h2 className="mt-3 text-2xl font-black text-white">Workout items complete</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-[#CBD5E1]">Do your check-in to save how the session felt</p>
        </section>
      )}

      {upcomingItem && <UpcomingWorkoutCard item={upcomingItem} position={currentIndex + 2} total={queue.length} />}

      <button className="mt-auto flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-2xl bg-[#40B5AD] px-5 font-black text-slate-950 shadow-xl shadow-teal-200 sm:min-h-14" onClick={onCheckIn} type="button">
        Finish Workout
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function UpcomingWorkoutCard({ item, position, total }: { item: WorkoutQueueItem; position: number; total: number }) {
  const title = item.kind === "activity" ? item.activity.name : item.exercise.main.name;
  const detail =
    item.kind === "activity"
      ? `${item.activity.time} | ${item.activity.reps}`
      : `${item.exercise.main.sets} sets | ${item.exercise.main.repsPerSet} reps`;

  return (
    <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[#94A3B8]">Upcoming {position}/{total}</p>
          <h3 className="mt-1 truncate text-lg font-black text-white">{title}</h3>
          <p className="mt-1 text-sm font-bold text-[#CBD5E1]">{item.section} | {detail}</p>
        </div>
        <span className="shrink-0 rounded-full bg-[#0F172A] px-3 py-1 text-xs font-black text-[#ABD600]">Next</span>
      </div>
    </section>
  );
}

function SimpleWorkoutSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3">
      <div>
        <h2 className="text-lg font-black text-white">{title}</h2>
        <p className="text-sm font-semibold text-[#CBD5E1]">{subtitle}</p>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function DailyWorkoutLogCard({
  activitySummary,
  log,
  onWeightChange,
}: {
  activitySummary: ReturnType<typeof getWorkoutActivitySummary>;
  log: DailyWorkoutLog;
  onWeightChange: (key: "beforeWeight" | "afterWeight", value: string) => void;
}) {
  return (
    <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Today&apos;s session</p>
      <div className="mt-3">
        <WeightInput label="Before" value={log.beforeWeight} onChange={(value) => onWeightChange("beforeWeight", value)} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricTile label="After weight" value={log.afterWeight ? `${log.afterWeight} kg` : "Check-in"} />
        <MetricTile label="Active time" value={formatDuration(activitySummary.activeSeconds)} />
        <MetricTile label="Rest time" value={formatDuration(activitySummary.restSeconds)} />
      </div>
    </section>
  );
}

function WeightInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 rounded-2xl bg-[#0F172A] p-3">
      <span className="text-xs font-black text-[#CBD5E1]">{label} weight</span>
      <div className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 bg-transparent text-base font-black text-white outline-none"
          inputMode="decimal"
          max={VALUE_RULES.weight.max}
          min={VALUE_RULES.weight.min}
          placeholder="kg"
          step="0.01"
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-xs font-black text-[#CBD5E1]">kg</span>
      </div>
    </label>
  );
}

function WorkoutSection({
  title,
  subtitle,
  loggedSeconds,
  children,
}: {
  title: string;
  subtitle: string;
  loggedSeconds: number;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 pt-1">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-black leading-tight text-white">{title}</h2>
          <p className="mt-1 text-sm font-semibold leading-5 text-[#CBD5E1]">{subtitle}</p>
        </div>
        <div className="shrink-0 rounded-2xl border border-[#334155] bg-[#1E293B] px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">Time logged</p>
          <p className="text-sm font-black text-[#ABD600]">{formatDuration(loggedSeconds)}</p>
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

function ActivityCard({
  activity,
  status,
  timer,
  onOpenVideo,
  onToggleTimer,
  onUpdateStatus,
}: {
  activity: PlanActivity;
  status: ExerciseStatus;
  timer: WorkoutSectionLog;
  onOpenVideo: (video: VideoTarget) => void;
  onToggleTimer: () => void;
  onUpdateStatus: (status: ExerciseStatus) => void;
}) {
  const demoLink = getDemoLink(activity.name, activity.demoLink);

  return (
    <article className="rounded-3xl border border-[#334155] bg-[#111827] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#F97316]">Guide</p>
          <h3 className="mt-1 font-black text-white">{activity.name}</h3>
          <p className="mt-1 text-sm font-bold text-[#CBD5E1]">
            {activity.time} | {activity.sets} set | {activity.reps}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#94A3B8]">{activity.paceOrLoad}</p>
        </div>
        <button
          className="shrink-0 rounded-2xl bg-[#0066FF] px-3 py-2 text-xs font-black text-white"
          onClick={() => onOpenVideo({ title: activity.name, url: demoLink })}
          type="button"
        >
          Demo
        </button>
      </div>
      <ItemTimerControl timer={timer} onToggle={onToggleTimer} />
      <StatusButtonGroup
        allowedStatuses={["Done", "Not done"]}
        className="mt-3"
        value={status}
        onChange={onUpdateStatus}
      />
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
  setLogs,
  timer,
  onChooseOption,
  onOpenVideo,
  onToggleTimer,
  onUpdateSetLog,
  onUpdateStatus,
}: {
  exercise: Exercise;
  selectedOption: "main" | "alternative";
  completionStatus: ExerciseStatus;
  setLogs: SetPerformanceLog[] | undefined;
  timer: WorkoutSectionLog;
  onChooseOption: (selectedOption: "main" | "alternative") => void;
  onOpenVideo: (video: VideoTarget) => void;
  onToggleTimer: () => void;
  onUpdateSetLog: (setIndex: number, key: keyof SetPerformanceLog, value: string) => void;
  onUpdateStatus: (status: ExerciseStatus) => void;
}) {
  const activeOption = exercise[selectedOption];
  const activeDemoLink = getDemoLink(activeOption.name, activeOption.demoLink);
  const isTimeBased = /\b(sec|min|seconds|minutes)\b/i.test(activeOption.repsPerSet);
  const isBodyweightOnly = /bodyweight/i.test(activeOption.weightGuide) && !/\bkg|plate|stack|dumbbell|machine|cable\b/i.test(activeOption.weightGuide);
  const includeWeight = !isBodyweightOnly;
  const hasLoggedSets = Boolean(setLogs?.some((set) => set.weight || set.reps || set.duration));
  const [showSetLog, setShowSetLog] = useState(hasLoggedSets);
  const rows = normalizeSetLogs(setLogs, activeOption, includeWeight);
  const summary = getLoggedSetSummary(setLogs, isTimeBased, includeWeight);

  useEffect(() => {
    setShowSetLog(hasLoggedSets);
  }, [exercise.id, hasLoggedSets, selectedOption]);

  return (
    <article className="overflow-hidden rounded-3xl border border-[#334155] bg-[#111827] shadow-lg shadow-black/15">
      <div className="border-b border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#F97316]">{exercise.muscleGroup}</p>
            <h3 className="mt-1 text-xl font-black leading-tight text-white">{activeOption.name}</h3>
            <p className="mt-1 text-sm font-semibold text-[#CBD5E1]">{activeOption.equipment}</p>
          </div>
          <button
            aria-label={`Open demo for ${activeOption.name}`}
            className="min-h-10 shrink-0 rounded-2xl bg-[#0066FF] px-4 text-xs font-black text-white"
            onClick={() => onOpenVideo({ title: activeOption.name, url: activeDemoLink })}
            type="button"
          >
            Demo
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-[#0F172A] p-1">
          <button
            className={`min-h-10 rounded-xl text-sm font-black ${selectedOption === "main" ? "bg-[#3B82F6] text-white shadow-sm" : "text-[#CBD5E1]"}`}
            onClick={() => onChooseOption("main")}
            type="button"
          >
            Main
          </button>
          <button
            className={`min-h-10 rounded-xl text-sm font-black ${selectedOption === "alternative" ? "bg-[#3B82F6] text-white shadow-sm" : "text-[#CBD5E1]"}`}
            onClick={() => onChooseOption("alternative")}
            type="button"
          >
            Alternative
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-3 gap-2">
          <MetricTile label="Sets" value={activeOption.sets} />
          <MetricTile label={isTimeBased ? "Time" : "Reps"} value={activeOption.repsPerSet} />
          <MetricTile label="Rest" value={`${activeOption.restSeconds}s`} />
        </div>

        <div className="mt-3 rounded-2xl border border-[#334155] bg-[#0F172A] p-3">
          <p className="text-xs font-black uppercase tracking-wide text-[#F97316]">Suggested load</p>
          <p className="mt-1 text-sm font-bold leading-6 text-[#CBD5E1]">{activeOption.weightGuide}</p>
        </div>

        <ItemTimerControl timer={timer} onToggle={onToggleTimer} />

        <div className="mt-4 rounded-2xl border border-[#334155] bg-[#1E293B] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-white">Track progress</p>
              <p className="mt-1 text-xs font-bold text-[#CBD5E1]">{hasLoggedSets ? summary : "Optional for weight/reps graphs."}</p>
            </div>
            <button
              className="shrink-0 rounded-xl bg-[#273449] px-3 py-2 text-xs font-black text-[#F97316]"
              onClick={() => setShowSetLog((current) => !current)}
              type="button"
            >
              {showSetLog ? "Hide" : hasLoggedSets ? "Edit" : "Track"}
            </button>
          </div>

          {showSetLog && (
            <div className="mt-3 grid gap-2">
              {rows.map((row, index) => (
                <div className={`grid gap-2 ${includeWeight ? "grid-cols-[3.25rem_1fr_1fr]" : "grid-cols-[3.25rem_1fr]"}`} key={`${exercise.id}-set-${index}`}>
                  <div className="grid min-h-11 place-items-center rounded-xl bg-[#0F172A] text-xs font-black text-[#CBD5E1]">S{index + 1}</div>
                  {includeWeight && (
                    <input
                      className="min-w-0 rounded-xl border border-[#334155] bg-[#0F172A] px-3 text-sm font-black text-white outline-none placeholder:text-[#64748B]"
                      inputMode="decimal"
                      placeholder="kg"
                      value={row.weight === "Bodyweight" ? "" : row.weight}
                      onChange={(event) => onUpdateSetLog(index, "weight", event.target.value)}
                    />
                  )}
                  <input
                    className="min-w-0 rounded-xl border border-[#334155] bg-[#0F172A] px-3 text-sm font-black text-white outline-none placeholder:text-[#64748B]"
                    inputMode={isTimeBased ? "text" : "numeric"}
                    placeholder={isTimeBased ? "time" : "reps"}
                    value={isTimeBased ? row.duration : row.reps}
                    onChange={(event) => onUpdateSetLog(index, isTimeBased ? "duration" : "reps", event.target.value)}
                  />
                </div>
              ))}
              <button
                className="min-h-11 rounded-xl border border-[#424656] bg-[#0F172A] px-3 text-sm font-black text-[#B3C5FF]"
                onClick={() => onUpdateSetLog(rows.length, isTimeBased ? "duration" : "reps", "")}
                type="button"
              >
                + Add set
              </button>
            </div>
          )}
        </div>

        <p className="mt-3 rounded-2xl bg-[#0F172A] p-3 text-sm font-semibold leading-6 text-[#CBD5E1]">Cue: {activeOption.formCue}</p>

        <StatusButtonGroup
          allowedStatuses={["Done", "Partially done", "Not done"]}
          className="mt-4"
          value={completionStatus}
          onChange={onUpdateStatus}
        />
      </div>
    </article>
  );
}

function StatusButtonGroup({
  allowedStatuses,
  className = "",
  value,
  onChange,
}: {
  allowedStatuses: ExerciseStatus[];
  className?: string;
  value: ExerciseStatus;
  onChange: (status: ExerciseStatus) => void;
}) {
  return (
    <div className={`${className} grid ${allowedStatuses.length === 2 ? "grid-cols-2" : "grid-cols-3"} gap-2`}>
      {allowedStatuses.map((status) => {
        const isSelected = value === status;
        const Icon = status === "Done" ? CheckCheck : status === "Partially done" ? Check : X;
        const selectedClass =
          status === "Done"
            ? "border-[#22C55E] bg-[#22C55E] text-[#052E16]"
            : status === "Partially done"
              ? "border-[#3B82F6] bg-[#3B82F6] text-white"
              : "border-[#EF4444] bg-[#EF4444] text-white";
        const idleClass =
          status === "Done"
            ? "border-[#22C55E]/40 bg-[#12251B] text-[#86EFAC]"
            : status === "Partially done"
              ? "border-[#3B82F6]/40 bg-[#10213F] text-[#93C5FD]"
              : "border-[#EF4444]/40 bg-[#2A1217] text-[#FCA5A5]";

        return (
          <button
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-2 text-[11px] font-black leading-tight transition active:scale-[0.98] ${
              isSelected ? selectedClass : idleClass
            }`}
            key={status}
            onClick={() => onChange(status)}
            type="button"
          >
            <Icon size={15} strokeWidth={3} />
            <span>{status === "Partially done" ? "Partial" : status}</span>
          </button>
        );
      })}
    </div>
  );
}

function ItemTimerControl({ timer, onToggle }: { timer: WorkoutSectionLog; onToggle: () => void }) {
  const isRunning = Boolean(timer.runningSince);
  const elapsedSeconds = getSectionElapsedSeconds(timer);

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="grid min-h-14 grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-[#334155] bg-[#0F172A] p-2">
        <div className="min-w-0 px-2">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">Timer</p>
          <p className="truncate text-sm font-black text-white">{formatDuration(elapsedSeconds)}</p>
        </div>
        <button
          aria-label={isRunning ? "Pause timer" : "Start timer"}
          className={`grid h-10 w-10 place-items-center rounded-xl ${isRunning ? "bg-[#ABD600] text-[#283500]" : "bg-[#0066FF] text-white"}`}
          onClick={onToggle}
          type="button"
        >
          {isRunning ? <Pause size={18} /> : <Play size={18} />}
        </button>
      </div>
      <div className="grid min-h-14 place-content-center rounded-2xl border border-[#334155] bg-[#1E293B] px-3 text-center">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">Time logged</p>
        <p className="text-sm font-black text-[#ABD600]">{formatDuration(elapsedSeconds)}</p>
      </div>
    </div>
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

function ProgressBar({ percent, tone = "green" }: { percent: number; tone?: "green" | "cyan" | "orange" }) {
  const toneClass = tone === "cyan" ? "bg-[#06B6D4]" : tone === "orange" ? "bg-[#F97316]" : "bg-[#22C55E]";
  return (
    <div className="mt-2 h-3 overflow-hidden rounded-full bg-[#334155]">
      <div className={`h-full rounded-full ${toneClass} transition-all`} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  );
}

function ProgressScreen({
  plan,
  completion,
  exerciseSelection,
  monthlyProgress,
  workoutLogs,
  onOpenDay,
}: {
  plan: WeeklyPlan | null;
  completion: ExerciseCompletion;
  exerciseSelection: ExerciseSelection;
  monthlyProgress: MonthlyProgress;
  workoutLogs: WorkoutLogs;
  onOpenDay: (dayIndex: number) => void;
}) {
  const weekly = getWeeklyProgress(plan, completion);
  const [view, setView] = useState<"weekly" | "daily">("weekly");
  const [selectedProgressDayIndex, setSelectedProgressDayIndex] = useState<number | null>(null);
  const progressNudge = getProgressNudge(plan, completion);
  const partiallyStartedDay = getPartiallyStartedDay(plan, completion);
  const actionTargetDay = getProgressActionTargetDay(plan, completion);
  const actionTargetIndex = actionTargetDay && plan ? plan.days.findIndex((day) => day.day === actionTargetDay.day) : -1;
  const performanceRows = getExercisePerformanceRows(plan, workoutLogs, exerciseSelection, completion);

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-20 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-24">
      <ScreenTitle
        icon={<BarChart3 size={22} />}
        title={view === "weekly" ? "Progress" : "Daily Progress"}
        subtitle={view === "weekly" ? "" : "Daily workout completion"}
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
              <p className="pb-2 text-sm font-black text-[#CBD5E1]">{weekly.doneItems}/{weekly.totalItems} items done</p>
            </div>
            <ProgressBar percent={weekly.percent} />
            <p className="mt-4 text-sm font-black text-[#CBD5E1]">Tap to view daily progress</p>
          </button>

          <ProgressNudgeCard
            actionLabel={actionTargetDay ? `${partiallyStartedDay ? "Continue" : "Start"} ${actionTargetDay.day}` : "View daily progress"}
            message={progressNudge}
            onAction={() => {
              if (actionTargetIndex >= 0) {
                onOpenDay(actionTargetIndex);
                return;
              }
              setView("daily");
            }}
          />

          <div className="grid grid-cols-3 gap-3">
            <MetricTile label="Workout days" value={String(weekly.workoutDays)} />
            <MetricTile label="Partial" value={String(weekly.partialItems)} />
            <MetricTile label="Done" value={String(weekly.doneItems)} />
          </div>

          <ExercisePerformancePanel rows={performanceRows} />

          <button
            className="rounded-3xl border border-[#334155] bg-[#273449] p-4 text-left transition active:scale-[0.99]"
            onClick={() => setView("daily")}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Daily breakdown</p>
                <h3 className="mt-1 text-xl font-black text-white">See each day&apos;s progress</h3>
              </div>
              <ChevronRight className="shrink-0 text-[#F97316]" size={24} />
            </div>
          </button>

          <MonthlyProgressCalendar completion={completion} history={monthlyProgress} plan={plan} />
        </>
      ) : (
        <section className="grid gap-3">
          <button className="w-fit rounded-full bg-[#273449] px-4 py-2 text-sm font-black text-[#F97316]" onClick={() => setView("weekly")} type="button">
            Back to week
          </button>
          {plan?.days.map((day, dayIndex) => {
            const progress = getDayProgress(day, completion);
            const log = getWorkoutLog(workoutLogs, day);
            const summary = getWorkoutActivitySummary(day, log, completion);
            const isSelected = selectedProgressDayIndex === dayIndex;
            const dayPerformanceRows = getDayExercisePerformanceRows(day, log, exerciseSelection, completion);
            return (
              <article className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4" key={day.day}>
                <button
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setSelectedProgressDayIndex((current) => (current === dayIndex ? null : dayIndex))}
                  type="button"
                >
                  <span>
                    <span className="text-sm font-black text-[#F97316]">{day.day}</span>
                    <span className="mt-1 block font-black text-white">{day.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {progress.isComplete && <CheckCircle2 className="text-emerald-500" size={24} />}
                    {!day.isRestDay && <ChevronRight className={`text-[#B3C5FF] transition ${isSelected ? "rotate-90" : ""}`} size={22} />}
                  </span>
                </button>
                {day.isRestDay ? (
                  <p className="mt-3 text-sm font-bold text-[#CBD5E1]">Recovery day</p>
                ) : (
                  <>
                    <p className="mt-3 text-sm font-bold text-[#CBD5E1]">
                      {progress.done} done, {progress.partial} partial, {progress.total - progress.done - progress.partial} left
                    </p>
                    <ProgressBar percent={progress.percent} />
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MetricTile label="Before weight" value={log.beforeWeight ? `${log.beforeWeight} kg` : "-"} />
                      <MetricTile label="After weight" value={log.afterWeight ? `${log.afterWeight} kg` : "-"} />
                      <MetricTile label="Active time" value={formatDuration(summary.activeSeconds)} />
                      <MetricTile label="Rest time" value={formatDuration(summary.restSeconds)} />
                    </div>
                    <p className="mt-3 text-xs font-black uppercase tracking-wide text-[#94A3B8]">
                      {isSelected ? "Exercise records" : "Tap day to view exercise records"}
                    </p>
                    {isSelected && <DayExerciseRecords rows={dayPerformanceRows} />}
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

function ExercisePerformancePanel({ rows }: { rows: ExercisePerformanceRow[] }) {
  const topRows = rows.slice(0, 6);
  const maxVolume = Math.max(1, ...topRows.map((row) => row.volume || row.totalReps || row.sets.length));

  return (
    <section className="rounded-3xl border border-[#334155] bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Exercise performance</p>
          <h3 className="mt-1 text-xl font-black text-white">Weights and reps logged</h3>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#273449] text-[#22C55E]">
          <BarChart3 size={18} />
        </span>
      </div>

      {topRows.length ? (
        <div className="mt-4 grid gap-3">
          {topRows.map((row) => {
            const score = row.volume || row.totalReps || row.sets.length;
            const percent = Math.min(100, Math.max(8, Math.round((score / maxVolume) * 100)));
            return (
              <article className="rounded-2xl border border-[#334155] bg-[#1E293B] p-3" key={`${row.day}-${row.exerciseId}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">{row.day} | {row.muscleGroup}</p>
                    <h4 className="mt-1 truncate text-sm font-black text-white">{row.exerciseName}</h4>
                  </div>
                  <p className="shrink-0 text-right text-xs font-black text-[#F97316]">
                    {row.bestWeight > 0 ? `${row.bestWeight} kg` : `${row.totalReps} reps`}
                  </p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#334155]">
                  <div className="h-full rounded-full bg-[#22C55E]" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.sets.map((set, index) => (
                    <span className="rounded-full bg-[#0F172A] px-3 py-1 text-[11px] font-black text-[#CBD5E1]" key={`${row.exerciseId}-mini-${index}`}>
                      S{index + 1}: {set.weight ? `${set.weight}kg ` : ""}{set.reps ? `${set.reps} reps` : set.duration || "logged"}
                    </span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#1E293B] p-4">
          <p className="text-sm font-bold leading-6 text-[#CBD5E1]">Log reps and weights during a workout. Your exercise progress will appear here.</p>
        </div>
      )}
    </section>
  );
}

function DayExerciseRecords({ rows }: { rows: ExercisePerformanceRow[] }) {
  if (!rows.length) {
    return (
      <div className="mt-3 rounded-2xl border border-[#334155] bg-[#0F172A] p-4">
        <p className="text-sm font-bold leading-6 text-[#CBD5E1]">No set logs yet. Tap Track during workouts</p>
      </div>
    );
  }

  return (
    <div className="mt-3 grid gap-3">
      {rows.map((row) => {
        const maxScore = Math.max(1, ...row.sets.map((set) => (Number(set.weight) || 1) * (Number(set.reps) || 1)));
        return (
          <article className="rounded-2xl border border-[#334155] bg-[#0F172A] p-3" key={`${row.day}-${row.exerciseId}-detail`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">{row.muscleGroup}</p>
                <h4 className="mt-1 truncate text-sm font-black text-white">{row.exerciseName}</h4>
              </div>
              <p className="shrink-0 text-xs font-black text-[#ABD600]">
                {row.bestWeight > 0 ? `${row.bestWeight} kg best` : `${row.totalReps} reps`}
              </p>
            </div>
            <div className="mt-3 grid gap-2">
              {row.sets.map((set, index) => {
                const score = (Number(set.weight) || 1) * (Number(set.reps) || 1);
                const percent = Math.min(100, Math.max(10, Math.round((score / maxScore) * 100)));
                const label = set.duration || `${set.weight ? `${set.weight}kg x ` : ""}${set.reps || 0} reps`;
                return (
                  <div className="grid grid-cols-[2.5rem_1fr] items-center gap-2" key={`${row.exerciseId}-set-line-${index}`}>
                    <p className="text-xs font-black text-[#CBD5E1]">S{index + 1}</p>
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-white">{label}</p>
                        <p className="text-[10px] font-black text-[#94A3B8]">{set.duration ? "time" : "load"}</p>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#333535]">
                        <div className="h-full rounded-full bg-[#ABD600]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function getProgressActionTargetDay(plan: WeeklyPlan | null, completion: ExerciseCompletion) {
  if (!plan) return null;
  return getPartiallyStartedDay(plan, completion) ?? getReminderTargetDay(plan, completion);
}

function ProgressNudgeCard({ actionLabel, message, onAction }: { actionLabel: string; message: string; onAction: () => void }) {
  return (
    <section className="rounded-3xl border border-[#334155] bg-[#0F172A] p-4">
      <p className="text-xs font-black uppercase tracking-wide text-[#ABD600]">Next</p>
      <p className="mt-2 text-xl font-black leading-tight text-white">{message}</p>
      <button
        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#0066FF] px-4 text-sm font-black text-white shadow-lg shadow-blue-950/25 transition active:scale-[0.98]"
        onClick={onAction}
        type="button"
      >
        {actionLabel}
        <ChevronRight size={18} />
      </button>
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
    if (weekNumber > currentWeek) return undefined;
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
        <CalendarLegendDot className="bg-[#3B82F6]" label="Partial" />
        <CalendarLegendDot className="bg-[#F59E0B]" label="Check-in" />
        <CalendarLegendDot className="bg-[#8B5CF6]" label="Rest" />
        <CalendarLegendDot className="border border-dashed border-[#64748B] bg-transparent" label="Upcoming" />
      </div>
    </section>
  );
}

function CalendarDayCell({ day }: { day?: CalendarDayProgress }) {
  const baseClass = "flex min-h-11 items-center justify-center rounded-2xl border text-xs font-black transition";

  if (!day) {
    return <div className={`${baseClass} border-dashed border-[#64748B] bg-transparent text-[#64748B]`}>-</div>;
  }

  const statusClass: Record<CalendarDayStatus, string> = {
    done: "border-[#22C55E] bg-[#22C55E] text-[#052E16] shadow-[0_0_0_2px_rgba(34,197,94,0.16)]",
    partial: "border-[#3B82F6] bg-[#3B82F6] text-white",
    missed: "border-[#F59E0B] bg-[#F59E0B] text-[#111827]",
    rest: "border-[#8B5CF6] bg-[#8B5CF6]/20 text-[#C4B5FD]",
    pending: "border-dashed border-[#64748B] bg-transparent text-[#94A3B8]",
  };

  const label: Record<CalendarDayStatus, string> = {
    done: "OK",
    partial: `${day.percent}%`,
    missed: "!",
    rest: "R",
    pending: "-",
  };

  return (
    <div aria-label={`Day ${day.dayNumber}: ${day.title}, ${day.status === "missed" ? "needs check-in" : day.status}`} className={`${baseClass} ${statusClass[day.status]}`} title={`${day.title} - ${day.status === "missed" ? "needs check-in" : `${day.percent}%`}`}>
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
  proteinLog,
  waterLog,
  onDietPreferenceChange,
  onLogProtein,
  onLogWater,
}: {
  profile: UserProfile;
  nutritionPlan: NutritionPlan | null;
  isLoading: boolean;
  proteinLog: Record<string, number>;
  waterLog: Record<string, number>;
  onDietPreferenceChange: (dietPreference: UserProfile["dietPreference"]) => void;
  onLogProtein: (grams: number) => void;
  onLogWater: (ml: number) => void;
}) {
  const plan = nutritionPlan ?? createFallbackNutritionPlan(profile);
  const dietOptions: UserProfile["dietPreference"][] = ["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"];
  const targetCalories = plan.targetCalories ?? 0;
  const protein = plan.macros?.protein ?? 0;
  const carbs = plan.macros?.carbs ?? 0;
  const fats = plan.macros?.fats ?? 0;
  const waterGoal = plan.macros?.waterLiters ?? getDailyWaterToDrinkLiters(profile);
  const todayKey = getLocalDateKey();
  const [selectedMealStyle, setSelectedMealStyle] = useState<MealStyle>("North Indian");
  const [mealRefreshIndex, setMealRefreshIndex] = useState(0);
  const waterIntake = Number(waterLog[todayKey] ?? 0);
  const proteinIntake = Number(proteinLog[todayKey] ?? 0);
  const waterIntakePercent = waterGoal ? Math.min(100, Math.round((waterIntake / waterGoal) * 100)) : 0;
  const proteinIntakePercent = protein ? Math.min(100, Math.round((proteinIntake / protein) * 100)) : 0;
  const mealStyles: MealStyle[] = ["North Indian", "South Indian", "Quick Budget"];
  const visibleMeals = getMealChoices(profile.dietPreference, selectedMealStyle);
  const mealLibrary = getMealSpotlightLibrary(profile.dietPreference, selectedMealStyle, plan);
  const meal = mealLibrary[mealRefreshIndex % mealLibrary.length];
  const proteinPercent = getMacroCalorieShare(protein, 4, targetCalories);
  const carbsPercent = getMacroCalorieShare(carbs, 4, targetCalories);
  const fatsPercent = getMacroCalorieShare(fats, 9, targetCalories);

  return (
    <section className="flex flex-1 flex-col gap-6 bg-[#0F172A] p-4 pb-24 pt-4 sm:gap-7 sm:p-5 sm:pb-28 sm:pt-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-[#CBD5E1]">Daily targets</p>
          <h1 className="mt-1 text-3xl font-black leading-tight text-white">Nutrition Guide</h1>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black leading-none text-[#B3C5FF]">{targetCalories ? targetCalories.toLocaleString("en-IN") : "--"}</p>
          <p className="mt-1 text-sm font-black text-[#CBD5E1]">kcal target</p>
        </div>
      </div>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="grid grid-cols-3 gap-3">
          <MacroRing label="Protein" percent={proteinPercent} value={`${protein || "-"}g`} tone="blue" />
          <MacroRing label="Carbs" percent={carbsPercent} value={`${carbs || "-"}g`} tone="lime" />
          <MacroRing label="Fats" percent={fatsPercent} value={`${fats || "-"}g`} tone="silver" />
        </div>
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#0066FF]/20 text-[#B3C5FF]">
            <Droplet size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white">Water Intake</h2>
            <p className="mt-1 text-xl font-black text-[#CBD5E1]">{waterIntake.toFixed(1)}L / {waterGoal.toFixed(1)}L</p>
            <ProgressBar percent={waterIntakePercent} tone="cyan" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[250, 500, 750].map((ml) => (
            <button
              className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-[#B3C5FF] px-2 text-xs font-black text-[#002B75] transition active:scale-[0.98]"
              key={ml}
              onClick={() => onLogWater(ml)}
              type="button"
            >
              <Plus size={15} />
              {ml} ml
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#F97316]/20 text-[#FB923C]">
            <Utensils size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white">Protein Log</h2>
            <p className="mt-1 text-xl font-black text-[#CBD5E1]">{proteinIntake}g / {protein || "-"}g</p>
            <ProgressBar percent={proteinIntakePercent} tone="orange" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[10, 20, 30].map((grams) => (
            <button
              className="flex min-h-11 items-center justify-center gap-1 rounded-2xl bg-[#F97316] px-2 text-xs font-black text-[#283500] transition active:scale-[0.98]"
              key={grams}
              onClick={() => onLogProtein(grams)}
              type="button"
            >
              <Plus size={15} />
              {grams} g
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Meal of the Day</h2>
          <button className="text-sm font-black text-[#B3C5FF]" disabled={isLoading} onClick={() => setMealRefreshIndex((current) => current + 1)} type="button">
            Refresh
          </button>
        </div>
        <MealHeroCard meal={meal} profile={profile} />
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black uppercase tracking-wide text-[#CBD5E1]">Diet preference</p>
          <p className="text-xs font-black text-[#ABD600]">{profile.dietPreference}</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dietOptions.map((option) => {
            const isSelected = profile.dietPreference === option;
            return (
              <button
                className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-black transition ${
                  isSelected
                    ? "border-[#0066FF] bg-[#0066FF] text-white"
                    : "border-[#424656] bg-transparent text-[#CBD5E1]"
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

      <section className="grid grid-cols-2 gap-3">
        <NutritionTipCard icon={<Flame size={25} />} title="Pre Workout" body={plan.workoutFood.before || "Banana, coffee, or light poha 45-60 minutes before training."} />
        <NutritionTipCard icon={<Utensils size={25} />} title="Post Workout" body={plan.workoutFood.after || "Protein + carbs after training, like dal/eggs/paneer with rice or roti."} />
      </section>

      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black uppercase tracking-wide text-[#CBD5E1]">Food choices</p>
          <p className="text-xs font-black text-[#ABD600]">{selectedMealStyle}</p>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {mealStyles.map((style) => {
            const isSelected = selectedMealStyle === style;
            return (
              <button
                className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-black transition ${
                  isSelected
                    ? "border-[#ABD600] bg-[#ABD600] text-[#283500]"
                    : "border-[#424656] bg-[#282A2B] text-[#CBD5E1]"
                }`}
                key={style}
                onClick={() => setSelectedMealStyle(style)}
                type="button"
              >
                {style}
              </button>
            );
          })}
        </div>
        <div className="mt-3 grid gap-3">
          {visibleMeals.map((mealItem) => (
            <div className="rounded-2xl bg-[#273449] p-3" key={mealItem.label}>
              <p className="text-xs font-black text-[#ABD600]">{mealItem.label}</p>
              <p className="mt-1 text-sm font-bold leading-6 text-white">{mealItem.value}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function getMacroCalorieShare(grams: number, caloriesPerGram: number, targetCalories: number) {
  if (!grams || !targetCalories) return 0;
  return Math.min(100, Math.max(5, Math.round(((grams * caloriesPerGram) / targetCalories) * 100)));
}

function getMealChoices(dietPreference: UserProfile["dietPreference"], style: MealStyle): NutritionMeal[] {
  const choices: Record<MealStyle, Record<UserProfile["dietPreference"], NutritionMeal[]>> = {
    "North Indian": {
      Vegetarian: [
        { label: "Breakfast", value: "Besan chilla + curd + fruit" },
        { label: "Lunch", value: "Dal/rajma/chole + rice + salad" },
        { label: "Dinner", value: "Paneer bhurji + 2 rotis + vegetables" },
        { label: "Snack", value: "Roasted chana, peanuts, or lassi" },
      ],
      "Non-vegetarian": [
        { label: "Breakfast", value: "Oats + milk + boiled eggs" },
        { label: "Lunch", value: "Chicken curry + rice/roti + salad" },
        { label: "Dinner", value: "Grilled chicken + dal + 2 rotis" },
        { label: "Snack", value: "Eggs, curd, fruit, or roasted chana" },
      ],
      Eggetarian: [
        { label: "Breakfast", value: "Egg bhurji + 2 rotis" },
        { label: "Lunch", value: "Dal + rice + curd + salad" },
        { label: "Dinner", value: "Paneer/egg curry + 2 rotis" },
        { label: "Snack", value: "Boiled eggs, fruit, or chana" },
      ],
      Vegan: [
        { label: "Breakfast", value: "Besan chilla + chutney + fruit" },
        { label: "Lunch", value: "Rajma/chole + rice + salad" },
        { label: "Dinner", value: "Soy chunks curry + 2 rotis + vegetables" },
        { label: "Snack", value: "Peanut chaat, sprouts, or soy milk" },
      ],
    },
    "South Indian": {
      Vegetarian: [
        { label: "Breakfast", value: "Idli/dosa + sambar + chutney" },
        { label: "Lunch", value: "Rice + sambar + curd + poriyal" },
        { label: "Dinner", value: "Uttapam + paneer/curd side" },
        { label: "Snack", value: "Sundal, fruit, or buttermilk" },
      ],
      "Non-vegetarian": [
        { label: "Breakfast", value: "Dosa + sambar + 2 boiled eggs" },
        { label: "Lunch", value: "Chicken curry + rice + vegetables" },
        { label: "Dinner", value: "Fish/chicken + rice + rasam" },
        { label: "Snack", value: "Eggs, sundal, or curd rice small bowl" },
      ],
      Eggetarian: [
        { label: "Breakfast", value: "Idli + sambar + egg omelette" },
        { label: "Lunch", value: "Rice + sambar + egg podimas" },
        { label: "Dinner", value: "Dosa + egg curry + vegetables" },
        { label: "Snack", value: "Boiled eggs, sundal, or fruit" },
      ],
      Vegan: [
        { label: "Breakfast", value: "Idli/dosa + sambar + chutney" },
        { label: "Lunch", value: "Rice + sambar + beans poriyal" },
        { label: "Dinner", value: "Adai dosa + chutney + vegetables" },
        { label: "Snack", value: "Sundal, sprouts, or coconut water" },
      ],
    },
    "Quick Budget": {
      Vegetarian: [
        { label: "Breakfast", value: "Oats + milk, or poha + curd" },
        { label: "Lunch", value: "Dal + rice + salad" },
        { label: "Dinner", value: "Roti + paneer/soy + vegetables" },
        { label: "Snack", value: "Banana, peanuts, chana, or curd" },
      ],
      "Non-vegetarian": [
        { label: "Breakfast", value: "Oats + milk + eggs" },
        { label: "Lunch", value: "Chicken + rice + salad" },
        { label: "Dinner", value: "Egg/chicken + roti + vegetables" },
        { label: "Snack", value: "Eggs, banana, peanuts, or curd" },
      ],
      Eggetarian: [
        { label: "Breakfast", value: "Poha + 2 boiled eggs" },
        { label: "Lunch", value: "Dal + rice + curd" },
        { label: "Dinner", value: "Egg bhurji + roti + vegetables" },
        { label: "Snack", value: "Boiled eggs, fruit, or chana" },
      ],
      Vegan: [
        { label: "Breakfast", value: "Poha, oats + soy milk, or sprouts" },
        { label: "Lunch", value: "Dal/chole + rice + salad" },
        { label: "Dinner", value: "Soy chunks + roti + vegetables" },
        { label: "Snack", value: "Peanuts, chana, fruit, or soy milk" },
      ],
    },
  };

  return choices[style][dietPreference];
}

function getYoutubeThumbnail(videoId: string) {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function getMealSpotlightLibrary(dietPreference: UserProfile["dietPreference"], style: MealStyle, plan: NutritionPlan): MealSpotlight[] {
  const fallbackSubtitle = plan.workoutFood.after || "A simple beginner meal to support training recovery.";
  const library: Record<UserProfile["dietPreference"], MealSpotlight[]> = {
    Vegetarian: [
      { title: "Paneer Bhurji Roti Plate", style: "North Indian", image: getYoutubeThumbnail("Lxfvo6p1a14"), tag: "North Indian", subtitle: "Paneer, roti, and vegetables for an easy protein-focused meal.", prepTime: "25 min", videoId: "Lxfvo6p1a14" },
      { title: "Rajma Chawal Bowl", style: "North Indian", image: getYoutubeThumbnail("uUQmob13Gx4"), tag: "Budget", subtitle: "Rajma, rice, and salad for a filling post-workout plate.", prepTime: "35 min", videoId: "uUQmob13Gx4" },
      { title: "Besan Chilla + Curd", style: "Quick Budget", image: getYoutubeThumbnail("AkmaBa3PICo"), tag: "Quick", subtitle: "A fast protein-friendly meal with ingredients most homes already have.", prepTime: "15 min", videoId: "AkmaBa3PICo" },
      { title: "Dal Chawal Bowl", style: "Quick Budget", image: getYoutubeThumbnail("AbRdwyZE-g8"), tag: "Simple", subtitle: fallbackSubtitle, prepTime: "20 min", videoId: "AbRdwyZE-g8" },
      { title: "Idli Sambar Plate", style: "South Indian", image: getYoutubeThumbnail("3lWb4qBqrms"), tag: "South Indian", subtitle: "Idli with sambar for an easy, light meal before or after training.", prepTime: "25 min", videoId: "3lWb4qBqrms" },
      { title: "Dosa Sambar Plate", style: "South Indian", image: getYoutubeThumbnail("BMVexJba64Y"), tag: "Beginner", subtitle: "Dosa, sambar, and curd when you want familiar comfort food.", prepTime: "25 min", videoId: "BMVexJba64Y" },
      { title: "Paneer Chilla Plate", style: "Quick Budget", image: getYoutubeThumbnail("ACzsQTsaZiA"), tag: "High protein", subtitle: "Paneer chilla for a light training-day meal.", prepTime: "20 min", videoId: "ACzsQTsaZiA" },
    ],
    "Non-vegetarian": [
      { title: "Tandoori Chicken Rice Bowl", style: "North Indian", image: getYoutubeThumbnail("-wRY7LvwjFI"), tag: "Post workout", subtitle: "Chicken, rice, and salad for a simple high-protein recovery meal.", prepTime: "30 min", videoId: "-wRY7LvwjFI" },
      { title: "Dhaba Chicken Curry Plate", style: "North Indian", image: getYoutubeThumbnail("Uu_koz3W48Q"), tag: "Protein", subtitle: "Chicken curry with roti and salad for a familiar high-protein meal.", prepTime: "35 min", videoId: "Uu_koz3W48Q" },
      { title: "Egg Bhurji Roti Plate", style: "North Indian", image: getYoutubeThumbnail("uzdb3Hxm2EU"), tag: "Quick", subtitle: "Egg bhurji with roti when you need a fast meal after training.", prepTime: "15 min", videoId: "uzdb3Hxm2EU" },
      { title: "Egg Dosa Plate", style: "South Indian", image: getYoutubeThumbnail("2mZdzaKTDzA"), tag: "South Indian", subtitle: "Dosa with eggs and sambar for a simple training-day meal.", prepTime: "20 min", videoId: "2mZdzaKTDzA" },
      { title: "Chicken Meal Prep Bowl", style: "Quick Budget", image: getYoutubeThumbnail("el4RuWPWZ6A"), tag: "Meal prep", subtitle: "Cook once and split into two simple protein meals.", prepTime: "30 min", videoId: "el4RuWPWZ6A" },
      { title: "Egg Curry Rice Bowl", style: "North Indian", image: getYoutubeThumbnail("xH2iedsq0qA"), tag: "Protein", subtitle: "Egg curry with rice or roti for a filling post-workout plate.", prepTime: "25 min", videoId: "xH2iedsq0qA" },
      { title: "Masala Omelette Toast", style: "Quick Budget", image: getYoutubeThumbnail("I1zuqz5DfT0"), tag: "Quick", subtitle: "Masala omelette with toast or roti for a fast protein meal.", prepTime: "12 min", videoId: "I1zuqz5DfT0" },
    ],
    Eggetarian: [
      { title: "Egg Bhurji Roti Plate", style: "North Indian", image: getYoutubeThumbnail("uzdb3Hxm2EU"), tag: "Beginner", subtitle: "Egg bhurji, roti, and salad for quick protein without heavy prep.", prepTime: "15 min", videoId: "uzdb3Hxm2EU" },
      { title: "Egg Curry Rice Bowl", style: "North Indian", image: getYoutubeThumbnail("xH2iedsq0qA"), tag: "Protein", subtitle: "Egg curry with rice or roti for a filling post-workout plate.", prepTime: "25 min", videoId: "xH2iedsq0qA" },
      { title: "Masala Omelette Toast", style: "Quick Budget", image: getYoutubeThumbnail("I1zuqz5DfT0"), tag: "Quick", subtitle: "Masala omelette with toast or roti for a fast protein meal.", prepTime: "12 min", videoId: "I1zuqz5DfT0" },
      { title: "Egg Dosa Plate", style: "South Indian", image: getYoutubeThumbnail("2mZdzaKTDzA"), tag: "South Indian", subtitle: "Egg dosa for a familiar breakfast-style protein option.", prepTime: "20 min", videoId: "2mZdzaKTDzA" },
      { title: "Poha + Boiled Eggs", style: "Quick Budget", image: getYoutubeThumbnail("h0vqeRrGMAE"), tag: "Budget", subtitle: "Poha with boiled eggs on the side for a beginner-friendly meal.", prepTime: "15 min", videoId: "h0vqeRrGMAE" },
      { title: "Boiled Egg Salad", style: "Quick Budget", image: getYoutubeThumbnail("lzJbRIFbU5U"), tag: "No fuss", subtitle: "Boiled eggs, onion, tomato, lemon, and masala for a quick snack meal.", prepTime: "10 min", videoId: "lzJbRIFbU5U" },
      { title: "Paneer Chilla Plate", style: "North Indian", image: getYoutubeThumbnail("ACzsQTsaZiA"), tag: "High protein", subtitle: "Paneer chilla for a light training-day meal.", prepTime: "20 min", videoId: "ACzsQTsaZiA" },
    ],
    Vegan: [
      { title: "Soya Chunks Curry Bowl", style: "North Indian", image: getYoutubeThumbnail("GrhRKz15UWU"), tag: "Plant protein", subtitle: "Soya chunks with rice or roti for a simple vegan protein meal.", prepTime: "25 min", videoId: "GrhRKz15UWU" },
      { title: "Chole Rice Bowl", style: "North Indian", image: getYoutubeThumbnail("bGrYqbSVs4Y"), tag: "Budget", subtitle: "Chole, rice, and salad for a filling plant-based meal.", prepTime: "30 min", videoId: "bGrYqbSVs4Y" },
      { title: "Rajma Chawal Bowl", style: "North Indian", image: getYoutubeThumbnail("uUQmob13Gx4"), tag: "Simple", subtitle: "Rajma, rice, and salad for a repeatable budget meal.", prepTime: "35 min", videoId: "uUQmob13Gx4" },
      { title: "Idli Sambar Plate", style: "South Indian", image: getYoutubeThumbnail("3lWb4qBqrms"), tag: "Vegan", subtitle: "Idli and sambar for a light plant-based meal.", prepTime: "25 min", videoId: "3lWb4qBqrms" },
      { title: "Adai Dosa Plate", style: "South Indian", image: getYoutubeThumbnail("hnW5J3kX-nk"), tag: "Protein", subtitle: "Lentil dosa with chutney and vegetables for plant protein.", prepTime: "30 min", videoId: "hnW5J3kX-nk" },
      { title: "Sprouts Chaat Bowl", style: "Quick Budget", image: getYoutubeThumbnail("paBDseb8rKg"), tag: "No-cook", subtitle: "Sprouts, peanuts, onion, tomato, lemon, and masala.", prepTime: "10 min", videoId: "paBDseb8rKg" },
      { title: "Black Chana Salad", style: "Quick Budget", image: getYoutubeThumbnail("zeMnWRpCfrw"), tag: "Budget", subtitle: "Black chana, onion, tomato, lemon, and masala for plant protein.", prepTime: "10 min", videoId: "zeMnWRpCfrw" },
    ],
  };

  const meals = library[dietPreference];
  return [...meals.filter((meal) => meal.style === style), ...meals.filter((meal) => meal.style !== style)].slice(0, 7);
}

function MacroRing({
  label,
  percent,
  tone,
  value,
}: {
  label: string;
  percent: number;
  tone: "blue" | "lime" | "silver";
  value: string;
}) {
  const color = tone === "blue" ? "#B3C5FF" : tone === "lime" ? "#ABD600" : "#E2E2E2";
  const safePercent = Math.min(100, Math.max(0, percent));

  return (
    <div className="grid justify-items-center gap-2 text-center">
      <div
        className="grid h-[86px] w-[86px] place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${safePercent * 3.6}deg, #333535 0deg)` }}
      >
        <div className="grid h-[62px] w-[62px] place-items-center rounded-full bg-[#121414]">
          <p className="text-lg font-black text-white">{safePercent}%</p>
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-[#CBD5E1]">{label}</p>
        <p className={`text-lg font-black ${tone === "lime" ? "text-[#ABD600]" : tone === "blue" ? "text-[#B3C5FF]" : "text-white"}`}>{value}</p>
      </div>
    </div>
  );
}

function MealHeroCard({
  meal,
  profile,
}: {
  meal: MealSpotlight;
  profile: UserProfile;
}) {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="grid gap-3">
      <article
        className="relative min-h-[260px] overflow-hidden rounded-3xl border border-[#334155] bg-[#111827] p-5"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(18,20,20,0.05), rgba(18,20,20,0.9)), url('${meal.image}')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute right-4 top-4 rounded-full bg-[#121414]/80 px-3 py-2 text-xs font-black text-white backdrop-blur">
          <Timer className="mr-1 inline" size={14} />
          {meal.prepTime}
        </div>
        <div className="flex min-h-[220px] flex-col justify-end">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-[#B3C5FF] bg-[#121414]/40 px-3 py-1 text-[11px] font-black uppercase text-[#B3C5FF] backdrop-blur">{meal.tag}</span>
            <span className="rounded-full border border-white/40 bg-[#121414]/40 px-3 py-1 text-[11px] font-black uppercase text-white backdrop-blur">{profile.experienceLevel}</span>
          </div>
          <h2 className="mt-4 text-2xl font-black leading-tight text-white">{meal.title}</h2>
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-6 text-[#CBD5E1]">{meal.subtitle}</p>
          <button
            className="mt-4 flex min-h-11 w-fit items-center gap-2 rounded-full bg-[#ABD600] px-4 text-sm font-black text-[#283500] transition active:scale-[0.98]"
            onClick={() => setShowVideo((current) => !current)}
            type="button"
          >
            <Play size={16} fill="currentColor" />
            {showVideo ? "Hide recipe" : "Watch recipe"}
          </button>
        </div>
      </article>
      {showVideo && (
        <div className="overflow-hidden rounded-3xl border border-[#334155] bg-[#1E293B]">
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="aspect-video w-full"
            loading="lazy"
            src={`https://www.youtube.com/embed/${meal.videoId}`}
            title={`${meal.title} recipe video`}
          />
        </div>
      )}
    </div>
  );
}

function NutritionTipCard({ body, icon, title }: { body: string; icon: React.ReactNode; title: string }) {
  return (
    <article className="min-h-[164px] rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
      <div className="text-[#ABD600]">{icon}</div>
      <h3 className="mt-8 text-lg font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#CBD5E1]">{body}</p>
    </article>
  );
}

function ProfileScreen({
  profile,
  authStatus,
  syncStatus,
  syncMessage,
  lastSyncedAt,
  userEmail,
  onManualSync,
  onPasswordAuth,
  onPasswordReset,
  onPasswordUpdate,
  onProfileUpdate,
  onSignOut,
}: {
  profile: UserProfile;
  authStatus: AuthStatus;
  syncStatus: SyncStatus;
  syncMessage: string;
  lastSyncedAt: string;
  userEmail: string;
  onManualSync: () => void;
  onPasswordAuth: (email: string, password: string, mode: AuthMode) => Promise<boolean>;
  onPasswordReset: (email: string) => Promise<boolean>;
  onPasswordUpdate: (password: string) => Promise<boolean>;
  onProfileUpdate: (profile: UserProfile) => void;
  onSignOut: () => void;
}) {
  const isSignedIn = authStatus === "signed-in";
  const isBusy = authStatus === "checking" || syncStatus === "loading" || syncStatus === "saving";
  const canUseCloudSave = authStatus !== "unconfigured";
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftProfile, setDraftProfile] = useState<UserProfile>(profile);
  const fieldErrors = getOnboardingFieldErrors(draftProfile);
  const canUpdateProfile = isValidOnboardingProfile(draftProfile);

  useEffect(() => {
    setDraftProfile(profile);
  }, [profile]);

  function updateDraftProfile<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setDraftProfile((current) => ({ ...current, [key]: value }));
  }

  function saveProfileUpdate() {
    if (!canUpdateProfile) return;
    onProfileUpdate(draftProfile);
    setIsEditingProfile(false);
  }

  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-20 pt-3 sm:gap-5 sm:p-5 sm:pt-4 sm:pb-24">
      <ScreenTitle icon={<User size={22} />} title="Profile" subtitle="Your plan is personalized from these details." />

      <div className="rounded-3xl bg-[#EAF7F6] p-4 sm:p-5">
        <p className="text-sm font-black uppercase tracking-wide text-teal-800">GymBuddy profile</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">{profile.name || "Beginner Athlete"}</h2>
        <p className="mt-2 font-bold text-slate-600">{profile.goal} | {profile.experienceLevel}</p>
        <button
          className="mt-4 min-h-11 rounded-2xl bg-[#0066FF] px-4 text-sm font-black text-white"
          onClick={() => setIsEditingProfile((current) => !current)}
          type="button"
        >
          {isEditingProfile ? "Close edit" : "Edit profile"}
        </button>
      </div>

      {isEditingProfile && (
        <div className="grid gap-4 rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              error={fieldErrors.name}
              label="Name"
              placeholder="Your name"
              value={draftProfile.name}
              onChange={(value) => updateDraftProfile("name", cleanAlphabetName(value))}
            />
            <NumberField
              error={fieldErrors.age}
              label="Age"
              max={VALUE_RULES.age.max}
              min={VALUE_RULES.age.min}
              placeholder="24"
              suffix="yrs"
              value={draftProfile.age}
              onChange={(value) => updateDraftProfile("age", value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              error={fieldErrors.height}
              label="Height"
              max={VALUE_RULES.height.max}
              min={VALUE_RULES.height.min}
              placeholder="170"
              step="0.01"
              suffix="cm"
              value={draftProfile.height}
              onChange={(value) => updateDraftProfile("height", value)}
            />
            <NumberField
              error={fieldErrors.weight}
              label="Weight"
              max={VALUE_RULES.weight.max}
              min={VALUE_RULES.weight.min}
              placeholder="70"
              step="0.01"
              suffix="kg"
              value={draftProfile.weight}
              onChange={(value) => updateDraftProfile("weight", value)}
            />
          </div>
          <SelectField label="Gender" value={draftProfile.gender} onChange={(value) => updateDraftProfile("gender", value as UserProfile["gender"])} options={["Male", "Female", "Other"]} />
          <SelectField label="Goal" value={draftProfile.goal} onChange={(value) => updateDraftProfile("goal", value as UserProfile["goal"])} options={["Lose fat", "Build strength", "Build muscle", "General fitness"]} />
          <SelectField label="Body goal" value={draftProfile.bodyGoal} onChange={(value) => updateDraftProfile("bodyGoal", value as BodyGoal)} options={["Lose weight slowly", "Maintain weight", "Gain muscle slowly"]} />
          <SelectField label="Diet" value={draftProfile.dietPreference} onChange={(value) => updateDraftProfile("dietPreference", value as UserProfile["dietPreference"])} options={["Vegetarian", "Non-vegetarian", "Eggetarian", "Vegan"]} />
          <SelectField label="Gym type" value={draftProfile.gymType} onChange={(value) => updateDraftProfile("gymType", value as UserProfile["gymType"])} options={["Basic gym", "Highly equipped gym"]} />
          <SelectField label="Days per week" value={draftProfile.daysPerWeek} onChange={(value) => updateDraftProfile("daysPerWeek", value as UserProfile["daysPerWeek"])} options={["3 days", "4 days", "5 days"]} />
          <SelectField label="Time per workout" value={draftProfile.workoutDuration} onChange={(value) => updateDraftProfile("workoutDuration", value as UserProfile["workoutDuration"])} options={["30 minutes", "45 minutes", "60 minutes"]} />
          <button
            className="min-h-12 rounded-2xl bg-[#ABD600] px-4 text-sm font-black text-[#283500] disabled:opacity-50"
            disabled={!canUpdateProfile}
            onClick={saveProfileUpdate}
            type="button"
          >
            Update profile
          </button>
        </div>
      )}

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
              {isSignedIn ? "Plan saved online" : "Save your plan"}
            </h2>
            {isSignedIn && <p className="mt-2 text-sm font-semibold leading-6 text-[#CBD5E1]">{userEmail || "Account connected"}</p>}
          </div>
        </div>

        <div className="mt-4">
          <SaveStatusRow
            canUseCloudSave={canUseCloudSave}
            isSignedIn={isSignedIn}
            message={lastSyncedAt ? `Synced ${lastSyncedAt}` : syncMessage}
            status={syncStatus}
          />
        </div>

        {isSignedIn ? (
          <div className="mt-4 grid gap-3">
            <div className="grid grid-cols-2 gap-3">
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
            <PasswordUpdateForm disabled={isBusy} onUpdate={onPasswordUpdate} />
          </div>
        ) : canUseCloudSave ? (
          <div className="mt-4 grid gap-3">
            <PasswordBackupForm disabled={isBusy} onAuth={onPasswordAuth} onResetPassword={onPasswordReset} />
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-[#0F172A] p-4">
            <SaveMiniItem icon={<CheckCircle2 size={18} />} label="Device save on" />
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
  activeTab: MainTab;
  onNavigate: (tab: MainTab) => void;
}) {
  const items = [
    { id: "home" as const, label: "Home", icon: House },
    { id: "exercise" as const, label: "Exercise", icon: Dumbbell },
    { id: "nutrition" as const, label: "Nutrition", icon: Apple },
    { id: "progress" as const, label: "Progress", icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-4 border-t border-[#334155] bg-[#0F172A]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_30px_rgba(0,0,0,0.28)] backdrop-blur sm:bottom-5 sm:rounded-b-[2rem] sm:border-x">
      {items.map((item, index) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 text-[10px] font-black sm:min-h-16 sm:gap-1 sm:text-[11px] ${index > 0 ? "border-l border-[#1E293B]" : ""} ${isActive ? "bg-[#1E293B] text-[#F97316]" : "text-[#CBD5E1]"}`}
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
  activitySummary,
  day,
  log,
  checkIn,
  setCheckIn,
  onUpdateWorkoutWeight,
  onSave,
}: {
  activitySummary: ReturnType<typeof getWorkoutActivitySummary>;
  day: DayPlan | null;
  log: DailyWorkoutLog;
  checkIn: WorkoutCheckIn;
  setCheckIn: (checkIn: WorkoutCheckIn) => void;
  onUpdateWorkoutWeight: (day: DayPlan, key: "beforeWeight" | "afterWeight", value: string) => void;
  onSave: () => void;
}) {
  return (
    <section className="flex flex-1 flex-col gap-4 p-4 pb-24 pt-3 sm:gap-5 sm:p-5 sm:pb-28 sm:pt-4">
      <ScreenTitle icon={<HeartPulse size={22} />} title="Workout Check-In" subtitle="Quick answers so next week can adjust." />
      <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
        <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">Activity summary</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <MetricTile label="Warm-up" value={formatDuration(activitySummary.warmUpSeconds)} />
          <MetricTile label="Exercise" value={formatDuration(activitySummary.workoutSeconds)} />
          <MetricTile label="Cooldown" value={formatDuration(activitySummary.coolDownSeconds)} />
          <MetricTile label="Active total" value={formatDuration(activitySummary.activeSeconds)} />
          <MetricTile label="Rest time" value={formatDuration(activitySummary.restSeconds)} />
        </div>
      </section>
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
      {day && !day.isRestDay && (
        <section className="rounded-3xl border border-[#334155] bg-[#1E293B] p-4">
          <p className="text-sm font-black uppercase tracking-wide text-[#F97316]">After workout weight</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#CBD5E1]">This updates today&apos;s calorie target.</p>
          <div className="mt-3">
            <WeightInput label="After" value={log.afterWeight} onChange={(value) => onUpdateWorkoutWeight(day, "afterWeight", value)} />
          </div>
        </section>
      )}
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
        {subtitle && <p className="mt-1 text-sm leading-5 text-slate-600 sm:text-base sm:leading-6">{subtitle}</p>}
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
  error,
  helper,
  label,
  placeholder,
  value,
  onChange,
}: {
  error?: string;
  helper?: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const message = error || helper;
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        aria-label={label}
        className={`min-h-12 rounded-2xl border bg-white px-4 font-semibold text-slate-900 outline-none focus:ring-4 ${
          error ? "border-[#EF4444] focus:border-[#EF4444] focus:ring-red-100" : "border-slate-200 focus:border-[#2F9F98] focus:ring-teal-100"
        }`}
        placeholder={placeholder}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {message && <span className={`text-xs font-bold ${error ? "text-[#EF4444]" : "text-slate-500"}`}>{message}</span>}
    </label>
  );
}

function NumberField({
  error,
  helper,
  label,
  max,
  min,
  placeholder,
  required = true,
  step = "1",
  suffix,
  value,
  onChange,
}: {
  error?: string;
  helper?: string;
  label: string;
  max?: number;
  min?: number;
  placeholder?: string;
  required?: boolean;
  step?: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const message = error || helper;
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <div
        className={`flex min-h-12 items-center rounded-2xl border bg-white px-4 focus-within:ring-4 ${
          error ? "border-[#EF4444] focus-within:border-[#EF4444] focus-within:ring-red-100" : "border-slate-200 focus-within:border-[#2F9F98] focus-within:ring-teal-100"
        }`}
      >
        <input
          aria-label={label}
          className="w-full bg-transparent font-semibold text-slate-900 outline-none"
          inputMode="decimal"
          max={max}
          min={min}
          placeholder={placeholder}
          required={required}
          step={step}
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="text-sm font-black text-slate-400">{suffix}</span>
      </div>
      {message && <span className={`text-xs font-bold leading-4 ${error ? "text-[#EF4444]" : "text-slate-500"}`}>{message}</span>}
    </label>
  );
}

export default App;

