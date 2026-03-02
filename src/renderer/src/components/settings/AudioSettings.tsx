import { useState, useEffect, useCallback } from 'react'
import type { ReactElement } from 'react'
import { Keyboard } from 'lucide-react'
import { Switch } from '@renderer/components/ui/switch'
import { Label } from '@renderer/components/ui/label'
import { Button } from '@renderer/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@renderer/components/ui/select'
import { cn } from '@renderer/lib/utils'
import type { Settings } from '../../../../shared/types'

const SHORTCUT_PRESETS = [
  { value: 'CommandOrControl+Space', label: 'Command + Space' },
  { value: 'RightCommand', label: 'Right Command' },
  { value: 'custom', label: 'Custom...' }
]

function isPresetShortcut(shortcut: string): boolean {
  return SHORTCUT_PRESETS.some((p) => p.value === shortcut && p.value !== 'custom')
}

function formatShortcutDisplay(shortcut: string): string {
  return shortcut
    .replace('CommandOrControl', '⌘')
    .replace('Command', '⌘')
    .replace('Control', '⌃')
    .replace('Alt', '⌥')
    .replace('Shift', '⇧')
    .replace('RightCommand', '⌘ Right')
    .replace(/\+/g, ' + ')
}

interface ShortcutRecorderProps {
  currentShortcut: string
  onSave: (shortcut: string) => void
  onCancel: () => void
}

function ShortcutRecorder({
  currentShortcut,
  onSave,
  onCancel
}: ShortcutRecorderProps): ReactElement {
  const [recording, setRecording] = useState(false)
  const [draft, setDraft] = useState(currentShortcut)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!recording) return
      e.preventDefault()
      e.stopPropagation()

      const parts: string[] = []
      if (e.metaKey) parts.push('Command')
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      const key = e.key
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(key)) {
        parts.push(key.toUpperCase())
        const combo = parts.join('+')
        setDraft(combo)
        setRecording(false)
      }
    },
    [recording]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => setRecording(true)}
        className={cn(
          'flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors',
          recording
            ? 'border-zinc-400 bg-zinc-800 text-zinc-100 animate-pulse'
            : 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600'
        )}
      >
        <Keyboard className="h-4 w-4 text-zinc-500" />
        <span className="flex-1">{recording ? 'Press keys...' : formatShortcutDisplay(draft)}</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(draft)} className="flex-1">
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface Props {
  settings: Settings
  saveSettings: (updates: Partial<Settings>) => void
}

export default function AudioSettings({ settings, saveSettings }: Props): ReactElement {
  const currentShortcut = settings.shortcut ?? 'CommandOrControl+Space'
  const [showCustomRecorder, setShowCustomRecorder] = useState(!isPresetShortcut(currentShortcut))

  const handlePresetChange = (value: string): void => {
    if (value === 'custom') {
      setShowCustomRecorder(true)
    } else {
      setShowCustomRecorder(false)
      saveSettings({ shortcut: value })
    }
  }

  const handleCustomSave = (shortcut: string): void => {
    saveSettings({ shortcut })
    setShowCustomRecorder(false)
  }

  const selectedPreset = isPresetShortcut(currentShortcut) ? currentShortcut : 'custom'

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Keyboard Shortcut */}
      <div className="rounded-[20px] bg-white/[0.03] p-4 flex flex-col gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-zinc-200">Keyboard Shortcut</span>
          <span className="text-xs text-zinc-500">Global shortcut to start and stop recording</span>
        </div>

        <Select value={selectedPreset} onValueChange={handlePresetChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHORTCUT_PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showCustomRecorder && (
          <ShortcutRecorder
            currentShortcut={currentShortcut}
            onSave={handleCustomSave}
            onCancel={() => setShowCustomRecorder(false)}
          />
        )}

        {!showCustomRecorder && (
          <div className="flex items-center gap-2 rounded-xl bg-black/20 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <Keyboard className="h-4 w-4 text-zinc-500" />
            <span className="text-sm text-zinc-400">{formatShortcutDisplay(currentShortcut)}</span>
          </div>
        )}
      </div>

      {/* Recording Overlay */}
      <div className="rounded-[20px] bg-white/[0.03] divide-y divide-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-zinc-200">Recording Overlay</span>
            <span className="text-xs text-zinc-500">
              Show a floating indicator during recording
            </span>
          </div>
          <Switch
            checked={settings.showRecordingOverlay ?? true}
            onCheckedChange={(checked) => saveSettings({ showRecordingOverlay: checked })}
          />
        </div>

        {settings.showRecordingOverlay && (
          <div className="px-4 py-3 flex flex-col gap-1.5">
            <Label className="text-xs text-zinc-400">Overlay Style</Label>
            <Select
              value={settings.overlayStyle ?? 'compact'}
              onValueChange={(value) =>
                saveSettings({ overlayStyle: value as Settings['overlayStyle'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  )
}
