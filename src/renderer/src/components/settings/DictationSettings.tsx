import React from 'react'
import {
  Key,
  Languages,
  Keyboard,
  Radio,
  Zap,
  Download,
  Check,
  Trash2,
  Loader2
} from 'lucide-react'

interface DictationSettingsProps {
  modelDownloadStatus: 'idle' | 'checking' | 'downloading' | 'ready' | 'missing'
  downloadProgress: { percent: number; downloaded: number; total: number } | null
  onModelTypeChange: (newType: 'base' | 'small' | 'medium' | 'large-v3') => void
  onDownloadModel: () => void
  onCheckModelStatus: (modelType: string) => void
  localKey: string
  setLocalKey: (key: string) => void
  localSourceLanguage: string
  setLocalSourceLanguage: (lang: string) => void
  localTargetLanguage: string
  setLocalTargetLanguage: (lang: string) => void
  localShortcut: string
  setLocalShortcut: (shortcut: string) => void
  localTranslate: boolean
  setLocalTranslate: (val: boolean) => void
  localShowRecordingOverlay: boolean
  setLocalShowRecordingOverlay: (val: boolean) => void
  localOverlayStyle: 'compact' | 'large'
  setLocalOverlayStyle: (val: 'compact' | 'large') => void
  localUseLocalModel: boolean
  setLocalUseLocalModel: (val: boolean) => void
  localLocalModelType: 'base' | 'small' | 'medium' | 'large-v3'
  setLocalLocalModelType: (val: 'base' | 'small' | 'medium' | 'large-v3') => void
}

export const DictationSettings: React.FC<DictationSettingsProps> = ({
  modelDownloadStatus,
  downloadProgress,
  onModelTypeChange,
  onDownloadModel,
  onCheckModelStatus,
  localKey,
  setLocalKey,
  localSourceLanguage,
  setLocalSourceLanguage,
  localTargetLanguage,
  setLocalTargetLanguage,
  localShortcut,
  setLocalShortcut,
  localTranslate,
  setLocalTranslate,
  localShowRecordingOverlay,
  setLocalShowRecordingOverlay,
  localOverlayStyle,
  setLocalOverlayStyle,
  localUseLocalModel,
  setLocalUseLocalModel,
  localLocalModelType,
  setLocalLocalModelType
}) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Dictation</h2>
        <p className="text-sm text-zinc-500">Voice recording and transcription configuration</p>
      </div>
      <div className="space-y-4">
        {/* Local Model Toggle */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Use Local Model</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {localUseLocalModel
                    ? 'Processing on your device (Offline)'
                    : 'Using OpenAI Cloud (Requires API Key)'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLocalUseLocalModel(!localUseLocalModel)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                localUseLocalModel ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  localUseLocalModel ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {localUseLocalModel && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs font-medium mb-1">First Time Setup</p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Using a local model requires downloading the model file (~140MB - 3GB depending on
                  model). Please download it before collecting audio.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium block">Model Size</label>
                <select
                  value={localLocalModelType}
                  onChange={(e) => {
                    const newValue = e.target.value as 'base' | 'small' | 'medium' | 'large-v3'
                    setLocalLocalModelType(newValue)
                    onModelTypeChange(newValue)
                  }}
                  className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="base">Whisper Base (Fastest) (~140MB)</option>
                  <option value="small">Whisper Small (Balanced) (~460MB)</option>
                  <option value="medium">Whisper Medium (GGML) (~1.5GB)</option>
                  <option value="large-v3">Whisper Large V3 (GGML) (~2.9GB)</option>
                </select>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs">
                    {modelDownloadStatus === 'ready' && (
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 flex items-center gap-1">
                          <Check size={12} /> Model Ready ({localLocalModelType})
                        </span>
                        <button
                          title="Delete Local Model"
                          onClick={async () => {
                            if (
                              confirm(
                                `Are you sure you want to delete the ${localLocalModelType} model? You will need to download it again to use it.`
                              )
                            ) {
                              await window.api.deleteLocalModel(localLocalModelType)
                              onCheckModelStatus(localLocalModelType)
                            }
                          }}
                          className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                    {modelDownloadStatus === 'missing' && (
                      <span className="text-zinc-500">Model not found</span>
                    )}
                    {modelDownloadStatus === 'downloading' && (
                      <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-blue-400">Downloading...</span>
                          {downloadProgress && downloadProgress.total > 0 && (
                            <span className="text-blue-300 font-medium">
                              {downloadProgress.percent}%
                            </span>
                          )}
                        </div>
                        {downloadProgress && downloadProgress.total > 0 && (
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300 ease-out"
                              style={{ width: `${downloadProgress.percent}%` }}
                            />
                          </div>
                        )}
                        {downloadProgress && downloadProgress.total > 0 && (
                          <span className="text-zinc-500 text-[10px]">
                            {(downloadProgress.downloaded / 1024 / 1024).toFixed(1)} MB /{' '}
                            {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {(modelDownloadStatus === 'missing' || modelDownloadStatus === 'idle') && (
                    <button
                      onClick={onDownloadModel}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-medium rounded-lg transition-colors border border-blue-500/20"
                    >
                      <Download size={12} />
                      Download Model
                    </button>
                  )}

                  {modelDownloadStatus === 'downloading' && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-lg border border-white/5">
                      <Loader2 size={12} className="animate-spin" />
                      Downloading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Key (Only if not using local model) */}
        {!localUseLocalModel && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Key size={12} />
              <span>OpenAI API Key</span>
            </div>
            <div className="relative group">
              <input
                type="password"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
              />
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
            <p className="text-[10px] text-zinc-600 px-1">
              Required for speech transcription and translation
            </p>
          </div>
        )}

        {/* Shortcut */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
            <Keyboard size={12} />
            <span>Keyboard Shortcut</span>
          </div>
          <div className="relative group">
            <select
              value={localShortcut}
              onChange={(e) => setLocalShortcut(e.target.value)}
              className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
            >
              <optgroup label="Single Keys">
                <option value="RightCommand">Right ⌘</option>
              </optgroup>
              <optgroup label="Command Combinations">
                <option value="Command+Space">⌘ Space</option>
                <option value="Command+K">⌘ K</option>
                <option value="Command+R">⌘ R</option>
                <option value="Command+T">⌘ T</option>
                <option value="Command+M">⌘ M</option>
              </optgroup>
              <optgroup label="Shift+Command Combinations">
                <option value="Shift+Command+Space">⇧⌘ Space</option>
                <option value="Shift+Command+K">⇧⌘ K</option>
                <option value="Shift+Command+R">⇧⌘ R</option>
                <option value="Shift+Command+T">⇧⌘ T</option>
                <option value="Shift+Command+M">⇧⌘ M</option>
              </optgroup>
              <optgroup label="Control Combinations">
                <option value="Control+Space">⌃ Space</option>
                <option value="Control+K">⌃ K</option>
                <option value="Control+R">⌃ R</option>
              </optgroup>
              <optgroup label="Option Combinations">
                <option value="Option+Space">⌥ Space</option>
                <option value="Option+K">⌥ K</option>
                <option value="Option+R">⌥ R</option>
                <option value="Shift+Option+R">⇧⌥ R</option>
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

        {/* Spoken Language */}
        {(!localUseLocalModel || localTranslate) && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Languages size={12} />
              <span>{localTranslate ? 'Source Language' : 'Spoken Language'}</span>
            </div>
            <div className="relative group">
              <select
                value={localSourceLanguage}
                onChange={(e) => setLocalSourceLanguage(e.target.value)}
                className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
              >
                <option value="auto">Auto Detect</option>
                <option value="en">English</option>
                <option value="tr">Turkish</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="ru">Russian</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="zh">Chinese</option>
                <option value="ar">Arabic</option>
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
            <p className="text-[10px] text-zinc-600 px-1">Language of the audio being recorded</p>
          </div>
        )}

        {/* Translation */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Languages size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Translation Mode</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {localTranslate
                    ? 'Translate speech between languages'
                    : 'Transcribe in original language'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLocalTranslate(!localTranslate)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                localTranslate ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  localTranslate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {localTranslate && (
            <div className="pt-2 border-t border-white/5 space-y-2">
              <div className="space-y-2">
                <label className="text-zinc-400 text-xs font-medium flex items-center gap-2">
                  <Languages size={14} />
                  Translate To
                </label>
                <select
                  value={localTargetLanguage}
                  onChange={(e) => setLocalTargetLanguage(e.target.value)}
                  className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="en">English</option>
                  <option value="tr">Turkish</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="pt">Portuguese</option>
                  <option value="ru">Russian</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                  <option value="ar">Arabic</option>
                </select>
                <p className="text-zinc-500 text-xs mt-1">
                  Source language will be auto-detected from your speech
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recording Overlay */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Radio size={18} className="text-zinc-400" />
              <div className="flex flex-col">
                <span className="text-white text-sm font-medium">Recording Overlay</span>
                <span className="text-zinc-500 text-xs mt-0.5">
                  {localShowRecordingOverlay
                    ? 'Show waveform visualization'
                    : 'No visual indicator'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setLocalShowRecordingOverlay(!localShowRecordingOverlay)}
              className={`w-11 h-6 rounded-full relative transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1a1a] focus:ring-blue-500/50 ${
                localShowRecordingOverlay ? 'bg-blue-600' : 'bg-white/10'
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                  localShowRecordingOverlay ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Overlay Style */}
        {localShowRecordingOverlay && (
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
            <div className="flex gap-2 ml-7">
              <button
                onClick={() => setLocalOverlayStyle('compact')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  localOverlayStyle === 'compact'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                Compact
              </button>
              <button
                onClick={() => setLocalOverlayStyle('large')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  localOverlayStyle === 'large'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                Large
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
