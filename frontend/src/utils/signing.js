const API_SECRET = import.meta.env.VITE_API_SECRET || ''

export async function signRequest(body) {
  if (!API_SECRET) return '' // Skip if no secret configured
  
  const bodyStr = JSON.stringify(body)
  const encoder = new TextEncoder()
  const data = encoder.encode(API_SECRET + bodyStr)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
