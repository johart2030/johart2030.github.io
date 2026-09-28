import SwiftUI

@main
struct HumanSkillsTesterTerraApp: App {
    @StateObject private var session = TerraWebSession()

    var body: some Scene {
        WindowGroup {
            TerraBrowserView()
                .environmentObject(session)
                .onOpenURL { session.openDeepLink($0) }
        }
        #if os(macOS)
        .defaultSize(width: 1180, height: 820)
        #endif
    }
}
