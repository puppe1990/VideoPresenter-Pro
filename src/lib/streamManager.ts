import ffmpegPath from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

interface Session {
  command: ffmpeg.FfmpegCommand
  stdin: NodeJS.WritableStream
}

const sessions: Record<string, Session> = {}

export function startStream(id: string, rtmpUrl: string) {
  if (sessions[id]) throw new Error('Stream already active')

  const command = ffmpeg()
    .addInput('pipe:0')
    .inputFormat('webm')
    .outputOptions(['-c:v copy', '-c:a aac'])
    .format('flv')
    .output(rtmpUrl)

  if (ffmpegPath) {
    command.setFfmpegPath(ffmpegPath as string)
  }

  const proc = command.run()
  sessions[id] = { command, stdin: proc.stdin }
}

export function pushChunk(id: string, chunk: Buffer) {
  const session = sessions[id]
  if (!session) return
  session.stdin.write(chunk)
}

export function stopStream(id: string) {
  const session = sessions[id]
  if (!session) return
  session.stdin.end()
  session.command.kill('SIGINT')
  delete sessions[id]
}
