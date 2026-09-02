using System.Runtime.InteropServices;
using System.Text.Json;

static class RemoteInput {
  const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
  const uint MOUSE_MOVE = 0x0001, MOUSE_ABSOLUTE = 0x8000, LEFT_DOWN = 0x0002, LEFT_UP = 0x0004,
    RIGHT_DOWN = 0x0008, RIGHT_UP = 0x0010, MIDDLE_DOWN = 0x0020, MIDDLE_UP = 0x0040, KEY_UP = 0x0002;

  [StructLayout(LayoutKind.Sequential)] struct INPUT { public uint type; public InputUnion u; }
  [StructLayout(LayoutKind.Explicit)] struct InputUnion { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint mouseData, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort vk, scan; public uint flags, time; public IntPtr extra; }
  [DllImport("user32.dll")] static extern uint SendInput(uint count, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern short VkKeyScan(char ch);

  static void Mouse(double x, double y, uint flags) => SendInput(1, [new INPUT {
    type = INPUT_MOUSE, u = new InputUnion { mi = new MOUSEINPUT {
      dx = (int)Math.Clamp(x * 65535, 0, 65535), dy = (int)Math.Clamp(y * 65535, 0, 65535), flags = flags
    }}
  }], Marshal.SizeOf<INPUT>());

  static void Key(string key) {
    var special = new Dictionary<string, ushort>(StringComparer.OrdinalIgnoreCase) {
      ["Enter"] = 0x0D, ["Backspace"] = 0x08, ["Tab"] = 0x09, ["Escape"] = 0x1B,
      [" "] = 0x20, ["ArrowLeft"] = 0x25, ["ArrowUp"] = 0x26, ["ArrowRight"] = 0x27, ["ArrowDown"] = 0x28
    };
    ushort vk = special.TryGetValue(key, out var value) ? value : key.Length == 1 ? (ushort)(VkKeyScan(key[0]) & 0xff) : (ushort)0;
    if (vk == 0) return;
    SendInput(2, [
      new INPUT { type = INPUT_KEYBOARD, u = new InputUnion { ki = new KEYBDINPUT { vk = vk } } },
      new INPUT { type = INPUT_KEYBOARD, u = new InputUnion { ki = new KEYBDINPUT { vk = vk, flags = KEY_UP } } }
    ], Marshal.SizeOf<INPUT>());
  }

  public static void Main() {
    string? line;
    while ((line = Console.ReadLine()) != null) try {
      using var json = JsonDocument.Parse(line); var root = json.RootElement;
      var kind = root.GetProperty("kind").GetString();
      if (kind == "key") { Key(root.GetProperty("key").GetString() ?? ""); continue; }
      var x = root.GetProperty("x").GetDouble(); var y = root.GetProperty("y").GetDouble();
      if (kind == "move") Mouse(x, y, MOUSE_MOVE | MOUSE_ABSOLUTE);
      else {
        var button = root.TryGetProperty("button", out var b) ? b.GetInt32() : 0;
        uint flag = (kind, button) switch { ("down", 2) => RIGHT_DOWN, ("up", 2) => RIGHT_UP, ("down", 1) => MIDDLE_DOWN, ("up", 1) => MIDDLE_UP, ("down", _) => LEFT_DOWN, _ => LEFT_UP };
        Mouse(x, y, MOUSE_MOVE | MOUSE_ABSOLUTE | flag);
      }
    } catch { }
  }
}
