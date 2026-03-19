import type { Payload } from 'payload'

import type { Recipe } from '@/payload-types'

import type { PlannerRecipeInput } from './mealPlanner'

function mapRecipeToPlannerInput(recipe: Recipe): PlannerRecipeInput {
  return {
    id: recipe.sourceId,
    title: recipe.name,
    description: recipe.description ?? undefined,
    servings: recipe.servings ?? undefined,
    ingredients: (recipe.ingredients ?? []).map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity ?? undefined,
      category: ingredient.category ?? undefined,
    })),
    instructions: (recipe.instructions ?? []).map((instruction) => instruction.step),
    storage: recipe.storage
      ? {
          fridge_days: recipe.storage.fridgeDays ?? undefined,
          freezer_days: recipe.storage.freezerDays ?? undefined,
          reheat_instructions: recipe.storage.reheatInstructions ?? undefined,
        }
      : undefined,
    batch_notes: (recipe.batchNotes ?? []).map((note) => note.note),
    tags: (recipe.tags ?? []).map((tag) => tag.tag),
    meal_variations: (recipe.mealVariations ?? []).map((variation) => variation.variation),
    prep_time_minutes: recipe.prepTime ?? undefined,
    cook_time_minutes: recipe.cookTime ?? undefined,
    calories_per_serving: recipe.caloriesPerServing ?? undefined,
    protein_per_serving: recipe.proteinPerServing ?? undefined,
    carbs_per_serving: recipe.carbsPerServing ?? undefined,
    fat_per_serving: recipe.fatPerServing ?? undefined,
  }
}

export async function loadPlannerRecipes(payload: Payload): Promise<PlannerRecipeInput[]> {
  const result = await payload.find({
    collection: 'recipes',
    depth: 0,
    limit: 100,
    pagination: false,
    sort: 'name',
  })

  return result.docs.map(mapRecipeToPlannerInput)
}
