import { describe, expect, it } from 'vitest'

import { generateMealPlan, type PlannerRecipeInput } from '@/utilities/mealPlanner'

const recipes: PlannerRecipeInput[] = [
  {
    id: 'chicken-rice',
    title: 'Chicken Rice Bowls',
    tags: ['high-protein', 'batch-cooking'],
    prep_time_minutes: 20,
    calories_per_serving: 510,
    protein_per_serving: 42,
    carbs_per_serving: 40,
    fat_per_serving: 14,
    ingredients: [
      { name: 'chicken breast', quantity: '2 lb', category: 'protein' },
      { name: 'rice', quantity: '2 cups', category: 'carb' },
      { name: 'onion', quantity: '1', category: 'vegetable' },
    ],
    instructions: ['Cook chicken and rice.'],
    batch_notes: ['Cook the full batch and portion it for the week.'],
  },
  {
    id: 'turkey-rice',
    title: 'Turkey Rice Skillet',
    tags: ['high-protein', 'batch-cooking'],
    prep_time_minutes: 15,
    calories_per_serving: 430,
    protein_per_serving: 35,
    carbs_per_serving: 34,
    fat_per_serving: 15,
    ingredients: [
      { name: 'ground turkey', quantity: '2 lb', category: 'protein' },
      { name: 'rice', quantity: '2 cups', category: 'carb' },
      { name: 'onion', quantity: '1', category: 'vegetable' },
    ],
    instructions: ['Cook turkey and rice.'],
    batch_notes: ['Prep turkey and rice at the same time.'],
  },
  {
    id: 'beef-pasta',
    title: 'Beef Pasta',
    tags: ['high-protein'],
    prep_time_minutes: 25,
    calories_per_serving: 540,
    protein_per_serving: 28,
    carbs_per_serving: 48,
    fat_per_serving: 21,
    ingredients: [
      { name: 'ground beef', quantity: '2 lb', category: 'protein' },
      { name: 'pasta', quantity: '1 lb', category: 'carb' },
      { name: 'marinara', quantity: '1 jar', category: 'pantry' },
    ],
    instructions: ['Cook pasta and sauce.'],
  },
]

describe('generateMealPlan', () => {
  it('creates a deterministic 3-5 day plan with lunch and dinner meals', () => {
    const plan = generateMealPlan(recipes, {
      days: 4,
    })

    expect(plan.days).toHaveLength(4)
    plan.days.forEach((day, index) => {
      expect(day.day).toBe(index + 1)
      expect(day.meals.map((meal) => meal.type)).toEqual(['lunch', 'dinner'])
      expect(day.nutrition.calories).toBeGreaterThan(0)
      expect(day.nutrition.protein).toBeGreaterThan(0)
    })
    expect(plan.days.map((day) => day.meals.map((meal) => meal.recipeId))).toEqual([
      ['chicken-rice', 'turkey-rice'],
      ['turkey-rice', 'chicken-rice'],
      ['chicken-rice', 'turkey-rice'],
      ['turkey-rice', 'chicken-rice'],
    ])
    expect(plan.prepSteps.length).toBeGreaterThan(1)
    expect(plan.groceryList.some((item) => item.ingredient === 'rice')).toBe(true)
    expect(plan.nutritionSummary.averagePerDay.calories).toBeGreaterThan(0)
  })

  it('respects exclusions', () => {
    const plan = generateMealPlan(recipes, {
      days: 3,
      exclusions: ['beef'],
    })

    const recipeIds = plan.days.flatMap((day) => day.meals.map((meal) => meal.recipeId))
    expect(recipeIds).not.toContain('beef-pasta')
  })

  it('returns the same plan for the same input', () => {
    const firstPlan = generateMealPlan(recipes, {
      days: 5,
      exclusions: ['marinara'],
      recipeCount: 2,
    })
    const secondPlan = generateMealPlan(recipes, {
      days: 5,
      exclusions: ['marinara'],
      recipeCount: 2,
    })

    expect(secondPlan).toEqual(firstPlan)
  })

  it('multiplies repeated grocery quantities into a single total', () => {
    const plan = generateMealPlan(recipes, {
      days: 4,
      exclusions: ['beef'],
    })

    const rice = plan.groceryList.find((item) => item.ingredient === 'rice')
    expect(rice?.quantity).toBe('16 cups')
    expect(rice?.quantity).not.toContain('x')
  })
})
