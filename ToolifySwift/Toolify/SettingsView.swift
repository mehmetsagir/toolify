import SwiftUI

class SettingsManager: ObservableObject {
    @AppStorage("apiKey") var apiKey: String = ""
    @AppStorage("language") var language: String = ""
    @AppStorage("translate") var translate: Bool = false
}

struct SettingsView: View {
    @ObservedObject var settings: SettingsManager
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(spacing: 20) {
            Text("Settings")
                .font(.title2)
                .fontWeight(.semibold)
            
            Form {
                Section("OpenAI API Key") {
                    SecureField("sk-...", text: $settings.apiKey)
                        .textFieldStyle(.roundedBorder)
                }
                
                Section("Language (Optional)") {
                    TextField("e.g., tr, en, fr", text: $settings.language)
                        .textFieldStyle(.roundedBorder)
                    Text("Leave empty for auto-detection")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                
                Section("Translation") {
                    Toggle("Translate to English", isOn: $settings.translate)
                }
            }
            .formStyle(.grouped)
            
            HStack {
                Button("Close") {
                    dismiss()
                }
                .keyboardShortcut(.cancelAction)
                
                Spacer()
                
                Button("Save") {
                    dismiss()
                }
                .keyboardShortcut(.defaultAction)
                .buttonStyle(.borderedProminent)
            }
            .padding()
        }
        .frame(width: 400, height: 350)
        .padding()
    }
}
