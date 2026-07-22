import { supabase } from "./supabase";
import { logToNative } from "./bridge";

const BUCKET = "graphite-images";

export async function uploadImage(file: File): Promise<string> {
  // Offline / Unconfigured fallback: convert File to Data URL
  if (!supabase) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${crypto.randomUUID()}.${ext}`;

  try {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      logToNative("warn", `Supabase upload failed, using offline Data URL: ${error.message}`);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    }

    const { data: publicUrl } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(path);

    return publicUrl.publicUrl;
  } catch {
    // Fallback to local Data URL on network error
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
}

export async function uploadFromClipboard(
  clipboardItems: DataTransferItemList,
): Promise<string | null> {
  for (let i = 0; i < clipboardItems.length; i++) {
    const item = clipboardItems[i];
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) {
        return uploadImage(file);
      }
    }
  }
  return null;
}

export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const file = input.files?.[0] ?? null;
      resolve(file);
    };
    input.click();
  });
}
