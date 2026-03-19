import { generateMealPlan } from '@/utilities/mealPlanner'
import { loadRecipeCatalog } from '@/utilities/loadRecipes'

type PlannerRequestBody = {
  days?: number
  exclusions?: string[]
  targetProteinPerDay?: number
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as PlannerRequestBody
    const recipes = await loadRecipeCatalog()
    const plan = generateMealPlan(recipes, {
      days: body.days,
      exclusions: body.exclusions,
      targetProteinPerDay: body.targetProteinPerDay,
    })

    return Response.json(plan)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate meal plan.'
    return Response.json({ error: message }, { status: 400 })
  }
}
