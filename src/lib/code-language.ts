/**
 * Map a snapshot path to a shiki language id. Unknown extensions fall back to `text`, so a
 * lesson can never break rendering because a repo contains an exotic file type.
 */
const BY_EXTENSION: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "jsonc",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  htm: "html",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  py: "python",
  go: "go",
  rs: "rust",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  swift: "swift",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  ini: "ini",
  xml: "xml",
  graphql: "graphql",
  gql: "graphql",
  prisma: "prisma",
  dockerfile: "docker",
  env: "dotenv",
  txt: "text",
};

const BY_FILENAME: Record<string, string> = {
  dockerfile: "docker",
  makefile: "make",
  ".gitignore": "text",
  ".env": "dotenv",
  ".env.local": "dotenv",
  ".env.example": "dotenv",
};

export function languageForPath(path: string): string {
  const filename = path.split("/").pop()?.toLowerCase() ?? "";
  if (BY_FILENAME[filename]) return BY_FILENAME[filename] ?? "text";

  const extension = filename.includes(".") ? filename.split(".").pop() ?? "" : "";
  return BY_EXTENSION[extension] ?? "text";
}
