import { NextResponse } from 'next/server'
import { getJson, setJson } from '../../upstash'

type ChildProfile = {
  id: 'ali'|'said'
  name: string
  mode: 'full'|'little-hero'
  avatarLetter: string
  favoriteHeroes: string[]
  createdAt: string
  updatedAt: string
}

export async function GET() {
  // Try to load Ali profile; if not present seed a minimal default
  let ali = await getJson('aq:child:ali:profile') as ChildProfile | null
  let said = await getJson('aq:child:said:profile') as ChildProfile | null
  const now = new Date().toISOString()
  if (!ali) {
    ali = {
      id: 'ali',
      name: 'Али',
      mode: 'full',
      avatarLetter: 'A',
      favoriteHeroes: ['Ronaldo','Muhammad Ali'],
      createdAt: now,
      updatedAt: now
    }
    await setJson('aq:child:ali:profile', ali)
  }
  if (!said) {
    said = {
      id: 'said',
      name: 'Саид',
      mode: 'little-hero',
      avatarLetter: 'S',
      favoriteHeroes: ['Neymar'],
      createdAt: now,
      updatedAt: now
    }
    await setJson('aq:child:said:profile', said)
  }

  return NextResponse.json({ ali, said })
}
