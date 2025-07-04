'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'

interface Props {
  peerId: string | null
  connectToPeer: (id: string) => void
}

export default function CollaborationPanel({ peerId, connectToPeer }: Props) {
  const [remoteId, setRemoteId] = useState('')

  return (
    <Card className='w-72'>
      <CardHeader>
        <CardTitle>Collaboration</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        <div>
          <div className='text-xs text-muted-foreground mb-1'>Your ID</div>
          <div className='text-sm break-all'>{peerId ?? 'Connecting...'}</div>
        </div>
        <div>
          <div className='text-xs text-muted-foreground mb-1'>Connect to ID</div>
          <Input value={remoteId} onChange={e => setRemoteId(e.target.value)} />
        </div>
      </CardContent>
      <CardFooter className='justify-end'>
        <Button size='sm' onClick={() => connectToPeer(remoteId)} disabled={!remoteId}>Connect</Button>
      </CardFooter>
    </Card>
  )
}
