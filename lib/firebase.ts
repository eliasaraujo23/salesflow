import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwOPD8Cl3vFIs64Xte2h3O9-q7M8JP3fI",
  authDomain: "salesflow-goldtech.firebaseapp.com",
  projectId: "salesflow-goldtech",
  storageBucket: "salesflow-goldtech.firebasestorage.app",
  messagingSenderId: "673844856609",
  appId: "1:673844856609:web:2cd067a86bc976a74c2060"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
