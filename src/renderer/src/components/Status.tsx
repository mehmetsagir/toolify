import React from 'react'
import { Mic, Settings2, Loader2, Sparkles } from 'lucide-react'

interface StatusProps {
  status: 'idle' | 'recording' | 'processing'
  audioLevel?: number
  shortcut?: string
  onRecordToggle: () => void
  onOpenSettings: () => void
}

export const Status: React.FC<StatusProps> = ({
  status,
  audioLevel = 0,
  shortcut = 'Shift+Command+Space',
  onRecordToggle,
  onOpenSettings
}) => {
  const scale = 1 + (audioLevel / 100) * 0.1

  const formatShortcut = (shortcut: string): string[] => {
    return shortcut.split('+').map((key) => {
      const keyMap: Record<string, string> = {
        Command: '⌘',
        Option: '⌥',
        Control: '⌃',
        Shift: '⇧',
        Space: 'SPACE'
      }
      return keyMap[key] || key.toUpperCase()
    })
  }

  const shortcutKeys = formatShortcut(shortcut)

  return (
    <div className="h-full flex flex-col bg-zinc-950 text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-zinc-950/50 to-zinc-950 animate-spin-slow opacity-30" />
      </div>

      {/* Header */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={onOpenSettings}
          className="no-drag w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all backdrop-blur-sm cursor-pointer"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 z-10">
        {/* Status Indicator */}
        <div className="relative group">
          {/* Ripple Effect */}
          {status === 'recording' && (
            <>
              <div
                className="absolute inset-0 bg-red-500 rounded-full opacity-10 transition-transform duration-75"
                style={{ transform: `scale(${1 + (audioLevel / 100) * 0.2})` }}
              />
              <div
                className="absolute inset-0 bg-red-500 rounded-full opacity-5 transition-transform duration-100 delay-75"
                style={{ transform: `scale(${1 + (audioLevel / 100) * 0.3})` }}
              />
            </>
          )}

          {/* Main Button */}
          <button
            onClick={onRecordToggle}
            disabled={status === 'processing'}
            style={{ transform: status === 'recording' ? `scale(${scale})` : 'scale(1)' }}
            className={`no-drag relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-75 cursor-pointer ${
              status === 'recording'
                ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]'
                : status === 'processing'
                  ? 'bg-zinc-900 border border-white/5'
                  : 'bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 hover:border-white/10 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.1)]'
            }`}
          >
            {status === 'processing' ? (
              <div className="relative">
                <Loader2 size={32} className="text-blue-500 animate-spin" />
                <div className="absolute inset-0 blur-md bg-blue-500/20 animate-pulse" />
              </div>
            ) : (
              <Mic
                size={32}
                className={`transition-colors duration-300 ${
                  status === 'recording' ? 'text-white' : 'text-zinc-400 group-hover:text-white'
                }`}
              />
            )}
          </button>
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          <h1
            className={`text-2xl font-medium tracking-tight transition-all duration-300 ${
              status === 'recording' ? 'text-red-500' : 'text-white'
            }`}
          >
            {status === 'idle' && 'Tap to Record'}
            {status === 'recording' && 'Listening...'}
            {status === 'processing' && 'Processing'}
          </h1>

          <div className="h-6 flex items-center justify-center">
            {status === 'idle' && (
              <div className="flex items-center gap-2 text-zinc-500 text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {shortcutKeys.map((key, index) => (
                  <span key={index} className="font-mono text-[10px]">
                    {key}
                  </span>
                ))}
              </div>
            )}
            {status === 'recording' && (
              <p className="text-zinc-500 text-xs animate-pulse">Press again to stop</p>
            )}
            {status === 'processing' && (
              <div className="flex items-center gap-1.5 text-blue-400/80 text-xs">
                <Sparkles size={10} />
                <span>AI is working magic</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
