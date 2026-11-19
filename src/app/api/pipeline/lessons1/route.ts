import { handleLessonsStage } from "@/lib/pipeline/lessons-route";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stage `lessons1`: the first half of the Foundations pathway. */
export async function POST(request: Request) {
  return handleLessonsStage(request, 1);
}
