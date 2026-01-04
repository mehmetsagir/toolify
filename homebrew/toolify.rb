cask "toolify" do
  version "0.0.12"
  sha256 "6b6a90260ffab443200f88bffd01910e96a260857bbc86dde58932831e81516d"

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

