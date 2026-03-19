import config from '@payload-config'
import { getPayload } from 'payload'

import {
  generateMealPlan,
  type MealPlanGenerateRequest,
  type MealPlanGenerateResponse,
} from '@/utilities/mealPlanner'
import { loadPlannerRecipes } from '@/utilities/loadPlannerRecipes'

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as MealPlanGenerateRequest
    const payload = await getPayload({ config })
    const recipes = await loadPlannerRecipes(payload)
    const plan = generateMealPlan(recipes, {
      days: body.days,
      people: body.people,
      preferences: body.preferences,
      exclusions: body.excludedIngredients,
    })

    const response: MealPlanGenerateResponse = {
      selectedMeals: plan.days,
      groceryList: plan.groceryList,
      prepPlan: plan.prepSteps,
      nutritionSummary: plan.nutritionSummary,
    }

    return Response.json(response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate meal plan.'
    return Response.json({ error: message }, { status: 400 })
  }
}
