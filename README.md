# Toolify

AI-powered voice transcription and translation tool for macOS. Record audio, transcribe it using OpenAI Whisper, and optionally translate it to different languages. Perfect for quick voice-to-text conversion and multilingual communication.

## Features

- 🎤 **Voice Recording**: Record audio with customizable keyboard shortcuts
- 📝 **Transcription**: Convert speech to text using OpenAI Whisper API
- 🌍 **Translation**: Translate transcribed text between multiple languages
- 📋 **Auto-paste**: Automatically paste transcribed text to active application
- 🎨 **Modern UI**: Beautiful dark-themed interface with waveform visualization
- ⚙️ **Customizable**: Configure shortcuts, notifications, and more

## Requirements

- macOS (tested on macOS 13+)
- Node.js 18+
- OpenAI API key

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/yourusername/toolify.git
cd toolify

# Install dependencies
npm install

# Build the application
npm run build:mac
```

## Configuration

1. Launch Toolify from Applications
2. Right-click the menu bar icon and select "Settings"
3. Enter your OpenAI API key
4. Configure your preferred settings:
   - Keyboard shortcut (default: Command+Space)
   - Source and target languages for translation
   - Notification preferences
   - Sound alerts

## Usage

1. Press your configured keyboard shortcut (default: Command+Space) to start recording
2. Speak into your microphone
3. Press the shortcut again to stop recording
4. The transcribed text will be automatically copied to clipboard and pasted to the active application

### Translation Mode

Enable translation in settings and select your source and target languages. The app will transcribe your speech in the source language and translate it to the target language.

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

### Build

```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## Privacy

- All audio processing is done through OpenAI's API
- No audio data is stored locally
- API keys are stored securely using electron-store

## License

MIT License - see LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Uses [OpenAI Whisper](https://openai.com/research/whisper) for transcription
- UI built with [React](https://reactjs.org/) and [Tailwind CSS](https://tailwindcss.com/)
