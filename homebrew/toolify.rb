cask "toolify" do
  version "0.0.15"
  sha256 "e2fc51d12ca7a7e8a89339b2dfd5116d1f498a80f4be2db3a3031e7936a916f5"

  url "https://github.com/mehmetsagir/toolify/releases/download/v#{version}/Toolify-#{version}-arm64.dmg"
  name "Toolify"
  desc "AI-powered voice transcription and translation tool"
  homepage "https://github.com/mehmetsagir/toolify"

  livecheck do
    url :url
    strategy :github_latest
  end

  auto_updates true

  app "Toolify.app"

  zap trash: [
    "~/Library/Application Support/Toolify",
    "~/Library/Caches/com.toolify.app",
    "~/Library/Caches/com.toolify.app.ShipIt",
    "~/Library/Logs/Toolify",
    "~/Library/Preferences/com.toolify.app.plist",
    "~/Library/Saved Application State/com.toolify.app.savedState",
  ]
end

