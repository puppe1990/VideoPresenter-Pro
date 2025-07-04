import { useEffect, useState } from 'react'

export type SceneLayout = 'presenter' | 'screen'

interface UseAutoSceneSwitchOptions {
  enabled: boolean
  videoElement: HTMLVideoElement | null
  stream: MediaStream | null
}

export default function useAutoSceneSwitch({ enabled, videoElement, stream }: UseAutoSceneSwitchOptions) {
  const [layout, setLayout] = useState<SceneLayout>('screen')

  useEffect(() => {
    if (!enabled || !videoElement || !stream) return

    let frame: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let faceDetector: any
    let audioCtx: AudioContext | null = null
    let analyser: AnalyserNode | null = null

    if ('FaceDetector' in window) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        faceDetector = new (window as any).FaceDetector({ fastMode: true })
      } catch {
        faceDetector = null
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const check = async () => {
      let faceFound = false
      if (faceDetector && videoElement.readyState >= 2) {
        try {
          const faces = await faceDetector.detect(videoElement)
          faceFound = faces.length > 0
        } catch {
          faceFound = false
        }
      }

      analyser.getByteFrequencyData(dataArray)
      const maxVal = Math.max(...dataArray)
      const speaking = maxVal > 30

      if (faceFound || speaking) {
        setLayout('presenter')
      } else {
        setLayout('screen')
      }

      frame = requestAnimationFrame(check)
    }

    frame = requestAnimationFrame(check)

    return () => {
      cancelAnimationFrame(frame)
      audioCtx?.close()
    }
  }, [enabled, videoElement, stream])

  return layout
}
