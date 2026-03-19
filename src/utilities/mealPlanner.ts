export type GeneratedPlan = {
  days: {
    day: number
    meals: {
      type: 'breakfast' | 'lunch' | 'dinner'
      recipeId: string
      recipeTitle: string
    }[]
  }[]
  groceryList: {
    ingredient: string
    quantity?: string
    category?: string
  }[]
  prepSteps: string[]
}

export type PlannerIngredient = {
  name: string
  quantity?: string
  category?: string
}

export type PlannerRecipeInput = {
  id: string
  title: string
  ingredients: PlannerIngredient[]
  instructions?: string[]
  batch_notes?: string[]
  tags?: string[]
  prep_time_minutes?: number
  cook_time_minutes?: number
  estimated_protein_per_serving?: number
}

export type GenerateMealPlanOptions = {
  days?: number
  exclusions?: string[]
  targetProteinPerDay?: number
}

type NormalizedRecipe = {
  id: string
  title: string
  ingredients: PlannerIngredient[]
  ingredientKeys: string[]
  instructions: string[]
  batchNotes: string[]
  tags: string[]
  prepTimeMinutes: number
  cookTimeMinutes: number
  proteinPerServing: number
  batchable: boolean
  hasProtein: boolean
  hasCarb: boolean
}

type GroceryAggregate = {
  category?: string
  ingredient: string
  quantities: string[]
}

const DEFAULT_DAYS = 5
const MIN_DAYS = 3
const MAX_DAYS = 5
const DEFAULT_TARGET_PROTEIN_PER_DAY = 70

const normalizeText = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const toTitleSlug = (value: string): string => normalizeText(value).replace(/\s+/g, '-')

const dedupe = <T,>(items: T[]): T[] => Array.from(new Set(items))

function normalizeRecipe(recipe: PlannerRecipeInput): NormalizedRecipe {
  const tags = (recipe.tags ?? []).map(normalizeText)
  const ingredients = recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    name: ingredient.name.trim(),
    category: ingredient.category?.trim(),
    quantity: ingredient.quantity?.trim(),
  }))
  const categories = ingredients.map((ingredient) => normalizeText(ingredient.category ?? ''))
  const ingredientKeys = dedupe(ingredients.map((ingredient) => normalizeText(ingredient.name)).filter(Boolean))
  const batchable =
    tags.includes('batch cooking') ||
    tags.includes('batch-cooking') ||
    recipe.batch_notes !== undefined ||
    normalizeText(recipe.title).includes('bulk')

  return {
    id: recipe.id || toTitleSlug(recipe.title),
    title: recipe.title,
    ingredients,
    ingredientKeys,
    instructions: recipe.instructions ?? [],
    batchNotes: recipe.batch_notes ?? [],
    tags,
    prepTimeMinutes: recipe.prep_time_minutes ?? 0,
    cookTimeMinutes: recipe.cook_time_minutes ?? 0,
    proteinPerServing: recipe.estimated_protein_per_serving ?? 0,
    batchable,
    hasProtein: categories.includes('protein'),
    hasCarb: categories.includes('carb'),
  }
}

function matchesExclusions(recipe: NormalizedRecipe, exclusions: string[]): boolean {
  if (exclusions.length === 0) {
    return false
  }

  const haystack = [
    normalizeText(recipe.title),
    ...recipe.tags,
    ...recipe.ingredientKeys,
  ].join(' ')

  return exclusions.some((exclusion) => haystack.includes(exclusion))
}

function scoreRecipe(recipe: NormalizedRecipe): number {
  return (
    recipe.proteinPerServing * 2 +
    (recipe.batchable ? 25 : 0) +
    (recipe.hasProtein ? 15 : 0) +
    (recipe.hasCarb ? 12 : 0)
  )
}

function overlapScore(left: NormalizedRecipe, right: NormalizedRecipe): number {
  const shared = left.ingredientKeys.filter((ingredient) => right.ingredientKeys.includes(ingredient))
  return shared.length * 6
}

function buildDailyPairScore(args: {
  counts: Map<string, number>
  previousPair?: [NormalizedRecipe, NormalizedRecipe]
  selectedRecipes: NormalizedRecipe[]
  lunch: NormalizedRecipe
  dinner: NormalizedRecipe
  targetProteinPerDay: number
}): number {
  const { counts, previousPair, selectedRecipes, lunch, dinner, targetProteinPerDay } = args
  const selectedSet = new Set(selectedRecipes.flatMap((recipe) => recipe.ingredientKeys))
  const currentProtein = lunch.proteinPerServing + dinner.proteinPerServing
  const proteinDelta = Math.abs(targetProteinPerDay - currentProtein)
  const reuseScore =
    lunch.ingredientKeys.filter((ingredient) => selectedSet.has(ingredient)).length * 5 +
    dinner.ingredientKeys.filter((ingredient) => selectedSet.has(ingredient)).length * 5 +
    overlapScore(lunch, dinner)

  const repeatPenalty =
    (counts.get(lunch.id) ?? 0) * 18 +
    (counts.get(dinner.id) ?? 0) * 18 +
    (previousPair?.[0].id === lunch.id ? 14 : 0) +
    (previousPair?.[1].id === dinner.id ? 14 : 0)

  const diversityPenalty = previousPair && previousPair[0].id === lunch.id && previousPair[1].id === dinner.id ? 25 : 0

  return (
    scoreRecipe(lunch) +
    scoreRecipe(dinner) +
    reuseScore -
    repeatPenalty -
    diversityPenalty -
    proteinDelta
  )
}

function summarizeQuantities(quantities: string[]): string | undefined {
  const filtered = quantities.filter(Boolean)
  if (filtered.length === 0) {
    return undefined
  }

  const counts = filtered.reduce<Map<string, number>>((map, quantity) => {
    map.set(quantity, (map.get(quantity) ?? 0) + 1)
    return map
  }, new Map())

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([quantity, count]) => (count > 1 ? `${quantity} x${count}` : quantity))
    .join(' + ')
}

function buildGroceryList(selectedMeals: NormalizedRecipe[]): GeneratedPlan['groceryList'] {
  const aggregates = selectedMeals.reduce<Map<string, GroceryAggregate>>((map, recipe) => {
    recipe.ingredients.forEach((ingredient) => {
      const key = normalizeText(ingredient.name)
      const existing = map.get(key)

      if (existing) {
        if (ingredient.quantity) {
          existing.quantities.push(ingredient.quantity)
        }
        return
      }

      map.set(key, {
        ingredient: ingredient.name,
        category: ingredient.category,
        quantities: ingredient.quantity ? [ingredient.quantity] : [],
      })
    })

    return map
  }, new Map())

  return Array.from(aggregates.values())
    .map((item) => ({
      ingredient: item.ingredient,
      category: item.category,
      quantity: summarizeQuantities(item.quantities),
    }))
    .sort((left, right) => {
      const categoryCompare = (left.category ?? '').localeCompare(right.category ?? '')
      if (categoryCompare !== 0) {
        return categoryCompare
      }

      return left.ingredient.localeCompare(right.ingredient)
    })
}

function buildPrepSteps(selectedMeals: NormalizedRecipe[]): string[] {
  const frequency = selectedMeals.reduce<Map<string, number>>((map, recipe) => {
    map.set(recipe.id, (map.get(recipe.id) ?? 0) + 1)
    return map
  }, new Map())

  const uniqueRecipes = dedupe(selectedMeals)
    .slice()
    .sort((left, right) => {
      const frequencyCompare = (frequency.get(right.id) ?? 0) - (frequency.get(left.id) ?? 0)
      if (frequencyCompare !== 0) {
        return frequencyCompare
      }

      if (left.batchable !== right.batchable) {
        return left.batchable ? -1 : 1
      }

      return left.title.localeCompare(right.title)
    })

  const prepSteps = [
    `Cook these core recipes first: ${uniqueRecipes.map((recipe) => recipe.title).join(', ')}.`,
  ]

  uniqueRecipes.forEach((recipe) => {
    const note = recipe.batchNotes[0] ?? recipe.instructions[0]
    if (note) {
      prepSteps.push(`${recipe.title}: ${note}`)
    }
  })

  prepSteps.push('Portion the cooked food into labeled containers by day for quick grab-and-go meals.')

  return prepSteps
}

export function generateMealPlan(
  recipes: PlannerRecipeInput[],
  options: GenerateMealPlanOptions = {},
): GeneratedPlan {
  const dayCount = Math.min(MAX_DAYS, Math.max(MIN_DAYS, options.days ?? DEFAULT_DAYS))
  const exclusions = (options.exclusions ?? []).map(normalizeText).filter(Boolean)
  const targetProteinPerDay = Math.max(0, options.targetProteinPerDay ?? DEFAULT_TARGET_PROTEIN_PER_DAY)

  const normalizedRecipes = recipes
    .map(normalizeRecipe)
    .filter((recipe) => !matchesExclusions(recipe, exclusions))
    .sort((left, right) => {
      const scoreDelta = scoreRecipe(right) - scoreRecipe(left)
      if (scoreDelta !== 0) {
        return scoreDelta
      }

      return left.title.localeCompare(right.title)
    })

  if (normalizedRecipes.length < 2) {
    throw new Error('At least two eligible recipes are required to build a meal plan.')
  }

  const counts = new Map<string, number>()
  const selectedRecipes: NormalizedRecipe[] = []
  const days: GeneratedPlan['days'] = []
  let previousPair: [NormalizedRecipe, NormalizedRecipe] | undefined

  for (let day = 1; day <= dayCount; day += 1) {
    let bestPair: [NormalizedRecipe, NormalizedRecipe] | undefined
    let bestScore = Number.NEGATIVE_INFINITY

    normalizedRecipes.forEach((lunch) => {
      normalizedRecipes.forEach((dinner) => {
        if (lunch.id === dinner.id) {
          return
        }

        const pairScore = buildDailyPairScore({
          counts,
          previousPair,
          selectedRecipes,
          lunch,
          dinner,
          targetProteinPerDay,
        })

        const bestPairKey = bestPair ? `${bestPair[0].title}|${bestPair[1].title}` : ''
        const currentPairKey = `${lunch.title}|${dinner.title}`

        if (pairScore > bestScore || (pairScore === bestScore && currentPairKey < bestPairKey)) {
          bestScore = pairScore
          bestPair = [lunch, dinner]
        }
      })
    })

    if (!bestPair) {
      throw new Error('Unable to build a meal plan from the current recipe catalog.')
    }

    const [lunch, dinner] = bestPair

    counts.set(lunch.id, (counts.get(lunch.id) ?? 0) + 1)
    counts.set(dinner.id, (counts.get(dinner.id) ?? 0) + 1)
    selectedRecipes.push(lunch, dinner)
    previousPair = bestPair

    days.push({
      day,
      meals: [
        {
          type: 'lunch',
          recipeId: lunch.id,
          recipeTitle: lunch.title,
        },
        {
          type: 'dinner',
          recipeId: dinner.id,
          recipeTitle: dinner.title,
        },
      ],
    })
  }

  return {
    days,
    groceryList: buildGroceryList(selectedRecipes),
    prepSteps: buildPrepSteps(selectedRecipes),
  }
}
