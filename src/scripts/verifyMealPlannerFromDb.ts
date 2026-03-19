import { getPayload } from 'payload'
import config from '@payload-config'

import { loadPlannerRecipes } from '@/utilities/loadPlannerRecipes'
import { generateMealPlan } from '@/utilities/mealPlanner'

const payload = await getPayload({ config })

try {
  const recipes = await loadPlannerRecipes(payload)
  const plan = generateMealPlan(recipes, {
    days: 4,
    targetProteinPerDay: 80,
  })

  console.log(JSON.stringify(plan, null, 2))
} finally {
  await payload.destroy()
}
