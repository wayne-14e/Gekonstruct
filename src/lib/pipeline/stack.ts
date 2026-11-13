import type { Stack } from "@/lib/domain/project";

/**
 * Deterministic stack detection (BLUEPRINT §5.6). No LLM, no network: it only reads the
 * snapshot's manifests, config paths and a handful of framework markers. Returns null when
 * the repo has nothing we can name, which the ingest stage turns into a friendly failure.
 */

export type StackInputFile = { path: string; content: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function basename(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? path : path.slice(index + 1);
}

function packageDependencies(files: StackInputFile[]): Set<string> {
  const deps = new Set<string>();

  for (const file of files) {
    if (basename(file.path) !== "package.json") continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(file.content);
    } catch {
      continue;
    }
    if (!isRecord(parsed)) continue;

    for (const blockName of ["dependencies", "devDependencies", "peerDependencies"]) {
      const block = parsed[blockName];
      if (!isRecord(block)) continue;
      for (const name of Object.keys(block)) deps.add(name);
    }
  }

  return deps;
}

function joinContents(files: StackInputFile[], matches: (path: string) => boolean): string {
  return files
    .filter((file) => matches(file.path))
    .map((file) => file.content.toLowerCase())
    .join("\n");
}

export function detectStack(files: StackInputFile[]): Stack | null {
  const deps = packageDependencies(files);
  const paths = files.map((file) => file.path.toLowerCase());
  const pathMatch = (pattern: RegExp) => paths.some((path) => pattern.test(path));
  const dep = (...names: string[]) => names.some((name) => deps.has(name));

  const pythonText = joinContents(files, (path) =>
    /(^|\/)(requirements\.txt|pyproject\.toml|pipfile|setup\.py)$/i.test(path),
  );
  const goText = joinContents(files, (path) => /(^|\/)go\.mod$/i.test(path));
  const rustText = joinContents(files, (path) => /(^|\/)cargo\.toml$/i.test(path));
  const styleText = joinContents(files, (path) => /\.(css|scss|sass|less)$/i.test(path));

  const hasGo = pathMatch(/(^|\/)go\.mod$/);
  const hasRust = pathMatch(/(^|\/)cargo\.toml$/);
  const hasPython = pathMatch(/(^|\/)(requirements\.txt|pyproject\.toml|pipfile)$/);
  const hasTypeScript =
    pathMatch(/(^|\/)tsconfig(\.[^/]+)?\.json$/) ||
    paths.some((path) => /\.(ts|tsx|mts|cts)$/.test(path));
  const hasJavaScript =
    deps.size > 0 || paths.some((path) => /\.(js|jsx|mjs|cjs)$/.test(path));

  const hasTailwind =
    dep("tailwindcss", "@tailwindcss/postcss", "tailwindcss-animate") ||
    pathMatch(/(^|\/)tailwind\.config\./) ||
    /@import\s+["']tailwindcss["']|@tailwind\s/.test(styleText);

  let framework: string | null = null;

  // UI / meta-frameworks first: a Next app that also depends on Express is still a Next app
  // for teaching purposes, while `backend` records the server part separately.
  if (dep("next")) framework = "next";
  else if (dep("nuxt")) framework = "nuxt";
  else if (dep("@sveltejs/kit")) framework = "sveltekit";
  else if (dep("astro")) framework = "astro";
  else if (dep("@remix-run/react", "remix")) framework = "remix";
  else if (dep("gatsby")) framework = "gatsby";
  else if (dep("expo")) framework = "expo";
  else if (dep("react-native")) framework = "react-native";
  else if (dep("@angular/core")) framework = "angular";
  else if (dep("react")) framework = "react";
  else if (dep("vue")) framework = "vue";
  else if (dep("svelte")) framework = "svelte";
  else if (dep("solid-js")) framework = "solid";
  else if (dep("electron")) framework = "electron";
  else if (pythonText.includes("fastapi")) framework = "fastapi";
  else if (pythonText.includes("django")) framework = "django";
  else if (pythonText.includes("flask")) framework = "flask";
  else if (pythonText.includes("streamlit")) framework = "streamlit";
  else if (goText.includes("gin-gonic/gin")) framework = "gin";
  else if (goText.includes("labstack/echo")) framework = "echo";
  else if (goText.includes("gofiber/fiber")) framework = "fiber";
  else if (rustText.includes("axum")) framework = "axum";
  else if (rustText.includes("actix-web")) framework = "actix";
  else if (rustText.includes("rocket")) framework = "rocket";
  else if (dep("@nestjs/core")) framework = "nestjs";
  else if (dep("express")) framework = "express";
  else if (dep("fastify")) framework = "fastify";
  else if (dep("hono")) framework = "hono";
  else if (dep("koa")) framework = "koa";
  else if (hasGo) framework = "go";
  else if (hasRust) framework = "rust";
  else if (hasPython) framework = "python";
  else if (deps.size > 0) framework = "node";

  let language: string | null = null;
  if (hasGo) language = "go";
  else if (hasRust) language = "rust";
  else if (hasPython) language = "python";
  else if (hasTypeScript) language = "typescript";
  else if (hasJavaScript) language = "javascript";

  let uiLib: string | null = null;
  if (hasTailwind) uiLib = "tailwind";
  else if (dep("@mui/material")) uiLib = "mui";
  else if (dep("@chakra-ui/react")) uiLib = "chakra";
  else if (dep("bootstrap")) uiLib = "bootstrap";
  else if (dep("antd")) uiLib = "antd";
  else if (dep("styled-components")) uiLib = "styled-components";

  let backend: string | null = null;
  if (dep("firebase-functions", "firebase-functions/v2")) backend = "firebase-functions";
  else if (dep("next")) backend = "next-api";
  else if (dep("@nestjs/core")) backend = "nestjs";
  else if (dep("express")) backend = "express";
  else if (dep("fastify")) backend = "fastify";
  else if (dep("hono")) backend = "hono";
  else if (dep("koa")) backend = "koa";
  else if (pythonText.includes("fastapi")) backend = "fastapi";
  else if (pythonText.includes("django")) backend = "django";
  else if (pythonText.includes("flask")) backend = "flask";
  else if (goText.includes("gin-gonic/gin")) backend = "gin";
  else if (rustText.includes("axum")) backend = "axum";

  let db: string | null = null;
  if (dep("firebase", "firebase-admin", "@google-cloud/firestore")) db = "firestore";
  else if (dep("@supabase/supabase-js") || pathMatch(/(^|\/)supabase\//)) db = "supabase";
  else if (dep("prisma", "@prisma/client") || pathMatch(/(^|\/)prisma\/schema\.prisma$/)) db = "prisma";
  else if (dep("drizzle-orm")) db = "drizzle";
  else if (dep("mongoose", "mongodb")) db = "mongodb";
  else if (dep("pg", "postgres")) db = "postgres";
  else if (dep("mysql2", "mysql")) db = "mysql";
  else if (dep("better-sqlite3", "sqlite3")) db = "sqlite";
  else if (dep("ioredis", "redis")) db = "redis";

  let auth: string | null = null;
  if (dep("firebase", "firebase-admin")) auth = "firebase-auth";
  else if (dep("@supabase/supabase-js")) auth = "supabase-auth";
  else if (dep("next-auth")) auth = "nextauth";
  else if (dep("@clerk/nextjs", "@clerk/clerk-react")) auth = "clerk";
  else if (dep("@auth0/nextjs-auth0", "auth0")) auth = "auth0";
  else if (dep("lucia")) auth = "lucia";
  else if (dep("passport")) auth = "passport";

  let hosting: string | null = null;
  if (pathMatch(/(^|\/)apphosting\.ya?ml$/)) hosting = "firebase-app-hosting";
  else if (pathMatch(/(^|\/)firebase\.json$/)) hosting = "firebase";
  else if (pathMatch(/(^|\/)vercel\.json$/)) hosting = "vercel";
  else if (pathMatch(/(^|\/)netlify\.toml$/)) hosting = "netlify";
  else if (pathMatch(/(^|\/)fly\.toml$/)) hosting = "fly";
  else if (pathMatch(/(^|\/)dockerfile$/)) hosting = "docker";

  if (!framework && !language) return null;

  return { framework, language, uiLib, backend, db, auth, hosting };
}

/** Compact chips for cards and headers, with duplicates removed. */
export function stackChips(stack: Stack): string[] {
  const values = [
    stack.framework,
    stack.language,
    stack.uiLib,
    stack.backend,
    stack.db,
    stack.auth,
    stack.hosting,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(values)];
}
