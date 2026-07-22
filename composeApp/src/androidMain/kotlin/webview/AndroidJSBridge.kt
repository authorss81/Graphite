package webview

import android.webkit.JavascriptInterface
import database.DatabaseHelper
import sync.YjsSyncEngine

/**
 * Android JavaScript Bridge exposed to the WebView via window.AndroidBridge.
 * Handles document update callbacks, logging, and hardware feature requests (OCR, Audio).
 */
class AndroidJSBridge(
    private val dbHelper: DatabaseHelper,
    private val syncEngine: YjsSyncEngine,
    private val onNativeAction: (action: String, payload: String) -> Unit = { _, _ -> }
) {

    @JavascriptInterface
    fun onDocumentUpdated(docId: String, yjsUpdateBase64: String) {
        println("[AndroidJSBridge] Document updated from WebView: $docId")
        syncEngine.receiveUpdate(docId, yjsUpdateBase64)
        onNativeAction("document_updated", docId)
    }

    @JavascriptInterface
    fun logMessage(level: String, message: String) {
        println("[WebView Log][$level] $message")
    }

    @JavascriptInterface
    fun requestCameraOCR() {
        println("[AndroidJSBridge] Camera OCR requested by user.")
        onNativeAction("camera_ocr", "")
    }

    @JavascriptInterface
    fun startAudioRecording() {
        println("[AndroidJSBridge] Audio recording started.")
        onNativeAction("start_audio", "")
    }

    @JavascriptInterface
    fun stopAudioRecording() {
        println("[AndroidJSBridge] Audio recording stopped.")
        onNativeAction("stop_audio", "")
    }
}
