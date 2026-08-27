// auth.js (module)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import { firebaseConfig } from "./firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 👇 Make global for One Tap
window.handleCredentialResponse = function (response) {
  const idToken = response.credential;

  const credential = GoogleAuthProvider.credential(idToken);

  signInWithCredential(auth, credential)
    .then((result) => {
      console.log("Signed in:", result.user);

      // Example: start game or save player
      // startGame();
    })
    .catch((error) => {
      console.error("Login error:", error);
    });
};