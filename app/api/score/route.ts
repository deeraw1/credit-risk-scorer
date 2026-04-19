import { NextRequest, NextResponse } from 'next/server'
import { altman } from '@/lib/altman'

export async function POST(req: NextRequest) {
  try {
    const { corporate } = await req.json()
    if (!corporate) return NextResponse.json({ error: 'Missing corporate input' }, { status: 400 })
    return NextResponse.json({ result: altman(corporate) })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
