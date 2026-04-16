import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

const auth = getAuth();

// ==============================
// 🔥 ONE TAP → FIREBASE
// ==============================
window.handleCredentialResponse = (response) => {
  const credential = GoogleAuthProvider.credential(response.credential);

  signInWithCredential(auth, credential)
    .then((userCredential) => {
      console.log("Signed in:", userCredential.user);
    })
    .catch(console.error);
};

// ==============================
// 🔥 ONE TAP INIT (SIMPLE + STABLE)
// ==============================
function showOneTap() {
  if (auth.currentUser) return; // ❌ don’t show if signed in

  if (!window.google?.accounts?.id) return;

  google.accounts.id.initialize({
    client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
    callback: window.handleCredentialResponse,
    auto_select: true
  });

  google.accounts.id.prompt();
}

// ==============================
// 🔥 ALWAYS SHOW WHEN LOGGED OUT
// ==============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showOneTap();
  }
});