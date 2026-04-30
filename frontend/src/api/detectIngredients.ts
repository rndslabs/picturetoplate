import type { PantrySessionRead } from '../types/session'
import { mockSession } from '../mocks/ingredientSession'

// Flip to false to hit the real backend (POST /api/detect-ingredients)
export const USE_MOCK = true

async function detectIngredientsMock(_file: File): Promise<PantrySessionRead> {
  // Simulate vision model latency
  await new Promise(resolve => setTimeout(resolve, 2000))
  return mockSession
}

export async function detectIngredients(file: File): Promise<PantrySessionRead> {
  if (USE_MOCK) return detectIngredientsMock(file)

  const form = new FormData()
  form.append('image', file)
  const res = await fetch('/api/detect-ingredients', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Detection failed: ${res.status}`)
  return res.json() as Promise<PantrySessionRead>
}
