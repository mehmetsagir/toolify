import SwiftUI
import AppKit

// Bridge to communicate window position from SwiftUI to AppKit
class WindowPositionController: ObservableObject {
    var window: NSWindow?
    var initialOrigin: NSPoint?
    var startLocation: NSPoint?

    func startDrag(at location: NSPoint) {
        startLocation = location
        initialOrigin = window?.frame.origin
    }

    func updateDrag(at location: NSPoint) {
        guard let start = startLocation,
              let origin = initialOrigin,
              let window = window else { return }

        let delta = NSPoint(
            x: location.x - start.x,
            y: location.y - start.y
        )

        window.setFrameOrigin(NSPoint(
            x: origin.x + delta.x,
            y: origin.y + delta.y
        ))
    }

    func endDrag() {
        startLocation = nil
        initialOrigin = nil
    }
}

// Draggable overlay view with SwiftUI drag gesture
struct DraggableOverlayView: View {
    @ObservedObject var recorder: AudioRecorder
    @ObservedObject var positionController: WindowPositionController

    var body: some View {
        VStack(spacing: 8) {
            // Drag handle area
            Rectangle()
                .fill(.clear)
                .frame(height: 30)
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .overlay(
                    HStack(spacing: 4) {
                        ForEach(0..<3) { _ in
                            RoundedRectangle(cornerRadius: 2)
                                .fill(.gray.opacity(0.5))
                                .frame(width: 20, height: 4)
                        }
                    }
                )
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            if positionController.startLocation == nil {
                                positionController.startDrag(at: NSEvent.mouseLocation)
                            }
                            positionController.updateDrag(at: NSEvent.mouseLocation)
                        }
                        .onEnded { _ in
                            positionController.endDrag()
                        }
                )

            HStack(spacing: 12) {
                // Recording indicator
                Circle()
                    .fill(recorder.isRecording ? Color.red : Color.gray)
                    .frame(width: 12, height: 12)
                    .scaleEffect(recorder.isRecording ? 1.2 : 1.0)
                    .animation(.easeInOut(duration: 0.3).repeatForever(autoreverses: true), value: recorder.isRecording)

                Text(recorder.isRecording ? "Recording..." : recorder.isProcessing ? "Processing..." : "Ready")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.primary)

                Spacer()

                // Stop button
                Button(action: {
                    NotificationCenter.default.post(name: NSNotification.Name("ToggleRecording"), object: nil)
                }) {
                    Image(systemName: recorder.isRecording ? "stop.circle.fill" : "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundColor(recorder.isRecording ? .red : .gray)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
        }
        .frame(width: 220, height: 80)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(.ultraThinMaterial)
                .shadow(radius: 10, y: 4)
        )
    }
}

// NSWindow subclass
class OverlayWindow: NSWindow {
    private var positionController: WindowPositionController?

    init(recorder: AudioRecorder) {
        super.init(
            contentRect: NSRect(x: 0, y: 0, width: 220, height: 80),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )

        self.isOpaque = false
        self.backgroundColor = .clear
        self.level = .floating
        self.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        self.ignoresMouseEvents = false

        // Create position controller and pass window reference
        let controller = WindowPositionController()
        controller.window = self
        self.positionController = controller

        // Set content view with controller
        let rootView = DraggableOverlayView(recorder: recorder, positionController: controller)
        let hostingView = NSHostingView(rootView: rootView)
        self.contentView = hostingView

        // Position on top-right corner of main screen
        if let screen = NSScreen.main {
            let screenFrame = screen.visibleFrame
            let windowSize = NSSize(width: 220, height: 80)
            self.setFrame(
                NSRect(
                    x: screenFrame.maxX - windowSize.width - 20,
                    y: screenFrame.maxY - windowSize.height - 20,
                    width: windowSize.width,
                    height: windowSize.height
                ),
                display: true
            )
        }
    }

    override var canBecomeKey: Bool {
        return true
    }

    override var acceptsFirstResponder: Bool {
        return true
    }
}
