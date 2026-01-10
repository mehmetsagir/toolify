# Toolify UI Components Documentation

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Component Hierarchy](#component-hierarchy)
- [Component Reference](#component-reference)
- [State Management](#state-management)
- [IPC Communication](#ipc-communication)
- [Styling Conventions](#styling-conventions)
- [Adding New Components](#adding-new-components)
- [Modifying Components](#modifying-components)

---

## Architecture Overview

### Component Structure

```
src/renderer/src/components/
├── Settings.tsx              # Main settings container
├── History.tsx               # History viewer component
├── Status.tsx                # Main status/recording component
└── settings/
    ├── UpdateBanner.tsx      # Update & permission banners
    ├── GeneralSettings.tsx   # General app settings
    ├── DictationSettings.tsx # Dictation & model management
    ├── AudioSettings.tsx     # Audio & notification settings
    └── HistorySettings.tsx   # History management settings
```

### Design Philosophy

- **Component Composition**: Small, reusable components with clear responsibilities
- **Controlled Components**: Parent components manage state and pass down handlers
- **IPC Abstraction**: All main process communication through `window.api` interface
- **Local State Mirroring**: Each setting has local state for UI responsiveness
- **Tailwind-First**: All styling through Tailwind CSS utility classes

---

## Component Hierarchy

```
App (root)
└── Status/Settings (conditional)
    ├── Status
    │   └── Recording controls & visualization
    └── Settings
        ├── Sidebar (navigation)
        ├── UpdateBanner (alerts & permissions)
        ├── GeneralSettings
        │   └── HistorySettings
        ├── DictationSettings
        │   └── Model management UI
        └── AudioSettings
```

### Component Relationship Diagram

```
┌─────────────────────────────────────────┐
│              App.tsx                    │
│  (Routing: Status vs Settings window)   │
└─────────────────────────────────────────┘
              │
        ┌─────┴─────┐
        │           │
   ┌────▼───┐  ┌───▼────────┐
   │ Status │  │  Settings  │
   │        │  │  Container  │
   └────────┘  └───┬────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────────┐ ┌──▼───┐  ┌──────▼──────┐
│ UpdateBanner│ │ Side │  │  Settings   │
│ (alerts)    │ │ bar  │  │  Sections   │
└─────────────┘ └──────┘  └──┬─────┬────┘
                            │     │
              ┌─────────────┤     ├─────────────┐
              │             │     │             │
         ┌────▼────┐  ┌────▼──┐ ┌▼──────┐ ┌────▼──┐
         │ General │  │Audio  │ │History│  │Dict   │
         │         │  │       │ │       │  │       │
         └────┬────┘  └───────┘ └───────┘ └───────┘
              │
         ┌────▼────────┐
         │HistorySettings│
         └──────────────┘
```

---

## Component Reference

### Status Component

**Location**: `src/renderer/src/components/Status.tsx`

**Purpose**: Main recording interface with audio visualization and recording controls.

**Props**:

```typescript
interface StatusProps {
  status: 'idle' | 'recording' | 'processing'
  audioLevel?: number // Audio level for visualization (0-100)
  shortcut?: string // Keyboard shortcut display
  onRecordToggle: () => void // Start/stop recording handler
  onOpenSettings: () => void // Open settings window
  onOpenHistory?: () => void // Open history viewer (optional)
}
```

**Key Features**:

- Recording button with animated ripple effect
- Audio level reactive scaling
- Status text transitions
- Shortcut formatter (converts `Command+Space` → `⌘ SPACE`)
- Background gradient animations

**State**: None (fully controlled)

**IPC Methods Used**: None

**Example**:

```tsx
<Status
  status="recording"
  audioLevel={75}
  shortcut="Command+Space"
  onRecordToggle={() => window.api?.toggleRecording()}
  onOpenSettings={() => window.api?.openSettings()}
  onOpenHistory={() => window.api?.openHistory()}
/>
```

---

### Settings Component

**Location**: `src/renderer/src/components/Settings.tsx`

**Purpose**: Main settings container managing all application preferences.

**Props** (29 props total):

```typescript
interface SettingsProps {
  // API Configuration
  apiKey: string
  setApiKey: (key: string) => void

  // Language Settings
  sourceLanguage: string
  setSourceLanguage: (lang: string) => void
  targetLanguage: string
  setTargetLanguage: (lang: string) void

  // Shortcut & Actions
  shortcut: string
  setShortcut: (shortcut: string) => void
  translate: boolean
  setTranslate: (val: boolean) => void

  // Notifications
  processNotifications: boolean
  setProcessNotifications: (val: boolean) => void
  soundAlert: boolean
  setSoundAlert: (val: boolean) => void
  soundType: string
  setSoundType: (val: string) => void

  // App Behavior
  autoStart: boolean
  setAutoStart: (val: boolean) => void
  showDockIcon: boolean
  setShowDockIcon: (val: boolean) => void

  // Recording Overlay
  showRecordingOverlay: boolean
  setShowRecordingOverlay: (val: boolean) => void
  overlayStyle: 'compact' | 'large'
  setOverlayStyle: (val: 'compact' | 'large') => void

  // Local Model
  useLocalModel: boolean
  setUseLocalModel: (val: boolean) => void
  localModelType: LocalModelType
  setLocalModelType: (val: LocalModelType) => void
}
```

**Local State**:

- Accessibility permission status
- Update availability & download progress
- History settings (auto-delete, max items)
- Active tab & section navigation
- Model download status & progress maps
- Local model info list

**Key Features**:

- Sidebar navigation with icons
- Tab system (Settings vs History)
- Update management
- Model download/management
- Permission checking

**IPC Methods Used**:

```typescript
// Model Management
window.api.getLocalModelsInfo()
window.api.checkLocalModel(modelType)
window.api.downloadLocalModel(modelType)
window.api.deleteLocalModel(modelType)
window.api.openModelsFolder()
window.api.onModelDownloadProgress(callback)

// Updates
window.api.getUpdateStatus()
window.api.downloadUpdate()
window.api.quitAndInstall()
window.api.onUpdateAvailable(callback)
window.api.onUpdateDownloaded(callback)
window.api.onUpdateDownloadProgress(callback)

// Permissions
window.api.checkAccessibilityPermission()
window.api.openAccessibilitySettings()

// History
window.api.getHistorySettings()
window.api.saveHistorySettings(settings)

// Navigation
window.api.onShowHistory(callback)
```

---

### History Component

**Location**: `src/renderer/src/components/History.tsx`

**Purpose**: Three-panel history viewer with filtering and search.

**Props**:

```typescript
interface HistoryProps {
  onCopy: (text: string) => void // Copy to clipboard handler
}
```

**Local State**:

```typescript
history: HistoryItem[]              // All history items
searchQuery: string                 // Search input
activeFilter: 'all' | 'today' | 'week'
selectedItemId: string | null       // Currently viewed item
copiedId: string | null             // For copy feedback
```

**Component Structure**:

1. **Sidebar** (left): Filter tabs (All, Today, This Week)
2. **List View** (middle): Searchable history list
3. **Detail View** (right): Selected item details

**IPC Methods Used**:

```typescript
window.api.getAllHistory()
window.api.deleteHistoryItem(id)
window.api.clearHistory()
```

**Derived State** (computed with `useMemo`):

```typescript
filteredHistory // Search + filter applied
selectedItem // Current selection
getFilterCount() // Count per filter
getTotalDuration() // Sum of all durations
```

---

### UpdateBanner Component

**Location**: `src/renderer/src/components/settings/UpdateBanner.tsx`

**Purpose**: Display update availability and accessibility permission warnings.

**Props**:

```typescript
interface UpdateBannerProps {
  updateAvailable: boolean
  updateDownloaded: boolean
  latestVersion: string | null
  downloading: boolean
  updateDownloadProgress: number
  accessibilityGranted: boolean | null
  accessibilityRequired: boolean
  onDownloadUpdate: () => void
  onQuitAndInstall: () => void
}
```

**Banners**:

1. **Update Available**: Blue banner with download button
2. **Update Downloaded**: Green banner with install button
3. **Accessibility Required**: Yellow banner with instructions

**IPC Methods Used**:

```typescript
window.api.openAccessibilitySettings()
```

**Conditional Rendering**: Returns `null` if no banners to show

---

### GeneralSettings Component

**Location**: `src/renderer/src/components/settings/GeneralSettings.tsx`

**Purpose**: Basic application preferences and startup behavior.

**Props**:

```typescript
interface GeneralSettingsProps {
  autoStart: boolean
  setAutoStart: (val: boolean) => void
  showDockIcon: boolean
  setShowDockIcon: (val: boolean) => void
  historyAutoDeleteDays: number
  setHistoryAutoDeleteDays: (val: number) => void
  historyMaxItems: number
  setHistoryMaxItems: (val: number) => void
}
```

**Sub-Components**:

- `HistorySettings`: Auto-delete and max items configuration

**UI Elements**:

- Toggle switches with icons
- Dynamic descriptions based on state
- Number inputs with validation

---

### DictationSettings Component

**Location**: `src/renderer/src/components/settings/DictationSettings.tsx`

**Purpose**: Speech-to-text configuration and local model management.

**Props** (22 props):

```typescript
interface DictationSettingsProps {
  // Model Management
  modelDownloadStatusMap: Record<LocalModelType, ModelDownloadStatus>
  downloadProgressMap: Record<LocalModelType, Progress | null>
  localModelsInfo: LocalModelInfo[]
  onModelTypeChange: (newType: LocalModelType) => void
  onDownloadModel: (modelType: LocalModelType) => void
  onDeleteModel: (modelType: LocalModelType) => void
  onOpenModelsFolder: () => void

  // API Settings
  localKey: string
  setLocalKey: (key: string) => void

  // Language Settings
  localSourceLanguage: string
  setLocalSourceLanguage: (lang: string) => void
  localTargetLanguage: string
  setLocalTargetLanguage: (lang: string) => void

  // Recording Settings
  localShortcut: string
  setLocalShortcut: (shortcut: string) => void
  localTranslate: boolean
  setLocalTranslate: (val: boolean) => void
  localShowRecordingOverlay: boolean
  setLocalShowRecordingOverlay: (val: boolean) => void
  localOverlayStyle: 'compact' | 'large'
  setLocalOverlayStyle: (val: 'compact' | 'large') => void

  // Processing Mode
  localUseLocalModel: boolean
  setLocalUseLocalModel: (val: boolean) => void
  localLocalModelType: LocalModelType
}
```

**Key Sections**:

1. **Processing Mode**: Local vs Cloud (OpenAI)
2. **Local Models**: Download, delete, select models
3. **API Key**: OpenAI API key (cloud mode only)
4. **Keyboard Shortcut**: Global hotkey selection
5. **Languages**: Source and target language
6. **Translation Mode**: Enable/disable translation
7. **Recording Overlay**: Visual overlay settings

**Model Card UI**:

- Radio button for selection
- Status (downloading, ready, missing)
- Download button with progress bar
- Delete button for downloaded models
- File size display

**Model Types**:

```typescript
type LocalModelType = 'base' | 'small' | 'medium' | 'large-v3'
```

---

### AudioSettings Component

**Location**: `src/renderer/src/components/settings/AudioSettings.tsx`

**Purpose**: Sound and notification preferences.

**Props**:

```typescript
interface AudioSettingsProps {
  processNotifications: boolean
  setProcessNotifications: (val: boolean) => void
  soundAlert: boolean
  setSoundAlert: (val: boolean) => void
  soundType: string
  setSoundType: (val: string) => void
}
```

**Sound Options**:
Glass, Hero, Ping, Pop, Submarine, Basso, Blow, Bottle, Frog, Funk

**IPC Methods Used**:

```typescript
window.api.previewSound(soundType) // Preview sound on selection
```

---

### HistorySettings Component

**Location**: `src/renderer/src/components/settings/HistorySettings.tsx`

**Purpose**: History retention and cleanup configuration.

**Props**:

```typescript
interface HistorySettingsProps {
  autoDeleteDays: number
  setAutoDeleteDays: (val: number) => void
  maxItems: number
  setMaxItems: (val: number) => void
}
```

**Features**:

- Auto-delete after X days (0 = never)
- Maximum history items (0 = unlimited)
- Clear old history button

**IPC Methods Used**:

```typescript
window.api.clearOldHistory() // Returns deleted count
```

---

## State Management

### Pattern: Local State Mirroring

**Why?**: Settings need instant UI feedback but must persist to main process.

**Implementation**:

```typescript
// 1. Props from parent (persisted state)
interface SettingsProps {
  apiKey: string
  setApiKey: (key: string) => void // Persists to main process
}

// 2. Local state for UI
const [localKey, setLocalKey] = useState(initialKey)

// 3. Synchronized handler
const handleSetApiKey = useCallback(
  (value: string) => {
    setLocalKey(value) // Instant UI update
    setApiKey(value) // Persist to main process
  },
  [setApiKey]
)

// 4. Sync when props change (external updates)
useEffect(() => {
  setLocalKey(initialKey)
}, [initialKey])
```

**Benefits**:

- Instant UI response
- Main process as single source of truth
- Handles external state changes (e.g., other windows)

### State Flow Diagram

```
User Input
    │
    ▼
Local State Update (Instant UI feedback)
    │
    ▼
Prop Setter (Persist to main process)
    │
    ▼
Main Process State
    │
    ▼
Prop Update (Re-render with confirmed state)
```

---

## IPC Communication

### window.api Interface

**Type Definition**: `src/renderer/src/types.ts` (should exist or create)

**Available Methods**:

#### Model Management

```typescript
// Get info about all available models
window.api.getLocalModelsInfo(): Promise<LocalModelInfo[]>

// Check if specific model is downloaded
window.api.checkLocalModel(modelType: LocalModelType): Promise<boolean>

// Download a model
window.api.downloadLocalModel(modelType: LocalModelType): Promise<void>

// Delete a downloaded model
window.api.deleteLocalModel(modelType: LocalModelType): Promise<void>

// Open models folder in Finder
window.api.openModelsFolder(): Promise<void>

// Listen for download progress
window.api.onModelDownloadProgress(
  callback: (progress: ModelDownloadProgress) => void
): () => void  // Returns unsubscribe function
```

#### Update Management

```typescript
// Check for updates
window.api.getUpdateStatus(): Promise<UpdateStatus>

// Download available update
window.api.downloadUpdate(): Promise<void>

// Quit and install downloaded update
window.api.quitAndInstall(): Promise<void>

// Listen for update events
window.api.onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void
window.api.onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void
window.api.onUpdateDownloadProgress(
  callback: (progress: {percent: number}) => void
): () => void
```

#### Permissions

```typescript
// Check accessibility permission
window.api.checkAccessibilityPermission(): Promise<{
  granted: boolean
  required: boolean
}>

// Open system accessibility settings
window.api.openAccessibilitySettings(): Promise<void>
```

#### History

```typescript
// Get all history items
window.api.getAllHistory(): Promise<HistoryItem[]>

// Delete single item
window.api.deleteHistoryItem(id: string): Promise<boolean>

// Clear all history
window.api.clearHistory(): Promise<void>

// Clear old items based on settings
window.api.clearOldHistory(): Promise<number>  // Returns deleted count

// Get history settings
window.api.getHistorySettings(): Promise<HistorySettings>

// Save history settings
window.api.saveHistorySettings(settings: HistorySettings): Promise<void>
```

#### Audio

```typescript
// Preview sound
window.api.previewSound(soundType: string): Promise<void>
```

#### Navigation

```typescript
// Listen for show-history event
window.api.onShowHistory(callback: () => void): () => void
```

### IPC Usage Patterns

**1. One-way Call (Fire and Forget)**

```typescript
const handleClick = () => {
  window.api?.openSettings()
}
```

**2. Async/Await with Result**

```typescript
const handleDelete = async (id: string) => {
  try {
    const success = await window.api.deleteHistoryItem(id)
    if (success) {
      // Update local state
    }
  } catch (error) {
    console.error('Failed to delete:', error)
  }
}
```

**3. Event Listeners with Cleanup**

```typescript
useEffect(() => {
  if (!window.api?.onModelDownloadProgress) return

  const removeListener = window.api.onModelDownloadProgress((progress) => {
    setDownloadProgress(progress)
  })

  return removeListener // Cleanup on unmount
}, [])
```

**4. Null-Safe Calls**

```typescript
const checkPermission = async () => {
  if (window.api?.checkAccessibilityPermission) {
    const result = await window.api.checkAccessibilityPermission()
    setAccessibilityGranted(result.granted)
  }
}
```

---

## Styling Conventions

### Tailwind CSS Configuration

**Theme Colors** (`main.css`):

```css
--color-background: #09090b /* zinc-950 */ --color-surface: #18181b /* zinc-900 */
  --color-primary: #3b82f6 /* blue-500 */ --color-text: #fafafa /* zinc-50 */
  --color-text-muted: #a1a1aa /* zinc-400 */;
```

### Common Patterns

**1. Container Backgrounds**

```tsx
// Main background
<div className="bg-zinc-950">

// Surface/Card
<div className="bg-white/5 rounded-lg border border-white/5">

// Interactive surface
<div className="bg-zinc-900 hover:bg-zinc-800">
```

**2. Typography**

```tsx
// Headings
<h1 className="text-2xl font-semibold text-white">
<h2 className="text-lg font-medium text-white">

// Body text
<p className="text-sm text-zinc-300">

// Muted labels
<span className="text-xs text-zinc-500">
<label className="text-zinc-400 text-xs font-medium">
```

**3. Buttons**

```tsx
// Primary action
<button className="bg-blue-500 hover:bg-blue-600 text-white">

// Secondary action
<button className="bg-white/5 hover:bg-white/10 text-zinc-300">

// Destructive action
<button className="bg-red-500/10 hover:bg-red-500/20 text-red-400">

// Icon button
<button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5">
```

**4. Inputs**

```tsx
// Text input
<input className="w-full bg-white/5 text-white rounded-lg p-2.5 pl-3 text-sm
                  border border-white/10 focus:border-blue-500/50
                  focus:ring-2 focus:ring-blue-500/20 focus:outline-none">

// Select with custom arrow
<select className="appearance-none cursor-pointer">
  {/* Custom SVG arrow */}
</select>
```

**5. Toggle Switches**

```tsx
<button
  className={`w-11 h-6 rounded-full relative transition-all ${
    isActive ? 'bg-blue-600' : 'bg-white/10'
  }`}
>
  <div
    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full
                  shadow-sm transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
  />
</button>
```

**6. Borders and Dividers**

```tsx
// Section divider
<div className="border-t border-white/5 pt-4">

// Card border
<div className="rounded-lg border border-white/5">

// Focus ring
focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-2
focus:ring-offset-[#1a1a1a]
```

**7. Scrollbars**

```tsx
<div className="custom-scrollbar overflow-y-auto">
```

### Custom CSS Classes

**main.css**:

```css
/* Window dragging regions */
.drag {
  -webkit-app-region: drag;
}
.no-drag {
  -webkit-app-region: no-drag;
}

/* Custom scrollbar */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
}
```

**Usage**:

```tsx
// Draggable title bar
<div className="drag h-8">

// Interactive elements in drag region
<button className="no-drag">
```

### Animation Utilities

**Tailwind animations**:

```tsx
// Spin
<Loader2 className="animate-spin" />

// Pulse
<div className="animate-pulse">

// Slow spin (custom)
<div className="animate-spin-slow">  // Defined in tailwind config
```

**Transitions**:

```tsx
// Standard hover transition
className = 'transition-all duration-200'

// Color transition
className = 'transition-colors duration-150'

// Transform transition
className = 'transition-transform duration-75'
```

---

## Adding New Components

### Step 1: Create Component File

**Location**: Choose appropriate directory

- Top-level: `src/renderer/src/components/ComponentName.tsx`
- Settings subsection: `src/renderer/src/components/settings/ComponentName.tsx`

**Template**:

```tsx
import React from 'react'
import { IconName } from 'lucide-react'

interface ComponentNameProps {
  // Define props
  value: string
  onChange: (value: string) => void
  // Add more props as needed
}

export const ComponentName: React.FC<ComponentNameProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-white">Component Name</h2>
      {/* Component content */}
    </div>
  )
}
```

### Step 2: Define Props Interface

**Best Practices**:

- Use descriptive names (`onXxx` for callbacks)
- Include all necessary data
- Use TypeScript strict types
- Document with comments

```tsx
interface ComponentNameProps {
  // Data props
  items: ItemType[]
  selectedId: string

  // Callback props (prefixed with 'on')
  onSelect: (id: string) => void
  onDelete?: (id: string) => Promise<void> // Optional callback

  // Configuration props
  disabled?: boolean
  variant?: 'default' | 'compact'
}
```

### Step 3: Add to Parent Component

**For Settings Panels**:

```tsx
// 1. Add state in Settings.tsx
const [newSetting, setNewSetting] = useState(initialValue)

// 2. Add synchronized handler
const handleSetNewSetting = useCallback(
  (value: string) => {
    setLocalNewSetting(value)
    setNewSetting(value)
  },
  [setNewSetting]
)

// 3. Add to sidebarSections
const sidebarSections = [
  // ... existing sections
  {
    id: 'newsection',
    label: 'New Section',
    icon: IconName,
    category: 'main'
  }
]

// 4. Add to render
{
  activeSection === 'newsection' && (
    <NewSection newSetting={localNewSetting} setNewSetting={handleSetNewSetting} />
  )
}
```

### Step 4: Add IPC Methods (if needed)

**Main Process** (`src/main/ipc/*`):

```typescript
// Add IPC handler
ipcMain.handle('new-method', async (event, arg: ArgType) => {
  // Implement logic
  return result
})
```

**Preload Script** (`src/main/preload/index.ts`):

```typescript
export interface API {
  newMethod: (arg: ArgType) => Promise<ResultType>
}
```

**Renderer Component**:

```tsx
const handleAction = async () => {
  if (!window.api?.newMethod) return
  try {
    const result = await window.api.newMethod(arg)
    // Handle result
  } catch (error) {
    console.error('Failed:', error)
  }
}
```

### Step 5: Style the Component

**Follow existing patterns**:

```tsx
// Section header
<div className="space-y-8">
  <div>
    <h2 className="text-2xl font-semibold text-white mb-1.5 tracking-tight">Section Title</h2>
    <p className="text-sm text-zinc-500">Section description</p>
  </div>
  // Content cards
  <div className="space-y-4">
    <div className="bg-white/5 rounded-lg p-4 border border-white/5">{/* Card content */}</div>
  </div>
</div>
```

---

## Modifying Components

### Adding a New Setting

**Example**: Add "Enable Feature X" toggle to GeneralSettings

**1. Update State in App.tsx**:

```tsx
const [featureX, setFeatureX] = useState(false)
```

**2. Update Settings Props**:

```tsx
interface SettingsProps {
  // ... existing props
  featureX: boolean
  setFeatureX: (val: boolean) => void
}
```

**3. Pass Through Settings.tsx**:

```tsx
// Add local state
const [localFeatureX, setLocalFeatureX] = useState(initialFeatureX)

// Add handler
const handleSetFeatureX = useCallback(
  (value: boolean) => {
    setLocalFeatureX(value)
    setFeatureX(value)
  },
  [setFeatureX]
)

// Sync on prop change
useEffect(() => {
  setLocalFeatureX(initialFeatureX)
}, [initialFeatureX])

// Pass to child
<GeneralSettings
  // ... existing props
  featureX={localFeatureX}
  setFeatureX={handleSetFeatureX}
/>
```

**4. Add UI in GeneralSettings.tsx**:

```tsx
// Add to props interface
interface GeneralSettingsProps {
  // ... existing props
  featureX: boolean
  setFeatureX: (val: boolean) => void
}

// Add to component
export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  // ... existing props
  featureX,
  setFeatureX
}) => {
  return (
    <div className="space-y-8">
      {/* ... existing content */}

      {/* New Setting */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconName size={18} className="text-zinc-400" />
            <div className="flex flex-col">
              <span className="text-white text-sm font-medium">Feature X</span>
              <span className="text-zinc-500 text-xs mt-0.5">
                {featureX ? 'Enabled description' : 'Disabled description'}
              </span>
            </div>
          </div>

          <button
            onClick={() => setFeatureX(!featureX)}
            className={`w-11 h-6 rounded-full relative transition-all duration-200 ${
              featureX ? 'bg-blue-600' : 'bg-white/10'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                featureX ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
```

### Adding a New Settings Section

**1. Create Section Component**:

```tsx
// src/renderer/src/components/settings/NewSection.tsx
export const NewSection: React.FC<NewSectionProps> = (props) => {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-white mb-1.5">New Section</h2>
        <p className="text-sm text-zinc-500">Section description</p>
      </div>
      {/* Section content */}
    </div>
  )
}
```

**2. Add to Settings.tsx**:

```tsx
// Import
import { NewSection } from './settings/NewSection'

// Add to sidebar
const sidebarSections = [
  // ... existing
  {
    id: 'newsection',
    label: 'New Section',
    icon: IconFromLucideReact,
    category: 'main'
  }
]

// Add to render
{
  activeSection === 'newsection' && <NewSection prop1={localProp1} setProp1={handleSetProp1} />
}
```

### Modifying IPC Communication

**Add New IPC Handler**:

**1. Main Process** (`src/main/ipc/*`):

```typescript
import { ipcMain } from 'electron'

export const registerNewHandlers = () => {
  ipcMain.handle('new-method', async (event, arg) => {
    try {
      // Implement logic
      return result
    } catch (error) {
      console.error('IPC error:', error)
      throw error
    }
  })
}
```

**2. Preload** (`src/main/preload/index.ts`):

```typescript
import { ipcRenderer } from 'electron'

export const API: ElectronAPI = {
  // ... existing methods
  newMethod: (arg) => ipcRenderer.invoke('new-method', arg)
}
```

**3. Renderer Type Definition** (`src/renderer/src/types.ts`):

```typescript
export interface ElectronAPI {
  // ... existing methods
  newMethod?: (arg: ArgType) => Promise<ResultType>
}
```

**4. Use in Component**:

```tsx
const handleNewAction = async () => {
  if (!window.api?.newMethod) return
  try {
    const result = await window.api.newMethod(arg)
    // Update state based on result
  } catch (error) {
    console.error('Failed:', error)
  }
}
```

---

## Component Composition Patterns

### Compound Components

**Pattern**: Components that work together with shared state

**Example**: Model selection cards in DictationSettings

```tsx
// Parent manages state
const [selectedModel, setSelectedModel] = useState<LocalModelType>('base')

// Children receive handlers
{
  models.map((model) => (
    <ModelCard
      key={model.type}
      model={model}
      selected={selectedModel === model.type}
      onSelect={() => setSelectedModel(model.type)}
    />
  ))
}
```

### Render Props

**Pattern**: Pass rendering logic as props

**Example**:

```tsx
interface ContainerProps {
  renderHeader: () => React.ReactNode
  renderContent: () => React.ReactNode
}

export const Container: React.FC<ContainerProps> = ({ renderHeader, renderContent }) => {
  return (
    <div className="container">
      {renderHeader()}
      {renderContent()}
    </div>
  )
}

// Usage
;<Container renderHeader={() => <h1>Title</h1>} renderContent={() => <p>Content</p>} />
```

### Higher-Order Components (HOC)

**Pattern**: Wrap components with additional functionality

**Example**: With loading state

```tsx
function withLoading<P extends object>(
  Component: React.ComponentType<P>
) {
  return (props: P & { loading: boolean }) => {
    if (props.loading) {
      return <Loader />
    }
    return <Component {...(props as P)} />
  }
}

// Usage
const ModelListWithLoading = withLoading(ModelList)
<ModelListWithLoading loading={isLoading} models={models} />
```

### Custom Hooks

**Pattern**: Extract reusable logic

**Example**: History filtering

```tsx
function useFilteredHistory(history: HistoryItem[], query: string, filter: FilterType) {
  return useMemo(() => {
    let filtered = history

    // Apply search
    if (query) {
      filtered = filtered.filter((item) => item.text.toLowerCase().includes(query.toLowerCase()))
    }

    // Apply filter
    if (filter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      filtered = filtered.filter((item) => item.timestamp >= today.getTime())
    }

    return filtered
  }, [history, query, filter])
}

// Usage
const filteredHistory = useFilteredHistory(history, searchQuery, activeFilter)
```

---

## Best Practices

### Component Design

1. **Single Responsibility**: Each component should have one clear purpose
2. **Props Interface**: Always define explicit prop interfaces
3. **Default Props**: Provide sensible defaults for optional props
4. **Controlled Components**: Parent controls state, child handles display
5. **Memoization**: Use `useMemo` and `useCallback` for performance

### State Management

1. **Local State for UI**: Use local state for ephemeral UI state
2. **Prop State for Persistence**: Persist important state through props
3. **State Colocation**: Keep state as close to usage as possible
4. **Avoid Prop Drilling**: Consider context for deeply nested state

### IPC Communication

1. **Null Checks**: Always check `window.api?.method` before calling
2. **Error Handling**: Wrap IPC calls in try-catch
3. **Loading States**: Show loading indicators during async operations
4. **Listener Cleanup**: Always remove listeners in useEffect cleanup

### Styling

1. **Consistent Spacing**: Use Tailwind's spacing scale (2, 4, 8, etc.)
2. **Semantic Colors**: Use color utilities consistently
3. **Responsive Design**: Use Tailwind's responsive prefixes
4. **Custom Classes**: Minimize custom CSS, use Tailwind utilities

### Performance

1. **Code Splitting**: Lazy load heavy components
2. **List Keys**: Always provide unique keys for list items
3. **Avoid Inline Functions**: Use `useCallback` for handlers
4. **Debounce Inputs**: Debounce search inputs and frequent updates

---

## Quick Reference

### Icon Library

**Package**: `lucide-react`

**Common Icons**:

```tsx
import {
  Mic,
  Settings,
  History,
  Bell,
  Volume2,
  Trash2,
  Copy,
  Calendar,
  CheckCircle2,
  Loader2,
  Download,
  Check
} from 'lucide-react'
```

### Color Palette

```tsx
// Backgrounds
bg - zinc - 950 // Main background
bg - zinc - 900 // Surface
bg - white / 5 // Card
bg - blue - 500 / 10 // Accent surface

// Text
text - white // Primary
text - zinc - 300 // Secondary
text - zinc - 500 // Muted
text - zinc - 400 // Labels

// Accent
text - blue - 400 // Primary accent
text - blue - 500 // Buttons
text - green - 400 // Success
text - red - 400 // Destructive
text - yellow - 400 // Warning
```

### Spacing Scale

```tsx
// Padding
p - 2 // 8px
p - 4 // 16px
p - 6 // 24px
p - 8 // 32px

// Gap
gap - 2 // 8px
gap - 3 // 12px
gap -
  4 - // 16px
  // Margin (negative for layout)
  mt -
  4 // -16px
mb - 8 // 32px
```

---

## Troubleshooting

### Common Issues

**1. Component Not Re-rendering**

- Check state updates are using `setState`
- Verify prop changes are triggering updates
- Use `useEffect` to log prop changes for debugging

**2. IPC Methods Undefined**

- Ensure method is exposed in preload script
- Check `window.api` is defined
- Verify method name matches preload export

**3. Styling Not Applied**

- Check Tailwind class names are correct
- Verify CSS import order
- Use `!important` sparingly for overrides

**4. Event Listeners Not Cleanup**

- Always return cleanup function from `useEffect`
- Store unsubscribe function and call it
- Test for memory leaks with dev tools

---

## Additional Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Electron Docs](https://www.electronjs.org/docs)
- [Lucide Icons](https://lucide.dev/icons/)
