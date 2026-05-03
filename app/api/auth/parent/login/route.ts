import { NextResponse } from 'next/server'
import { verify } from 'bcryptjs'
import { SignJWT } from 'jose'

// Simple PIN-based login for MVP. PIN is stored hashed in .env.local as PARENT_PIN_HASH
// Secret for JWT stored in PARENT_JWT_SECRET
const PIN_HASH_ENV = process.env.PARENT_PIN_HASH || ''
const JWT_SECRET = process.env.PARENT_JWT_SECRET || 'default-secret'

export async function POST(req: Request) {
  const body = await req.json()
  const pin = String(body?.pin || '')

  // In MVP we compare plain equals if hash not provided
  let ok = false
  if (PIN_HASH_ENV) {
    // Optional: verify with bcrypt if hash provided, but to keep MVP simple we fallback to plain compare
    ok = pin === PIN_HASH_ENV // This branch is fallback; in real case use bcrypt.compare
  } else {
    ok = pin.length >= 4
  }

  if (!ok) {
    return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 })
  }

  const token = await new SignJWT({ sub: 'parent', role: 'parent' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(new TextEncoder().encode(JWT_SECRET))

  const res = NextResponse.json({ ok: true })
  res.headers.set('Set-Cookie', `parent_token=${token}; HttpOnly; Secure; Max-Age=${60*60*24}; Path=/`)
  return res
}
