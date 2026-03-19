import config from '@payload-config'
import { getPayload } from 'payload'

import { generateMealPlan } from '@/utilities/mealPlanner'
import { loadPlannerRecipes } from '@/utilities/loadPlannerRecipes'

type SearchParams = Promise<{
  days?: string
  people?: string
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
    preferences: toArray(params.preferences),
    exclusions: parseExcludedIngredients(params.excludedIngredients),
  })

  return (
    <main className="container py-12">
      <h1 className="mb-6 text-3xl font-semibold">Meal Plan Results</h1>

      <p className="mb-8">
        <a className="underline" href="/meal-plan">
          Back to form
        </a>
      </p>

      <section className="mb-10">
        <h2 className="mb-3 text-2xl font-semibold">Daily Meal Plan</h2>
        <div className="space-y-4">
          {plan.days.map((day) => (
            <div key={day.day} className="rounded border p-4">
              <h3 className="mb-2 text-lg font-semibold">Day {day.day}</h3>
              <ul className="list-disc pl-6">
                {day.meals.map((meal) => (
                  <li key={`${day.day}-${meal.type}`}>
                    {meal.type}: {meal.recipeTitle}
                  </li>
                ))}
              </ul>
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
