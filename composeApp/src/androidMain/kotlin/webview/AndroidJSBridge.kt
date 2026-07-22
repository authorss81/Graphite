package webview

import android.webkit.JavascriptInterface
import database.DatabaseHelper
import sync.YjsSyncEngine

/**
 * Android JavaScript Bridge exposed to the WebView via window.AndroidBridge.
 * Handles document update callbacks, logging, and hardware feature requests (OCR, Audio).
 * ALL calls are origin-validated — only allowed from the known app URL.
 */
class AndroidJSBridge(
    private val dbHelper: DatabaseHelper,
    private val syncEngine: YjsSyncEngine,
    private val allowedOrigins: Set<String> = setOf("https://trabkkiursawlwavtsdv.supabase.co", "file://"),
    private val onNativeAction: (action: String, payload: String) -> Unit = { _, _ -> }
) {
    private var currentUrl: String = ""

    fun setCurrentUrl(url: String) {
        currentUrl = url
    }

    private fun isAllowed(): Boolean {
        if (currentUrl.startsWith("file://")) return true
        return allowedOrigins.any { currentUrl.startsWith(it) }
    }

    @JavascriptInterface
    fun onDocumentUpdated(docId: String, yjsUpdateBase64: String) {
        if (!isAllowed()) {
            println("[AndroidJSBridge] BLOCKED from $currentUrl")
            return
        }
        println("[AndroidJSBridge] Document updated from WebView: $docId")
        syncEngine.receiveUpdate(docId, yjsUpdateBase64)
        onNativeAction("document_updated", docId)
    }

    @JavascriptInterface
    fun logMessage(level: String, message: String) {
        if (!isAllowed()) return
        println("[WebView Log][$level] $message")
    }

    @JavascriptInterface
    fun requestCameraOCR() {
        if (!isAllowed()) return
        println("[AndroidJSBridge] Camera OCR requested by user.")
        onNativeAction("camera_ocr", "")
    }

    @JavascriptInterface
    fun startAudioRecording() {
        if (!isAllowed()) return
        println("[AndroidJSBridge] Audio recording started.")
        onNativeAction("start_audio", "")
    }

    @JavascriptInterface
    fun stopAudioRecording() {
        if (!isAllowed()) return
        println("[AndroidJSBridge] Audio recording stopped.")
        onNativeAction("stop_audio", "")
    }
}
