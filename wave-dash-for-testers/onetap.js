// onetap.js (module)

// 🔥 Firebase imports
import { getAuth, signInWithCredential, GoogleAuthProvider } 
from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// 🔥 This connects One Tap → Firebase
window.handleCredentialResponse = (response) => {
  const auth = getAuth();
  const credential = GoogleAuthProvider.credential(response.credential);

  signInWithCredential(auth, credential)
    .then((userCredential) => {
      console.log("Signed in:", userCredential.user);
    })
    .catch(console.error);
};

// 🔥 One Tap init
window.addEventListener("load", () => {
  google.accounts.id.initialize({
    client_id: "92140525618-gffm531n2kucvu82s3g4vanobdgp1cqa.apps.googleusercontent.com",
    callback: handleCredentialResponse,
    auto_select: true
  });

  google.accounts.id.prompt();
});