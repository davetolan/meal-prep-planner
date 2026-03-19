import { POST } from '@/app/(frontend)/api/meal-plan/generate/route'

const request = new Request('http://localhost/api/meal-plan/generate', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    days: 4,
    people: 3,
    preferences: ['high-protein', 'budget'],
    excludedIngredients: ['lentil'],
  }),
})

const response = await POST(request)

console.log(await response.text())
