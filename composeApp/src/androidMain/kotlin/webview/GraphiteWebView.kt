package webview

import android.content.Context
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
        webViewClient = WebViewClient()
        webChromeClient = WebChromeClient()
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
    }

    private fun setupSettings() {
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            loadWithOverviewMode = true
            useWideViewPort = true
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        }
    }

    /**
     * Loads a document into the webview by executing window.loadDocument(docId, payloadBase64)
     */
    fun loadDocumentInWebView(docId: String, payloadBase64: String) {
        val script = "if(window.loadDocument){ window.loadDocument('$docId', '$payloadBase64'); }"
        post {
            evaluateJavascript(script, null)
        }
    }
}
