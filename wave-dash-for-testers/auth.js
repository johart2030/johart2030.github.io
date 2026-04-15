// auth.js (module)

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

window.firebaseAuth = auth;

window.handleCredentialResponse = function (response) {
  const idToken = response?.credential;
  if (!idToken) return;

  const credential = GoogleAuthProvider.credential(idToken);

  signInWithCredential(auth, credential)
    .then((result) => {
      window.dispatchEvent(
        new CustomEvent("auth-ready", {
          detail: { user: result.user }
        })
      );
    })
    .catch((error) => {
      const code = String(error?.code || "");
      if (code === "auth/account-exists-with-different-credential") return;
      console.error("One Tap login error:", error);
    });
};

onAuthStateChanged(auth, (user) => {
  if (!user) return;

  window.currentUser = user;
  window.dispatchEvent(
    new CustomEvent("auth-ready", {
      detail: { user }
    })
  );
});
