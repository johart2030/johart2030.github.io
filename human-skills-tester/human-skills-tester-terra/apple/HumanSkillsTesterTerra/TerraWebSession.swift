import Foundation
import Combine
import WebKit

final class TerraWebSession: NSObject, ObservableObject {
    static let home = URL(string: "https://johart2030.github.io/human-skills-tester/human-skills-tester-terra/index.html")!
    @Published var canGoBack = false
    @Published var canGoForward = false
    @Published var isLoading = false
    @Published var errorMessage: String?
    let webView: WKWebView

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        load(Self.home)
    }

    func load(_ url: URL) { errorMessage = nil; webView.load(URLRequest(url: url)) }
    func reload() { webView.reload() }
    func goHome() { load(Self.home) }
    func goBack() { if webView.canGoBack { webView.goBack() } }
    func goForward() { if webView.canGoForward { webView.goForward() } }
    func openDeepLink(_ url: URL) {
        guard url.scheme == "hstterra" else { return }
        let page = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "page" })?.value ?? "index.html"
        guard !page.contains(".."), let destination = URL(string: page, relativeTo: Self.home.deletingLastPathComponent()) else { return }
        load(destination)
    }
    private func updateNavigation() { canGoBack = webView.canGoBack; canGoForward = webView.canGoForward }
}

extension TerraWebSession: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { isLoading = true; errorMessage = nil; updateNavigation() }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { isLoading = false; updateNavigation() }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { isLoading = false; errorMessage = "Could not load Human Skills Tester Terra. Check your connection and try again."; updateNavigation() }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { isLoading = false; errorMessage = "Could not reach Human Skills Tester Terra. Check your connection and try again."; updateNavigation() }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.targetFrame == nil, let url = action.request.url { load(url); decisionHandler(.cancel); return }
        decisionHandler(.allow)
    }
}

extension TerraWebSession: WKUIDelegate {
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            load(url)
        }
        return nil
    }
}
