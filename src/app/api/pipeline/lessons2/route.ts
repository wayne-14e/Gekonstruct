import { handleLessonsStage } from "@/lib/pipeline/lessons-route";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stage `lessons2`: the second half; sets the project to `ready` on success. */
export async function POST(request: Request) {
  return handleLessonsStage(request, 2);
}
