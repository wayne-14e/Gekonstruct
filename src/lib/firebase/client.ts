"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./config";

/**
 * Browser Firebase singletons. Everything here is import-safe on the server (no
 * localStorage / window access until a function is called) but must only be *used*
 * from client components.
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
