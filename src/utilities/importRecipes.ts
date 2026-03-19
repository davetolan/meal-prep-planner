import type { Payload, PayloadRequest } from 'payload'

import { loadRecipeCatalog } from './loadRecipes'

type ImportRecipesResult = {
  created: number
  total: number
  updated: number
}

function isBatchable(tags?: string[], batchNotes?: string[]): boolean {
  const normalizedTags = (tags ?? []).map((tag) => tag.toLowerCase())
  return (
    normalizedTags.includes('batch-cooking') ||
    normalizedTags.includes('batch cooking') ||
    (batchNotes?.length ?? 0) > 0
  )
}

function buildRecipeData(recipe: Awaited<ReturnType<typeof loadRecipeCatalog>>[number]) {
  return {
    sourceId: recipe.id,
    name: recipe.title,
    description: recipe.description,
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      category: ingredient.category,
    })),
    tags: (recipe.tags ?? []).map((tag) => ({ tag })),
    prepTime: recipe.prep_time_minutes,
    cookTime: recipe.cook_time_minutes,
    batchable: isBatchable(recipe.tags, recipe.batch_notes),
    instructions: (recipe.instructions ?? []).map((step) => ({ step })),
    storage: recipe.storage
      ? {
          fridgeDays: recipe.storage.fridge_days,
          freezerDays: recipe.storage.freezer_days,
          reheatInstructions: recipe.storage.reheat_instructions,
        }
      : undefined,
    batchNotes: (recipe.batch_notes ?? []).map((note) => ({ note })),
    mealVariations: (recipe.meal_variations ?? []).map((variation) => ({ variation })),
    caloriesPerServing: recipe.calories_per_serving,
    proteinPerServing: recipe.protein_per_serving,
    carbsPerServing: recipe.carbs_per_serving,
    fatPerServing: recipe.fat_per_serving,
  }
}

export async function importRecipes({
  payload,
  req,
}: {
  payload: Payload
  req?: PayloadRequest
}): Promise<ImportRecipesResult> {
  const recipes = await loadRecipeCatalog()
  let created = 0
  let updated = 0

  for (const recipe of recipes) {
    const accessArgs = req
      ? {
          overrideAccess: false as const,
          req,
          user: req.user,
        }
      : {}

    const existing = await payload.find({
      collection: 'recipes',
      depth: 0,
      limit: 1,
      where: {
        sourceId: {
          equals: recipe.id,
        },
      },
      ...accessArgs,
    })

    const data = buildRecipeData(recipe)
    const existingRecipe = existing.docs[0]

    if (existingRecipe) {
      await payload.update({
        collection: 'recipes',
        id: existingRecipe.id,
        data,
        depth: 0,
        ...accessArgs,
      })
      updated += 1
      continue
    }

    await payload.create({
      collection: 'recipes',
      data,
      depth: 0,
      ...accessArgs,
    })
    created += 1
  }

  return {
    created,
    total: recipes.length,
    updated,
  }
}
