import SwiftUI
import AVFoundation

class AudioRecorder: NSObject, ObservableObject {
    @Published var isRecording = false
    @Published var isProcessing = false
    
    var settings: SettingsManager?
    private var audioRecorder: AVAudioRecorder?
    private var recordingURL: URL?
    
    func toggleRecording() {
        if isRecording {
            stopRecording()
        } else {
            startRecording()
        }
    }
    
    func startRecording() {
        let audioSession = AVAudioSession.sharedInstance()
        
        do {
            try audioSession.setCategory(.record, mode: .default)
            try audioSession.setActive(true)
            
            // Create temporary file
            let tempDir = FileManager.default.temporaryDirectory
            recordingURL = tempDir.appendingPathComponent("recording-\(Date().timeIntervalSince1970).m4a")
            
            let settings: [String: Any] = [
                AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
                AVSampleRateKey: 44100,
                AVNumberOfChannelsKey: 1,
                AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue
            ]
            
            audioRecorder = try AVAudioRecorder(url: recordingURL!, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.record()
            
            isRecording = true
            NotificationCenter.default.post(name: NSNotification.Name("RecordingStateChanged"), object: nil)
            print("🎤 Recording started")
        } catch {
            print("❌ Failed to start recording: \(error)")
        }
    }
    
    func stopRecording() {
        audioRecorder?.stop()
        isRecording = false
        isProcessing = true
        NotificationCenter.default.post(name: NSNotification.Name("RecordingStateChanged"), object: nil)
        print("⏹️ Recording stopped")
    }
    
    func processAudio() {
        guard let url = recordingURL,
              let apiKey = settings?.apiKey,
              !apiKey.isEmpty else {
            print("❌ No API key configured")
            isProcessing = false
            NotificationCenter.default.post(name: NSNotification.Name("RecordingStateChanged"), object: nil)
            return
        }
        
        Task {
            do {
                let audioData = try Data(contentsOf: url)
                let text = try await transcribeAudio(
                    audioData: audioData,
                    apiKey: apiKey,
                    language: settings?.language,
                    translate: settings?.translate ?? false
                )
                
                await MainActor.run {
                    pasteText(text)
                    isProcessing = false
                    NotificationCenter.default.post(name: NSNotification.Name("RecordingStateChanged"), object: nil)
                }
                
                // Cleanup
                try? FileManager.default.removeItem(at: url)
            } catch {
                print("❌ Transcription failed: \(error)")
                await MainActor.run {
                    isProcessing = false
                    NotificationCenter.default.post(name: NSNotification.Name("RecordingStateChanged"), object: nil)
                }
            }
        }
    }
    
    func transcribeAudio(audioData: Data, apiKey: String, language: String?, translate: Bool) async throws -> String {
        let boundary = UUID().uuidString
        let url = URL(string: translate ? "https://api.openai.com/v1/audio/translations" : "https://api.openai.com/v1/audio/transcriptions")!
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        
        var body = Data()
        
        // Add audio file
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"audio.m4a\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: audio/mp4\r\n\r\n".data(using: .utf8)!)
        body.append(audioData)
        body.append("\r\n".data(using: .utf8)!)
        
        // Add model
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"model\"\r\n\r\n".data(using: .utf8)!)
        body.append("whisper-1\r\n".data(using: .utf8)!)
        
        // Add language if provided and not translating
        if let language = language, !language.isEmpty, !translate {
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"language\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(language)\r\n".data(using: .utf8)!)
        }
        
        body.append("--\(boundary)--\r\n".data(using: .utf8)!)
        
        request.httpBody = body
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(TranscriptionResponse.self, from: data)
        
        return response.text
    }
    
    func pasteText(_ text: String) {
        // Copy to clipboard
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        
        print("📋 Copied to clipboard: \(text)")
        
        // Simulate Command+V
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            let source = CGEventSource(stateID: .hidSystemState)
            
            // Key down
            let keyDownEvent = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: true) // V key
            keyDownEvent?.flags = .maskCommand
            keyDownEvent?.post(tap: .cghidEventTap)
            
            // Key up
            let keyUpEvent = CGEvent(keyboardEventSource: source, virtualKey: 0x09, keyDown: false)
            keyUpEvent?.flags = .maskCommand
            keyUpEvent?.post(tap: .cghidEventTap)
            
            print("✅ Text pasted")
        }
    }
}

extension AudioRecorder: AVAudioRecorderDelegate {
    func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if flag {
            processAudio()
        }
    }
}

struct TranscriptionResponse: Codable {
    let text: String
}
