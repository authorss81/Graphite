package webview

import android.webkit.JavascriptInterface
import database.DatabaseHelper
import sync.YjsSyncEngine
import java.net.URI

/**
 * Android JavaScript Bridge exposed to the WebView via window.AndroidBridge.
 * Handles document update callbacks, logging, and hardware feature requests (OCR, Audio).
 * ALL calls are origin-validated — only allowed from the known app URL.
 */
class AndroidJSBridge(
    private val syncEngine: YjsSyncEngine,
    private val allowedHosts: Set<String> = setOf("trabkkiursawlwavtsdv.supabase.co"),
    private val onNativeAction: (action: String, payload: String) -> Unit = { _, _ -> }
) {
    @Volatile
    var currentUrl: String = ""
        private set

    fun setCurrentUrl(url: String) {
        currentUrl = url
    }

    fun isAllowed(): Boolean {
        if (currentUrl.isBlank()) {
            println("[AndroidJSBridge] BLOCKED: currentUrl is empty — setCurrentUrl() was never called")
            return false
        }
        return try {
            val uri = URI(currentUrl)
            // Require HTTPS scheme
            val scheme = uri.scheme ?: return false
            if (scheme != "https") {
                println("[AndroidJSBridge] BLOCKED: scheme must be https, got $scheme")
                return false
            }
            // Reject non-standard ports (only 443 or default allowed)
            val port = uri.port
            if (port != -1 && port != 443) {
                println("[AndroidJSBridge] BLOCKED: port $port not allowed")
                return false
            }
            val host = uri.host ?: return false
            allowedHosts.any { host == it || host.endsWith(".$it") }
        } catch (_: Exception) {
            false
        }
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
