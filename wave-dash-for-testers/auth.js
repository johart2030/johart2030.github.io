// auth.js (module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🌐 Make available globally for other scripts
window.firebaseAuth = auth;

// 👇 One Tap callback (Google Identity Services)
window.handleCredentialResponse = function (response) {
  const idToken = response.credential;

  const credential = GoogleAuthProvider.credential(idToken);

  signInWithCredential(auth, credential)
    .then((result) => {
      console.log("✅ Signed in:", result.user);

      // Fire auth-ready event immediately
      window.dispatchEvent(
        new CustomEvent("auth-ready", {
          detail: { user: result.user }
        })
      );
    })
    .catch((error) => {
      console.error("❌ Login error:", error);
    });
};

// 🔥 MAIN AUTH STATE LISTENER (CRITICAL FIX)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("🔥 Auth ready:", user.uid);

    // Global access
    window.currentUser = user;

    // Notify the rest of the game
    window.dispatchEvent(
      new CustomEvent("auth-ready", {
        detail: { user }
      })
    );
  } else {
    console.log("ℹ️ No user signed in");
  }
});