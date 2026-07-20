/**
 * Graphite JS-Native Communication Bridge
 * Coordinates document updates between the React/JS Lexical editor and the Native Kotlin/Swift shell.
 */

export function encodeBase64(data: string): string {
  const bytes = new TextEncoder().encode(data);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  try {
    return btoa(binary);
  } catch {
    return btoa(unescape(encodeURIComponent(data)));
  }
}

export function decodeBase64(data: string): string {
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    try {
      return decodeURIComponent(escape(atob(data)));
    } catch {
      return atob(data);
    }
  }
}

interface BridgeUpdate {
  type: 'update';
  docId: string;
  payload: string;
}

// Declare native global bridge interfaces
declare global {
  interface Window {
    loadDocument: (docId: string, payloadBase64: string) => void;
    receiveUpdateFromNative: (docId: string, payloadBase64: string) => void;
    AndroidBridge?: {
      onDocumentUpdated: (docId: string, payloadBase64: string) => void;
      logMessage: (level: string, message: string) => void;
    };
    webkit?: {
      messageHandlers: {
        iosBridge: {
          postMessage: (message: BridgeUpdate | { type: 'log'; payload: string }) => void;
        };
      };
    };
  }
}

/**
 * Sends a document update to the native shell (Android/iOS)
 */
export function sendUpdateToNative(docId: string, payloadBase64: string) {
  if (window.AndroidBridge?.onDocumentUpdated) {
    try {
      window.AndroidBridge.onDocumentUpdated(docId, payloadBase64);
    } catch (err) {
      console.error('Android bridge update failed:', err);
    }
    return;
  }

  if (window.webkit?.messageHandlers.iosBridge) {
    try {
      window.webkit.messageHandlers.iosBridge.postMessage({
        type: 'update',
        docId,
        payload: payloadBase64,
      });
    } catch (err) {
      console.error('iOS bridge update failed:', err);
    }
    return;
  }

  console.log(`[Bridge] Doc ${docId} updated:`, payloadBase64.substring(0, 50) + '...');
}

/**
 * Logs a message to the native console for easier debugging
 */
export function logToNative(level: 'info' | 'warn' | 'error', message: string) {
  if (window.AndroidBridge?.logMessage) {
    window.AndroidBridge.logMessage(level, message);
  } else if (window.webkit?.messageHandlers.iosBridge) {
    window.webkit.messageHandlers.iosBridge.postMessage({
      type: 'log',
      payload: `[${level.toUpperCase()}] ${message}`
    });
  } else {
    console[level](`[NativeLog] ${message}`);
  }
}
