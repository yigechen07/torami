import Cocoa
import ApplicationServices

let excludedPID = Int32(CommandLine.arguments.dropFirst().first ?? "0") ?? 0
struct MovedWindow { let element: AXUIElement; let original: CGPoint; let pid: Int32 }
var moved: [Int: MovedWindow] = [:]
func displays() -> [[String: Any]] {
    return NSScreen.screens.compactMap { screen in
        guard let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber else { return nil }
        return ["id": number.uint32Value, "safeAreaTop": screen.safeAreaInsets.top]
    }
}
func windows(fullscreenCandidates: Bool = false) -> [[String: Any]] {
    guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return [] }
    return list.compactMap { item in
        guard let pid = item[kCGWindowOwnerPID as String] as? Int32, pid != excludedPID,
              let layer = item[kCGWindowLayer as String] as? Int, layer >= 0,
              let alpha = item[kCGWindowAlpha as String] as? Double, alpha > 0,
              let id = item[kCGWindowNumber as String] as? Int,
              let bounds = item[kCGWindowBounds as String] as? [String: Double],
              let x = bounds["X"], let y = bounds["Y"], let width = bounds["Width"], let height = bounds["Height"],
              width >= 100, height >= 80 else { return nil }
        // Video fullscreen can use a separate, elevated window. Include such
        // windows for fullscreen detection, but never turn them into walking
        // surfaces. Dock / system overlays aren't regular app windows.
        guard layer == 0 || (fullscreenCandidates && NSRunningApplication(processIdentifier: pid)?.activationPolicy == .regular) else { return nil }
        return ["id": id, "pid": pid, "x": x, "y": y, "width": width, "height": height, "layer": layer]
    }
}
func point(_ element: AXUIElement) -> CGPoint? {
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &value) == .success,
          let value, CFGetTypeID(value) == AXValueGetTypeID() else { return nil }
    var result = CGPoint.zero
    guard AXValueGetValue(value as! AXValue, .cgPoint, &result) else { return nil }
    return result
}
func setPoint(_ element: AXUIElement, _ value: CGPoint) -> Bool {
    var value = value
    guard let wrapped = AXValueCreate(.cgPoint, &value) else { return false }
    return AXUIElementSetAttributeValue(element, kAXPositionAttribute as CFString, wrapped) == .success
}
func move(_ request: [String: Any], _ current: [[String: Any]]) -> [String: Any] {
    // This branch is reached only through the user's explicit "push window" menu
    // action. Reading the window list never prompts for Accessibility access.
    guard AXIsProcessTrusted() else { return ["ok": false, "error": "accessibility"] }
    guard let id = request["id"] as? Int, let x = request["x"] as? Double, let y = request["y"] as? Double,
          x.isFinite, y.isFinite, abs(x) < 32768, abs(y) < 32768,
          let record = current.first(where: { $0["id"] as? Int == id }),
          let pid = record["pid"] as? Int32, pid != excludedPID,
          let oldX = record["x"] as? Double, let oldY = record["y"] as? Double,
          hypot(x - oldX, y - oldY) <= 151 else { return ["ok": false, "error": "invalid-window"] }
    let application = AXUIElementCreateApplication(pid)
    AXUIElementSetMessagingTimeout(application, 0.5)
    var value: CFTypeRef?
    guard AXUIElementCopyAttributeValue(application, kAXWindowsAttribute as CFString, &value) == .success,
          let elements = value as? [AXUIElement] else { return ["ok": false, "error": "unavailable"] }
    let matches = elements.filter { element in
        guard let p = point(element) else { return false }
        var sizeValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXSizeAttribute as CFString, &sizeValue) == .success,
              let sizeValue, CFGetTypeID(sizeValue) == AXValueGetTypeID() else { return false }
        var size = CGSize.zero
        AXValueGetValue(sizeValue as! AXValue, .cgSize, &size)
        return abs(p.x - oldX) < 3 && abs(p.y - oldY) < 3
            && abs(size.width - (record["width"] as? Double ?? 0)) < 3
            && abs(size.height - (record["height"] as? Double ?? 0)) < 3
    }
    guard matches.count == 1, let element = matches.first, let original = point(element) else { return ["ok": false, "error": "ambiguous-window"] }
    guard setPoint(element, CGPoint(x: x, y: y)) else { return ["ok": false, "error": "not-movable"] }
    if moved[id] == nil { moved[id] = MovedWindow(element: element, original: original, pid: pid) }
    return ["ok": true]
}
func restore() -> [String: Any] {
    var restored = 0
    for (id, saved) in Array(moved) {
        guard NSRunningApplication(processIdentifier: saved.pid) != nil, point(saved.element) != nil else { moved.removeValue(forKey: id); continue }
        if setPoint(saved.element, saved.original) { restored += 1; moved.removeValue(forKey: id) }
    }
    return ["ok": moved.isEmpty, "restored": restored]
}
func respond(_ request: [String: Any]) {
    let current = windows()
    let command = request["command"] as? String ?? "list"
    var result: [String: Any] = ["ok": true]
    if command == "move" { result = move(request, current) }
    if command == "restore" { result = restore() }
    result["request"] = request["request"] ?? 0
    result["windows"] = command == "list" ? current : windows()
    result["fullscreenWindows"] = windows(fullscreenCandidates: true)
    result["displays"] = displays()
    result["accessibility"] = AXIsProcessTrusted()
    result["movedCount"] = moved.count
    if let data = try? JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]), let string = String(data: data, encoding: .utf8) { print(string); fflush(stdout) }
}
if CommandLine.arguments.contains("--once") { respond([:]) }
else {
    while let line = readLine() {
        guard line.utf8.count < 4096, let data = line.data(using: .utf8), let request = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else { continue }
        if request["command"] as? String == "quit" { _ = restore(); break }
        respond(request)
    }
    _ = restore()
}
