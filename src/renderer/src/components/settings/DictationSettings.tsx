import React, { useState, useEffect } from 'react'
import {
  Key,
  Languages,
  Zap,
  Download,
  Check,
  Trash2,
  Loader2,
  FolderOpen,
  Cpu,
  Cloud,
  Mic,
  Globe
} from 'lucide-react'
import type {
  LocalModelInfo,
  LocalModelType,
  TranscriptionProvider
} from '../../../../shared/types'

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
  localGoogleApiKey: string
  setLocalGoogleApiKey: (key: string) => void
  localSourceLanguage: string
  setLocalSourceLanguage: (lang: string) => void
  localTargetLanguage: string
  setLocalTargetLanguage: (lang: string) => void
  localTranslate: boolean
  setLocalTranslate: (val: boolean) => void
  localTranscriptionProvider: TranscriptionProvider
  setLocalTranscriptionProvider: (val: TranscriptionProvider) => void
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
  localGoogleApiKey,
  setLocalGoogleApiKey,
  localSourceLanguage,
  setLocalSourceLanguage,
  localTargetLanguage,
  setLocalTargetLanguage,
  localTranslate,
  setLocalTranslate,
  localTranscriptionProvider,
  setLocalTranscriptionProvider,
  localLocalModelType
}) => {
  const [appleSttStatus, setAppleSttStatus] = useState<{
    available: boolean
    permissionGranted: boolean
    checking: boolean
  }>({ available: false, permissionGranted: false, checking: false })

  useEffect(() => {
    if (localTranscriptionProvider === 'apple-stt') {
      setAppleSttStatus((prev) => ({ ...prev, checking: true }))
      window.api
        ?.checkAppleStt?.()
        .then((result) => {
          setAppleSttStatus({
            available: result?.available ?? false,
            permissionGranted: result?.permissionGranted ?? false,
            checking: false
          })
        })
        .catch(() => {
          setAppleSttStatus({ available: false, permissionGranted: false, checking: false })
        })
    }
  }, [localTranscriptionProvider])

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Transcription</h2>
        <p className="text-sm text-zinc-500">Speech recognition and translation configuration</p>
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
                  Choose how your voice recordings are transcribed.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => setLocalTranscriptionProvider('local-whisper')}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  localTranscriptionProvider === 'local-whisper'
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${localTranscriptionProvider === 'local-whisper' ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Cpu
                    size={16}
                    className={
                      localTranscriptionProvider === 'local-whisper'
                        ? 'text-blue-300'
                        : 'text-zinc-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Local Whisper</p>
                  <p className="text-xs text-zinc-500">
                    Works on your device without internet. Requires a model download.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocalTranscriptionProvider('openai')}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  localTranscriptionProvider === 'openai'
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${localTranscriptionProvider === 'openai' ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Cloud
                    size={16}
                    className={
                      localTranscriptionProvider === 'openai' ? 'text-blue-300' : 'text-zinc-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">OpenAI Cloud</p>
                  <p className="text-xs text-zinc-500">
                    Uses the OpenAI Whisper API. API Key required.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocalTranscriptionProvider('apple-stt')}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  localTranscriptionProvider === 'apple-stt'
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${localTranscriptionProvider === 'apple-stt' ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Mic
                    size={16}
                    className={
                      localTranscriptionProvider === 'apple-stt' ? 'text-blue-300' : 'text-zinc-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Apple Speech</p>
                  <p className="text-xs text-zinc-500">
                    Uses macOS built-in speech recognition. No API key or model download needed.
                  </p>
                </div>
              </button>
              <button
                onClick={() => setLocalTranscriptionProvider('google-cloud')}
                className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-all text-left ${
                  localTranscriptionProvider === 'google-cloud'
                    ? 'border-blue-400/60 bg-blue-500/10'
                    : 'border-white/10 bg-black/20 hover:border-white/30'
                }`}
              >
                <div
                  className={`p-2 rounded-full ${localTranscriptionProvider === 'google-cloud' ? 'bg-blue-500/20' : 'bg-white/10'}`}
                >
                  <Globe
                    size={16}
                    className={
                      localTranscriptionProvider === 'google-cloud'
                        ? 'text-blue-300'
                        : 'text-zinc-400'
                    }
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Google Cloud</p>
                  <p className="text-xs text-zinc-500">
                    Uses Google Cloud Speech-to-Text API. API Key required.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {localTranscriptionProvider === 'local-whisper' && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs font-medium mb-1">Local Model Setup</p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Models are downloaded once and stored in `~/Library/Application
                  Support/Toolify/models`. Select the model you want to use below and download it if
                  needed.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                <span>Select, download, or delete models from cache.</span>
                <button
                  onClick={onOpenModelsFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-lg border border-white/10 text-zinc-300 hover:border-white/30 transition-colors"
                >
                  <FolderOpen size={12} /> Open in Finder
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {localModelsInfo.length === 0 && (
                  <p className="text-xs text-zinc-500">
                    Loading models... Please try again in a moment.
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
                                ? `Downloaded • ${displaySize} MB`
                                : `Not Downloaded • ${model.expectedSizeMB.toFixed(1)} MB`}
                            </p>
                          </div>
                        </label>

                        {isReady && (
                          <button
                            onClick={async () => {
                              if (
                                confirm(
                                  `Delete ${model.displayName} model? You'll need to download it again to use it.`
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
                              <Loader2 size={11} className="animate-spin" /> Downloading
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
                              <Download size={12} /> Download Model
                            </button>
                          )}
                          {isReady ? (
                            <span className="flex items-center gap-1 text-green-400">
                              <Check size={12} /> Ready
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

          {localTranscriptionProvider === 'apple-stt' && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs font-medium mb-1">Apple Speech Recognition</p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Uses macOS built-in on-device speech recognition (SFSpeechRecognizer). No API key
                  or model download required. Speech Recognition permission is needed.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                {appleSttStatus.checking ? (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Loader2 size={12} className="animate-spin" /> Checking status...
                  </span>
                ) : appleSttStatus.permissionGranted && appleSttStatus.available ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check size={12} /> Ready
                  </span>
                ) : !appleSttStatus.permissionGranted ? (
                  <span className="text-amber-400">
                    Speech Recognition permission required. See the Permissions tab to manage.
                  </span>
                ) : (
                  <span className="text-amber-400">
                    Speech recognizer not available for the current language.
                  </span>
                )}
              </div>
            </div>
          )}

          {localTranscriptionProvider === 'google-cloud' && (
            <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-blue-300 text-xs font-medium mb-1">
                  Google Cloud Speech-to-Text
                </p>
                <p className="text-blue-200/80 text-xs leading-relaxed">
                  Uses Google Cloud Speech-to-Text API (v1 REST). Enable the Speech-to-Text API in
                  your Google Cloud Console and create an API key.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* API Key - show for OpenAI or Google Cloud */}
        {localTranscriptionProvider === 'openai' && (
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
            </div>
            <p className="text-[10px] text-zinc-600 px-1">
              Required for speech transcription and translation
            </p>
          </div>
        )}

        {localTranscriptionProvider === 'google-cloud' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <Key size={12} />
              <span>Google Cloud API Key</span>
            </div>
            <div className="relative group">
              <input
                type="password"
                value={localGoogleApiKey}
                onChange={(e) => setLocalGoogleApiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm border border-white/10 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all placeholder:text-zinc-600"
              />
            </div>
            <p className="text-[10px] text-zinc-600 px-1">
              Required for Google Cloud speech transcription
            </p>
          </div>
        )}

        {/* Spoken Language */}
        {(localTranscriptionProvider !== 'local-whisper' || localTranslate) && (
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

        {/* Translation - hidden for Apple Speech (no translation support without API) */}
        {localTranscriptionProvider !== 'apple-stt' && (
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
        )}
      </div>
    </div>
  )
}
