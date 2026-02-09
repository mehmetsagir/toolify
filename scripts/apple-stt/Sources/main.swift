import Foundation
import Speech

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
    printError("       apple-stt --check [--language <locale>]")
    printError("")
    printError("Options:")
    printError("  --file <path>      Audio file to transcribe (WAV format)")
    printError("  --language <locale> Locale identifier (e.g. en-US, tr-TR). Default: system locale")
    printError("  --check            Check availability and permission status")
}

// Parse arguments
var filePath: String?
var language: String?
var checkMode = false

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
    print("{\"available\":\(available),\"permissionGranted\":\(granted),\"supportsOnDevice\":\(supportsOnDevice)}")
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
request.shouldReportPartialResults = false

// Perform recognition
let recognitionSemaphore = DispatchSemaphore(value: 0)
var transcriptionResult: String?
var recognitionError: Error?

recognizer.recognitionTask(with: request) { result, error in
    if let error = error {
        recognitionError = error
        recognitionSemaphore.signal()
        return
    }

    guard let result = result else { return }

    if result.isFinal {
        transcriptionResult = result.bestTranscription.formattedString
        recognitionSemaphore.signal()
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
    let message = error.localizedDescription.lowercased()
    // "No speech detected" is a normal outcome, not a failure — output nothing and exit 0
    if message.contains("no speech") || message.contains("no result") {
        // Print empty line so caller gets empty string
        exit(EXIT_SUCCESS_CODE)
    }
    printError("Error: Recognition failed: \(error.localizedDescription)")
    exit(EXIT_GENERAL_ERROR)
}

if let text = transcriptionResult, !text.isEmpty {
    print(text)
    exit(EXIT_SUCCESS_CODE)
} else {
    // No transcription but no error either — just silence
    exit(EXIT_SUCCESS_CODE)
}
