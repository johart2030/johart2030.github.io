import SwiftUI
import WebKit

struct TerraBrowserView: View {
    @EnvironmentObject private var session: TerraWebSession
    var body: some View {
        ZStack {
            PlatformWebView(webView: session.webView)
            if let message = session.errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 34))
                    Text("Connection unavailable")
                        .font(.headline)
                    Text(message)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(.secondary)
                    Button("Try again") { session.reload() }
                        .buttonStyle(.borderedProminent)
                }
                .padding(24)
                .background(.regularMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .shadow(radius: 12)
            }
        }
        .overlay(alignment: .top) { if session.isLoading { ProgressView().controlSize(.small).padding(8) } }
        .toolbar {
            ToolbarItemGroup(placement: .navigation) {
                Button(action: session.goBack) { Label("Back", systemImage: "chevron.backward") }.disabled(!session.canGoBack)
                Button(action: session.goForward) { Label("Forward", systemImage: "chevron.forward") }.disabled(!session.canGoForward)
            }
            ToolbarItemGroup(placement: .primaryAction) {
                Button(action: session.goHome) { Label("Home", systemImage: "house") }
                Button(action: session.reload) { Label("Reload", systemImage: "arrow.clockwise") }
            }
        }
    }
}

#if os(macOS)
struct PlatformWebView: NSViewRepresentable {
    let webView: WKWebView
    func makeNSView(context: Context) -> WKWebView { webView }
    func updateNSView(_ view: WKWebView, context: Context) { }
}
#else
struct PlatformWebView: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ view: WKWebView, context: Context) { }
}
#endif
