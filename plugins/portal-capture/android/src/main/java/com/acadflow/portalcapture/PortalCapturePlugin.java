package com.acadflow.portalcapture;

import android.annotation.SuppressLint;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.net.Uri;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

@CapacitorPlugin(name = "PortalCapture")
public class PortalCapturePlugin extends Plugin {
    private static final int MAX_PAYLOAD_CHARS = 4_000_000;
    private Dialog dialog;
    private WebView webView;
    private Runnable timeout;
    private String activePageUrl;
    private boolean suppressDismissEvent;

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url", "").trim();
        if (url.isEmpty() || !isHttpUrl(url)) {
            call.reject("A valid http or https portal URL is required.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            closeDialog(false);
            createDialog(url);
            call.resolve();
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            closeDialog(true);
            call.resolve();
        });
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createDialog(String url) {
        dialog = new Dialog(getActivity());
        dialog.setTitle("Portal Capture");
        dialog.setCancelable(true);

        LinearLayout container = new LinearLayout(getActivity());
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundColor(Color.WHITE);

        Button closeButton = new Button(getActivity());
        closeButton.setText("Close");
        closeButton.setOnClickListener(view -> closeDialog(true));
        container.addView(closeButton, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

        webView = new WebView(getActivity());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setUserAgentString(settings.getUserAgentString() + " AcadFlowPortalCapture/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new CaptureBridge(), "AcadFlowCapture");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String pageUrl) {
                super.onPageFinished(view, pageUrl);
                view.evaluateJavascript(loadCaptureScript(), null);
                activePageUrl = pageUrl;
            }
        });
        container.addView(webView, new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        dialog.setContentView(container);
        if (dialog.getWindow() != null) {
            dialog.getWindow().setBackgroundDrawable(new ColorDrawable(Color.WHITE));
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            dialog.getWindow().setGravity(Gravity.CENTER);
        }
        dialog.setOnDismissListener(ignored -> {
            clearWebView();
            if (!suppressDismissEvent) notifyListeners("closed", new JSObject());
            dialog = null;
        });
        dialog.show();
        if (dialog.getWindow() != null) {
            dialog.getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
        }
        webView.loadUrl(url);

        timeout = () -> {
            notifyError("Capture timed out. Close and try again.");
            closeDialog(false);
        };
        getActivity().getWindow().getDecorView().postDelayed(timeout, 10 * 60 * 1000L);
    }

    private boolean isHttpUrl(String value) {
        Uri uri = Uri.parse(value);
        return "http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme());
    }

    private final class CaptureBridge {
        @JavascriptInterface
        public void onCapture(String rawPayload) {
            if (rawPayload == null || rawPayload.length() > MAX_PAYLOAD_CHARS) {
                notifyError("The captured page is too large. Try a simpler portal page.");
                return;
            }
            try {
                JSONObject input = new JSONObject(rawPayload);
                String capturedUrl = input.optString("url", "");
                String title = input.optString("title", "");
                String tables = input.optString("tables", "");
                if (!isHttpUrl(capturedUrl)
                    || !isHttpUrl(activePageUrl)
                    || !capturedUrl.equals(activePageUrl)
                    || tables.isEmpty()
                    || tables.length() > MAX_PAYLOAD_CHARS) {
                    notifyError("No usable tables were found on this page.");
                    return;
                }
                JSObject payload = new JSObject();
                payload.put("url", capturedUrl);
                payload.put("title", title);
                payload.put("tables", tables);
                notifyListeners("capture", payload);
                getActivity().runOnUiThread(() -> closeDialog(false));
            } catch (Exception ignored) {
                notifyError("The capture payload was malformed. Try again.");
            }
        }
    }

    private void notifyError(String message) {
        JSObject payload = new JSObject();
        payload.put("message", message);
        notifyListeners("error", payload);
    }

    private void closeDialog(boolean notifyClosed) {
        if (timeout != null) {
            getActivity().getWindow().getDecorView().removeCallbacks(timeout);
            timeout = null;
        }
        suppressDismissEvent = true;
        if (dialog != null && dialog.isShowing()) dialog.dismiss();
        suppressDismissEvent = false;
        dialog = null;
        clearWebView();
        if (notifyClosed) notifyListeners("closed", new JSObject());
    }

    private void clearWebView() {
        if (webView != null) {
            webView.stopLoading();
            webView.loadUrl("about:blank");
            webView.removeJavascriptInterface("AcadFlowCapture");
            webView.destroy();
            webView = null;
        }
        activePageUrl = null;
        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.removeAllCookies(null);
        cookieManager.removeSessionCookies(null);
        cookieManager.flush();
    }

    private String loadCaptureScript() {
        try (java.io.InputStream input = getActivity().getAssets().open("capture-button-script.js")) {
            byte[] bytes = new byte[input.available()];
            int length = input.read(bytes);
            return new String(bytes, 0, length, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }
}
