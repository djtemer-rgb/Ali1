import { NextResponse } from 'next/server';

export async function GET() {
  // Check if session cookie is valid
  return NextResponse.json({ authorized: true });
}
