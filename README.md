# Meal Prep Planner (Fitness-First)

A web application that generates **multi-day meal prep plans optimized for calories, macros, and minimal cooking effort**.

This project focuses on helping users:
- Hit daily calorie and protein targets
- Reduce cooking time through batch recipes
- Minimize recipe variety (cook once, eat multiple times)
- Generate simple grocery lists and prep instructions

---

## 🚀 MVP Focus

This is a **fitness-first meal prep planner**, not a general recipe app.

Core idea:

> Generate a multi-day plan using 1–3 batch recipes that meets calorie and protein goals with minimal cooking.

---

## ✨ Features (MVP)

- Generate meal plans for 2–7 days
- User-defined:
  - Calories per day
  - Protein target
  - Meals per day
  - Number of distinct recipes (1–3)
- Batch cooking optimization
- Reuse meals across days
- Grocery list aggregation
- Prep instructions (cook once, reuse)
- Per-meal and per-day macro calculations

---

## 🧠 How It Works

### 1. Recipes as Building Blocks

Each recipe contains:
- Servings per batch
- Calories per serving
- Protein / carbs / fat per serving
- Batch-friendly flag

---

### 2. Plan Generation

The system:
1. Selects 1–3 recipes
2. Distributes servings across days/meals
3. Attempts to match calorie + protein targets
4. Minimizes cooking complexity

---

### 3. Output

- Daily meal plan
- Total macros per day
- Grocery list (deduplicated)
- Prep plan

---

## 🏗️ Tech Stack

- **Frontend:** Next.js (App Router)
- **Backend:** API routes / server actions
- **CMS:** Payload CMS
- **Database:** Postgres (Docker locally, Neon optional)
- **Language:** TypeScript

---

## 🐳 Local Development (Postgres via Docker)

```bash
docker run -d \
  --name meal-prep-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=meal-prep-planner \
  -p 5432:5432 \
  -v meal-prep-data:/var/lib/postgresql/data \
  postgres:16
  Connection string:

postgres://postgres:postgres@127.0.0.1:5432/meal-prep-planner

📦 Project Structure (Suggested)
src/
  app/
    api/
      meal-plan/
        generate/
          route.ts
  lib/
    generateMealPlan.ts
    calculateNutrition.ts
  scripts/
    seedRecipes.ts
  types/
    recipe.ts
    plan.ts
📊 Core Data Models
Recipe
type Recipe = {
  id: string
  title: string
  servings: number

  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number

  ingredients: Ingredient[]
  batchFriendly: boolean
  tags: string[]
}
Plan Request
type PlanRequest = {
  days: number
  mealsPerDay: number

  calorieTarget: number
  proteinTarget: number

  distinctRecipes: number // 1–3 recommended

  exclusions?: string[]
}
Generated Plan
type GeneratedPlan = {
  days: {
    day: number
    meals: {
      recipeId: string
      servings: number
    }[]
  }[]

  totals: {
    caloriesPerDay: number[]
    proteinPerDay: number[]
  }

  groceryList: Ingredient[]
  prepSteps: string[]
}
⚙️ Core Functions
generateMealPlan()

Responsible for:

Selecting recipes

Assigning meals per day

Reusing recipes efficiently

calculateNutrition()

Responsible for:

Calculating per-meal macros

Aggregating daily totals

🧪 Development Roadmap
Phase 1 (MVP)

 Seed 10–20 recipes

 Implement generateMealPlan

 Calculate calories + protein

 Basic UI (form + results)

Phase 2

 Improve macro matching

 Better grocery list grouping

 Prep plan generation

Phase 3

 AI-assisted recipe generation

 Save/share plans

 Export to PDF

Phase 4

 Family mode (separate logic)

 Budget optimization

 Grocery store integrations

🎯 Design Principles

Cook once, eat multiple times

Minimize decision fatigue

Consistency over variety

Macros are guidance, not perfection

Keep it simple

❌ Non-Goals (for MVP)

Perfect macro optimization

Complex dietary engines

Social features

Advanced UI polish

🧠 Key Insight

Most meal planners optimize for variety.
This project optimizes for:

Efficiency + consistency + macro awareness
🛠️ Getting Started
pnpm install
pnpm dev

Seed recipes:

pnpm tsx src/scripts/seedRecipes.ts
📌 Future Direction

Macro ranges (instead of exact targets)

Smart recipe scoring (protein density, cost, prep time)

Weekly auto-planning

Mobile-first UX

License

MIT
