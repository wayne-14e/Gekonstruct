import {
  createBrandedShareImage,
  drawRoundedRect,
  type ShareCardFonts,
} from "@/lib/share-card";

const APP_URL = "https://gekonstruct.dev";

export function buildRoastShareText(input: {
  projectTitle: string;
  quote: string;
  file: string;
  repoUrl: string;
}): string {
  return [
    `Geko roasted ${input.projectTitle}:`,
    `“${input.quote}”`,
    `${input.file}`,
    `See the project: ${input.repoUrl}`,
    `Roast your own repo: ${APP_URL}`,
  ].join("\n\n");
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.slice(0, maxLines);
}

export async function createRoastShareImage(input: {
  projectTitle: string;
  quote: string;
  file: string;
}): Promise<File> {
  return createBrandedShareImage({
    fileName: "gekonstruct-repo-roast.png",
    category: "REPO ROAST",
    accentColor: "#ffc53d",
    drawContent: (context: CanvasRenderingContext2D, fonts: ShareCardFonts) => {
      context.font = `700 22px ${fonts.sans}`;
      context.fillStyle = "#a9b6c2";
      context.fillText(input.projectTitle.slice(0, 62), 76, 158);

      drawRoundedRect(context, 76, 188, 1048, 258, 18);
      context.fillStyle = "#2b1f06";
      context.fill();
      context.strokeStyle = "#584211";
      context.lineWidth = 2;
      context.stroke();

      context.font = `700 38px ${fonts.sans}`;
      context.fillStyle = "#ffd57a";
      const lines = wrapText(context, `“${input.quote}”`, 980, 4);
      lines.forEach((line, index) => {
        context.fillText(line, 112, 262 + index * 50);
      });

      drawRoundedRect(context, 76, 474, 1048, 58, 12);
      context.fillStyle = "#0b0f14";
      context.fill();
      context.font = `600 16px ${fonts.mono}`;
      context.fillStyle = "#ffc53d";
      context.fillText(input.file.slice(0, 90), 104, 509);
    },
  });
}
