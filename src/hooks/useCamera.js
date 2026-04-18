import { useState, useRef, useCallback, useEffect } from 'react'

export default function useCamera() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(document.createElement('canvas'))
  const [active, setActive] = useState(false)
  const [facingMode, setFacingMode] = useState('environment') // rear camera
  const [torchOn, setTorchOn] = useState(false)
  const [error, setError] = useState(null)

  const start = useCallback(async () => {
    try {
      setError(null)
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }

      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setActive(true)
    } catch (err) {
      console.error('Camera error:', err)
      setError(err.message || 'Camera access denied')
      setActive(false)
    }
  }, [facingMode])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setActive(false)
    setTorchOn(false)
  }, [])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !active) return null

    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    return canvas.toDataURL('image/jpeg', 0.85)
  }, [active])

  const switchCamera = useCallback(async () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    if (active) {
      // Will restart with new facing mode via effect
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [facingMode, active])

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return

    try {
      const capabilities = track.getCapabilities?.()
      if (capabilities?.torch) {
        await track.applyConstraints({ advanced: [{ torch: !torchOn }] })
        setTorchOn(!torchOn)
      }
    } catch {
      // Torch not supported on this device
    }
  }, [torchOn])

  // Restart camera when facing mode changes
  useEffect(() => {
    if (active) {
      start()
    }
  }, [facingMode])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  return {
    videoRef,
    active,
    error,
    torchOn,
    facingMode,
    start,
    stop,
    capture,
    switchCamera,
    toggleTorch,
  }
}
