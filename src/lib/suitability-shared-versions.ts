import type { DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "@/lib/admin";

/** Removes one data version and its entry chunks. Chunks are deleted in batches of 450, Firestore's batch limit. */
export async function removeVersion(taskRef: DocumentReference, version: string) {
  const versionRef = taskRef.collection("versions").doc(version);
  const chunks = await versionRef.collection("entryChunks").get();
  for (let start = 0; start < chunks.docs.length; start += 450) {
    const batch = adminDb().batch();
    chunks.docs.slice(start, start + 450).forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
  await versionRef.delete();
}

/** Purges every stored version of a task, including versions a failed save left behind. */
export async function removeAllVersions(taskRef: DocumentReference) {
  const versions = await taskRef.collection("versions").listDocuments();
  for (const version of versions) await removeVersion(taskRef, version.id);
}
