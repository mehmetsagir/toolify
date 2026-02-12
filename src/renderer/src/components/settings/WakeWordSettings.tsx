import React, { useState, useEffect, useCallback } from 'react'
import { AudioWaveform, AlertTriangle, Battery, Mic } from 'lucide-react'

export const WakeWordSettings: React.FC = () => {
  const [enabled, setEnabled] = useState(false)
  const [wakeWord, setWakeWord] = useState('Hey Toolify')

  const loadSettings = useCallback(async () => {
    const settings = await window.api.getSettings()
    setEnabled(settings.wakeWordEnabled ?? false)
    setWakeWord(settings.wakeWord ?? 'Hey Toolify')
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const save = async (updates: Record<string, unknown>): Promise<void> => {
    const settings = await window.api.getSettings()
    window.api.saveSettings({ ...settings, ...updates })
  }

  const handleToggle = async (): Promise<void> => {
    const next = !enabled
    setEnabled(next)
    await save({ wakeWordEnabled: next })
  }

  const handleWakeWordChange = async (value: string): Promise<void> => {
    setWakeWord(value)
    await save({ wakeWord: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Wake Word</h2>
        <p className="text-sm text-zinc-500">
          Start and stop recording hands-free using a voice command
        </p>
      </div>

      {/* Warnings */}
      <div className="space-y-3">
        <div className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20 flex items-start gap-3">
          <Battery size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 text-sm font-medium">Battery Usage</p>
            <p className="text-amber-200/70 text-xs mt-1">
              Wake word detection uses continuous microphone listening via Apple Speech Recognition.
              This may increase battery consumption on laptops.
            </p>
          </div>
        </div>

        <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20 flex items-start gap-3">
          <Mic size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-200 text-sm font-medium">Microphone Access</p>
            <p className="text-blue-200/70 text-xs mt-1">
              Requires microphone and speech recognition permissions. The listener automatically
              pauses during recording to avoid microphone conflicts.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Enable Toggle */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AudioWaveform size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Enable Wake Word</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {enabled
                    ? 'Listening for wake word to start/stop recording'
                    : 'Use keyboard shortcut to start/stop recording'}
                </span>
              </div>
            </div>

            <button
              onClick={handleToggle}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                enabled ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Wake Word Input */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <AlertTriangle size={12} />
            <span>Wake Word Phrase</span>
          </div>
          <input
            type="text"
            value={wakeWord}
            onChange={(e) => handleWakeWordChange(e.target.value)}
            disabled={!enabled}
            placeholder="Hey Toolify"
            className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-zinc-600 text-[11px] leading-relaxed">
            Choose a distinctive phrase to minimize false activations. The phrase is matched via
            Apple Speech Recognition and compared using simple text matching.
          </p>
        </div>
      </div>
    </div>
  )
}
