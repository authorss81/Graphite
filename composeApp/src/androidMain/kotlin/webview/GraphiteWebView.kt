package webview

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.view.View
import android.webkit.ValueCallback
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

    private var filePathCallback: ValueCallback<Array<Uri>>? = null

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
        webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                filePath: ValueCallback<Array<Uri>>,
                fileChooserParams: FileChooserParams
            ): Boolean {
                val activity = context as? Activity
                if (activity == null) return false
                filePathCallback?.onReceiveValue(null)
                filePathCallback = filePath
                val intent = fileChooserParams.createIntent()
                try {
                    activity.startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE)
                } catch (e: Exception) {
                    filePathCallback?.onReceiveValue(null)
                    filePathCallback = null
                    return false
                }
                return true
            }
        }
        setLayerType(View.LAYER_TYPE_HARDWARE, null)
    }

    fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            filePathCallback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            )
            filePathCallback = null
        }
        super.onActivityResult(requestCode, resultCode, data)
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
            cacheMode = WebSettings.LOAD_DEFAULT
        }
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 10001
    }

    /**
     * Loads a document into the webview by executing window.loadDocument(docId, payloadBase64)
     * Uses JSON.stringify for safe JS string escaping to prevent injection.
     */
    fun loadDocumentInWebView(docId: String, payloadBase64: String) {
        val safeDocId = org.json.JSONObject.quote(docId)
        val safePayload = org.json.JSONObject.quote(payloadBase64)
        val script = "if(window.loadDocument){ window.loadDocument($safeDocId, $safePayload); }"
        // Origin validation: only execute if bridge URL is from an allowed host
        if (!bridge.isAllowed()) {
            throw SecurityException("Blocked evaluateJavascript from unauthorized origin: ${bridge.currentUrl}")
        }
        // JSONObject.quote() properly escapes all JS special characters — safe to execute
        post {
            evaluateJavascript(script, null)
        }
    }
}
