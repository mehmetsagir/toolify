import React from 'react'
import { Power, Keyboard, Radio, Volume2, Bell } from 'lucide-react'
import { HistorySettings } from './HistorySettings'

const overlayStyleOptions: Array<{
  value: 'compact' | 'large'
  label: string
  description: string
}> = [
  {
    value: 'compact',
    label: 'Compact',
    description: 'Minimal floating bubble that hugs screen edges.'
  },
  {
    value: 'large',
    label: 'Expanded',
    description: 'Wide overlay with waveform, status text, duration, and shortcut hint.'
  }
]

interface GeneralSettingsProps {
  autoStart: boolean
  setAutoStart: (val: boolean) => void
  shortcut: string
  setShortcut: (shortcut: string) => void
  showRecordingOverlay: boolean
  setShowRecordingOverlay: (val: boolean) => void
  overlayStyle: 'compact' | 'large'
  setOverlayStyle: (val: 'compact' | 'large') => void
  soundAlert: boolean
  setSoundAlert: (val: boolean) => void
  soundType: string
  setSoundType: (val: string) => void
  processNotifications: boolean
  setProcessNotifications: (val: boolean) => void
  historyAutoDeleteDays: number
  setHistoryAutoDeleteDays: (val: number) => void
  historyMaxItems: number
  setHistoryMaxItems: (val: number) => void
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  autoStart,
  setAutoStart,
  shortcut,
  setShortcut,
  showRecordingOverlay,
  setShowRecordingOverlay,
  overlayStyle,
  setOverlayStyle,
  soundAlert,
  setSoundAlert,
  soundType,
  setSoundType,
  processNotifications,
  setProcessNotifications,
  historyAutoDeleteDays,
  setHistoryAutoDeleteDays,
  historyMaxItems,
  setHistoryMaxItems
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">General</h2>
        <p className="text-sm text-zinc-500">Basic application preferences</p>
      </div>
      <div className="space-y-4">
        {/* Auto Start */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Power size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Launch at Startup</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {autoStart
                    ? 'Toolify will start automatically when you log in'
                    : 'You need to start Toolify manually'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setAutoStart(!autoStart)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                autoStart ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  autoStart ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Keyboard Shortcut */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <Keyboard size={12} />
            <span>Keyboard Shortcut</span>
          </div>
          <div className="relative group">
            <select
              value={shortcut}
              onChange={(e) => setShortcut(e.target.value)}
              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
            >
              <optgroup label="Single Keys">
                <option value="RightCommand">Right &#8984;</option>
              </optgroup>
              <optgroup label="Command Combinations">
                <option value="Command+Space">&#8984; Space</option>
                <option value="Command+K">&#8984; K</option>
                <option value="Command+R">&#8984; R</option>
                <option value="Command+T">&#8984; T</option>
                <option value="Command+M">&#8984; M</option>
              </optgroup>
              <optgroup label="Shift+Command Combinations">
                <option value="Shift+Command+Space">&#8679;&#8984; Space</option>
                <option value="Shift+Command+K">&#8679;&#8984; K</option>
                <option value="Shift+Command+R">&#8679;&#8984; R</option>
                <option value="Shift+Command+T">&#8679;&#8984; T</option>
                <option value="Shift+Command+M">&#8679;&#8984; M</option>
              </optgroup>
              <optgroup label="Control Combinations">
                <option value="Control+Space">&#8963; Space</option>
                <option value="Control+K">&#8963; K</option>
                <option value="Control+R">&#8963; R</option>
              </optgroup>
              <optgroup label="Option Combinations">
                <option value="Option+Space">&#8997; Space</option>
                <option value="Option+K">&#8997; K</option>
                <option value="Option+R">&#8997; R</option>
                <option value="Shift+Option+R">&#8679;&#8997; R</option>
              </optgroup>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-zinc-600 px-1">Press to start/stop recording</p>
        </div>

        {/* Recording Overlay */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Recording Overlay</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {showRecordingOverlay ? 'Show waveform visualization' : 'No visual indicator'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowRecordingOverlay(!showRecordingOverlay)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                showRecordingOverlay ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  showRecordingOverlay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Overlay Style */}
        {showRecordingOverlay && (
          <div className="bg-white/5 rounded-lg p-4 border border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <Radio size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Overlay Style</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  Choose the appearance of the recording overlay
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7">
              {overlayStyleOptions.map((option) => {
                const selected = overlayStyle === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setOverlayStyle(option.value)}
                    aria-pressed={selected}
                    className={`rounded-2xl border p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
                      selected
                        ? 'border-blue-500/70 bg-blue-500/5 shadow-lg shadow-blue-500/20'
                        : 'border-white/5 bg-transparent hover:bg-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="mb-0.5">
                      <span className="text-sm font-semibold text-white">{option.label}</span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Sound Alert */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Sound Alert</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {soundAlert ? 'Play sound on completion' : 'Silent mode'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setSoundAlert(!soundAlert)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                soundAlert ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  soundAlert ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {soundAlert && (
            <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
              <label className="text-xs text-zinc-400 font-medium block mb-2">Sound Type</label>
              <select
                value={soundType}
                onChange={(e) => {
                  const newSoundType = e.target.value
                  setSoundType(newSoundType)
                  if (window.api.previewSound) {
                    window.api.previewSound(newSoundType)
                  }
                }}
                className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="Glass">Glass</option>
                <option value="Hero">Hero</option>
                <option value="Ping">Ping</option>
                <option value="Pop">Pop</option>
                <option value="Submarine">Submarine</option>
                <option value="Basso">Basso</option>
                <option value="Blow">Blow</option>
                <option value="Bottle">Bottle</option>
                <option value="Frog">Frog</option>
                <option value="Funk">Funk</option>
              </select>
            </div>
          )}
        </div>

        {/* Process Notifications */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Process Notifications</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {processNotifications ? 'Show start/stop notifications' : 'Only show errors'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setProcessNotifications(!processNotifications)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                processNotifications ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  processNotifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* History Section */}
      <HistorySettings
        autoDeleteDays={historyAutoDeleteDays}
        setAutoDeleteDays={setHistoryAutoDeleteDays}
        maxItems={historyMaxItems}
        setMaxItems={setHistoryMaxItems}
      />
    </div>
  )
}
