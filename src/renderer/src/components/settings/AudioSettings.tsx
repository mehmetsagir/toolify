import React from 'react'
import { Bell, Volume2 } from 'lucide-react'

interface AudioSettingsProps {
  processNotifications: boolean
  setProcessNotifications: (val: boolean) => void
  soundAlert: boolean
  setSoundAlert: (val: boolean) => void
  soundType: string
  setSoundType: (val: string) => void
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  processNotifications,
  setProcessNotifications,
  soundAlert,
  setSoundAlert,
  soundType,
  setSoundType
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">
          Audio & Notifications
        </h2>
        <p className="text-sm text-zinc-500">Sound alerts and notification preferences</p>
      </div>
      <div className="space-y-4">
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
      </div>
    </div>
  )
}
