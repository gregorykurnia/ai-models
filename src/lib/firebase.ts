import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDg-VRhlp5Ikk2TDUmx52cAluULwKtC0aE",
  authDomain: "ai-comparison-6b522.firebaseapp.com",
  projectId: "ai-comparison-6b522",
  storageBucket: "ai-comparison-6b522.firebasestorage.app",
  messagingSenderId: "730294474017",
  appId: "1:730294474017:web:4d80ed5c14107574fbda60",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
