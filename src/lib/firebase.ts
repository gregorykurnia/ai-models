import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4TCskbe6W8ltfBzNgA3XYfyNm5WxOkwk",
  authDomain: "ai-models-72d27.firebaseapp.com",
  projectId: "ai-models-72d27",
  storageBucket: "ai-models-72d27.firebasestorage.app",
  messagingSenderId: "293751049915",
  appId: "1:293751049915:web:6c6e93c4022f6a48baa39e",
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
