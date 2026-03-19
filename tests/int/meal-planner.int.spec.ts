import { describe, expect, it } from 'vitest'

import { generateMealPlan, type PlannerRecipeInput } from '@/utilities/mealPlanner'

const recipes: PlannerRecipeInput[] = [
  {
    id: 'chicken-rice',
    title: 'Chicken Rice Bowls',
    tags: ['high-protein', 'batch-cooking'],
    prep_time_minutes: 20,
    estimated_protein_per_serving: 42,
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
    estimated_protein_per_serving: 35,
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
    estimated_protein_per_serving: 28,
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
      targetProteinPerDay: 75,
    })

    expect(plan.days).toHaveLength(4)
    plan.days.forEach((day, index) => {
      expect(day.day).toBe(index + 1)
      expect(day.meals.map((meal) => meal.type)).toEqual(['lunch', 'dinner'])
    })
    expect(plan.prepSteps.length).toBeGreaterThan(1)
    expect(plan.groceryList.some((item) => item.ingredient === 'rice')).toBe(true)
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
      targetProteinPerDay: 70,
    })
    const secondPlan = generateMealPlan(recipes, {
      days: 5,
      exclusions: ['marinara'],
      targetProteinPerDay: 70,
    })

    expect(secondPlan).toEqual(firstPlan)
  })
})
