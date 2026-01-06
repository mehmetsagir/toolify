import React from 'react'
import { Power } from 'lucide-react'
import { HistorySettings } from './HistorySettings'

interface GeneralSettingsProps {
  autoStart: boolean
  setAutoStart: (val: boolean) => void
  historyAutoDeleteDays: number
  setHistoryAutoDeleteDays: (val: number) => void
  historyMaxItems: number
  setHistoryMaxItems: (val: number) => void
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  autoStart,
  setAutoStart,
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
