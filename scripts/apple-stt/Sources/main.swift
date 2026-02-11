import Foundation
import Speech
import AVFoundation
import AppKit

// Exit codes
let EXIT_SUCCESS_CODE: Int32 = 0
let EXIT_GENERAL_ERROR: Int32 = 1
let EXIT_PERMISSION_DENIED: Int32 = 2
let EXIT_RECOGNIZER_UNAVAILABLE: Int32 = 3
let EXIT_FILE_NOT_FOUND: Int32 = 4

func printError(_ message: String) {
    FileHandle.standardError.write(Data((message + "\n").utf8))
}

func printUsage() {
    printError("Usage: apple-stt --file <path> [--language <locale>]")
    printError("       apple-stt --stream [--language <locale>]")
    printError("       apple-stt --check [--language <locale>]")
    printError("       apple-stt --request-permission")
    printError("")
    printError("Options:")
    printError("  --file <path>      Audio file to transcribe (WAV format)")
    printError("  --stream           Stream live microphone audio, output JSON lines to stdout")
    printError("  --language <locale> Locale identifier (e.g. en-US, tr-TR). Default: system locale")
    printError("  --check            Check availability and permission status")
    printError("  --request-permission  Request speech recognition permission from macOS")
}

// Parse arguments
var filePath: String?
var language: String?
var checkMode = false
var streamMode = false
var requestPermissionMode = false

// Check for sentinel file first (used when launched via `open` which can't pass args reliably)
let sentinelPath = NSTemporaryDirectory() + "apple-stt-request-permission"
if FileManager.default.fileExists(atPath: sentinelPath) {
    try? FileManager.default.removeItem(atPath: sentinelPath)
    requestPermissionMode = true
}

var args = CommandLine.arguments.dropFirst()
while let arg = args.first {
    args = args.dropFirst()
    switch arg {
    case "--file":
        guard let value = args.first else {
            printError("Error: --file requires a path argument")
            exit(EXIT_GENERAL_ERROR)
        }
        filePath = value
        args = args.dropFirst()
    case "--language":
        guard let value = args.first else {
            printError("Error: --language requires a locale argument")
            exit(EXIT_GENERAL_ERROR)
        }
        language = value
        args = args.dropFirst()
    case "--check":
        checkMode = true
    case "--stream":
        streamMode = true
    case "--request-permission":
        requestPermissionMode = true
    case "--help", "-h":
        printUsage()
        exit(EXIT_SUCCESS_CODE)
    default:
        printError("Unknown argument: \(arg)")
        printUsage()
        exit(EXIT_GENERAL_ERROR)
    }
}

// Determine locale
let locale: Locale
if let lang = language {
    locale = Locale(identifier: lang)
} else {
    locale = Locale.current
}

// Create recognizer
guard let recognizer = SFSpeechRecognizer(locale: locale) else {
    if checkMode {
        print("{\"available\":false,\"permissionGranted\":false,\"supportsOnDevice\":false}")
        exit(EXIT_SUCCESS_CODE)
    }
    printError("Error: Speech recognizer not available for locale \(locale.identifier)")
    exit(EXIT_RECOGNIZER_UNAVAILABLE)
}

// Use authorizationStatus() instead of requestAuthorization() to avoid SIGABRT.
// requestAuthorization() crashes standalone CLI tools that lack NSSpeechRecognitionUsageDescription
// in their own Info.plist. authorizationStatus() is safe to call from any context.
let authStatus = SFSpeechRecognizer.authorizationStatus()

// Check mode
if checkMode {
    let available = recognizer.isAvailable
    let supportsOnDevice = recognizer.supportsOnDeviceRecognition
    let granted = (authStatus == .authorized)
    let statusString: String
    switch authStatus {
    case .authorized: statusString = "authorized"
    case .denied: statusString = "denied"
    case .restricted: statusString = "restricted"
    case .notDetermined: statusString = "notDetermined"
    @unknown default: statusString = "unknown"
    }
    print("{\"available\":\(available),\"permissionGranted\":\(granted),\"supportsOnDevice\":\(supportsOnDevice),\"authStatus\":\"\(statusString)\"}")
    exit(EXIT_SUCCESS_CODE)
}

// Request permission mode - trigger macOS permission dialog via requestAuthorization()
// Requires NSApplication event loop and a proper .app bundle with Info.plist
// containing NSSpeechRecognitionUsageDescription.
if requestPermissionMode {
    let resultPath = NSTemporaryDirectory() + "apple-stt-permission-result.json"

    func writeResult(_ json: String) {
        try? json.write(toFile: resultPath, atomically: true, encoding: .utf8)
    }

    if authStatus == .authorized {
        writeResult("{\"granted\":true}")
        exit(EXIT_SUCCESS_CODE)
    }
    if authStatus == .denied || authStatus == .restricted {
        writeResult("{\"granted\":false,\"alreadyDenied\":true}")
        exit(EXIT_SUCCESS_CODE)
    }

    // Status is notDetermined — need NSApplication for the permission dialog.
    // The binary must be launched via `open` from within a .app bundle so that
    // LaunchServices provides the full bundle context and Info.plist is respected.
    let app = NSApplication.shared
    app.setActivationPolicy(.prohibited) // No dock icon, no menu bar

    DispatchQueue.main.async {
        SFSpeechRecognizer.requestAuthorization { status in
            let granted = (status == .authorized)
            writeResult("{\"granted\":\(granted)}")
            DispatchQueue.main.async {
                app.terminate(nil)
            }
        }
    }

    // Timeout: terminate after 60 seconds if user doesn't respond to dialog
    DispatchQueue.global().asyncAfter(deadline: .now() + 60) {
        writeResult("{\"granted\":false}")
        DispatchQueue.main.async {
            app.terminate(nil)
        }
    }

    app.run()
    exit(EXIT_SUCCESS_CODE)
}

// Stream mode - live microphone transcription
if streamMode {
    switch authStatus {
    case .denied, .restricted:
        printError("Error: Speech recognition permission denied (status: \(authStatus.rawValue))")
        exit(EXIT_PERMISSION_DENIED)
    case .notDetermined, .authorized:
        break
    @unknown default:
        break
    }

    guard recognizer.isAvailable else {
        printError("Error: Speech recognizer is not available")
        exit(EXIT_RECOGNIZER_UNAVAILABLE)
    }

    let audioEngine = AVAudioEngine()
    var activeRequest: SFSpeechAudioBufferRecognitionRequest?
    var taskLatestText = ""
    var shouldRestart = false
    var stopRequested = false
    var exitSignaled = false
    var consecutiveErrors = 0
    let maxConsecutiveErrors = 10
    var streamError: Error?
    let exitSemaphore = DispatchSemaphore(value: 0)

    // Swift outputs per-task text only. TypeScript handles cross-task accumulation.
    // segmentEnd=true means this task is done and its text should be committed.
    func outputJSON(_ text: String, isFinal: Bool, segmentEnd: Bool = false) {
        let escaped = text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
            .replacingOccurrences(of: "\t", with: "\\t")
        var json = "{\"partial\":\"\(escaped)\",\"isFinal\":\(isFinal)"
        if segmentEnd {
            json += ",\"segmentEnd\":true"
        }
        json += "}"
        print(json)
        fflush(stdout)
    }

    func startRecognitionTask() {
        taskLatestText = ""

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            request.requiresOnDeviceRecognition = true
        }
        activeRequest = request

        recognizer.recognitionTask(with: request) { result, error in
            if let error = error {
                let nsError = error as NSError
                printError("Stream task error: [\(nsError.domain)] code=\(nsError.code)")

                // Commit whatever partial text we had from this task
                if !taskLatestText.isEmpty {
                    outputJSON(taskLatestText, isFinal: false, segmentEnd: true)
                }

                consecutiveErrors += 1
                if consecutiveErrors > maxConsecutiveErrors {
                    // Too many consecutive errors — treat as fatal
                    streamError = error
                    exitSemaphore.signal()
                    return
                }

                // Restart task (handles all error types: no speech, timeout, etc.)
                if !stopRequested {
                    shouldRestart = true
                }
                return
            }

            guard let result = result else { return }

            // Got a valid result — reset error counter
            consecutiveErrors = 0

            let current = result.bestTranscription.formattedString
            taskLatestText = current

            if result.isFinal {
                if stopRequested {
                    if !exitSignaled {
                        exitSignaled = true
                        outputJSON(current, isFinal: true, segmentEnd: true)
                        exitSemaphore.signal()
                    }
                } else {
                    outputJSON(current, isFinal: false, segmentEnd: true)
                    shouldRestart = true
                }
            } else {
                outputJSON(current, isFinal: false)
            }
        }
    }

    // Install tap — feeds into whatever activeRequest points to
    let inputNode = audioEngine.inputNode
    let recordingFormat = inputNode.outputFormat(forBus: 0)
    inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
        activeRequest?.append(buffer)
    }

    do {
        audioEngine.reset()
        audioEngine.prepare()
        try audioEngine.start()
    } catch {
        printError("Error: Failed to start audio engine: \(error.localizedDescription)")
        exit(EXIT_GENERAL_ERROR)
    }

    startRecognitionTask()

    // Listen for newline on stdin as stop signal
    DispatchQueue.global(qos: .userInitiated).async {
        _ = readLine()
        stopRequested = true
        audioEngine.stop()
        inputNode.removeTap(onBus: 0)
        activeRequest?.endAudio()
        // Fallback: if recognition callback doesn't fire within 2s, force exit
        Thread.sleep(forTimeInterval: 2.0)
        if !exitSignaled {
            exitSignaled = true
            outputJSON(taskLatestText, isFinal: true, segmentEnd: true)
            exitSemaphore.signal()
        }
    }

    // Run loop — restart recognition tasks as needed
    let streamTimeout = DispatchTime.now() + .seconds(300)
    while exitSemaphore.wait(timeout: .now()) == .timedOut {
        RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))

        if shouldRestart && !stopRequested {
            shouldRestart = false
            startRecognitionTask()
        }

        if DispatchTime.now() > streamTimeout {
            audioEngine.stop()
            inputNode.removeTap(onBus: 0)
            activeRequest?.endAudio()
            printError("Error: Stream timed out")
            exit(EXIT_GENERAL_ERROR)
        }
    }

    if let error = streamError {
        printError("Error: Stream recognition failed: \(error.localizedDescription)")
        exit(EXIT_GENERAL_ERROR)
    }

    exit(EXIT_SUCCESS_CODE)
}

// Normal transcription mode
guard let filePath = filePath else {
    printError("Error: --file is required for transcription")
    printUsage()
    exit(EXIT_GENERAL_ERROR)
}

let fileURL = URL(fileURLWithPath: filePath)

guard FileManager.default.fileExists(atPath: filePath) else {
    printError("Error: File not found: \(filePath)")
    exit(EXIT_FILE_NOT_FOUND)
}

// Check authorization status (no request — the parent Electron app handles the prompt)
switch authStatus {
case .denied, .restricted:
    printError("Error: Speech recognition permission denied (status: \(authStatus.rawValue))")
    exit(EXIT_PERMISSION_DENIED)
case .notDetermined:
    // Permission hasn't been requested yet. The Electron app's Info.plist has the usage
    // description, so macOS will prompt the user when the recognition task starts.
    // We proceed and let the framework handle it.
    break
case .authorized:
    break
@unknown default:
    break
}

guard recognizer.isAvailable else {
    printError("Error: Speech recognizer is not available")
    exit(EXIT_RECOGNIZER_UNAVAILABLE)
}

// Create recognition request
let request = SFSpeechURLRecognitionRequest(url: fileURL)
request.requiresOnDeviceRecognition = true
request.shouldReportPartialResults = true

// Perform recognition with segment accumulation.
// When the user pauses mid-speech, bestTranscription.formattedString resets and
// only contains post-pause text. We detect the reset (text length drops below 80%
// of the segment peak) and commit pre-pause text before tracking the new segment.
let recognitionSemaphore = DispatchSemaphore(value: 0)
var accumulated = ""
var currentSegmentText = ""
var currentSegmentPeakLen = 0
var recognitionError: Error?
var signaled = false

func commitSegment(_ text: String) {
    if !text.isEmpty {
        accumulated = accumulated.isEmpty ? text : accumulated + " " + text
    }
    currentSegmentText = ""
    currentSegmentPeakLen = 0
}

recognizer.recognitionTask(with: request) { result, error in
    if let result = result {
        let text = result.bestTranscription.formattedString

        // Detect reset: text length dropped significantly from peak.
        // Within a single segment, text only grows (or changes slightly due to
        // corrections). A significant drop means the recognizer restarted after a pause.
        if currentSegmentPeakLen > 3 && !text.isEmpty
            && text.count < Int(Double(currentSegmentPeakLen) * 0.8) {
            commitSegment(currentSegmentText)
        }

        currentSegmentText = text
        currentSegmentPeakLen = max(currentSegmentPeakLen, text.count)

        if result.isFinal {
            commitSegment(text)
            if !signaled {
                signaled = true
                recognitionSemaphore.signal()
            }
            return
        }
    }

    if let error = error {
        // Commit whatever partial text we had before the error
        commitSegment(currentSegmentText)
        recognitionError = error
        if !signaled {
            signaled = true
            recognitionSemaphore.signal()
        }
    }
}

// Wait for recognition to complete (up to 120 seconds for long audio)
let recognitionTimeout = DispatchTime.now() + .seconds(120)
while recognitionSemaphore.wait(timeout: .now()) == .timedOut {
    RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
    if DispatchTime.now() > recognitionTimeout {
        printError("Error: Recognition timed out")
        exit(EXIT_GENERAL_ERROR)
    }
}

if let error = recognitionError {
    let nsError = error as NSError
    // If we accumulated text across segments before the error, use it
    if !accumulated.isEmpty {
        print(accumulated)
        exit(EXIT_SUCCESS_CODE)
    }
    // "No speech detected" / "no result" errors are normal outcomes — exit 0
    // kAFAssistantErrorDomain code 1101 = no speech, code 1110 = no result
    if nsError.domain == "kAFAssistantErrorDomain" && (nsError.code == 1101 || nsError.code == 1110) {
        exit(EXIT_SUCCESS_CODE)
    }
    printError("Error: Recognition failed: [\(nsError.domain)] code=\(nsError.code) \(error.localizedDescription)")
    exit(EXIT_GENERAL_ERROR)
}

if !accumulated.isEmpty {
    print(accumulated)
    exit(EXIT_SUCCESS_CODE)
} else {
    // No transcription but no error either — just silence
    exit(EXIT_SUCCESS_CODE)
}
