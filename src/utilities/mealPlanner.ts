export type GeneratedPlan = {
  days: {
    day: number
    meals: {
      type: 'breakfast' | 'lunch' | 'dinner'
      recipeId: string
      recipeTitle: string
      servings: number
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
    targets?: {
      calories?: number
      protein?: number
    }
    averageDelta?: {
      calories?: number
      protein?: number
    }
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
  recipeCount?: number
  calorieTarget?: number
  proteinTarget?: number
}

export type MealPlanGenerateRequest = {
  days?: number
  people?: number
  preferences?: string[]
  excludedIngredients?: string[]
  recipeCount?: number
  calorieTarget?: number
  proteinTarget?: number
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

type MacroTargets = {
  calories?: number
  protein?: number
}

type MealAssignment = {
  type: 'lunch' | 'dinner'
  recipe: NormalizedRecipe
  servings: number
  nutrition: NutritionTotals
}

type DayTemplate = {
  meals: MealAssignment[]
  nutrition: NutritionTotals
  score: number
}

const DEFAULT_DAYS = 5
const MIN_DAYS = 3
const MAX_DAYS = 5
const MIN_RECIPE_COUNT = 2
const MAX_RECIPE_COUNT = 3
const SERVING_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

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

function getMacroTargets(options: GenerateMealPlanOptions): MacroTargets {
  const calories =
    typeof options.calorieTarget === 'number' && Number.isFinite(options.calorieTarget) && options.calorieTarget > 0
      ? options.calorieTarget
      : undefined
  const protein =
    typeof options.proteinTarget === 'number' && Number.isFinite(options.proteinTarget) && options.proteinTarget > 0
      ? options.proteinTarget
      : undefined

  return {
    calories,
    protein,
  }
}

function hasMacroTargets(targets: MacroTargets): boolean {
  return targets.calories !== undefined || targets.protein !== undefined
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

function buildRecipePoolScore(recipes: NormalizedRecipe[], preferences: string[]): number {
  const recipeScore = recipes.reduce((total, recipe) => total + scoreRecipe(recipe, preferences), 0)
  const reuseScore = recipes.reduce((total, recipe, index) => {
    const overlapTotal = recipes
      .slice(index + 1)
      .reduce((pairTotal, otherRecipe) => pairTotal + overlapScore(recipe, otherRecipe), 0)

    return total + overlapTotal
  }, 0)

  return recipeScore + reuseScore
}

function scoreNutritionAgainstTargets(nutrition: NutritionTotals, targets: MacroTargets): number {
  if (!hasMacroTargets(targets)) {
    return 0
  }

  let penalty = 0

  if (targets.calories) {
    penalty += (Math.abs(nutrition.calories - targets.calories) / targets.calories) * 120
  }

  if (targets.protein) {
    const proteinGap = Math.abs(nutrition.protein - targets.protein) / targets.protein
    const underProteinGap = Math.max(0, targets.protein - nutrition.protein) / targets.protein
    penalty += proteinGap * 160
    penalty += underProteinGap * 80
  }

  return -penalty
}

function multiplyNutrition(nutrition: NutritionTotals, multiplier: number): NutritionTotals {
  return {
    calories: roundNutrition(nutrition.calories * multiplier),
    protein: roundNutrition(nutrition.protein * multiplier),
    carbs: roundNutrition(nutrition.carbs * multiplier),
    fat: roundNutrition(nutrition.fat * multiplier),
  }
}

function buildDayTemplate(recipePool: NormalizedRecipe[], targets: MacroTargets): DayTemplate {
  let bestTemplate: DayTemplate | undefined

  for (const lunchRecipe of recipePool) {
    for (const dinnerRecipe of recipePool) {
      for (const lunchServings of SERVING_OPTIONS) {
        for (const dinnerServings of SERVING_OPTIONS) {
          const meals: MealAssignment[] = [
            {
              type: 'lunch',
              recipe: lunchRecipe,
              servings: lunchServings,
              nutrition: multiplyNutrition(getRecipeNutrition(lunchRecipe), lunchServings),
            },
            {
              type: 'dinner',
              recipe: dinnerRecipe,
              servings: dinnerServings,
              nutrition: multiplyNutrition(getRecipeNutrition(dinnerRecipe), dinnerServings),
            },
          ]
          const nutrition = meals.reduce<NutritionTotals>(
            (totals, meal) => addNutrition(totals, meal.nutrition),
            { calories: 0, protein: 0, carbs: 0, fat: 0 },
          )

          let score = scoreNutritionAgainstTargets(nutrition, targets)

          if (lunchRecipe.id !== dinnerRecipe.id) {
            score += 8
          }

          if (lunchRecipe.batchable) {
            score += 4
          }

          if (dinnerRecipe.batchable) {
            score += 4
          }

          if (
            !bestTemplate ||
            score > bestTemplate.score ||
            (score === bestTemplate.score &&
              `${lunchRecipe.title}|${lunchServings}|${dinnerRecipe.title}|${dinnerServings}` <
                `${bestTemplate.meals[0]?.recipe.title}|${bestTemplate.meals[0]?.servings}|${bestTemplate.meals[1]?.recipe.title}|${bestTemplate.meals[1]?.servings}`)
          ) {
            bestTemplate = {
              meals,
              nutrition,
              score,
            }
          }
        }
      }
    }
  }

  if (!bestTemplate) {
    throw new Error('Unable to build a meal template for this recipe pool.')
  }

  return bestTemplate
}

function selectRecipePool(args: {
  recipes: NormalizedRecipe[]
  recipeCount: number
  preferences: string[]
  targets: MacroTargets
}): NormalizedRecipe[] {
  const { recipes, recipeCount, preferences, targets } = args
  let bestPool: NormalizedRecipe[] | undefined
  let bestScore = Number.NEGATIVE_INFINITY

  function visit(startIndex: number, pool: NormalizedRecipe[]) {
    if (pool.length === recipeCount) {
      const poolScore =
        buildRecipePoolScore(pool, preferences) +
        buildDayTemplate(pool, targets).score * 3
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

function buildRotatingMealAssignments(recipePool: NormalizedRecipe[], dayCount: number): GeneratedPlan['days'] {
  return Array.from({ length: dayCount }, (_, index) => {
    const lunch = recipePool[index % recipePool.length]!
    const dinner = recipePool[(index + 1) % recipePool.length]!
    const lunchNutrition = getRecipeNutrition(lunch)
    const dinnerNutrition = getRecipeNutrition(dinner)

    return {
      day: index + 1,
      meals: [
        {
          type: 'lunch',
          recipeId: lunch.id,
          recipeTitle: lunch.title,
          servings: 1,
          nutrition: lunchNutrition,
        },
        {
          type: 'dinner',
          recipeId: dinner.id,
          recipeTitle: dinner.title,
          servings: 1,
          nutrition: dinnerNutrition,
        },
      ],
      nutrition: addNutrition(lunchNutrition, dinnerNutrition),
    }
  })
}

function buildTargetedMealAssignments(
  recipePool: NormalizedRecipe[],
  dayCount: number,
  targets: MacroTargets,
): GeneratedPlan['days'] {
  const templates = recipePool
    .flatMap((anchorRecipe) => {
      const baseTemplate = buildDayTemplate(
        [
          anchorRecipe,
          ...recipePool.filter((recipe) => recipe.id !== anchorRecipe.id),
        ],
        targets,
      )

      return {
        ...baseTemplate,
        score:
          baseTemplate.score +
          baseTemplate.meals.reduce((total, meal) => {
            return total + (meal.recipe.id === anchorRecipe.id ? 3 : 0)
          }, 0),
      }
    })
    .sort((left, right) => right.score - left.score)

  const recipeUsage = new Map<string, number>()
  let previousTemplateKey = ''

  return Array.from({ length: dayCount }, (_, index) => {
    let bestTemplate = templates[0]!
    let bestAdjustedScore = Number.NEGATIVE_INFINITY

    for (const template of templates) {
      const templateKey = template.meals
        .map((meal) => `${meal.recipe.id}:${meal.servings}:${meal.type}`)
        .join('|')
      const usagePenalty = template.meals.reduce((total, meal) => {
        return total + (recipeUsage.get(meal.recipe.id) ?? 0) * 1.5
      }, 0)
      const repeatPenalty = templateKey === previousTemplateKey ? 6 : 0
      const adjustedScore = template.score - usagePenalty - repeatPenalty

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore
        bestTemplate = template
      }
    }

    previousTemplateKey = bestTemplate.meals
      .map((meal) => `${meal.recipe.id}:${meal.servings}:${meal.type}`)
      .join('|')

    bestTemplate.meals.forEach((meal) => {
      recipeUsage.set(meal.recipe.id, (recipeUsage.get(meal.recipe.id) ?? 0) + 1)
    })

    return {
      day: index + 1,
      meals: bestTemplate.meals.map((meal) => ({
        type: meal.type,
        recipeId: meal.recipe.id,
        recipeTitle: meal.recipe.title,
        servings: meal.servings,
        nutrition: meal.nutrition,
      })),
      nutrition: bestTemplate.nutrition,
    }
  })
}

function getBatchCount(recipe: NormalizedRecipe, people: number, totalAssignedServings: number): number {
  return Math.max(1, Math.ceil((people * totalAssignedServings) / Math.max(1, recipe.servings)))
}

function parseNumericAmount(value: string): number | undefined {
  const trimmed = value.trim()

  if (/^\d+\/\d+$/.test(trimmed)) {
    const [numerator, denominator] = trimmed.split('/').map(Number)
    if (!denominator) {
      return undefined
    }

    return numerator / denominator
  }

  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatNumericAmount(value: number): string {
  if (Number.isInteger(value)) {
    return String(value)
  }

  return value.toFixed(2).replace(/\.?0+$/, '')
}

function multiplyQuantity(quantity: string, count: number): string {
  const match = quantity.match(/^(\d+(?:\.\d+)?|\d+\s+\d+\/\d+|\d+\/\d+)(.*)$/)
  if (!match) {
    return count > 1 ? `${quantity} x${count}` : quantity
  }

  const [, rawAmount, remainder] = match
  const normalizedAmount = rawAmount.includes(' ')
    ? rawAmount
        .split(/\s+/)
        .map((part) => parseNumericAmount(part))
        .reduce<number | undefined>((total, part) => {
          if (part === undefined) {
            return undefined
          }

          return (total ?? 0) + part
        }, undefined)
    : parseNumericAmount(rawAmount)

  if (normalizedAmount === undefined) {
    return count > 1 ? `${quantity} x${count}` : quantity
  }

  return `${formatNumericAmount(normalizedAmount * count)}${remainder}`
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
    .map(([quantity, count]) => multiplyQuantity(quantity, count))
    .join(' + ')
}

function getRecipeAssignments(days: GeneratedPlan['days'], recipePool: NormalizedRecipe[]) {
  return days.flatMap((day) =>
    day.meals.map((meal) => ({
      recipe: recipePool.find((recipe) => recipe.id === meal.recipeId)!,
      servings: meal.servings,
    })),
  )
}

function summarizeRecipeUsage(days: GeneratedPlan['days'], recipePool: NormalizedRecipe[]) {
  return getRecipeAssignments(days, recipePool).reduce<Map<string, { recipe: NormalizedRecipe; servings: number }>>(
    (map, assignment) => {
      const existing = map.get(assignment.recipe.id)
      if (existing) {
        existing.servings += assignment.servings
        return map
      }

      map.set(assignment.recipe.id, {
        recipe: assignment.recipe,
        servings: assignment.servings,
      })

      return map
    },
    new Map(),
  )
}

function buildGroceryList(
  recipeUsage: Map<string, { recipe: NormalizedRecipe; servings: number }>,
  people: number,
): GeneratedPlan['groceryList'] {
  const aggregates = Array.from(recipeUsage.values()).reduce<Map<string, GroceryAggregate>>((map, usage) => {
    const batchCount = getBatchCount(usage.recipe, people, usage.servings)

    usage.recipe.ingredients.forEach((ingredient) => {
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

function buildPrepSteps(
  recipeUsage: Map<string, { recipe: NormalizedRecipe; servings: number }>,
  people: number,
): string[] {
  const frequency = Array.from(recipeUsage.values()).reduce<Map<string, number>>((map, usage) => {
    map.set(usage.recipe.id, getBatchCount(usage.recipe, people, usage.servings))
    return map
  }, new Map())

  const uniqueRecipes = Array.from(recipeUsage.values())
    .map((usage) => usage.recipe)
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
  const recipeCount = getRecipeCount(dayCount, options.recipeCount)
  const targets = getMacroTargets(options)

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
    targets,
  })
  const days = hasMacroTargets(targets)
    ? buildTargetedMealAssignments(recipePool, dayCount, targets)
    : buildRotatingMealAssignments(recipePool, dayCount)
  const recipeUsage = summarizeRecipeUsage(days, recipePool)

  const totalNutrition = days.reduce<NutritionTotals>(
    (totals, day) => addNutrition(totals, day.nutrition),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return {
    days,
    groceryList: buildGroceryList(recipeUsage, people),
    prepSteps: buildPrepSteps(recipeUsage, people),
    nutritionSummary: {
      total: totalNutrition,
      averagePerDay: divideNutrition(totalNutrition, days.length),
      ...(hasMacroTargets(targets)
        ? {
            targets,
            averageDelta: {
              calories: targets.calories
                ? roundNutrition(divideNutrition(totalNutrition, days.length).calories - targets.calories)
                : undefined,
              protein: targets.protein
                ? roundNutrition(divideNutrition(totalNutrition, days.length).protein - targets.protein)
                : undefined,
            },
          }
        : {}),
    },
  }
}
