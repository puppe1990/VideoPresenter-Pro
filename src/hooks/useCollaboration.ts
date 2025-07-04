import { useEffect, useRef, useState } from 'react'
import Peer, { MediaConnection } from 'peerjs'

export interface RemoteParticipant {
  id: string
  stream: MediaStream
}

export function useCollaboration() {
  const [peerId, setPeerId] = useState<string | null>(null)
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([])
  const peerRef = useRef<Peer | null>(null)
  const connectionsRef = useRef<Record<string, MediaConnection>>({})
  const localStreamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    const peer = new Peer({
      host: process.env.NEXT_PUBLIC_PEERJS_HOST || '0.peerjs.com',
      secure: true,
      path: '/'
    })
    peerRef.current = peer

    peer.on('open', id => {
      setPeerId(id)
    })

    peer.on('call', call => {
      if (!localStreamRef.current) return
      call.answer(localStreamRef.current)
      call.on('stream', remoteStream => {
        setRemoteParticipants(prev => [...prev, { id: call.peer, stream: remoteStream }])
        connectionsRef.current[call.peer] = call
      })
    })

    return () => {
      peer.destroy()
    }
  }, [])

  const registerLocalStream = (stream: MediaStream) => {
    localStreamRef.current = stream
  }

  const connectToPeer = (id: string) => {
    if (!peerRef.current || !localStreamRef.current) return
    const call = peerRef.current.call(id, localStreamRef.current)
    if (!call) return
    connectionsRef.current[id] = call
    call.on('stream', remoteStream => {
      setRemoteParticipants(prev => [...prev, { id, stream: remoteStream }])
    })
  }

  return { peerId, remoteParticipants, registerLocalStream, connectToPeer }
}

