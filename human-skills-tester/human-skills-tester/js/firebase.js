import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, deleteUser, reauthenticateWithPopup, setPersistence, browserLocalPersistence, signInWithCredential } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getDatabase, ref, set, update, remove, get, onValue, onDisconnect, serverTimestamp as rtdbTimestamp, push, runTransaction as runRTDBTransaction } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-database.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAarz1W85ASeOPxSGTiz3jgKeXA9Mskw18",
  authDomain: "human-skills-tester.firebaseapp.com",
  projectId: "human-skills-tester",
  storageBucket: "human-skills-tester.firebasestorage.app",
  messagingSenderId: "820576883284",
  appId: "1:820576883284:web:1e381f056b99bd048293c1",
  measurementId: "G-MLHW8FN7VM",
  databaseURL: "https://human-skills-tester-default-rtdb.firebaseio.com"
};
export const GOOGLE_CLIENT_ID="820576883284-v4ojl18sjr9a07sv6hjkglc8eh0di0f6.apps.googleusercontent.com";
export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app); export const db=getFirestore(app); export const rtdb=getDatabase(app);
setPersistence(auth,browserLocalPersistence).catch(console.warn);
analyticsSupported().then(ok=>{if(ok)getAnalytics(app)}).catch(()=>{});
export { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, deleteUser, reauthenticateWithPopup, signInWithCredential, doc, getDoc, setDoc, updateDoc, deleteDoc, runTransaction, serverTimestamp, collection, query, orderBy, limit, getDocs, where, ref, set, update, remove, get, onValue, onDisconnect, rtdbTimestamp, push, runRTDBTransaction };
export function friendlyError(e){const map={'auth/email-already-in-use':'That email already has an account.','auth/invalid-credential':'Email or password is incorrect.','auth/weak-password':'Use a password with at least 6 characters.','auth/popup-closed-by-user':'The sign-in window was closed.','auth/popup-blocked':'Pop-up blocked. Trying a full page sign-in instead.','auth/network-request-failed':'Network error. Check your connection.','auth/requires-recent-login':'Please sign out and sign in again before deleting your account.','permission-denied':'Firebase rules blocked this request. Deploy the included rules.'};return map[e?.code]||e?.message||'Something went wrong.'}
export async function profileFor(uid){const s=await getDoc(doc(db,'users',uid));return s.exists()?s.data():null}
export async function claimDisplayName(user,raw){const displayName=raw.trim().replace(/\\s+/g,' '),key=displayName.toLowerCase();if(!/^[a-zA-Z0-9 _-]{3,20}$/.test(displayName))throw new Error('Display name must be 3–20 characters using letters, numbers, spaces, _ or -.');await runTransaction(db,async tx=>{const nameRef=doc(db,'usernames',key),userRef=doc(db,'users',user.uid),existing=await tx.get(nameRef),old=await tx.get(userRef);if(existing.exists()&&existing.data().uid!==user.uid)throw new Error('That display name is already taken.');if(old.exists()&&old.data().usernameKey&&old.data().usernameKey!==key)tx.delete(doc(db,'usernames',old.data().usernameKey));if(!existing.exists())tx.set(nameRef,{uid:user.uid,displayName});tx.set(userRef,{uid:user.uid,displayName,usernameKey:key,email:user.email||'',photoURL:user.photoURL||'',createdAt:old.exists()?old.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()},{merge:true});});await updateProfile(user,{displayName});return displayName}
