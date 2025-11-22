import SwiftUI

struct ContentView: View {
    @StateObject private var recorder = AudioRecorder()
    @StateObject private var settings = SettingsManager()
    @State private var showSettings = false
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            HStack {
                Text("Toolify")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button(action: { showSettings.toggle() }) {
                    Image(systemName: "gearshape.fill")
                        .foregroundColor(.gray)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal)
            
            // Recording button
            VStack(spacing: 15) {
                ZStack {
                    Circle()
                        .fill(recorder.isRecording ? Color.red : Color.gray.opacity(0.2))
                        .frame(width: 80, height: 80)
                        .scaleEffect(recorder.isRecording ? 1.1 : 1.0)
                        .animation(.easeInOut(duration: 0.3).repeatForever(autoreverses: true), value: recorder.isRecording)
                    
                    Image(systemName: recorder.isProcessing ? "waveform" : "mic.fill")
                        .font(.system(size: 32))
                        .foregroundColor(.white)
                }
                .onTapGesture {
                    recorder.toggleRecording()
                }
                
                Text(recorder.isRecording ? "Listening..." : recorder.isProcessing ? "Processing..." : "Tap to Record")
                    .font(.headline)
                
                if !recorder.isRecording && !recorder.isProcessing {
                    Text("⌥ (Option)")
                        .font(.caption)
                        .foregroundColor(.gray)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .frame(width: 300, height: 250)
        .sheet(isPresented: $showSettings) {
            SettingsView(settings: settings)
        }
        .onAppear {
            recorder.settings = settings
        }
        .onReceive(NotificationCenter.default.publisher(for: NSNotification.Name("ToggleRecording"))) { _ in
            recorder.toggleRecording()
        }
    }
}
