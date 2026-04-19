import { NextRequest, NextResponse } from 'next/server'
import { score } from '@/lib/scorecard'
import { altman } from '@/lib/altman'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, retail, corporate } = body

    if (mode === 'retail') {
      if (!retail) return NextResponse.json({ error: 'Missing retail input' }, { status: 400 })
      return NextResponse.json({ mode: 'retail', result: score(retail) })
    }

    if (mode === 'corporate') {
      if (!corporate) return NextResponse.json({ error: 'Missing corporate input' }, { status: 400 })
      return NextResponse.json({ mode: 'corporate', result: altman(corporate) })
    }

    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
