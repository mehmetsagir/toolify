import { useState } from 'react'
import type { ReactElement } from 'react'
import { Eye, EyeOff, Cloud, HardDrive, Mic, Globe } from 'lucide-react'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { Input } from '@renderer/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'
import type { Settings, TranscriptionProvider } from '../../../../shared/types'

const LANGUAGES_WITH_AUTO = [
  { value: 'auto', label: 'Auto Detect' },
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ar', label: 'Arabic' }
]

const LANGUAGES = LANGUAGES_WITH_AUTO.filter((l) => l.value !== 'auto')

const LOCAL_MODEL_TYPES = [
  { value: 'base', label: 'Base (~150 MB)' },
  { value: 'small', label: 'Small (~490 MB)' },
  { value: 'medium', label: 'Medium (~1.5 GB)' },
  { value: 'large-v3', label: 'Large v3 (~3 GB)' }
]

interface ProviderCardProps {
  id: TranscriptionProvider
  label: string
  description: string
  icon: ReactElement
  selected: boolean
  onSelect: () => void
}

function ProviderCard({
  label,
  description,
  icon,
  selected,
  onSelect
}: ProviderCardProps): ReactElement {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 rounded-[18px] p-3 text-left transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]',
        selected
          ? 'bg-white/[0.08] text-zinc-100'
          : 'bg-white/[0.03] text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-200'
      )}
    >
      <div
        className={cn(
          'mt-0.5 shrink-0 rounded-md p-1.5',
          selected ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-800 text-zinc-500'
        )}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{description}</div>
      </div>
    </button>
  )
}

interface ApiKeyInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function ApiKeyInput({ label, value, onChange, placeholder }: ApiKeyInputProps): ReactElement {
  const [visible, setVisible] = useState(false)
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="relative">
        <Input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Paste your API key'}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

interface Props {
  settings: Settings
  saveSettings: (updates: Partial<Settings>) => void
}

export default function DictationSettings({ settings, saveSettings }: Props): ReactElement {
  const provider = settings.transcriptionProvider ?? 'openai'

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Provider Selection */}
      <div className="flex flex-col gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Transcription Provider
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <ProviderCard
            id="openai"
            label="OpenAI Whisper"
            description="Cloud-based, high accuracy"
            icon={<Cloud className="h-4 w-4" />}
            selected={provider === 'openai'}
            onSelect={() => saveSettings({ transcriptionProvider: 'openai' })}
          />
          <ProviderCard
            id="local-whisper"
            label="Local Whisper"
            description="Offline, runs on device"
            icon={<HardDrive className="h-4 w-4" />}
            selected={provider === 'local-whisper'}
            onSelect={() => saveSettings({ transcriptionProvider: 'local-whisper' })}
          />
          <ProviderCard
            id="apple-stt"
            label="Apple Speech"
            description="Native macOS speech recognition"
            icon={<Mic className="h-4 w-4" />}
            selected={provider === 'apple-stt'}
            onSelect={() => saveSettings({ transcriptionProvider: 'apple-stt' })}
          />
          <ProviderCard
            id="google-cloud"
            label="Google Cloud STT"
            description="Cloud-based, multi-language"
            icon={<Globe className="h-4 w-4" />}
            selected={provider === 'google-cloud'}
            onSelect={() => saveSettings({ transcriptionProvider: 'google-cloud' })}
          />
        </div>
      </div>

      {/* Provider-specific config */}
      {provider === 'openai' && (
        <div className="rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <ApiKeyInput
            label="OpenAI API Key"
            value={settings.apiKey ?? ''}
            onChange={(value) => saveSettings({ apiKey: value })}
            placeholder="sk-..."
          />
        </div>
      )}

      {provider === 'google-cloud' && (
        <div className="rounded-[20px] bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <ApiKeyInput
            label="Google Cloud API Key"
            value={settings.googleApiKey ?? ''}
            onChange={(value) => saveSettings({ googleApiKey: value })}
            placeholder="AIza..."
          />
        </div>
      )}

      {provider === 'local-whisper' && (
        <div className="rounded-[20px] bg-white/[0.03] p-4 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Model Size</Label>
            <Select
              value={settings.localModelType ?? 'base'}
              onValueChange={(value) =>
                saveSettings({ localModelType: value as Settings['localModelType'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCAL_MODEL_TYPES.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-zinc-500">
            Download and manage models in the <strong className="text-zinc-400">Models</strong> tab.
          </p>
        </div>
      )}

      {/* Translation */}
      <div className="rounded-[20px] bg-white/[0.03] divide-y divide-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-zinc-200">Translation</span>
            <span className="text-xs text-zinc-500">Translate transcription output</span>
          </div>
          <Switch
            checked={settings.translate ?? false}
            onCheckedChange={(checked) => saveSettings({ translate: checked })}
          />
        </div>

        {settings.translate && (
          <>
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Source Language</Label>
              <Select
                value={settings.sourceLanguage ?? 'auto'}
                onValueChange={(value) => saveSettings({ sourceLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES_WITH_AUTO.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="px-4 py-3 flex flex-col gap-1.5">
              <Label className="text-xs text-zinc-400">Target Language</Label>
              <Select
                value={settings.targetLanguage ?? 'en'}
                onValueChange={(value) => saveSettings({ targetLanguage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
