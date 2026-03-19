import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import type { PlannerRecipeInput } from './mealPlanner'

type RawRecipe = Omit<PlannerRecipeInput, 'id'> | Array<Omit<PlannerRecipeInput, 'id'>>

function slugFromFilename(filename: string): string {
  return filename.replace(/\.json$/i, '')
}

export async function loadRecipeCatalog(): Promise<PlannerRecipeInput[]> {
  const recipesDir = path.join(process.cwd(), 'recipes')
  const entries = await readdir(recipesDir)
  const recipeFiles = entries.filter((entry) => entry.endsWith('.json')).sort()
  const recipes: PlannerRecipeInput[] = []

  for (const filename of recipeFiles) {
    const filePath = path.join(recipesDir, filename)
    const fileContents = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(fileContents) as RawRecipe

    if (Array.isArray(parsed)) {
      parsed.forEach((recipe) => {
        recipes.push({
          ...recipe,
          id: recipe.title ? recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : slugFromFilename(filename),
        })
      })
      continue
    }

    recipes.push({
      ...parsed,
      id: slugFromFilename(filename),
    })
  }

  return recipes
}
