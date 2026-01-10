# Toolify Development Guide

Comprehensive guide for contributing to and developing Toolify, an AI-powered voice transcription and translation tool for macOS.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Build System (electron-vite)](#build-system-electron-vite)
- [Architecture Overview](#architecture-overview)
- [Adding New Features](#adding-new-features)
- [Debugging](#debugging)
- [Common Development Workflows](#common-development-workflows)
- [Working with the Dual-Process Architecture](#working-with-the-dual-process-architecture)
- [Adding IPC Channels](#adding-ipc-channels)
- [Modifying UI Components](#modifying-ui-components)
- [Local Development with Swift Helper](#local-development-with-swift-helper)
- [Testing](#testing)
- [Building for Distribution](#building-for-distribution)

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **macOS**: 10.12 (Sierra) or later (for macOS app development)
- **Xcode**: Latest version (for Swift helper development, optional)
- **FFmpeg**: Required for audio conversion (install via `brew install ffmpeg`)

### Installation Steps

```bash
# Clone the repository
git clone https://github.com/mehmetsagir/toolify.git
cd toolify

# Install dependencies
npm install

# Verify installation
npm run typecheck
```

### Environment Setup

No environment variables are required for development. The application uses:

- **Electron Store** for user settings (stored in `~/Library/Application Support/Toolify`)
- **System Keychain** for API keys on macOS
- **OpenAI API** for online transcription (requires API key from user)

### Development Tools

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run typecheck          # Check all TypeScript
npm run typecheck:node     # Check main/preload processes
npm run typecheck:web      # Check renderer process

# Linting and formatting
npm run lint               # Check code style
npm run format             # Format code with Prettier
```

## Project Structure

```
toolify/
├── src/
│   ├── main/              # Main process (Node.js environment)
│   │   ├── index.ts       # Entry point, app lifecycle, IPC handlers
│   │   ├── auto-updater.ts # Auto-update functionality
│   │   ├── local-whisper.ts # Local Whisper model integration
│   │   ├── openai.ts      # OpenAI API integration
│   │   ├── types.ts       # Main process types
│   │   └── utils/         # Main process utilities
│   │       ├── history.ts # History management
│   │       ├── overlay-template.ts # Recording overlay HTML
│   │       ├── settings.ts # Settings persistence
│   │       ├── system.ts  # System utilities (sound, notifications)
│   │       ├── transcription-helpers.ts # Transcription helpers
│   │       └── windows.ts # Window creation helpers
│   ├── preload/           # Preload script (secure bridge)
│   │   ├── index.ts       # Preload script - exposes safe APIs to renderer
│   │   └── index.d.ts     # TypeScript declarations for exposed APIs
│   ├── renderer/          # Renderer process (React application)
│   │   └── src/
│   │       ├── App.tsx    # Main React component
│   │       ├── main.tsx   # React entry point
│   │       └── components/ # React components
│   │           ├── Status.tsx      # Recording status UI
│   │           ├── Settings.tsx    # Settings panel
│   │           ├── History.tsx     # History management UI
│   │           └── settings/       # Settings sub-components
│   │               ├── GeneralSettings.tsx
│   │               ├── AudioSettings.tsx
│   │               ├── DictationSettings.tsx
│   │               ├── HistorySettings.tsx
│   │               └── UpdateBanner.tsx
│   └── shared/            # Shared code (types, utilities)
│       └── types/         # Shared TypeScript types
│           ├── index.ts
│           ├── settings.types.ts
│           ├── history.types.ts
│           ├── local-models.types.ts
│           └── update.types.ts
├── resources/             # Static assets
│   └── icon.png          # App icon
├── scripts/              # Build and utility scripts
│   └── copy-whisper-executables.js
├── ToolifySwift/         # Swift helper (optional, for system-level features)
├── out/                  # Compiled output (generated)
├── dist/                 # Distribution builds (generated)
├── electron.vite.config.ts   # Electron-Vite configuration
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Build System (electron-vite)

Toolify uses **electron-vite**, a build tool optimized for Electron applications that combines Vite's fast development experience with Electron's multi-process architecture.

### How electron-vite Works

electron-vite manages three separate build processes:

1. **Main Process**: Node.js environment that runs the Electron backend
2. **Preload Script**: Secure bridge between main and renderer processes
3. **Renderer Process**: React frontend (web environment)

### Configuration

```typescript
// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()] // Externalize Node.js dependencies
  },
  preload: {
    plugins: [externalizeDepsPlugin()] // Externalize Node.js dependencies
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src') // Path alias for cleaner imports
      }
    },
    plugins: [react()] // React plugin for JSX
  }
})
```

### Build Commands

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build           # Type-check + build
npm run build:skip-check # Build without type-checking (faster)

# Platform-specific builds
npm run build:mac       # Build for macOS
npm run build:win       # Build for Windows
npm run build:linux     # Build for Linux

# Build DMG (macOS installer)
npm run build:dmg       # Build DMG without type-checking

# Unpacked build (for testing)
npm run build:unpack    # Build without creating installer
```

### Build Output

- **Development**: Files are built in memory with hot reload
- **Production**: Compiled files go to `out/` directory
  - `out/main/index.js` - Main process
  - `out/preload/index.js` - Preload script
  - `out/renderer/` - Renderer assets (HTML, CSS, JS)

## Architecture Overview

### Electron Multi-Process Architecture

Toolify follows Electron's security model with three separate processes:

```
┌─────────────────────────────────────────────────────────────┐
│                        Main Process                          │
│  (Node.js environment - full system access)                  │
│  - Application lifecycle                                     │
│  - Window management                                         │
│  - Native integrations (keyboard shortcuts, tray, etc.)      │
│  - File system access                                        │
│  - API calls (OpenAI, local models)                          │
└──────────────┬────────────────────────────────┬──────────────┘
               │                                │
               │ IPC (Inter-Process Communication)
               │                                │
┌──────────────▼─────────────┐    ┌───────────▼────────────────┐
│      Preload Script        │    │    Renderer Process       │
│  (Secure bridge)           │    │  (Chrome/Chromium sandbox) │
│  - Exposes safe APIs       │───▶│  - React UI               │
│  - Context isolation       │    │  - Web APIs (microphone)  │
│  - Type-safe bridge        │    │  - No direct Node.js access│
└────────────────────────────┘    └──────────────────────────┘
```

### Key Design Patterns

1. **IPC Communication**: All communication between processes uses IPC (Inter-Process Communication)
2. **Context Isolation**: Renderer process cannot directly access Node.js APIs
3. **Type Safety**: Shared TypeScript types ensure type-safe IPC communication
4. **Event-Driven**: Main process sends events to renderer; renderer invokes methods on main

### Data Flow Example (Recording)

```
User presses shortcut
    ↓
Main Process (globalShortcut/uiohook)
    ↓ (IPC event: 'start-recording')
Renderer Process (App.tsx)
    ↓ (Web API: navigator.mediaDevices.getUserMedia)
Microphone access
    ↓ (IPC invoke: 'set-recording-state')
Main Process (updates tray icon, shows overlay)
    ↓ (IPC event: 'update-recording-audio-level')
Recording Overlay (audio visualization)
    ↓ (User presses shortcut again)
Main Process (IPC event: 'stop-recording')
    ↓
Renderer Process (MediaRecorder.stop)
    ↓ (IPC invoke: 'process-audio' with ArrayBuffer)
Main Process (transcribe/transcribeLocal)
    ↓ (OpenAI API or local Whisper)
Clipboard copy
    ↓ (IPC event: 'processing-complete')
Renderer Process (updates UI)
```

## Adding New Features

### Feature Development Workflow

1. **Plan the feature**
   - Identify which process needs the changes (main, renderer, or both)
   - Determine if new IPC channels are needed
   - Check if new types are required

2. **Add shared types** (if data structures are shared)

   ```typescript
   // src/shared/types/my-feature.types.ts
   export interface MyFeatureSettings {
     enabled: boolean
     config: string
   }
   ```

3. **Implement main process logic**

   ```typescript
   // src/main/my-feature.ts
   import { ipcMain } from 'electron'

   export function setupMyFeature() {
     ipcMain.handle('my-feature-action', async () => {
       // Implementation
       return result
     })
   }
   ```

4. **Add preload API** (expose to renderer)

   ```typescript
   // src/preload/index.ts
   const api = {
     // ... existing APIs
     myFeatureAction: (): Promise<Result> => ipcRenderer.invoke('my-feature-action')
   }
   ```

5. **Add TypeScript declarations**

   ```typescript
   // src/preload/index.d.ts
   declare global {
     interface Window {
       api: {
         // ... existing declarations
         myFeatureAction: () => Promise<Result>
       }
     }
   }
   ```

6. **Implement UI** (if needed)

   ```typescript
   // src/renderer/src/components/MyFeature.tsx
   export function MyFeature() {
     const handleAction = async () => {
       const result = await window.api.myFeatureAction()
       // Handle result
     }

     return <div>...</div>
   }
   ```

### Example: Adding a New Setting

**1. Add to shared types**

```typescript
// src/shared/types/settings.types.ts
export interface Settings {
  // ... existing settings
  myNewSetting?: boolean
}
```

**2. Update main process settings handler**

```typescript
// src/main/index.ts - already handles generic settings
ipcMain.on('save-settings', (_, settings: Settings) => {
  saveSettingsUtil(settings) // Automatically saves new setting
})
```

**3. Add to Settings component**

```typescript
// src/renderer/src/components/Settings.tsx
const [myNewSetting, setMyNewSetting] = useState(false)

// In saveSettings function, include:
myNewSetting,

// In JSX:
<label>
  <input
    type="checkbox"
    checked={myNewSetting}
    onChange={(e) => setMyNewSetting(e.target.checked)}
  />
  My New Setting
</label>
```

## Debugging

### Debugging Main Process

The main process runs in a Node.js environment and can be debugged using:

1. **Console Logs**

   ```typescript
   console.log('Debug info:', data)
   ```

2. **Chrome DevTools** (attached to main process)
   - Run with `npm run dev`
   - In VS Code, use the "Debug Main Process" launch configuration
   - Or add `--inspect` flag to Electron

3. **VS Code Debug Configuration**
   ```json
   {
     "name": "Debug Main Process",
     "type": "node",
     "request": "launch",
     "cwd": "${workspaceFolder}",
     "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron-vite",
     "windows": {
       "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron-vite.cmd"
     },
     "runtimeArgs": ["--verbose", "wait"],
     "outputCapture": "std"
   }
   ```

### Debugging Renderer Process

The renderer process runs in a Chrome/Chromium environment:

1. **DevTools Window**
   - Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
   - Or right-click → "Inspect Element"

2. **React DevTools**
   - Install React DevTools Chrome extension
   - Automatically available in DevTools

3. **Console Logging**
   ```typescript
   console.log('Renderer debug:', data)
   console.warn('Warning:', data)
   console.error('Error:', error)
   ```

### Debugging IPC Communication

1. **Log all IPC messages** in preload script:

   ```typescript
   // src/preload/index.ts
   const originalSend = ipcRenderer.send
   ipcRenderer.send = function (channel, ...args) {
     console.log('IPC Send:', channel, args)
     return originalSend.apply(this, [channel, ...args])
   }
   ```

2. **Monitor IPC in DevTools**
   - Main Process: Console shows IPC handler registrations
   - Renderer Process: Network tab shows IPC activity

### Common Debugging Scenarios

#### Issue: Settings not persisting

```bash
# Check settings file location
cat ~/Library/Application\ Support/Toolify/settings.json
```

#### Issue: Keyboard shortcut not working

```typescript
// Add logging in main process
console.log('Registering shortcut:', shortcut)
console.log('Shortcut registered:', success)
```

#### Issue: Recording not starting

```typescript
// Add logging in renderer process
console.log('Current status:', statusRef.current)
console.log('Starting recording...')
```

## Common Development Workflows

### Running Tests

```bash
# Type checking (primary validation)
npm run typecheck

# Linting
npm run lint

# Manual testing
npm run dev
```

### Adding Dependencies

```bash
# Production dependency (needed in runtime)
npm install <package>

# Development dependency (build tools, etc.)
npm install -D <package>

# Example: Adding a new UI library
npm install lucide-react
```

### Updating Dependencies

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Rebuild native modules (if needed)
npm rebuild
```

### Code Style

The project uses ESLint and Prettier for code formatting:

```bash
# Format all files
npm run format

# Check for linting errors
npm run lint

# Fix auto-fixable linting errors
npm run lint -- --fix
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
```

### Troubleshooting Build Issues

```bash
# Clean build artifacts
rm -rf out/
rm -rf dist/
rm -rf node_modules/

# Reinstall dependencies
npm install

# Rebuild
npm run build
```

## Working with the Dual-Process Architecture

### Understanding Process Boundaries

**Main Process** (Node.js environment):

- File system access
- Native module integration
- System-level features (tray, shortcuts, notifications)
- Window management
- API calls to external services

**Renderer Process** (Chromium sandbox):

- UI rendering (React)
- Web APIs (microphone, clipboard)
- No direct Node.js access
- Communicates via IPC only

**Preload Script** (Secure bridge):

- Exposes safe APIs to renderer
- Validates and sanitizes data
- Maintains context isolation

### Best Practices

1. **Keep main process logic separate**
   - Don't mix UI code with business logic
   - Main process should work even without renderer

2. **Use TypeScript for type safety**
   - Shared types prevent type mismatches
   - Catch errors at compile time

3. **Minimize IPC overhead**
   - Batch operations when possible
   - Avoid frequent small IPC calls

4. **Handle renderer crashes**
   ```typescript
   mainWindow.on('render-process-gone', () => {
     console.log('Renderer crashed, reloading...')
     mainWindow.reload()
   })
   ```

### Process Communication Patterns

**Pattern 1: Renderer invokes Main (Request/Response)**

```typescript
// Renderer
const result = await window.api.someAction()

// Preload
someAction: () => ipcRenderer.invoke('some-action')

// Main
ipcMain.handle('some-action', async () => {
  return result
})
```

**Pattern 2: Main sends event to Renderer (Push)**

```typescript
// Main
mainWindow.webContents.send('some-event', data)

// Preload
onSomeEvent: (callback) => {
  const handler = (_, data) => callback(data)
  ipcRenderer.on('some-event', handler)
  return () => ipcRenderer.removeListener('some-event', handler)
}

// Renderer
useEffect(() => {
  const cleanup = window.api.onSomeEvent((data) => {
    console.log('Received:', data)
  })
  return cleanup
}, [])
```

## Adding IPC Channels

### Step-by-Step Guide

**1. Define the channel name**
Choose a clear, descriptive name in kebab-case:

```typescript
const CHANNEL_NAME = 'my-new-feature-action'
```

**2. Add shared types** (if passing complex data)

```typescript
// src/shared/types/my-feature.types.ts
export interface MyFeatureRequest {
  input: string
  options?: MyFeatureOptions
}

export interface MyFeatureResponse {
  success: boolean
  data?: string
  error?: string
}
```

**3. Implement main process handler**

```typescript
// src/main/index.ts (or separate module)
ipcMain.handle('my-new-feature-action', async (event, request: MyFeatureRequest) => {
  try {
    // Your implementation here
    const result = await performAction(request)

    return {
      success: true,
      data: result
    } as MyFeatureResponse
  } catch (error) {
    console.error('Action failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as MyFeatureResponse
  }
})
```

**4. Expose in preload script**

```typescript
// src/preload/index.ts
const api = {
  // ... existing APIs
  myFeatureAction: (request: MyFeatureRequest): Promise<MyFeatureResponse> =>
    ipcRenderer.invoke('my-new-feature-action', request)
}
```

**5. Add TypeScript declaration**

```typescript
// src/preload/index.d.ts
declare global {
  interface Window {
    api: {
      // ... existing declarations
      myFeatureAction: (request: MyFeatureRequest) => Promise<MyFeatureResponse>
    }
  }
}
```

**6. Use in renderer**

```typescript
// src/renderer/src/components/MyComponent.tsx
import { useState } from 'react'

export function MyComponent() {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    try {
      const response = await window.api.myFeatureAction({
        input: 'test',
        options: {}
      })

      if (response.success) {
        console.log('Success:', response.data)
      } else {
        console.error('Error:', response.error)
      }
    } finally {
      setLoading(false)
    }
  }

  return <button onClick={handleAction}>{loading ? 'Loading...' : 'Action'}</button>
}
```

### Example: Adding a Bi-directional Channel

For features where main process needs to push updates to renderer:

**1. Main process setup**

```typescript
// src/main/index.ts
import { BrowserWindow } from 'electron'

let progressWindow: BrowserWindow | null = null

export function startLongTask() {
  // Send progress updates
  const progressInterval = setInterval(() => {
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.webContents.send('task-progress', {
        percent: Math.random() * 100
      })
    }
  }, 1000)

  // Cleanup when done
  setTimeout(() => {
    clearInterval(progressInterval)
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.webContents.send('task-complete', { success: true })
    }
  }, 5000)
}
```

**2. Preload event listener**

```typescript
// src/preload/index.ts
const api = {
  onTaskProgress: (callback: (progress: { percent: number }) => void) => {
    const handler = (_, progress) => callback(progress)
    ipcRenderer.on('task-progress', handler)
    return () => ipcRenderer.removeListener('task-progress', handler)
  },
  onTaskComplete: (callback: (result: { success: boolean }) => void) => {
    const handler = (_, result) => callback(result)
    ipcRenderer.on('task-complete', handler)
    return () => ipcRenderer.removeListener('task-complete', handler)
  }
}
```

**3. Renderer usage**

```typescript
// src/renderer/src/components/TaskMonitor.tsx
import { useState, useEffect } from 'react'

export function TaskMonitor() {
  const [progress, setProgress] = useState(0)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    const cleanupProgress = window.api.onTaskProgress((p) => {
      setProgress(p.percent)
    })

    const cleanupComplete = window.api.onTaskComplete(() => {
      setComplete(true)
    })

    return () => {
      cleanupProgress()
      cleanupComplete()
    }
  }, [])

  return (
    <div>
      {complete ? 'Complete!' : `Progress: ${progress.toFixed(0)}%`}
    </div>
  )
}
```

## Modifying UI Components

### Component Architecture

Toolify uses React with TypeScript for the UI. Components are organized by feature:

```
src/renderer/src/components/
├── Status.tsx              # Main status display
├── Settings.tsx            # Settings container
├── History.tsx             # History management
└── settings/               # Settings sub-components
    ├── GeneralSettings.tsx
    ├── AudioSettings.tsx
    ├── DictationSettings.tsx
    ├── HistorySettings.tsx
    └── UpdateBanner.tsx
```

### Creating a New Component

**1. Create component file**

```typescript
// src/renderer/src/components/MyComponent.tsx
import { useState } from 'react'
import { cn } from '@renderer/utils' // Utility for className merging

interface MyComponentProps {
  title: string
  onAction?: () => void
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  const [active, setActive] = useState(false)

  return (
    <div className="p-4 bg-zinc-900 rounded-lg">
      <h3 className="text-lg font-semibold">{title}</h3>
      <button
        onClick={() => {
          setActive(!active)
          onAction?.()
        }}
        className={cn(
          'mt-2 px-4 py-2 rounded',
          active ? 'bg-blue-500' : 'bg-zinc-700'
        )}
      >
        {active ? 'Active' : 'Inactive'}
      </button>
    </div>
  )
}
```

**2. Use component in App.tsx**

```typescript
// src/renderer/src/App.tsx
import { MyComponent } from './components/MyComponent'

function App() {
  return (
    <div>
      <MyComponent
        title="My Feature"
        onAction={() => console.log('Action triggered')}
      />
    </div>
  )
}
```

### Styling with Tailwind CSS

Toolify uses Tailwind CSS for styling. The configuration is in `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {}
  },
  plugins: []
}
```

**Common styling patterns:**

```tsx
// Dark theme colors
className = 'bg-zinc-950 text-white'

// Interactive elements
className = 'hover:bg-zinc-800 active:bg-zinc-700 transition-colors'

// Layout
className = 'flex items-center justify-between gap-4'

// Typography
className = 'text-sm font-medium text-zinc-400'
```

### State Management

Toolify uses React's built-in state management:

```typescript
// Local component state
const [value, setValue] = useState<string>('')

// Persisted state (via IPC)
const [settings, setSettings] = useState<Settings>(null)

useEffect(() => {
  // Load settings on mount
  window.api.getSettings().then(setSettings)
}, [])

// Save settings
const saveSettings = (newSettings: Settings) => {
  setSettings(newSettings)
  window.api.saveSettings(newSettings)
}
```

### Component Example: Adding a Toggle Switch

```typescript
// src/renderer/src/components/Toggle.tsx
import { cn } from '@renderer/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-blue-500' : 'bg-zinc-700',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      disabled={disabled}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
```

## Local Development with Swift Helper

Toolify includes an optional Swift helper (`ToolifySwift/`) for system-level features. This is currently used for specialized macOS integrations.

### Swift Helper Structure

```
ToolifySwift/
├── Toolify/                   # Swift source files
│   ├── ToolifyApp.swift      # Main app entry point
│   └── ...                   # Other Swift files
└── project.pbxproj.template  # Xcode project template
```

### Building the Swift Helper

**Note**: The Swift helper is optional. Toolify works without it for most features.

```bash
# Open in Xcode
open ToolifySwift/Toolify.xcodeproj

# Or build from command line
xcodebuild -project ToolifySwift/Toolify.xcodeproj \
  -scheme Toolify \
  -configuration Debug
```

### Integrating with Electron

The Swift helper communicates with Electron via:

- **Local HTTP server**: Swift runs a local server that Electron can call
- **AppleEvents**: macOS-specific inter-process communication
- **File-based IPC**: Reading/writing shared files

Example integration:

```typescript
// Call Swift helper from main process
import { exec } from 'child_process'

function callSwiftHelper(action: string, params: Record<string, unknown>) {
  return new Promise((resolve, reject) => {
    exec(
      `./ToolifySwift/bin/Toolify "${action}" '${JSON.stringify(params)}'`,
      (error, stdout, stderr) => {
        if (error) reject(error)
        else resolve(stdout)
      }
    )
  })
}
```

### When to Use the Swift Helper

Use the Swift helper when you need:

- Low-level macOS API access not available in Electron
- Native performance for critical operations
- Access to macOS frameworks (Core Audio, AVFoundation, etc.)
- System-wide features requiring privileged operations

### Current Swift Features

The Swift helper currently provides:

- Enhanced audio device enumeration
- Low-latency audio monitoring
- System-level keyboard shortcuts (alternative to Electron's globalShortcut)

Check `ToolifySwift/Toolify/` for current implementation.

## Testing

### Manual Testing Checklist

**Recording Workflow:**

- [ ] Start recording with keyboard shortcut
- [ ] Verify overlay appears
- [ ] Speak and check audio level visualization
- [ ] Stop recording and verify transcription
- [ ] Check text is copied to clipboard
- [ ] Verify history item is saved

**Settings:**

- [ ] Open settings panel
- [ ] Modify API key
- [ ] Change keyboard shortcut
- [ ] Toggle notifications
- [ ] Switch between online and local models
- [ ] Verify settings persist after restart

**History:**

- [ ] View history items
- [ ] Delete individual items
- [ ] Clear all history
- [ ] Copy text from history
- [ ] Play audio recordings

**Auto-Update:**

- [ ] Check for updates
- [ ] Download update
- [ ] Install update

### Type Checking

```bash
# Check all TypeScript
npm run typecheck

# Check specific process
npm run typecheck:node    # Main + Preload
npm run typecheck:web     # Renderer
```

### Linting

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint -- --fix

# Check specific files
npm run lint -- src/renderer/src/App.tsx
```

## Building for Distribution

### Prerequisites

- **Apple Developer Account**: Required for code signing (optional but recommended)
- **Xcode**: For macOS builds
- **FFmpeg**: For audio conversion features

### Build Configuration

Build settings are in `electron-builder.yml`:

```yaml
appId: com.toolify.app
productName: Toolify
directories:
  buildResources: build
  output: dist

mac:
  category: public.app-category.utilities
  target:
    - target: dmg
      arch:
        - arm64
        - x64
```

### Build Commands

```bash
# Build for macOS
npm run build:mac

# Build DMG (installer)
npm run build:dmg

# Build for Windows
npm run build:win

# Build for Linux
npm run build:linux

# Build without type checking (faster)
npm run build:skip-check
```

### Code Signing (macOS)

**For development/testing (no certificate):**

```bash
npm run build:mac
# Builds without signing (users will see Gatekeeper warning)
```

**For distribution (requires Apple Developer account):**

1. Install signing certificate from Apple
2. Configure in `electron-builder.yml`:
   ```yaml
   mac:
     identity: 'Developer ID Application: Your Name (TEAM_ID)'
     provisioningProfile: path/to/profile.provisionprofile
   ```
3. Build:
   ```bash
   npm run build:mac:publish
   ```

### Automated Publishing

Toolify supports automatic updates via GitHub Releases:

```bash
# Publish to GitHub
npm run build:mac:publish

# This will:
# 1. Build the app
# 2. Notarize with Apple (if configured)
# 3. Create GitHub Release
# 4. Upload DMG as release asset
# 5. Update update server
```

### Update Server Configuration

Updates are served from GitHub Releases. The app checks for updates using electron-updater:

```typescript
// src/main/auto-updater.ts
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'mehmetsagir',
  repo: 'toolify'
})
```

### Distribution Checklist

Before releasing:

- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Run `npm run typecheck`
- [ ] Run `npm run lint`
- [ ] Test all features manually
- [ ] Build DMG and test installation
- [ ] Test auto-update mechanism
- [ ] Create Git tag: `git tag v0.0.12`
- [ ] Push tag: `git push origin v0.0.12`
- [ ] Release on GitHub

### Post-Release

After releasing:

- [ ] Verify auto-update works from previous version
- [ ] Monitor GitHub Issues for bug reports
- [ ] Update documentation if needed
- [ ] Celebrate! 🎉

## Tips and Tricks

### Performance Optimization

**1. Lazy load large modules**

```typescript
// Instead of:
import { LargeModule } from './large-module'

// Use:
const LargeModule = await import('./large-module')
```

**2. Debounce user input**

```typescript
import { debounce } from 'lodash-es'

const handleSearch = debounce((query: string) => {
  // Expensive operation
}, 300)
```

**3. Use React.memo for expensive components**

```typescript
export const ExpensiveComponent = React.memo(({ data }) => {
  // ...
})
```

### Debugging Production Builds

```bash
# Build with source maps
npm run build:mac

# Find the built app
open dist/

# View logs
~/Library/Logs/toolify.log
```

### Common Issues and Solutions

**Issue: "Module not found" error**

- Solution: Run `npm install` and check import paths

**Issue: TypeScript errors in production**

- Solution: Run `npm run typecheck` before building

**Issue: App crashes on startup**

- Solution: Check Console.app for crash logs, verify native modules are built

**Issue: Settings not persisting**

- Solution: Check file permissions in `~/Library/Application Support/Toolify/`

**Issue: Keyboard shortcut not working**

- Solution: Check Accessibility permissions in System Settings

## Resources

- **Electron Documentation**: https://www.electronjs.org/docs
- **electron-vite Documentation**: https://electron-vite.org
- **React Documentation**: https://react.dev
- **Tailwind CSS Documentation**: https://tailwindcss.com/docs
- **TypeScript Documentation**: https://www.typescriptlang.org/docs

## Getting Help

- **GitHub Issues**: https://github.com/mehmetsagir/toolify/issues
- **Discussions**: https://github.com/mehmetsagir/toolify/discussions

## License

MIT License - see LICENSE file for details.

---

Happy coding! 🚀
