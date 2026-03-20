import config from '@payload-config'
import { getPayload } from 'payload'

import { generateMealPlan } from '@/utilities/mealPlanner'
import { loadPlannerRecipes } from '@/utilities/loadPlannerRecipes'

type SearchParams = Promise<{
  days?: string
  people?: string
  calorieTarget?: string
  proteinTarget?: string
  preferences?: string | string[]
  excludedIngredients?: string
}>

function toArray(value: string | string[] | undefined): string[] {
  if (!value) {
    return []
  }

  return Array.isArray(value) ? value : [value]
}

function parseExcludedIngredients(value?: string): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function MealPlanResultsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const payload = await getPayload({ config })
  const recipes = await loadPlannerRecipes(payload)
  const plan = generateMealPlan(recipes, {
    days: Number(params.days) || 4,
    people: Number(params.people) || 2,
    calorieTarget: parseNumber(params.calorieTarget),
    proteinTarget: parseNumber(params.proteinTarget),
    preferences: toArray(params.preferences),
    exclusions: parseExcludedIngredients(params.excludedIngredients),
  })
  const calorieDelta = plan.nutritionSummary.averageDelta?.calories
  const proteinDelta = plan.nutritionSummary.averageDelta?.protein

  return (
    <main className="container py-12">
      <h1 className="mb-6 text-3xl font-semibold">Meal Plan Results</h1>

      <p className="mb-8">
        <a className="underline" href="/meal-plan">
          Back to form
        </a>
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Nutrition Summary</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded border p-4">
            <h3 className="mb-2 text-lg font-semibold">Average Per Day</h3>
            <ul className="list-disc pl-6">
              <li>Calories: {plan.nutritionSummary.averagePerDay.calories}</li>
              <li>Protein: {plan.nutritionSummary.averagePerDay.protein}g</li>
              <li>Carbs: {plan.nutritionSummary.averagePerDay.carbs}g</li>
              <li>Fat: {plan.nutritionSummary.averagePerDay.fat}g</li>
              {plan.nutritionSummary.targets?.calories ? (
                <li>
                  Calorie target delta: {calorieDelta && calorieDelta > 0 ? '+' : ''}
                  {calorieDelta}
                </li>
              ) : null}
              {plan.nutritionSummary.targets?.protein ? (
                <li>
                  Protein target delta: {proteinDelta && proteinDelta > 0 ? '+' : ''}
                  {proteinDelta}g
                </li>
              ) : null}
            </ul>
          </div>

          <div className="rounded border p-4">
            <h3 className="mb-2 text-lg font-semibold">Plan Total</h3>
            <ul className="list-disc pl-6">
              <li>Calories: {plan.nutritionSummary.total.calories}</li>
              <li>Protein: {plan.nutritionSummary.total.protein}g</li>
              <li>Carbs: {plan.nutritionSummary.total.carbs}g</li>
              <li>Fat: {plan.nutritionSummary.total.fat}g</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Daily Meal Plan</h2>
        <div className="space-y-4">
          {plan.days.map((day) => (
            <div key={day.day} className="rounded border p-4">
              <h3 className="mb-2 text-lg font-semibold">Day {day.day}</h3>
              <ul className="list-disc pl-6">
                {day.meals.map((meal) => (
                  <li key={`${day.day}-${meal.type}`}>
                    {meal.type}: {meal.recipeTitle} ({meal.servings} serving{meal.servings === 1 ? '' : 's'},{' '}
                    {meal.nutrition.calories} cal, {meal.nutrition.protein}g protein)
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Day total: {day.nutrition.calories} cal, {day.nutrition.protein}g protein,{' '}
                {day.nutrition.carbs}g carbs, {day.nutrition.fat}g fat
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Grocery List</h2>
        <ul className="list-disc pl-6">
          {plan.groceryList.map((item) => (
            <li key={`${item.category ?? 'uncategorized'}-${item.ingredient}`}>
              {item.ingredient}
              {item.quantity ? ` - ${item.quantity}` : ''}
              {item.category ? ` (${item.category})` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-semibold">Prep Steps</h2>
        <ol className="list-decimal pl-6">
          {plan.prepSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  )
}
