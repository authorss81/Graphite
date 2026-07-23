/**
 * Graphite JS-Native Communication Bridge
 * Coordinates document updates between the React/JS Lexical editor and the Native Kotlin/Swift shell.
 */

/**
 * Isomorphic base64 encode — works in browser, Node.js, Workers, React Native.
 */
export function encodeBase64(data: string): string {
  const bytes = new TextEncoder().encode(data);
  // Base64 alphabet
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    result += base64Chars[b0 >> 2];
    result += base64Chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? base64Chars[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < bytes.length ? base64Chars[b2 & 63] : "=";
  }
  return result;
}

/**
 * Isomorphic base64 decode — works in browser, Node.js, Workers, React Native.
 */
export function decodeBase64(data: string): string {
  const base64Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  // Strip padding
  const sanitized = data.replace(/=+$/, "");
  const bytes: number[] = [];
  for (let i = 0; i < sanitized.length; i += 4) {
    const c0 = base64Chars.indexOf(sanitized[i]);
    const c1 = base64Chars.indexOf(sanitized[i + 1]);
    const c2 = i + 2 < sanitized.length ? base64Chars.indexOf(sanitized[i + 2]) : -1;
    const c3 = i + 3 < sanitized.length ? base64Chars.indexOf(sanitized[i + 3]) : -1;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== -1) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c3 !== -1) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
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
