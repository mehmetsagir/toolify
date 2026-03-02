import { useState, useEffect, useRef, useCallback } from 'react'

interface RecordingState {
  isRecording: boolean
  isProcessing: boolean
  duration: number
  audioLevel: number
  spectrum: number[]
}

const INITIAL_STATE: RecordingState = {
  isRecording: false,
  isProcessing: false,
  duration: 0,
  audioLevel: 0,
  spectrum: []
}

const MIME_TYPE = 'audio/webm;codecs=opus'
const FFT_SIZE = 256
const AUDIO_LEVEL_INTERVAL_MS = 50
const DURATION_INTERVAL_MS = 100

export function useRecording(): RecordingState & {
  startRecording: () => Promise<void>
  stopRecording: () => void
  cancelRecording: () => void
} {
  const [state, setState] = useState<RecordingState>(INITIAL_STATE)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number>(0)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isCancelledRef = useRef(false)

  // ---- cleanup helpers ----

  const stopAnalysis = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
      durationIntervalRef.current = null
    }
  }, [])

  const teardownAudio = useCallback(() => {
    stopAnalysis()

    if (sourceRef.current) {
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect()
      analyserRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [stopAnalysis])

  // ---- spectrum / level loop ----

  const startAnalysisLoop = useCallback((analyser: AnalyserNode) => {
    const binCount = analyser.frequencyBinCount // FFT_SIZE / 2 = 128
    const dataArray = new Uint8Array(binCount)
    let lastSentMs = 0

    const loop = (timestamp: number): void => {
      analyser.getByteFrequencyData(dataArray)

      // RMS audio level normalised to [0, 1]
      let sum = 0
      for (let i = 0; i < binCount; i++) sum += (dataArray[i] / 255) ** 2
      const level = Math.sqrt(sum / binCount)

      // Spectrum as array of normalised values
      const spectrum = Array.from(dataArray).map((v) => v / 255)

      // Throttle IPC sends to ~20 fps
      if (timestamp - lastSentMs >= AUDIO_LEVEL_INTERVAL_MS) {
        lastSentMs = timestamp
        const durationMs = Date.now() - startTimeRef.current
        window.api.updateRecordingAudioLevel({ level, spectrum, durationMs })
      }

      setState((prev) => ({ ...prev, audioLevel: level, spectrum }))

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)
  }, [])

  // ---- processAudio on onstop ----

  const attachOnStop = useCallback(
    (recorder: MediaRecorder) => {
      recorder.onstop = () => {
        if (isCancelledRef.current) {
          chunksRef.current = []
          teardownAudio()
          return
        }

        const blob = new Blob(chunksRef.current, { type: MIME_TYPE })
        chunksRef.current = []
        const durationSec = (Date.now() - startTimeRef.current) / 1000

        blob.arrayBuffer().then((buffer) => {
          window.api.processAudio(buffer, durationSec)
        })

        teardownAudio()
      }
    },
    [teardownAudio]
  )

  // ---- public actions ----

  const startRecording = useCallback(async () => {
    // Guard against double-start
    if (mediaRecorderRef.current?.state === 'recording') return

    // Permission check
    const micStatus = await window.api.checkMicrophonePermission()
    if (micStatus === 'denied' || micStatus === 'restricted') {
      new Notification('Toolify', {
        body: 'Microphone permission denied. Please enable it in System Settings.'
      })
      return
    }
    if (micStatus === 'not-determined') {
      const granted = await window.api.requestMicrophonePermission()
      if (!granted) return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch {
      new Notification('Toolify', { body: 'Could not access microphone.' })
      return
    }

    streamRef.current = stream
    chunksRef.current = []
    isCancelledRef.current = false
    startTimeRef.current = Date.now()

    // AudioContext + AnalyserNode
    const audioContext = new AudioContext()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.8
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    audioContextRef.current = audioContext
    analyserRef.current = analyser
    sourceRef.current = source

    // MediaRecorder
    const mimeType = MediaRecorder.isTypeSupported(MIME_TYPE) ? MIME_TYPE : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    attachOnStop(recorder)
    mediaRecorderRef.current = recorder
    recorder.start(100) // collect chunks every 100 ms

    // Duration ticker
    durationIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      setState((prev) => ({ ...prev, duration: elapsed }))
    }, DURATION_INTERVAL_MS)

    // Spectrum loop
    startAnalysisLoop(analyser)

    window.api.setRecordingState(true)
    setState((prev) => ({
      ...prev,
      isRecording: true,
      isProcessing: false,
      duration: 0,
      audioLevel: 0,
      spectrum: []
    }))
  }, [attachOnStop, startAnalysisLoop])

  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return

    isCancelledRef.current = false
    stopAnalysis()
    mediaRecorderRef.current.stop()
    mediaRecorderRef.current = null

    window.api.setRecordingState(false)
    window.api.setProcessingState(true)
    setState((prev) => ({
      ...prev,
      isRecording: false,
      isProcessing: true,
      audioLevel: 0,
      spectrum: []
    }))
  }, [stopAnalysis])

  const cancelRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return

    isCancelledRef.current = true
    stopAnalysis()

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    mediaRecorderRef.current = null

    window.api.setRecordingState(false)
    setState(INITIAL_STATE)
  }, [stopAnalysis])

  // ---- IPC event listeners ----

  useEffect(() => {
    const unsubStart = window.api.onStartRecording(() => startRecording())
    const unsubStop = window.api.onStopRecording(() => stopRecording())
    const unsubCancel = window.api.onCancelRecording(() => cancelRecording())
    const unsubComplete = window.api.onProcessingComplete(() => {
      setState((prev) => ({ ...prev, isProcessing: false }))
    })

    return () => {
      unsubStart()
      unsubStop()
      unsubCancel()
      unsubComplete()
    }
  }, [startRecording, stopRecording, cancelRecording])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true
      teardownAudio()
    }
  }, [teardownAudio])

  return { ...state, startRecording, stopRecording, cancelRecording }
}
