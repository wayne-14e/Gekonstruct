import "server-only";

import OpenAI from "openai";

/**
 * Thin structured-output layer over DeepSeek's OpenAI-compatible API (BLUEPRINT §6).
 *
 * The pipeline rule: parse with zod (here: `validate`), ONE repair retry with the
 * concrete problems appended, then fail the stage. Nothing in this module knows about
 * architecture, lessons or debug — it only knows "ask for JSON and prove it".
 */

export class LlmError extends Error {
  readonly code: string;
  readonly httpStatus: number;

  constructor(message: string, code: string, httpStatus = 502) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; problems: string[] };

export type StructuredRequest<T> = {
  /** Short stage name for logs, e.g. "architecture". */
  label: string;
  system: string;
  user: string;
  validate: (raw: unknown) => ValidationResult<T>;
};

export type StructuredResult<T> = {
  value: T;
  attempts: number;
  model: string;
};

const DEFAULT_MODEL = "deepseek-flash";
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const REQUEST_TIMEOUT_MS = 50_000; // stage budget is 60s
const MAX_OUTPUT_TOKENS = 8_192;
const MAX_ATTEMPTS = 2;

/**
 * DeepSeek extension, not part of the OpenAI schema. Thinking mode is on by default for
 * `deepseek-flash` and spends output tokens before the JSON starts; the pipeline needs a
 * predictable, sub-minute structured answer, and BLUEPRINT §6 asks for temperature 0.2
 * (which only applies in non-thinking mode).
 */
type DeepSeekThinking = { thinking?: { type: "enabled" | "disabled" } };

type LlmConfig = { apiKey: string; baseURL: string; model: string };

let cachedClient: { client: OpenAI; model: string; baseURL: string } | null = null;

function readConfig(): LlmConfig {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) {
    throw new LlmError(
      "AI analysis isn't configured. Add DEEPSEEK_API_KEY to the server environment.",
      "missing-api-key",
      500,
    );
  }

  return {
    apiKey,
    baseURL: (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL,
  };
}

function client(): { client: OpenAI; model: string } {
  if (cachedClient) return cachedClient;

  const config = readConfig();
  cachedClient = {
    client: new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL }),
    model: config.model,
    baseURL: config.baseURL,
  };
  return cachedClient;
}

/** Test seam: forget the cached client (used after env changes in dev). */
export function resetLlmClient(): void {
  cachedClient = null;
}

function mapSdkError(error: unknown): LlmError {
  if (error instanceof LlmError) return error;

  if (error instanceof OpenAI.APIConnectionTimeoutError) {
    return new LlmError(
      "The AI took too long to answer. Try again — the retry usually lands faster.",
      "llm-timeout",
      504,
    );
  }

  if (error instanceof OpenAI.APIConnectionError) {
    return new LlmError(
      "We couldn't reach the AI service. Try again in a moment.",
      "llm-network",
      503,
    );
  }

  if (error instanceof OpenAI.APIError) {
    if (error.status === 401 || error.status === 403) {
      return new LlmError(
        "The AI service rejected our credentials. Check DEEPSEEK_API_KEY.",
        "llm-auth",
        500,
      );
    }
    if (error.status === 402) {
      return new LlmError(
        "The AI account is out of credit, so the map can't be built right now.",
        "llm-billing",
        503,
      );
    }
    if (error.status === 429) {
      return new LlmError(
        "The AI service is busy right now. Try again in a minute.",
        "llm-rate-limited",
        503,
      );
    }
    if (error.status && error.status >= 500) {
      return new LlmError(
        "The AI service had a problem. Try again in a moment.",
        "llm-upstream",
        503,
      );
    }
    return new LlmError("The AI request failed. Try again in a moment.", "llm-error", 502);
  }

  if (error instanceof Error && /timed? ?out|abort/i.test(`${error.name} ${error.message}`)) {
    return new LlmError(
      "The AI took too long to answer. Try again — the retry usually lands faster.",
      "llm-timeout",
      504,
    );
  }

  return new LlmError("We couldn't reach the AI service. Try again in a moment.", "llm-network", 503);
}

async function complete(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
): Promise<{ content: string; truncated: boolean }> {
  const { client: openai, model } = client();

  let completion: OpenAI.Chat.Completions.ChatCompletion;
  try {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming &
      DeepSeekThinking = {
      model,
      messages,
      temperature: 0.2,
      max_tokens: MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
    };

    completion = await openai.chat.completions.create(params, { timeout: REQUEST_TIMEOUT_MS });
  } catch (error) {
    throw mapSdkError(error);
  }

  const choice = completion.choices[0];
  const content = choice?.message?.content ?? "";

  if (!content.trim()) {
    throw new LlmError("The AI returned an empty answer. Try again.", "llm-empty", 502);
  }

  return { content, truncated: choice?.finish_reason === "length" };
}

/** Strip fences / stray prose, then JSON.parse. Returns null when no object is present. */
export function parseJsonObject(text: string): unknown {
  let body = text.trim();

  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(body);
  if (fence?.[1]) body = fence[1].trim();

  // JSON mode should return a bare object, but a stray sentence before/after it is a
  // cheap thing to tolerate. Always slice to the outermost braces.
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  body = body.slice(start, end + 1);

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

/**
 * Ask for a JSON object and validate it. Attempt 1 is clean; attempt 2 is the repair
 * pass with every concrete problem spelled out. Anything after that is a stage failure.
 */
export async function requestStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: request.system },
    { role: "user", content: request.user },
  ];

  let lastProblems: string[] = ["The previous answer could not be read."];

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    const { content, truncated } = await complete(messages);
    const json = truncated ? null : parseJsonObject(content);

    if (truncated) {
      lastProblems = ["The answer was cut off by the output limit. Return a shorter JSON object."];
    } else if (json === null) {
      lastProblems = ["The response was not a single valid JSON object."];
    } else {
      const result = request.validate(json);
      if (result.ok) {
        console.info(
          `llm:${request.label} accepted on attempt ${attempt} in ${Date.now() - startedAt}ms`,
        );
        return { value: result.value, attempts: attempt, model: client().model };
      }
      lastProblems = result.problems.slice(0, 12);
    }

    console.warn(`llm:${request.label} attempt ${attempt} rejected`, {
      ms: Date.now() - startedAt,
      problems: lastProblems,
      // Enough of the answer to debug a bad shape without dumping a whole repo.
      preview: content.slice(0, 600),
    });

    messages.push({ role: "assistant", content });
    messages.push({
      role: "user",
      content: `That answer failed validation. Fix every problem below and return the corrected JSON object only. Be concise so the answer fits in one response. Do not explain.\n\n${lastProblems
        .map((problem) => `- ${problem}`)
        .join("\n")}`,
    });
  }

  throw new LlmError(
    "The AI couldn't produce a map that matches this repository. Try again — a retry usually fixes it.",
    "llm-invalid-output",
    502,
  );
}
