import type { ReactElement } from 'react'
import { Volume2 } from 'lucide-react'
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

const SOUND_TYPES = [
  'Glass',
  'Basso',
  'Blow',
  'Bottle',
  'Frog',
  'Funk',
  'Hero',
  'Morse',
  'Ping',
  'Pop',
  'Purr',
  'Sosumi',
  'Submarine',
  'Tink'
]

interface SettingRowProps {
  label: string
  description?: string
  children: React.ReactNode
  className?: string
}

function SettingRow({ label, description, children, className }: SettingRowProps): ReactElement {
  return (
    <div className={cn('flex items-center justify-between gap-4 py-3', className)}>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-zinc-200">{label}</span>
        {description && <span className="text-xs text-zinc-500">{description}</span>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

interface Props {
  settings: Settings
  saveSettings: (updates: Partial<Settings>) => void
}

export default function GeneralSettings({ settings, saveSettings }: Props): ReactElement {
  const handlePreviewSound = (): void => {
    window.api.previewSound(settings.soundType ?? 'Glass')
  }

  return (
    <div className="p-4">
      <div className="rounded-[20px] bg-white/[0.03] divide-y divide-white/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
        <div className="px-4">
          <SettingRow
            label="Launch at Login"
            description="Automatically start Toolify when you log in"
          >
            <Switch
              checked={settings.autoStart ?? false}
              onCheckedChange={(checked) => saveSettings({ autoStart: checked })}
            />
          </SettingRow>
        </div>

        <div className="px-4">
          <SettingRow
            label="Tray Animations"
            description="Animate the menu bar icon during recording"
          >
            <Switch
              checked={settings.trayAnimations ?? true}
              onCheckedChange={(checked) => saveSettings({ trayAnimations: checked })}
            />
          </SettingRow>
        </div>

        <div className="px-4">
          <SettingRow
            label="Process Notifications"
            description="Show a notification when transcription completes"
          >
            <Switch
              checked={settings.processNotifications ?? true}
              onCheckedChange={(checked) => saveSettings({ processNotifications: checked })}
            />
          </SettingRow>
        </div>

        <div className="px-4">
          <SettingRow label="Sound Alert" description="Play a sound when transcription finishes">
            <Switch
              checked={settings.soundAlert ?? false}
              onCheckedChange={(checked) => saveSettings({ soundAlert: checked })}
            />
          </SettingRow>
        </div>

        {settings.soundAlert && (
          <div className="px-4 py-3">
            <Label className="mb-2 block text-xs text-zinc-400">Sound Type</Label>
            <div className="flex items-center gap-2">
              <Select
                value={settings.soundType ?? 'Glass'}
                onValueChange={(value) => saveSettings({ soundType: value })}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOUND_TYPES.map((sound) => (
                    <SelectItem key={sound} value={sound}>
                      {sound}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviewSound}
                title="Preview sound"
                className="border-zinc-700/70 bg-black/20"
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
