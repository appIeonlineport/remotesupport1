import Foundation
import CoreGraphics

func point(_ json: [String: Any]) -> CGPoint? {
  guard let x = json["x"] as? Double, let y = json["y"] as? Double,
        (0...1).contains(x), (0...1).contains(y) else { return nil }
  let display = CGDisplayBounds(CGMainDisplayID())
  return CGPoint(x: display.minX + display.width * x, y: display.minY + display.height * y)
}

let keys: [String: CGKeyCode] = ["Enter": 36, "Backspace": 51, "Tab": 48, "Escape": 53, " ": 49,
  "ArrowLeft": 123, "ArrowRight": 124, "ArrowDown": 125, "ArrowUp": 126]
let printable: [Character: CGKeyCode] = [
  "a": 0, "s": 1, "d": 2, "f": 3, "h": 4, "g": 5, "z": 6, "x": 7, "c": 8, "v": 9,
  "b": 11, "q": 12, "w": 13, "e": 14, "r": 15, "y": 16, "t": 17, "1": 18, "2": 19,
  "3": 20, "4": 21, "6": 22, "5": 23, "9": 25, "7": 26, "8": 28, "0": 29, "o": 31,
  "u": 32, "i": 34, "p": 35, "l": 37, "j": 38, "k": 40, "n": 45, "m": 46
]

while let line = readLine() {
  guard let data = line.data(using: .utf8),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let kind = json["kind"] as? String else { continue }
  if kind == "key", let name = json["key"] as? String {
    let character = name.count == 1 ? name.lowercased().first : nil
    if let code = keys[name] ?? character.flatMap({ printable[$0] }) {
      let down = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: true)
      let up = CGEvent(keyboardEventSource: nil, virtualKey: code, keyDown: false)
      if name.count == 1 && name == name.uppercased() { down?.flags = .maskShift; up?.flags = .maskShift }
      down?.post(tap: .cghidEventTap)
      up?.post(tap: .cghidEventTap)
    }
    continue
  }
  guard let location = point(json) else { continue }
  let buttonValue = json["button"] as? Int ?? 0
  let button: CGMouseButton = buttonValue == 2 ? .right : buttonValue == 1 ? .center : .left
  let type: CGEventType = kind == "move" ? .mouseMoved : kind == "down" ? (button == .right ? .rightMouseDown : .leftMouseDown) : (button == .right ? .rightMouseUp : .leftMouseUp)
  CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: location, mouseButton: button)?.post(tap: .cghidEventTap)
}
