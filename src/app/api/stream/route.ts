import { NextRequest, NextResponse } from 'next/server'
import { startStream, pushChunk, stopStream } from '@/lib/streamManager'

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || 'chunk'
  const id = req.nextUrl.searchParams.get('id') || 'default'

  if (action === 'start') {
    const { rtmpUrl } = await req.json()
    try {
      startStream(id, rtmpUrl)
      return NextResponse.json({ status: 'started' })
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  }

  if (action === 'stop') {
    stopStream(id)
    return NextResponse.json({ status: 'stopped' })
  }

  const data = await req.arrayBuffer()
  pushChunk(id, Buffer.from(data))
  return NextResponse.json({ status: 'chunk' })
}
