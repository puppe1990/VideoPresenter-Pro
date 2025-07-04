'use client'

import { useState } from 'react'

async function sendCommand(command: string) {
  await fetch('/api/control', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command })
  })
}

export default function RemotePage() {
  const [loading, setLoading] = useState(false)

  const handle = async (cmd: string) => {
    setLoading(true)
    await sendCommand(cmd)
    setLoading(false)
  }

  return (
    <div className='p-4 space-y-4 text-center'>
      <h1 className='text-xl font-semibold'>Remote Control</h1>
      <div className='flex flex-col gap-2'>
        <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={() => handle('startRecording')} disabled={loading}>Start Recording</button>
        <button className='bg-blue-600 text-white px-4 py-2 rounded' onClick={() => handle('stopRecording')} disabled={loading}>Stop Recording</button>
        <button className='bg-green-600 text-white px-4 py-2 rounded' onClick={() => handle('teleprompterPlay')} disabled={loading}>Teleprompter Play</button>
        <button className='bg-green-600 text-white px-4 py-2 rounded' onClick={() => handle('teleprompterPause')} disabled={loading}>Teleprompter Pause</button>
        <button className='bg-green-600 text-white px-4 py-2 rounded' onClick={() => handle('teleprompterUp')} disabled={loading}>Teleprompter Up</button>
        <button className='bg-green-600 text-white px-4 py-2 rounded' onClick={() => handle('teleprompterDown')} disabled={loading}>Teleprompter Down</button>
        <button className='bg-yellow-600 text-white px-4 py-2 rounded' onClick={() => handle('toggleTeleprompter')} disabled={loading}>Toggle Teleprompter</button>
      </div>
    </div>
  )
}

