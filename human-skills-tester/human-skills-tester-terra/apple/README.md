# Human Skills Tester Terra for Apple platforms

This is a complete SwiftUI app source for iPhone, iPad, and Mac. It keeps one persistent web session, so games, live presence, friends, Firebase Authentication, and scores use the same backend and signed-in session as the website. It adds native Home, Back, Forward, Reload, connection recovery, and `hstterra://open?page=pi-memory.html` deep links.

## Create the Xcode app

1. On a Mac, install XcodeGen and run `xcodegen generate` inside this `apple` folder. It creates an Xcode project with an iOS/iPadOS target and a macOS target.
2. Open the generated project in Xcode and choose your Apple Developer team in Signing & Capabilities.
3. The included bundle IDs are:
   - iOS/iPadOS: `com.johart2030.humanskillstesterterra`
   - macOS: `com.johart2030.humanskillstesterterra.mac`
4. Test in Simulator and on a real device. Add App Icons in Xcode before App Store submission.

## Firebase registration

Because this app is a web wrapper, it already uses the same Firebase project through the deployed site. You only need to register Apple Firebase apps if you later add native Firebase SDK features such as native push notifications, Analytics, Crashlytics, or native sign-in.

For each bundle ID: Firebase Console → **human-skills-tester** → Project settings → **Your apps** → **Add app** → iOS (then macOS) → enter its exact bundle ID → download `GoogleService-Info.plist` → add it to the matching Xcode target. Do not replace the website's Firebase configuration.

Native Google Sign-In needs its own iOS/macOS URL scheme setup. The current WKWebView app uses the website's existing browser-based authentication flow.
