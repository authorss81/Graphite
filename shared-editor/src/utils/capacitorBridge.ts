/**
 * Capacitor Native Bridge — Graphite Notes
 *
 * Thin wrappers around Capacitor plugins that gracefully degrade to
 * web-standard alternatives when running in a browser (not native).
 */

// Detect whether we are running inside a Capacitor container
export const isNative = (): boolean =>
  typeof (window as any).Capacitor !== "undefined" &&
  (window as any).Capacitor?.isNativePlatform?.() === true;

// ── Camera ─────────────────────────────────────────────────
export interface CapturedPhoto {
  dataUrl: string; // base64 data-url (image/jpeg)
}

/**
 * Opens the camera (native) or file picker (web) and returns the
 * selected/captured image as a base64 data-url.
 */
export async function capturePhoto(): Promise<CapturedPhoto | null> {
  if (isNative()) {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        quality: 80,
        allowEditing: false,
      });
      if (photo.dataUrl) {
        return { dataUrl: photo.dataUrl };
      }
    } catch (err) {
      console.warn("Camera capture cancelled or failed:", err);
    }
    return null;
  }

  // Web fallback: open file picker filtered to images
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // prefer rear camera on mobile
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string });
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ── File Picker ─────────────────────────────────────────────
export interface PickedFile {
  name: string;
  data: string; // base64-encoded file contents
  mimeType: string;
}

/**
 * Opens a file picker (native or web) and returns the file as base64.
 */
export async function pickFile(accept?: string): Promise<PickedFile | null> {
  if (isNative()) {
    try {
      // @capacitor/filesystem does not include a picker, so we fall through to the
      // web-based <input> even on native. A dedicated plugin like @robingenz/capacitor-file-picker
      // would be needed for a true native picker.
    } catch {}
  }

  // Web / fallback
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        // strip the data-url prefix to get raw base64
        const base64 = dataUrl.split(",")[1] ?? dataUrl;
        resolve({ name: file.name, data: base64, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ── Haptics ─────────────────────────────────────────────────

/** Light haptic tap — used for selections and toggles. */
export async function hapticLight(): Promise<void> {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
      return;
    } catch {}
  }
  navigator.vibrate?.(10);
}

/** Medium haptic tap — used for confirmations. */
export async function hapticMedium(): Promise<void> {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
      return;
    } catch {}
  }
  navigator.vibrate?.(20);
}

/** Strong haptic tap — used for destructive actions. */
export async function hapticHeavy(): Promise<void> {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Heavy });
      return;
    } catch {}
  }
  navigator.vibrate?.([30, 10, 30]);
}

// ── Status Bar ──────────────────────────────────────────────

/** Configure native status bar appearance. */
export async function configureStatusBar(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0a0f" });
  } catch (err) {
    console.warn("StatusBar configuration failed:", err);
  }
}

// ── Save File ───────────────────────────────────────────────

/**
 * Write text content to a file.
 * On native: writes to the app's documents directory.
 * On web: triggers a download.
 */
export async function saveTextFile(filename: string, content: string, mimeType = "text/plain"): Promise<void> {
  if (isNative()) {
    try {
      const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
      await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return;
    } catch (err) {
      console.warn("Filesystem write failed, falling back to download:", err);
    }
  }

  // Web fallback
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
