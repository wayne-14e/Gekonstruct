import { z } from "zod";

/**
 * Public Firebase config. These values are inlined at build time; a missing value is a
 * setup error, so fail loudly with an actionable message instead of a blank screen.
 */
const PublicFirebaseSchema = z.object({
  apiKey: z.string().min(1),
  authDomain: z.string().min(1),
  projectId: z.string().min(1),
  storageBucket: z.string().min(1),
  messagingSenderId: z.string().min(1),
  appId: z.string().min(1),
});

const raw = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const parsed = PublicFirebaseSchema.safeParse(raw);

if (!parsed.success) {
  throw new Error(
    `Firebase web config is incomplete. Missing: ${parsed.error.issues
      .map((i) => i.path.join("."))
      .join(", ")}. Copy .env.example to .env.local and fill the NEXT_PUBLIC_FIREBASE_* values.`,
  );
}

export const firebaseConfig = parsed.data;
