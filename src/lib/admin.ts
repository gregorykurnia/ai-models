import { applicationDefault, cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function adminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID || "ai-comparison-6b522";
  if (rawServiceAccount) {
    let serviceAccount: ServiceAccount;
    try {
      serviceAccount = JSON.parse(rawServiceAccount) as ServiceAccount;
    } catch {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON");
    }
    return initializeApp({ credential: cert(serviceAccount), projectId });
  }

  return initializeApp({ credential: applicationDefault(), projectId });
}

export function adminDb() { return getFirestore(adminApp()); }
