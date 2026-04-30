// Returns a flat list of ingredient name strings from Claude Vision.
// The backend field name is `file` (matches FastAPI's UploadFile parameter).
export async function detectIngredients(file: File): Promise<string[]> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/detect-ingredients', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Detection failed: ${res.status}`)
  const data = await res.json() as { ingredients: string[] }
  return data.ingredients
}
