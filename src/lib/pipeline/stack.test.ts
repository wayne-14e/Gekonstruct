import { describe, expect, it } from "vitest";
import { detectStack, stackChips, type StackInputFile } from "./stack";

function file(path: string, content = ""): StackInputFile {
  return { path, content };
}

function pkg(deps: Record<string, string>): string {
  return JSON.stringify({ dependencies: deps });
}

describe("detectStack", () => {
  it("reads a Next + Firebase + Tailwind app", () => {
    const stack = detectStack([
      file("package.json", pkg({ next: "16.0.0", react: "19.0.0", tailwindcss: "4.0.0", firebase: "12.0.0" })),
      file("tsconfig.json", "{}"),
      file("firebase.json", "{}"),
      file("app/page.tsx", "export default function Page() {}"),
    ]);

    expect(stack).toEqual({
      framework: "next",
      language: "typescript",
      uiLib: "tailwind",
      backend: "next-api",
      db: "firestore",
      auth: "firebase-auth",
      hosting: "firebase",
    });
  });

  it("reads an Express + Mongo + Passport API", () => {
    const stack = detectStack([
      file("package.json", pkg({ express: "4.0.0", mongoose: "8.0.0", passport: "0.7.0" })),
      file("server.js", "const express = require('express')"),
    ]);

    expect(stack).toMatchObject({
      framework: "express",
      language: "javascript",
      uiLib: null,
      backend: "express",
      db: "mongodb",
      auth: "passport",
    });
  });

  it("reads a FastAPI service", () => {
    const stack = detectStack([
      file("requirements.txt", "fastapi==0.115.0\nuvicorn\n"),
      file("main.py", "from fastapi import FastAPI"),
    ]);

    expect(stack).toMatchObject({
      framework: "fastapi",
      language: "python",
      backend: "fastapi",
    });
  });

  it("reads a Go service", () => {
    const stack = detectStack([
      file("go.mod", "module example.com/app\nrequire github.com/gin-gonic/gin v1.10.0"),
      file("main.go", "package main"),
    ]);

    expect(stack).toMatchObject({ framework: "gin", language: "go", backend: "gin" });
  });

  it("reads a Vite + React + Tailwind site", () => {
    const stack = detectStack([
      file("package.json", pkg({ react: "19.0.0", typescript: "5.0.0", vite: "6.0.0" })),
      file("tsconfig.json", "{}"),
      file("tailwind.config.ts", "export default {}"),
      file("src/index.css", '@import "tailwindcss";'),
      file("vercel.json", "{}"),
    ]);

    expect(stack).toMatchObject({
      framework: "react",
      language: "typescript",
      uiLib: "tailwind",
      hosting: "vercel",
    });
  });

  it("detects Prisma from schema files even without a package manifest", () => {
    const stack = detectStack([
      file("prisma/schema.prisma", "datasource db { provider = \"postgresql\" }"),
      file("src/index.ts", ""),
    ]);

    expect(stack?.db).toBe("prisma");
  });

  it("returns null when nothing is recognizable", () => {
    expect(detectStack([file("README.md", "hello")])).toBeNull();
    expect(detectStack([])).toBeNull();
  });
});

describe("stackChips", () => {
  it("drops nulls and duplicates", () => {
    const base = {
      framework: "next",
      language: "typescript",
      uiLib: null,
      backend: "next-api",
      db: null,
      auth: null,
      hosting: null,
    } as const;

    expect(
      stackChips({
        framework: "next",
        language: "typescript",
        uiLib: "tailwind",
        backend: "next-api",
        db: "firestore",
        auth: "firebase-auth",
        hosting: null,
      }),
    ).toEqual(["next", "typescript", "tailwind", "next-api", "firestore", "firebase-auth"]);
    expect(stackChips({ ...base, hosting: "firebase" })).toContain("firebase");
  });
});

