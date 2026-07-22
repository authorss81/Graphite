package webview

import android.content.Context
import android.graphics.Bitmap
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Custom Android WebView configured for optimal performance, local storage, hardware acceleration,
 * WebChromeClient file pickers, and JS-Native bridge integration.
 */
class GraphiteWebView(
    context: Context,
    private val bridge: AndroidJSBridge
) : WebView(context) {

    init {
        setupSettings()
        addJavascriptInterface(bridge, "AndroidBridge")
        webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
                bridge.setCurrentUrl(url)
            }
            override fun doUpdateVisitedHistory(view: WebView, url: String, isReload: Boolean) {
                bridge.setCurrentUrl(url)
            }
        }
        webChromeClient = WebChromeClient()
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
    }

    private fun setupSettings() {
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            loadWithOverviewMode = true
            useWideViewPort = true
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }
    }

    /**
     * Loads a document into the webview by executing window.loadDocument(docId, payloadBase64)
     * Uses JSON.stringify for safe JS string escaping to prevent injection.
     */
    fun loadDocumentInWebView(docId: String, payloadBase64: String) {
        val safeDocId = org.json.JSONObject.quote(docId)
        val safePayload = org.json.JSONObject.quote(payloadBase64)
        val script = "if(window.loadDocument){ window.loadDocument($safeDocId, $safePayload); }"
        post {
            evaluateJavascript(script, null)
        }
    }
}
