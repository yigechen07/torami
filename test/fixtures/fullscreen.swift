import Cocoa
import ApplicationServices

// Standalone AppKit regression fixture. Run with: <pet PID> native|video.
let app = NSApplication.shared
let petPID = Int32(CommandLine.arguments.dropFirst().first ?? "0") ?? 0
guard CommandLine.arguments.count == 3, petPID > 0,
      ["native", "video"].contains(CommandLine.arguments[2]) else {
    fputs("Usage: fullscreen-fixture <pet PID> native|video\n", stderr); exit(1)
}
let mode = CommandLine.arguments[2]
var failures: [String] = []
var reachedFullscreen = false
func snapshot(_ phase: String, expectPet: Bool) {
    let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
    let rows = list.compactMap { w -> [String: Any]? in
        let pid = w[kCGWindowOwnerPID as String] as? Int32 ?? 0
        guard pid == getpid() || pid == petPID,
              let b = w[kCGWindowBounds as String] as? [String: Double],
              (b["Width"] ?? 0) >= 100, (b["Height"] ?? 0) >= 80 else { return nil }
        return ["pid": pid, "bounds": b, "layer": w[kCGWindowLayer as String] ?? 0]
    }
    let visible = rows.contains { ($0["pid"] as? Int32) == petPID }
    if visible != expectPet { failures.append("\(phase): expected pet visible=\(expectPet), got \(visible)") }
    let data = try! JSONSerialization.data(withJSONObject: ["phase": phase, "mode": mode, "petVisible": visible, "windows": rows], options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!); fflush(stdout)
}
func finish() {
    if !reachedFullscreen { failures.append("fullscreen transition was not reached") }
    let data = try! JSONSerialization.data(withJSONObject: ["ok": failures.isEmpty, "mode": mode, "failures": failures], options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!); fflush(stdout)
    exit(failures.isEmpty ? 0 : 1)
}
class Delegate: NSObject, NSWindowDelegate {
    func windowDidEnterFullScreen(_ n: Notification) {
        reachedFullscreen = true
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            snapshot("fullscreen", expectPet: false)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) { (n.object as? NSWindow)?.toggleFullScreen(nil) }
        }
    }
    func windowDidExitFullScreen(_ n: Notification) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) { snapshot("restored", expectPet: true); finish() }
    }
}
let delegate = Delegate()
app.setActivationPolicy(.regular)
let window = NSWindow(contentRect: NSRect(x: 200, y: 200, width: 800, height: 500), styleMask: [.titled, .closable, .resizable, .miniaturizable], backing: .buffered, defer: false)
window.title = "Torami fullscreen check"
window.delegate = delegate
window.collectionBehavior = [.fullScreenPrimary]
window.backgroundColor = NSColor(calibratedRed: 1, green: 0.94, blue: 0.97, alpha: 1)
window.makeKeyAndOrderFront(nil)
app.activate(ignoringOtherApps: true)
DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
    snapshot("windowed", expectPet: true)
    if mode == "native" { window.toggleFullScreen(nil); return }
    let view = window.contentView!
    reachedFullscreen = view.enterFullScreenMode(NSScreen.main!, withOptions: [:])
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
        snapshot("fullscreen", expectPet: false)
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            view.exitFullScreenMode(options: [:])
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { snapshot("restored", expectPet: true); finish() }
        }
    }
}
DispatchQueue.main.asyncAfter(deadline: .now() + 18) { failures.append("timed out"); finish() }
app.run()
