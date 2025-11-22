# Icon Generation Guide

## Current Icon Design

The icon combines:
- 🔧 **Wrench/Tool** - Represents the "tool" aspect of Toolify
- 🎤 **Microphone** - Represents audio recording
- 🔊 **Sound waves** - Represents audio processing

## Converting SVG to PNG

### Option 1: Using Online Tool (Easiest)
1. Go to https://cloudconvert.com/svg-to-png or https://convertio.co/svg-png/
2. Upload `resources/icon.svg`
3. Set size to 512x512
4. Download and save as `resources/icon.png`

### Option 2: Using ImageMagick (macOS/Linux)
```bash
# Install ImageMagick (if not installed)
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux

# Run the conversion script
chmod +x scripts/generate-icon.sh
./scripts/generate-icon.sh
```

### Option 3: Using Node.js with Sharp
```bash
# Install sharp
npm install sharp --save-dev

# Run the Node script
node scripts/generate-icon.js
```

### Option 4: Using Inkscape (Free, Cross-platform)
1. Download Inkscape: https://inkscape.org/
2. Open `resources/icon.svg`
3. File → Export PNG Image
4. Set size to 512x512
5. Export as `resources/icon.png`

## Required Sizes

For best results, generate these sizes:
- 16x16 (menu bar)
- 32x32 (dock)
- 64x64
- 128x128
- 256x256
- 512x512 (main icon)
- 1024x1024 (retina)

The main `icon.png` should be 512x512 pixels.

## After Generating

1. Replace `resources/icon.png` with your generated file
2. For macOS builds, you may need to generate `.icns` file:
   ```bash
   # Using iconutil (macOS only)
   iconutil -c icns resources/icon.iconset
   ```
3. Rebuild the app to see the new icon

