import { useState, useEffect, useRef } from 'react'
import { Status } from './components/Status'
import { Settings } from './components/Settings'

function App(): React.JSX.Element {
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing'>('idle')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [translate, setTranslate] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState('en')
  const [targetLanguage, setTargetLanguage] = useState('tr')
  const [shortcut, setShortcut] = useState('Command+Space')
  const [trayAnimations, setTrayAnimations] = useState(true)
  const [processNotifications, setProcessNotifications] = useState(false)
  const [soundAlert, setSoundAlert] = useState(false)
  const [soundType, setSoundType] = useState('Glass')
  const [autoStart, setAutoStart] = useState(true)
  const [showRecordingOverlay, setShowRecordingOverlay] = useState(true)
  const [useLocalModel, setUseLocalModel] = useState(false)
  const [localModelType, setLocalModelType] = useState<'base' | 'small' | 'medium' | 'large-v3'>(
    'base'
  )

  const [audioLevel, setAudioLevel] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  const statusRef = useRef(status)
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const isSettingsMode = window.location.hash === '#settings'
    setShowSettings(isSettingsMode)

    const loadSettings = (): void => {
      window.api.getSettings().then((settings) => {
        setApiKey(settings.apiKey || '')
        setTranslate(settings.translate || false)
        setSourceLanguage(settings.sourceLanguage || 'en')
        setTargetLanguage(settings.targetLanguage || 'tr')
        setShortcut(settings.shortcut || 'Command+Space')
        setTrayAnimations(settings.trayAnimations !== undefined ? settings.trayAnimations : true)
        setProcessNotifications(
          settings.processNotifications !== undefined ? settings.processNotifications : false
        )
        setSoundAlert(settings.soundAlert !== undefined ? settings.soundAlert : false)
        setSoundType(settings.soundType || 'Glass')
        setAutoStart(settings.autoStart !== false)
        setShowRecordingOverlay(settings.showRecordingOverlay !== false)
        setUseLocalModel(settings.useLocalModel || false)
        setLocalModelType(
          (settings.localModelType as 'base' | 'small' | 'medium' | 'large-v3') || 'base'
        )
      })
    }

    loadSettings()

    if (isSettingsMode) {
      loadSettings()
    }

    const removeStartListener = window.api.onStartRecording(() => {
      console.log('Renderer: Received start-recording IPC message')
      console.log('Renderer: Current status:', statusRef.current)
      if (statusRef.current === 'idle') {
        console.log('Renderer: Starting recording...')
        startRecording()
      } else {
        console.warn('Renderer: Cannot start recording, current status:', statusRef.current)
      }
    })

    const removeStopListener = window.api.onStopRecording(() => {
      console.log('Renderer: Received stop-recording IPC message')
      console.log('Renderer: Current status:', statusRef.current)
      if (statusRef.current === 'recording') {
        console.log('Renderer: Stopping recording...')
        stopRecording()
      } else {
        console.warn('Renderer: Cannot stop recording, current status:', statusRef.current)
      }
    })

    const removeCancelListener = window.api.onCancelRecording(() => {
      console.log('Renderer: Received cancel-recording IPC message')
      console.log('Renderer: Current status:', statusRef.current)
      if (statusRef.current === 'recording') {
        console.log('Renderer: Cancelling recording (no processing)...')
        cancelRecording()
      }
    })

    const removeProcessingCompleteListener = window.api.onProcessingComplete(() => {
      setStatus('idle')
      window.api.setProcessingState(false)
    })

    return () => {
      removeStartListener()
      removeStopListener()
      removeCancelListener()
      removeProcessingCompleteListener()
      cancelAnimationFrame(animationFrameRef.current!)
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveSettings = (
    newKey: string,
    newTranslate: boolean,
    newSourceLanguage: string,
    newTargetLanguage: string,
    newShortcut: string,
    newTrayAnimations: boolean,
    newProcessNotifications: boolean,
    newSoundAlert: boolean,
    newSoundType: string,
    newAutoStart: boolean,
    newShowRecordingOverlay: boolean,
    newUseLocalModel: boolean,
    newLocalModelType: 'base' | 'small' | 'medium' | 'large-v3'
  ): void => {
    setApiKey(newKey)
    setTranslate(newTranslate)
    setSourceLanguage(newSourceLanguage)
    setTargetLanguage(newTargetLanguage)
    setShortcut(newShortcut)
    setTrayAnimations(newTrayAnimations)
    setProcessNotifications(newProcessNotifications)
    setSoundAlert(newSoundAlert)
    setSoundType(newSoundType)
    setAutoStart(newAutoStart)
    setShowRecordingOverlay(newShowRecordingOverlay)
    setUseLocalModel(newUseLocalModel)
    setLocalModelType(newLocalModelType)
    window.api.saveSettings({
      apiKey: newKey,
      translate: newTranslate,
      language: '',
      sourceLanguage: newSourceLanguage,
      targetLanguage: newTargetLanguage,
      shortcut: newShortcut,
      trayAnimations: newTrayAnimations,
      processNotifications: newProcessNotifications,
      soundAlert: newSoundAlert,
      soundType: newSoundType,
      autoStart: newAutoStart,
      showRecordingOverlay: newShowRecordingOverlay,
      useLocalModel: newUseLocalModel,
      localModelType: newLocalModelType
    })
  }

  const analyzeAudio = (): void => {
    if (!analyserRef.current) return

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)

    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const average = sum / dataArray.length
    const normalizedLevel = Math.min(100, average * 2.5)

    setAudioLevel(normalizedLevel)

    if (window.api?.updateRecordingAudioLevel && statusRef.current === 'recording') {
      window.api.updateRecordingAudioLevel(normalizedLevel)
    }

    animationFrameRef.current = requestAnimationFrame(analyzeAudio)
  }

  const startRecording = async (): Promise<void> => {
    console.log('startRecording called, current status:', statusRef.current)
    try {
      console.log('Requesting microphone access...')

      // Ensure window is focused for microphone permission
      window.focus()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000, // Whisper works best with 16kHz
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })

      console.log('Microphone access granted, stream obtained')

      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createMediaStreamSource(stream)

      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      sourceRef.current = source

      analyzeAudio()

      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 32000 // 32kbps is sufficient for speech
      }

      // Fallback if the specific mimeType isn't supported
      if (options.mimeType && !MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType
      }

      const mediaRecorder = new MediaRecorder(stream, options)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const buffer = await blob.arrayBuffer()
        setStatus('processing')
        window.api.setProcessingState(true)
        const duration = (Date.now() - startTimeRef.current) / 1000
        window.api.processAudio(buffer, duration)
        window.api.setRecordingState(false)
        setAudioLevel(0)

        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
        if (audioContextRef.current) audioContextRef.current.close()

        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      startTimeRef.current = Date.now()
      setStatus('recording')
      window.api.setRecordingState(true)
      console.log('Recording started successfully')
    } catch (error) {
      // Failed to start recording - user may have denied permission
      console.error('Failed to start recording:', error)
      setStatus('idle')
      window.api.setRecordingState(false)

      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          alert('Microphone permission denied. Please grant microphone access in System Settings.')
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          alert('No microphone found. Please connect a microphone and try again.')
        } else {
          alert(`Failed to start recording: ${error.message}`)
        }
      }
    }
  }

  const stopRecording = (): void => {
    if (!mediaRecorderRef.current) return

    setStatus('processing')
    mediaRecorderRef.current.stop()
  }

  const cancelRecording = (): void => {
    console.log('Cancelling recording without processing')

    if (!mediaRecorderRef.current) {
      console.log('No media recorder to cancel')
      setStatus('idle')
      window.api.setRecordingState(false)
      return
    }

    // CRITICAL: Remove BOTH handlers to prevent ANY processing
    const mediaRecorder = mediaRecorderRef.current

    // Clear chunks
    chunksRef.current = []

    // Remove handlers BEFORE stopping
    if (mediaRecorder.state !== 'inactive') {
      console.log('Removing handlers and stopping recorder')

      // Remove onstop handler - THIS WAS THE BUG!
      mediaRecorder.onstop = null

      // Remove ondataavailable handler
      mediaRecorder.ondataavailable = null

      // Now stop - won't trigger any processing
      mediaRecorder.stop()
    }

    // Clean up audio analysis
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    // Stop all tracks
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())
    }

    // Reset state
    mediaRecorderRef.current = null
    setStatus('idle')
    window.api.setRecordingState(false)
    setAudioLevel(0)

    console.log('Recording cancelled - NO processing, NO AI, NO paste')
  }

  const handleRecordToggle = (): void => {
    if (status === 'idle') {
      startRecording()
    } else if (status === 'recording') {
      stopRecording()
    }
  }

  useEffect(() => {
    if (showSettings || window.location.hash === '#settings') {
      window.api.getSettings().then((settings) => {
        setApiKey(settings.apiKey || '')
        setTranslate(settings.translate || false)
        setShortcut(settings.shortcut || 'Command+Space')
        setTrayAnimations(settings.trayAnimations !== undefined ? settings.trayAnimations : true)
      })
    }
  }, [showSettings])

  if (showSettings || window.location.hash === '#settings') {
    return (
      <div className="h-screen w-screen bg-zinc-950">
        <Settings
          apiKey={apiKey}
          setApiKey={(val) =>
            saveSettings(
              val,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          translate={translate}
          setTranslate={(val) =>
            saveSettings(
              apiKey,
              val,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          sourceLanguage={sourceLanguage}
          setSourceLanguage={(val) =>
            saveSettings(
              apiKey,
              translate,
              val,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          targetLanguage={targetLanguage}
          setTargetLanguage={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              val,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          shortcut={shortcut}
          setShortcut={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              val,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          trayAnimations={trayAnimations}
          setTrayAnimations={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              val,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          processNotifications={processNotifications}
          setProcessNotifications={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              val,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          soundAlert={soundAlert}
          setSoundAlert={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              val,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          soundType={soundType}
          setSoundType={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              val,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          autoStart={autoStart}
          setAutoStart={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              val,
              showRecordingOverlay,
              useLocalModel,
              localModelType
            )
          }
          showRecordingOverlay={showRecordingOverlay}
          setShowRecordingOverlay={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              val,
              useLocalModel,
              localModelType
            )
          }
          useLocalModel={useLocalModel}
          setUseLocalModel={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              val,
              localModelType
            )
          }
          localModelType={localModelType}
          setLocalModelType={(val) =>
            saveSettings(
              apiKey,
              translate,
              sourceLanguage,
              targetLanguage,
              shortcut,
              trayAnimations,
              processNotifications,
              soundAlert,
              soundType,
              autoStart,
              showRecordingOverlay,
              useLocalModel,
              val
            )
          }
          onSave={(settings) =>
            saveSettings(
              settings.apiKey,
              settings.translate,
              settings.sourceLanguage,
              settings.targetLanguage,
              settings.shortcut,
              settings.trayAnimations,
              settings.processNotifications,
              settings.soundAlert,
              settings.soundType,
              settings.autoStart,
              settings.showRecordingOverlay,
              settings.useLocalModel,
              settings.localModelType
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="drag h-screen w-screen bg-transparent rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
      <Status
        status={status}
        audioLevel={audioLevel}
        shortcut={shortcut}
        onRecordToggle={handleRecordToggle}
        onOpenSettings={() => window.api.openSettings()}
        onOpenHistory={() => window.api.openHistory()}
      />
    </div>
  )
}

export default App
