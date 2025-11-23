# Toolify

AI-powered voice transcription and translation tool for macOS. Toolify allows you to record audio, transcribe it using OpenAI's Whisper, and optionally translate it to another language.

## Features

- 🎤 **Voice Recording**: Record audio using a global keyboard shortcut
- 🔤 **Transcription**: Automatic transcription using OpenAI Whisper API
- 🌍 **Translation**: Optional translation to multiple languages
- 🎨 **Modern UI**: Clean, dark-themed interface
- 📊 **Real-time Waveform**: Visual feedback during recording
- ⚙️ **Customizable**: Configure API keys, shortcuts, and preferences
- 🔔 **Notifications**: Optional sound alerts and system notifications
- 💾 **Credit System**: Built-in credit management for AI operations

## Requirements

- macOS 10.12 or later
- OpenAI API key

## Installation

### Via Homebrew (Easiest)

```bash
# Add the tap
brew tap mehmetsagir/toolify

# Install Toolify
brew install --cask toolify

# Update Toolify
brew upgrade --cask toolify
```

### From DMG (Alternative)

1. Download the latest `Toolify-x.x.x-arm64.dmg` from [Releases](https://github.com/mehmetsagir/toolify/releases)
2. Open the DMG file
3. Drag Toolify to your Applications folder
4. **Important**: Since the app is not signed, you need to bypass macOS Gatekeeper:

#### Opening the App for the First Time

**Method 1: Right-Click (Easiest)**

1. Right-click (or Control + Click) on Toolify.app in Applications
2. Select "Open" from the menu
3. Click "Open" in the warning dialog
4. The app will open and you won't see this warning again

**Method 2: System Settings**

1. Try to open the app normally (you'll get the warning)
2. Go to System Settings > Privacy & Security
3. Scroll down to find "Toolify.app was blocked from use"
4. Click "Open Anyway"
5. Enter your password and confirm

**Method 3: Terminal Command**

```bash
sudo xattr -rd com.apple.quarantine /Applications/Toolify.app
```

### From Source

```bash
# Clone the repository
git clone https://github.com/mehmetsagir/toolify.git
cd toolify

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:mac
```

## Configuration

1. Launch Toolify
2. Click the settings icon (⚙️)
3. Enter your OpenAI API key
4. Configure your preferences:
   - Translation settings
   - Keyboard shortcut (default: Command+Space)
   - Sound alerts
   - Notifications
   - Recording overlay

## Usage

1. Press your configured keyboard shortcut (default: Command+Space) to start recording
2. Speak into your microphone
3. Press the shortcut again to stop recording
4. The transcription (and optional translation) will be automatically copied to your clipboard
5. A notification will appear when processing is complete

## Privacy

- All audio processing is done through OpenAI's API
- No data is stored locally except for user preferences
- Your API key is stored securely in your system keychain

## Development

```bash
# Install dependencies
npm install

# Development mode with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Build DMG
npm run build:dmg
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [OpenAI](https://openai.com/)
- UI built with [React](https://react.dev/) and [Tailwind CSS](https://tailwindcss.com/)
