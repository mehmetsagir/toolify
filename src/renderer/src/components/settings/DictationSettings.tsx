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
  Loader2,
  FolderOpen,
  Cpu,
  Cloud
} from 'lucide-react'
import type { LocalModelInfo, LocalModelType } from '../../../../shared/types'

type ModelDownloadStatus = 'idle' | 'checking' | 'downloading' | 'ready' | 'missing'

interface DictationSettingsProps {
  modelDownloadStatusMap: Record<LocalModelType, ModelDownloadStatus>
  downloadProgressMap: Record<
    LocalModelType,
    { percent: number; downloaded: number; total: number } | null
  >
  localModelsInfo: LocalModelInfo[]
  onModelTypeChange: (newType: LocalModelType) => void
  onDownloadModel: (modelType: LocalModelType) => void
  onDeleteModel: (modelType: LocalModelType) => void
  onOpenModelsFolder: () => void
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
  localLocalModelType: LocalModelType
}

export const DictationSettings: React.FC<DictationSettingsProps> = ({
  modelDownloadStatusMap,
  downloadProgressMap,
  localModelsInfo,
  onModelTypeChange,
  onDownloadModel,
  onDeleteModel,
  onOpenModelsFolder,
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
  localLocalModelType
}) => {
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Dictation</h2>
        <p className="text-sm text-zinc-500">Voice recording and transcription configuration</p>
      </div>
      <div className="space-y-4">
        {/* Processing Mode */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/5">
          <div>
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-zinc-400" />
              <div>
                <p className="text-white text-sm font-medium">Processing Mode</p>
                <p className="text-xs text-zinc-500">
                  Seçtiğin moda göre ya cihazındaki Whisper modelini ya da OpenAI bulut servislerini
                  kullanırız.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setLocalUseLocalModel(true)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  localUseLocalModel
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${localUseLocalModel ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Cpu
                    size={16}
                    className={localUseLocalModel ? 'text-blue-300' : 'text-zinc-400'}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Lokal Whisper</p>
                  <p className="text-xs text-zinc-500">
                    İnternete ihtiyaç duymadan cihazında çalışır. Bir model indirip hazır tutman
                    gerekir.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocalUseLocalModel(false)}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  !localUseLocalModel
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${!localUseLocalModel ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Cloud
                    size={16}
                    className={!localUseLocalModel ? 'text-blue-300' : 'text-zinc-400'}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">OpenAI Bulut</p>
                  <p className="text-xs text-zinc-500">
                    OpenAI Whisper API&rsquo;sini kullanır. API Key gerekli ve veriler bulutta
                    işlenir.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {localUseLocalModel && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs font-medium mb-1">Yerel model hazırlığı</p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Modelleri bir kez indirir ve `~/Library/Application Support/Toolify/models`
                  dizininde saklarız. Aşağıdan kullanmak istediğin modeli seçip gerekirse indir.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>Model seç, indir ve istersen önbellekten sil.</span>
                <button
                  onClick={onOpenModelsFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border border-white/10 text-zinc-300 hover:border-white/30 transition-colors"
                >
                  <FolderOpen size={12} /> Finder&rsquo;da Aç
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {localModelsInfo.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    Modeller yükleniyor... Lütfen birazdan tekrar deneyin.
                  </p>
                )}
                {localModelsInfo.map((model) => {
                  const progress = downloadProgressMap[model.type]
                  const status = modelDownloadStatusMap[model.type]
                  const isSelected = localLocalModelType === model.type
                  const isDownloading = status === 'downloading' && !!progress
                  const isReady = model.exists && status !== 'downloading'
                  const displaySize = (model.fileSizeMB ?? model.expectedSizeMB).toFixed(1)

                  return (
                    <div
                      key={model.type}
                      className={`rounded-xl border p-3 flex flex-col gap-3 transition-colors ${
                        isSelected
                          ? 'border-blue-500/60 bg-blue-500/5'
                          : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex items-start gap-2 flex-1 cursor-pointer">
                          <input
                            type="radio"
                            className="mt-1 accent-blue-500"
                            checked={isSelected}
                            onChange={() => onModelTypeChange(model.type)}
                          />
                          <div>
                            <p className="text-sm text-white font-medium">{model.displayName}</p>
                            <p className="text-[11px] text-zinc-500">
                              {isReady
                                ? `İndirildi • ${displaySize} MB`
                                : `İndirilmeli • ${model.expectedSizeMB.toFixed(1)} MB`}
                            </p>
                          </div>
                        </label>

                        {isReady && (
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `${model.displayName} modelini silmek istiyor musun? Tekrar kullanmak için yeniden indirmen gerekir.`
                                )
                              ) {
                                await onDeleteModel(model.type)
                              }
                            }}
                            className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      {isDownloading && progress ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] text-blue-300">
                            <span className="flex items-center gap-1">
                              <Loader2 size={11} className="animate-spin" /> İndiriliyor
                            </span>
                            <span>{progress.percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-300"
                              style={{ width: `${progress.percent}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-zinc-500">
                            {(progress.downloaded / 1024 / 1024).toFixed(1)} MB /{' '}
                            {(progress.total > 0
                              ? progress.total / 1024 / 1024
                              : model.expectedSizeMB
                            ).toFixed(1)}{' '}
                            MB
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-xs">
                          {!isReady && (
                            <button
                              onClick={() => onDownloadModel(model.type)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/20 transition-colors"
                            >
                              <Download size={12} /> Modeli İndir
                            </button>
                          )}
                          {isReady ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Check size={12} /> Hazır
                            </span>
                          ) : (
                            <span className="text-zinc-500">
                              ~{model.expectedSizeMB.toFixed(1)} MB
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-7">
              {overlayStyleOptions.map((option) => {
                const selected = localOverlayStyle === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLocalOverlayStyle(option.value)}
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
      </div>
    </div>
  )
}
