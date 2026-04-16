import {
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { auth } from "./firebase-config.js";

// ==============================
// 🔥 ONE TAP → FIREBASE
// ==============================
window.handleCredentialResponse = (response) => {
  const credential = GoogleAuthProvider.credential(response.credential);

  signInWithCredential(auth, credential)
    .then((user) => {
      console.log("Signed in:", user.user);
    })
    .catch(console.error);
};

// ==============================
// 🔥 ONE TAP INIT
// ==============================
let initialized = false;

function showOneTap() {
  if (auth.currentUser) return;

  if (!window.google?.accounts?.id) {
    setTimeout(showOneTap, 200);
    return;
  }

  if (!initialized) {
    google.accounts.id.initialize({
      client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
      callback: window.handleCredentialResponse,
      auto_select: true
    });
    initialized = true;
  }

  google.accounts.id.prompt();
}

// ==============================
// 🔥 ALWAYS SHOW WHEN LOGGED OUT
// ==============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    setTimeout(showOneTap, 300);
  }
});