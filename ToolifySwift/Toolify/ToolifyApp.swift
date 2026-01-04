import SwiftUI
import AVFoundation

@main
struct ToolifyApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        Settings {
            EmptyView()
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem?
    var popover: NSPopover?
    var globalMonitor: Any?
    var overlayWindow: OverlayWindow?
    var recorder: AudioRecorder?
    private var recordingObserver: NSObjectProtocol?

    func applicationDidFinishLaunching(_ notification: Notification) {
        // Create recorder
        let recorder = AudioRecorder()
        self.recorder = recorder

        // Hide dock icon
        NSApp.setActivationPolicy(.accessory)

        // Create menu bar item
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)

        if let button = statusItem?.button {
            button.image = NSImage(systemSymbolName: "mic.fill", accessibilityDescription: "Toolify")
            button.action = #selector(togglePopover)
        }

        // Create popover with recorder
        let popover = NSPopover()
        popover.contentViewController = NSHostingController(rootView: ContentView().environmentObject(recorder))
        popover.behavior = .transient
        self.popover = popover

        // Setup global shortcut
        setupGlobalShortcut()

        // Request permissions
        requestPermissions()

        // Setup overlay window observation
        setupOverlayWindow()
    }

    func setupOverlayWindow() {
        // Observe recording state changes
        recordingObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("RecordingStateChanged"),
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.updateOverlayVisibility()
        }
    }

    func updateOverlayVisibility() {
        guard let recorder = recorder else { return }

        if recorder.isRecording || recorder.isProcessing {
            // Show overlay window
            if overlayWindow == nil {
                overlayWindow = OverlayWindow(recorder: recorder)
            }
            overlayWindow?.makeKeyAndOrderFront(nil)
            overlayWindow?.orderFrontRegardless()
        } else {
            // Hide overlay window but keep it alive (preserves position)
            overlayWindow?.orderOut(nil)
        }
    }

    @objc func togglePopover() {
        if let popover = popover {
            if popover.isShown {
                popover.performClose(nil)
            } else {
                if let button = statusItem?.button {
                    popover.show(relativeTo: button.bounds, of: button, preferredEdge: .minY)
                }
            }
        }
    }

    func setupGlobalShortcut() {
        // Setup Carbon Event Tap for single key monitoring
        let eventMask = (1 << CGEventType.keyDown.rawValue)

        guard let eventTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(eventMask),
            callback: { (proxy, type, event, refcon) in
                let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
                let flags = event.flags

                // Check for Option key (58) or Command key (55)
                if keyCode == 58 && flags.contains(.maskAlternate) {
                    // Option key pressed
                    NotificationCenter.default.post(name: NSNotification.Name("ToggleRecording"), object: nil)
                    return nil // Suppress the event
                }

                return Unmanaged.passRetained(event)
            },
            userInfo: nil
        ) else {
            print("Failed to create event tap")
            return
        }

        let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: eventTap, enable: true)
    }

    func requestPermissions() {
        // Request microphone permission
        AVCaptureDevice.requestAccess(for: .audio) { granted in
            if granted {
                print("✅ Microphone permission granted")
            } else {
                print("❌ Microphone permission denied")
            }
        }

        // Check accessibility permission
        let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true]
        let accessEnabled = AXIsProcessTrustedWithOptions(options)

        if accessEnabled {
            print("✅ Accessibility permission granted")
        } else {
            print("⚠️ Accessibility permission needed")
        }
    }

    deinit {
        if let observer = recordingObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }
}
