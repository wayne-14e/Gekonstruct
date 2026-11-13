import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { z } from "zod";

const ServiceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().email(),
  private_key: z.string().includes("BEGIN PRIVATE KEY"),
});

function createAdminApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Put the service-account JSON (single line) in .env.local.",
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON. It must be the whole service-account file on one line.",
    );
  }

  const parsed = ServiceAccountSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT is missing fields: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }

  return initializeApp({
    credential: cert({
      projectId: parsed.data.project_id,
      clientEmail: parsed.data.client_email,
      // JSON.parse already unescaped \\n, but dotenv can hand us literal "\n" pairs.
      privateKey: parsed.data.private_key.replace(/\\n/g, "\n"),
    }),
  });
}

let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;

/** Lazily initialised so builds without credentials still succeed. */
export function adminAuth(): Auth {
  authInstance ??= getAuth(createAdminApp());
  return authInstance;
}

export function adminDb(): Firestore {
  dbInstance ??= getFirestore(createAdminApp());
  return dbInstance;
}
