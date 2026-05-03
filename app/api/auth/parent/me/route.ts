import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.PARENT_JWT_SECRET || 'default-secret'

export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie') || ''
  const tokenMatch = /parent_token=([^;]+)/.exec(cookieHeader)
  const token = tokenMatch?.[1]
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(JWT_SECRET), { algorithms: ['HS256'] })
    return NextResponse.json({ authenticated: true, user: payload?.sub ?? 'parent' })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
