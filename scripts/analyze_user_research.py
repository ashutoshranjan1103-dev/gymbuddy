import json
import re
from collections import Counter
from pathlib import Path

import pandas as pd


SOURCE = Path(r"C:\Users\ashut\Downloads\GymBuddy User Research (Responses).xlsx")
OUT_DIR = Path(r"C:\Users\ashut\OneDrive\Documents\Gym Buddy\tmp\research_analysis")
OUT_JSON = OUT_DIR / "gymbuddy_research_analysis.json"


COLS = {
    "timestamp": "Timestamp",
    "name": "Name",
    "age": "Age",
    "status": "Which best describes you?",
    "gym_type": "What type of gym do you use?",
    "duration": "How long have you been going?",
    "days_last_week": "How many days did you go last week?",
    "clarity": "When you enter the gym, do you know exactly what to do?",
    "problem": "Biggest problem inside the gym?",
    "busy_action": "What do you do when equipment is busy?",
    "skipped": "Have you skipped exercises because you didn’t know how to do them?",
    "plan": "Do you follow a workout plan?",
    "ai_trust": "Would you trust an AI weekly gym plan?",
    "useful": "What would make a gym app useful?",
    "hardest": "Hardest part of staying consistent at gym?",
    "contact": "Can I contact you to test GymBuddy?",
}


def pct(n, total):
    return round(n / total, 4) if total else 0


def normalize_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def count_series(df, col):
    counts = df[col].fillna("(blank)").astype(str).str.strip().value_counts()
    total = len(df)
    return [
        {"label": label, "count": int(count), "percent": pct(int(count), total)}
        for label, count in counts.items()
    ]


def split_multi_select(series):
    counter = Counter()
    for value in series.dropna():
        parts = [part.strip() for part in str(value).split(",") if part.strip()]
        counter.update(parts)
    total = len(series)
    return [
        {"label": label, "count": count, "percent_of_respondents": pct(count, total)}
        for label, count in counter.most_common()
    ]


def theme_hardest(text):
    t = text.lower()
    if any(word in t for word in ["motivation", "mood", "discipline", "lazy", "laziness", "procrastination"]):
        return "Motivation / discipline"
    if any(word in t for word in ["work", "shift", "energy", "tired"]):
        return "Time / energy after work"
    if any(word in t for word in ["start", "showing up", "reaching", "wake", "morning"]):
        return "Showing up / starting"
    if any(word in t for word in ["clarity", "fitness related", "soreness", "issue"]):
        return "Knowledge / discomfort"
    if any(word in t for word in ["distance", "weather"]):
        return "Access / environment"
    if any(word in t for word in ["weight", "wait gaining"]):
        return "Progress anxiety"
    if t in ["not any", "none", "nothing"]:
        return "No major barrier"
    return "Other"


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_excel(SOURCE)
    df = df.rename(columns={v: k for k, v in COLS.items()})
    for col in df.columns:
        if col != "timestamp":
            df[col] = df[col].map(normalize_text)

    total = len(df)
    budget_adjacent = df["gym_type"].isin(["Budget/local gym", "Housing society gym", "College/office gym"]).sum()
    active_or_recent = df["status"].isin(["Currently go to gym", "Recently joined gym"]).sum()
    not_active = df["days_last_week"].isin(["0", "1"]).sum()
    lacks_clarity = df["clarity"].isin(["Somewhat", "I decide randomly", "I copy others/ask someone", "I feel confused"]).sum()
    skipped_uncertain = df["skipped"].isin(["Many times", "Sometimes"]).sum()
    ai_positive = df["ai_trust"].isin(["Yes, if simple", "Yes, if demo videos included"]).sum()
    ai_open = df["ai_trust"].isin(["Yes, if simple", "Yes, if demo videos included", "Maybe, if safety warnings included"]).sum()
    testers = (df["contact"] == "Yes").sum()

    hardest_themes = Counter(theme_hardest(v) for v in df["hardest"].fillna(""))

    multi_useful = split_multi_select(df["useful"])
    top_features = multi_useful[:6]
    top_problems = count_series(df, "problem")

    insights = [
        {
            "title": "The biggest pain is practical gym execution, not motivation alone.",
            "evidence": f"{top_problems[0]['label']} is the top stated gym problem ({top_problems[0]['count']}/{total}), followed by form, exercise choice, and sets/reps uncertainty.",
            "product_decision": "Make GymBuddy's primary screen a Today's Workout checklist with exact exercise, sets, reps, weight guidance, and demo help.",
        },
        {
            "title": "Users are open to AI, but only when it feels simple, visual, and safe.",
            "evidence": f"{ai_open}/{total} respondents are open to an AI weekly plan; {ai_positive}/{total} explicitly trust it if simple or supported by demo videos.",
            "product_decision": "Position AI as a plan generator and weekly adapter, not as an unrestricted trainer chat.",
        },
        {
            "title": "The MVP should focus on substitutes and confidence loops.",
            "evidence": f"{skipped_uncertain}/{total} users have skipped exercises because they did not know how to do them, and equipment availability is the top problem.",
            "product_decision": "Every exercise should include one demo link, one machine-busy alternative, and a low-friction Done/Skipped check-in.",
        },
    ]

    quotes = [
        q
        for q in df["hardest"].fillna("").astype(str).str.strip().tolist()
        if q and q.lower() not in ["nan"]
    ]

    workbook_data = {
        "source_file": str(SOURCE),
        "total_responses": total,
        "kpis": [
            {"metric": "Total responses", "value": total, "display": str(total)},
            {"metric": "Budget-adjacent users", "value": int(budget_adjacent), "display": f"{budget_adjacent}/{total} ({budget_adjacent/total:.0%})"},
            {"metric": "0-1 gym days last week", "value": int(not_active), "display": f"{not_active}/{total} ({not_active/total:.0%})"},
            {"metric": "Lack full in-gym clarity", "value": int(lacks_clarity), "display": f"{lacks_clarity}/{total} ({lacks_clarity/total:.0%})"},
            {"metric": "Skipped due to uncertainty", "value": int(skipped_uncertain), "display": f"{skipped_uncertain}/{total} ({skipped_uncertain/total:.0%})"},
            {"metric": "Open to AI plan", "value": int(ai_open), "display": f"{ai_open}/{total} ({ai_open/total:.0%})"},
            {"metric": "Prototype testers", "value": int(testers), "display": f"{testers}/{total} ({testers/total:.0%})"},
        ],
        "tables": {
            "status": count_series(df, "status"),
            "gym_type": count_series(df, "gym_type"),
            "duration": count_series(df, "duration"),
            "days_last_week": count_series(df, "days_last_week"),
            "clarity": count_series(df, "clarity"),
            "problem": top_problems,
            "busy_action": count_series(df, "busy_action"),
            "skipped": count_series(df, "skipped"),
            "plan": count_series(df, "plan"),
            "ai_trust": count_series(df, "ai_trust"),
            "useful_features": multi_useful,
            "hardest_themes": [
                {"label": label, "count": count, "percent": pct(count, total)}
                for label, count in hardest_themes.most_common()
            ],
        },
        "insights": insights,
        "quotes": quotes,
        "raw_rows": df.astype(str).replace("NaT", "").to_dict(orient="records"),
    }

    OUT_JSON.write_text(json.dumps(workbook_data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(OUT_JSON)


if __name__ == "__main__":
    main()
