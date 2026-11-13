/**
 * DEV ONLY — mints a session cookie for a throwaway user so you can click through pages
 * that require auth without a Google popup (Playwright, curl, manual QA).
 *
 *   node scripts/dev-session.mjs [uid] > /tmp/geko-cookie.json
 *
 * Needs .secrets/firebase-service-account.json and NEXT_PUBLIC_FIREBASE_API_KEY in
 * .env.local. Never deploy this file, never share its output.
 */
import { readFileSync } from "node:fs";
import { initApp } from "./_admin.mjs";

const uid = process.argv[2] ?? "dev-tester";
const app = initApp();

const { getAuth } = await import("firebase-admin/auth");
const { getFirestore } = await import("firebase-admin/firestore");

const auth = getAuth(app);
const db = getFirestore(app);

const customToken = await auth.createCustomToken(uid, {
  email: `${uid}@local.gekonstruct.test`,
  displayName: "Dev Tester",
});

const res = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey()}`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true }),
  },
);
if (!res.ok) throw new Error(`custom token exchange failed: ${res.status} ${await res.text()}`);
const { idToken } = await res.json();

const ref = db.doc(`users/${uid}`);
if (!(await ref.get()).exists) {
  await ref.set({
    email: `${uid}@local.gekonstruct.test`,
    displayName: "Dev Tester",
    photoURL: null,
    totalXp: 0,
    badges: [],
    createdAt: Date.now(),
  });
}

const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn: 3600 * 1000 });
console.log(JSON.stringify({ uid, sessionCookie }));

function apiKey() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const line = text.split("\n").find((l) => l.startsWith("NEXT_PUBLIC_FIREBASE_API_KEY="));
  if (!line) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY missing from .env.local");
  return line.slice("NEXT_PUBLIC_FIREBASE_API_KEY=".length).trim();
}
