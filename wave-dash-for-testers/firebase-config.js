import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyBmiYTrxcD1OS2WTWQaYP-LNXdNlttQ8qY",
  authDomain: "wave-dash-3ed3a.firebaseapp.com",
  projectId: "wave-dash-3ed3a",
  storageBucket: "wave-dash-3ed3a.firebasestorage.app",
  messagingSenderId: "92140525618",
  appId: "1:92140525618:web:31e81b8c9a3f2a87bac42b",
  measurementId: "G-EPF4KJXXMG",
};

// ✅ Initialize Firebase ONCE
const app = initializeApp(firebaseConfig);

// ✅ Export shared auth instance
export const auth = getAuth(app);

// Keep your setting
export const enableCloudSave = true;