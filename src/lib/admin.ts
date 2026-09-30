import { applicationDefault,getApps,initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
export function adminDb(){const app=getApps()[0]||initializeApp({credential:applicationDefault(),projectId:process.env.FIREBASE_PROJECT_ID||"ai-comparison-6b522"});return getFirestore(app);}
