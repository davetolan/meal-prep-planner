const goalOptions = [
  { label: 'High protein', value: 'high-protein' },
  { label: 'Budget', value: 'budget' },
  { label: 'Kid friendly', value: 'kid-friendly' },
  { label: 'Batch cooking', value: 'batch-cooking' },
]

export default function MealPlanPage() {
  return (
    <main className="container py-12">
      <h1 className="mb-6 text-3xl font-semibold">Meal Planner</h1>

      <form action="/meal-plan/results" className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="days">
            Number of days
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            defaultValue={4}
            id="days"
            max={5}
            min={3}
            name="days"
            type="number"
          />
          <p className="text-sm text-muted-foreground">
            Plans currently reuse 2-3 core recipes to keep prep simple and batch-friendly.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="people">
            Number of people
          </label>
          <input
            className="w-full rounded border px-3 py-2"
            defaultValue={2}
            id="people"
            min={1}
            name="people"
            type="number"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="calorieTarget">
              Daily calorie target
            </label>
            <input
              className="w-full rounded border px-3 py-2"
              defaultValue={2200}
              id="calorieTarget"
              min={1}
              name="calorieTarget"
              step="any"
              type="number"
            />
            <p className="text-sm text-muted-foreground">
              Optional. The planner will adjust portions to get closer to this average per day.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="proteinTarget">
              Daily protein target
            </label>
            <input
              className="w-full rounded border px-3 py-2"
              defaultValue={180}
              id="proteinTarget"
              min={1}
              name="proteinTarget"
              step="any"
              type="number"
            />
            <p className="text-sm text-muted-foreground">
              Optional. Higher protein targets will bias toward larger portions of higher-protein meals.
            </p>
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Goals</legend>
          {goalOptions.map((goal) => (
            <label key={goal.value} className="flex items-center gap-2">
              <input name="preferences" type="checkbox" value={goal.value} />
              <span>{goal.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="excludedIngredients">
            Ingredient exclusions
          </label>
          <textarea
            className="min-h-32 w-full rounded border px-3 py-2"
            id="excludedIngredients"
            name="excludedIngredients"
            placeholder="Example: lentil, pork, mushroom"
          />
          <p className="text-sm text-muted-foreground">Comma-separated ingredients or terms.</p>
        </div>

        <button className="rounded border px-4 py-2" type="submit">
          Generate meal plan
        </button>
      </form>
    </main>
  )
}
