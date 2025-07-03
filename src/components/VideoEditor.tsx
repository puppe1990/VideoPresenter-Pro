'use client'

import { useState } from 'react'
import ffmpeg from 'ffmpeg.js'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

interface VideoEditorProps {
  videoUrl: string
  onClose: () => void
  onSave: (blob: Blob) => void
}

export default function VideoEditor({ videoUrl, onClose, onSave }: VideoEditorProps) {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropW, setCropW] = useState(640)
  const [cropH, setCropH] = useState(360)
  const [text, setText] = useState('')
  const [processing, setProcessing] = useState(false)

  const applyEdits = async () => {
    setProcessing(true)
    try {
      const blob = await fetch(videoUrl).then(r => r.blob())
      const buffer = await blob.arrayBuffer()
      const args: string[] = []
      if (start > 0) args.push('-ss', String(start))
      if (end > start) args.push('-to', String(end))
      args.push('-i', 'input.webm')
      const filters: string[] = []
      if (cropW && cropH) {
        filters.push(`crop=${cropW}:${cropH}:${cropX}:${cropY}`)
      }
      if (text) {
        filters.push(
          `drawtext=text='${text}':x=10:y=H-th-10:fontcolor=white:fontsize=24`
        )
      }
      if (filters.length) {
        args.push('-vf', filters.join(','))
      }
      args.push('-c:v', 'libvpx', '-c:a', 'copy', 'output.webm')
      const result = ffmpeg({
        MEMFS: [{ name: 'input.webm', data: new Uint8Array(buffer) }],
        arguments: args,
      })
      const output = result.MEMFS[0]
      onSave(new Blob([output.data], { type: 'video/webm' }))
    } catch (error) {
      console.error('Failed to edit video', error)
      alert('Video editing failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-50'>
      <div className='bg-background p-4 rounded-md w-[420px] space-y-4'>
        <video src={videoUrl} controls className='w-full rounded' />
        <div className='grid grid-cols-2 gap-2 text-sm'>
          <div>
            <Label htmlFor='start'>Trim Start (s)</Label>
            <input
              id='start'
              type='number'
              value={start}
              onChange={e => setStart(parseFloat(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div>
            <Label htmlFor='end'>Trim End (s)</Label>
            <input
              id='end'
              type='number'
              value={end}
              onChange={e => setEnd(parseFloat(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div>
            <Label htmlFor='cropx'>Crop X</Label>
            <input
              id='cropx'
              type='number'
              value={cropX}
              onChange={e => setCropX(parseInt(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div>
            <Label htmlFor='cropy'>Crop Y</Label>
            <input
              id='cropy'
              type='number'
              value={cropY}
              onChange={e => setCropY(parseInt(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div>
            <Label htmlFor='cropw'>Width</Label>
            <input
              id='cropw'
              type='number'
              value={cropW}
              onChange={e => setCropW(parseInt(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div>
            <Label htmlFor='croph'>Height</Label>
            <input
              id='croph'
              type='number'
              value={cropH}
              onChange={e => setCropH(parseInt(e.target.value))}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
          <div className='col-span-2'>
            <Label htmlFor='txt'>Overlay Text</Label>
            <input
              id='txt'
              type='text'
              value={text}
              onChange={e => setText(e.target.value)}
              className='w-full border px-2 py-1 rounded'
            />
          </div>
        </div>
        <div className='flex justify-end gap-2'>
          <Button onClick={onClose} variant='outline'>Cancel</Button>
          <Button onClick={applyEdits} disabled={processing}>
            {processing ? 'Processing...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  )
}
