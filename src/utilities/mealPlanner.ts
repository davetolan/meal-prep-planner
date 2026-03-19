export type GeneratedPlan = {
  days: {
    day: number
    meals: {
      type: 'breakfast' | 'lunch' | 'dinner'
      recipeId: string
      recipeTitle: string
      nutrition: NutritionTotals
    }[]
    nutrition: NutritionTotals
  }[]
  groceryList: {
    ingredient: string
    quantity?: string
    category?: string
  }[]
  prepSteps: string[]
  nutritionSummary: {
    total: NutritionTotals
    averagePerDay: NutritionTotals
  }
}

export type NutritionTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type PlannerIngredient = {
  name: string
  quantity?: string
  category?: string
}

export type PlannerRecipeInput = {
  id: string
  title: string
  description?: string
  servings?: number
  ingredients: PlannerIngredient[]
  instructions?: string[]
  storage?: {
    fridge_days?: number
    freezer_days?: number
    reheat_instructions?: string
  }
  batch_notes?: string[]
  tags?: string[]
  meal_variations?: string[]
  prep_time_minutes?: number
  cook_time_minutes?: number
  calories_per_serving: number
  protein_per_serving: number
  carbs_per_serving?: number
  fat_per_serving?: number
}

export type GenerateMealPlanOptions = {
  days?: number
  people?: number
  preferences?: string[]
  exclusions?: string[]
  targetProteinPerDay?: number
  recipeCount?: number
}

export type MealPlanGenerateRequest = {
  days?: number
  people?: number
  preferences?: string[]
  excludedIngredients?: string[]
  recipeCount?: number
}

export type MealPlanGenerateResponse = {
  selectedMeals: GeneratedPlan['days']
  groceryList: GeneratedPlan['groceryList']
  prepPlan: string[]
  nutritionSummary: GeneratedPlan['nutritionSummary']
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
  servings: number
  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number
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
const MIN_RECIPE_COUNT = 2
const MAX_RECIPE_COUNT = 3

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
    servings: recipe.servings ?? 1,
    caloriesPerServing: recipe.calories_per_serving,
    proteinPerServing: recipe.protein_per_serving,
    carbsPerServing: recipe.carbs_per_serving ?? 0,
    fatPerServing: recipe.fat_per_serving ?? 0,
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

function scoreRecipe(recipe: NormalizedRecipe, preferences: string[]): number {
  const preferenceScore = preferences.reduce((score, preference) => {
    if (recipe.tags.includes(preference) || normalizeText(recipe.title).includes(preference)) {
      return score + 20
    }

    return score
  }, 0)

  return (
    recipe.proteinPerServing * 2 +
    (recipe.batchable ? 25 : 0) +
    (recipe.hasProtein ? 15 : 0) +
    (recipe.hasCarb ? 12 : 0) +
    preferenceScore
  )
}

function overlapScore(left: NormalizedRecipe, right: NormalizedRecipe): number {
  const shared = left.ingredientKeys.filter((ingredient) => right.ingredientKeys.includes(ingredient))
  return shared.length * 6
}

function getDefaultRecipeCount(dayCount: number): number {
  return dayCount >= 5 ? 3 : 2
}

function getRecipeCount(dayCount: number, requestedRecipeCount?: number): number {
  const defaultRecipeCount = getDefaultRecipeCount(dayCount)

  if (requestedRecipeCount === undefined || Number.isNaN(requestedRecipeCount)) {
    return defaultRecipeCount
  }

  return Math.min(MAX_RECIPE_COUNT, Math.max(MIN_RECIPE_COUNT, Math.round(requestedRecipeCount)))
}

function buildDailyPairScore(args: {
  counts: Map<string, number>
  previousPair?: [NormalizedRecipe, NormalizedRecipe]
  selectedRecipes: NormalizedRecipe[]
  lunch: NormalizedRecipe
  dinner: NormalizedRecipe
  preferences: string[]
  targetProteinPerDay: number
}): number {
  const { counts, previousPair, selectedRecipes, lunch, dinner, preferences, targetProteinPerDay } = args
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
    scoreRecipe(lunch, preferences) +
    scoreRecipe(dinner, preferences) +
    reuseScore -
    repeatPenalty -
    diversityPenalty -
    proteinDelta
  )
}

function buildRecipePoolScore(recipes: NormalizedRecipe[], preferences: string[], targetProteinPerDay: number): number {
  const recipeScore = recipes.reduce((total, recipe) => total + scoreRecipe(recipe, preferences), 0)
  const reuseScore = recipes.reduce((total, recipe, index) => {
    const overlapTotal = recipes
      .slice(index + 1)
      .reduce((pairTotal, otherRecipe) => pairTotal + overlapScore(recipe, otherRecipe), 0)

    return total + overlapTotal
  }, 0)
  const proteinDeltas = recipes.reduce((total, recipe, index) => {
    const pairProteinDelta = recipes
      .slice(index + 1)
      .reduce((pairTotal, otherRecipe) => {
        return pairTotal + Math.abs(targetProteinPerDay - (recipe.proteinPerServing + otherRecipe.proteinPerServing))
      }, 0)

    return total + pairProteinDelta
  }, 0)

  return recipeScore + reuseScore - proteinDeltas
}

function selectRecipePool(args: {
  recipes: NormalizedRecipe[]
  recipeCount: number
  preferences: string[]
  targetProteinPerDay: number
}): NormalizedRecipe[] {
  const { recipes, recipeCount, preferences, targetProteinPerDay } = args
  let bestPool: NormalizedRecipe[] | undefined
  let bestScore = Number.NEGATIVE_INFINITY

  function visit(startIndex: number, pool: NormalizedRecipe[]) {
    if (pool.length === recipeCount) {
      const poolScore = buildRecipePoolScore(pool, preferences, targetProteinPerDay)
      const bestPoolKey = bestPool?.map((recipe) => recipe.title).join('|') ?? ''
      const currentPoolKey = pool.map((recipe) => recipe.title).join('|')

      if (poolScore > bestScore || (poolScore === bestScore && currentPoolKey < bestPoolKey)) {
        bestScore = poolScore
        bestPool = [...pool]
      }
      return
    }

    const remainingSlots = recipeCount - pool.length
    for (let index = startIndex; index <= recipes.length - remainingSlots; index += 1) {
      pool.push(recipes[index]!)
      visit(index + 1, pool)
      pool.pop()
    }
  }

  visit(0, [])

  if (!bestPool) {
    throw new Error('Unable to select recipes for the meal plan.')
  }

  return bestPool
}

function getBatchCount(recipe: NormalizedRecipe, people: number): number {
  return Math.max(1, Math.ceil(people / Math.max(1, recipe.servings)))
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

function buildGroceryList(selectedMeals: NormalizedRecipe[], people: number): GeneratedPlan['groceryList'] {
  const aggregates = selectedMeals.reduce<Map<string, GroceryAggregate>>((map, recipe) => {
    const batchCount = getBatchCount(recipe, people)

    recipe.ingredients.forEach((ingredient) => {
      const key = normalizeText(ingredient.name)
      const existing = map.get(key)
      const repeatedQuantities = ingredient.quantity ? Array.from({ length: batchCount }, () => ingredient.quantity as string) : []

      if (existing) {
        existing.quantities.push(...repeatedQuantities)
        return
      }

      map.set(key, {
        ingredient: ingredient.name,
        category: ingredient.category,
        quantities: repeatedQuantities,
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

function roundNutrition(value: number): number {
  return Math.round(value * 10) / 10
}

function getRecipeNutrition(recipe: NormalizedRecipe): NutritionTotals {
  return {
    calories: roundNutrition(recipe.caloriesPerServing),
    protein: roundNutrition(recipe.proteinPerServing),
    carbs: roundNutrition(recipe.carbsPerServing),
    fat: roundNutrition(recipe.fatPerServing),
  }
}

function addNutrition(left: NutritionTotals, right: NutritionTotals): NutritionTotals {
  return {
    calories: roundNutrition(left.calories + right.calories),
    protein: roundNutrition(left.protein + right.protein),
    carbs: roundNutrition(left.carbs + right.carbs),
    fat: roundNutrition(left.fat + right.fat),
  }
}

function divideNutrition(totals: NutritionTotals, divisor: number): NutritionTotals {
  return {
    calories: roundNutrition(totals.calories / divisor),
    protein: roundNutrition(totals.protein / divisor),
    carbs: roundNutrition(totals.carbs / divisor),
    fat: roundNutrition(totals.fat / divisor),
  }
}

function buildPrepSteps(selectedMeals: NormalizedRecipe[], people: number): string[] {
  const frequency = selectedMeals.reduce<Map<string, number>>((map, recipe) => {
    map.set(recipe.id, (map.get(recipe.id) ?? 0) + getBatchCount(recipe, people))
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
      prepSteps.push(`${recipe.title} (${frequency.get(recipe.id) ?? 1} batch${(frequency.get(recipe.id) ?? 1) === 1 ? '' : 'es'}): ${note}`)
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
  const people = Math.max(1, options.people ?? 1)
  const preferences = (options.preferences ?? []).map(normalizeText).filter(Boolean)
  const exclusions = (options.exclusions ?? []).map(normalizeText).filter(Boolean)
  const targetProteinPerDay = Math.max(0, options.targetProteinPerDay ?? DEFAULT_TARGET_PROTEIN_PER_DAY)
  const recipeCount = getRecipeCount(dayCount, options.recipeCount)

  const normalizedRecipes = recipes
    .map(normalizeRecipe)
    .filter((recipe) => !matchesExclusions(recipe, exclusions))
    .sort((left, right) => {
      const scoreDelta = scoreRecipe(right, preferences) - scoreRecipe(left, preferences)
      if (scoreDelta !== 0) {
        return scoreDelta
      }

      return left.title.localeCompare(right.title)
    })

  if (normalizedRecipes.length < MIN_RECIPE_COUNT) {
    throw new Error('At least two eligible recipes are required to build a meal plan.')
  }

  if (normalizedRecipes.length < recipeCount) {
    throw new Error(`At least ${recipeCount} eligible recipes are required to build this meal plan.`)
  }

  const recipePool = selectRecipePool({
    recipes: normalizedRecipes,
    recipeCount,
    preferences,
    targetProteinPerDay,
  })

  const counts = new Map<string, number>()
  const selectedRecipes: NormalizedRecipe[] = []
  const days: GeneratedPlan['days'] = []
  let previousPair: [NormalizedRecipe, NormalizedRecipe] | undefined

  for (let day = 1; day <= dayCount; day += 1) {
    let bestPair: [NormalizedRecipe, NormalizedRecipe] | undefined
    let bestScore = Number.NEGATIVE_INFINITY

    recipePool.forEach((lunch) => {
      recipePool.forEach((dinner) => {
        if (lunch.id === dinner.id) {
          return
        }

        const pairScore = buildDailyPairScore({
          counts,
          previousPair,
          selectedRecipes,
          lunch,
          dinner,
          preferences,
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
    const lunchNutrition = getRecipeNutrition(lunch)
    const dinnerNutrition = getRecipeNutrition(dinner)
    const dayNutrition = addNutrition(lunchNutrition, dinnerNutrition)

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
          nutrition: lunchNutrition,
        },
        {
          type: 'dinner',
          recipeId: dinner.id,
          recipeTitle: dinner.title,
          nutrition: dinnerNutrition,
        },
      ],
      nutrition: dayNutrition,
    })
  }

  const totalNutrition = days.reduce<NutritionTotals>(
    (totals, day) => addNutrition(totals, day.nutrition),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return {
    days,
    groceryList: buildGroceryList(selectedRecipes, people),
    prepSteps: buildPrepSteps(selectedRecipes, people),
    nutritionSummary: {
      total: totalNutrition,
      averagePerDay: divideNutrition(totalNutrition, days.length),
    },
  }
}
