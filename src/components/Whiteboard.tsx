'use client'

import { useState, useRef, useCallback } from 'react'

interface Note {
  id: number
  x: number
  y: number
  text: string
}

export default function Whiteboard() {
  const [notes, setNotes] = useState<Note[]>([])
  const [dragId, setDragId] = useState<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  const addNote = () => {
    const newNote: Note = {
      id: Date.now(),
      x: 80,
      y: 80,
      text: 'New note'
    }
    setNotes(prev => [...prev, newNote])
  }

  const updateNote = useCallback((id: number, data: Partial<Note>) => {
    setNotes(prev =>
      prev.map(n => (n.id === id ? { ...n, ...data } : n))
    )
  }, [])

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragId === null) return
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    updateNote(dragId, { x, y })
  }

  const onMouseUp = () => {
    setDragId(null)
  }

  return (
    <div className='h-full flex flex-col'>
      <div className='p-2 border-b bg-background'>
        <button
          onClick={addNote}
          className='px-2 py-1 rounded bg-blue-500 text-white'
        >
          Add Note
        </button>
      </div>
      <div
        ref={boardRef}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        className='flex-1 relative bg-muted overflow-hidden'
      >
        {notes.map(note => (
          <div
            key={note.id}
            style={{ left: note.x, top: note.y }}
            onMouseDown={() => setDragId(note.id)}
            className='absolute w-40 h-24 p-2 bg-yellow-200 rounded shadow cursor-move'
          >
            <textarea
              value={note.text}
              onChange={e => updateNote(note.id, { text: e.target.value })}
              className='w-full h-full bg-transparent outline-none resize-none'
            />
          </div>
        ))}
      </div>
    </div>
  )
}
