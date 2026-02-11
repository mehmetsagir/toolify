// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "apple-stt",
    platforms: [
        .macOS(.v13)
    ],
    targets: [
        .executableTarget(
            name: "apple-stt",
            path: "Sources",
            exclude: ["Info.plist"],
            linkerSettings: [
                .linkedFramework("Speech"),
                .linkedFramework("Foundation"),
                .linkedFramework("AVFoundation")
            ]
        )
    ]
)
