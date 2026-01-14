cask "toolify" do
  version "0.0.13"
  sha256 "5d96d6ffda5c4c7c8b7fc64e6c37cabda807e74151a8ed678b5dd9d698a775dd"

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

