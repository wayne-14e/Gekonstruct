/** Shared firebase-admin bootstrap for local scripts (service-account JSON from .secrets). */
import { readFileSync } from "node:fs";
import { cert, initializeApp } from "firebase-admin/app";

export function initApp() {
  const json = JSON.parse(
    readFileSync(new URL("../.secrets/firebase-service-account.json", import.meta.url), "utf8"),
  );
  return initializeApp({
    credential: cert({
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key,
    }),
  });
}
