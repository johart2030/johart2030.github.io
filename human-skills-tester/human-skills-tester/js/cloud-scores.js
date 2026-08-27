import {auth,db,onAuthStateChanged,doc,setDoc,serverTimestamp} from './firebase.js';
onAuthStateChanged(auth,user=>{if(!user)return;const original=HST.setBest.bind(HST);HST.setBest=(key,value,lower=false)=>{const won=original(key,value,lower);if(won)setDoc(doc(db,'users',user.uid,'scores',key),{value,updatedAt:serverTimestamp()},{merge:true}).catch(console.warn);return won};});
