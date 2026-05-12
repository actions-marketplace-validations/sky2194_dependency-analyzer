const API_SECRET = import.meta.env.VITE_API_SECRET || ''

export async function signRequest(body) {
  if (!API_SECRET) return ''
  
  const bodyStr = JSON.stringify(body)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(API_SECRET), 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr))
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0')).join('')
}
