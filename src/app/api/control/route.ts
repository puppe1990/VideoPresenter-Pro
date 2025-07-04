import { NextRequest, NextResponse } from 'next/server'

let lastCommand: string | null = null

export async function POST(req: NextRequest) {
  const { command } = await req.json()
  lastCommand = command
  return NextResponse.json({ status: 'ok' })
}

export async function GET() {
  const command = lastCommand
  lastCommand = null
  return NextResponse.json({ command })
}
