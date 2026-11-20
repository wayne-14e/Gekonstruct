import { BADGES, BADGE_IDS } from "@/lib/badges";

const APP_URL = "https://gekonstruct.dev";

export function buildProgressShareText(profile: {
  displayName: string;
  totalXp: number;
  badges: readonly string[];
}): string {
  const displayName = profile.displayName.replace(/\s+/g, " ").trim() || "A Gekonstruct learner";
  const earnedBadges = BADGE_IDS.filter((id) => profile.badges.includes(id)).map(
    (id) => BADGES[id].name,
  );
  const achievements =
    earnedBadges.length > 0 ? `Badges: ${earnedBadges.join(", ")}` : "No badges earned yet";

  return [
    `${displayName} is learning to understand their code—not just vibe-code—with Gekonstruct.`,
    `${profile.totalXp.toLocaleString("en-US")} XP · ${achievements}`,
    `Start your own journey: ${APP_URL}`,
  ].join("\n\n");
}

function drawRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const corner = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + corner, y);
  context.arcTo(x + width, y, x + width, y + height, corner);
  context.arcTo(x + width, y + height, x, y + height, corner);
  context.arcTo(x, y + height, x, y, corner);
  context.arcTo(x, y, x + width, y, corner);
  context.closePath();
}

function fitText(context: CanvasRenderingContext2D, text: string, width: number): string {
  let fitted = text;
  while (fitted.length > 1 && context.measureText(`${fitted}…`).width > width) {
    fitted = fitted.slice(0, -1);
  }
  return fitted === text ? text : `${fitted.trimEnd()}…`;
}

export function createProgressShareImage(profile: {
  displayName: string;
  totalXp: number;
  badges: readonly string[];
}): File {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the progress share card.");

  const displayName = profile.displayName.replace(/\s+/g, " ").trim() || "Gekonstruct learner";
  const earnedBadges = BADGE_IDS.filter((id) => profile.badges.includes(id)).map(
    (id) => BADGES[id].name,
  );

  context.fillStyle = "#0b0f14";
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawRoundedRect(context, 28, 28, 1144, 574, 28);
  context.fillStyle = "#111821";
  context.fill();
  context.lineWidth = 2;
  context.strokeStyle = "#26313c";
  context.stroke();

  const accent = context.createLinearGradient(76, 0, 340, 0);
  accent.addColorStop(0, "#5be000");
  accent.addColorStop(0.55, "#b9e769");
  accent.addColorStop(1, "#f0c766");
  drawRoundedRect(context, 76, 67, 88, 6, 3);
  context.fillStyle = accent;
  context.fill();

  context.font = "700 20px Arial, sans-serif";
  context.fillStyle = "#f1f5f9";
  context.fillText("GEKONSTRUCT", 76, 111);
  context.textAlign = "right";
  context.font = "600 14px Arial, sans-serif";
  context.fillStyle = "#91a0ad";
  context.fillText("LEARNING ACHIEVEMENT", 1124, 109);
  context.textAlign = "left";

  context.font = "700 15px Arial, sans-serif";
  context.fillStyle = "#ffc53d";
  context.fillText("NOT JUST VIBE-CODING", 76, 160);
  context.font = "700 46px Arial, sans-serif";
  context.fillStyle = "#f1f5f9";
  context.fillText(fitText(context, displayName, 1048), 76, 218);
  context.font = "20px Arial, sans-serif";
  context.fillStyle = "#a9b6c2";
  context.fillText("is learning how their code works", 76, 250);

  drawRoundedRect(context, 76, 282, 1048, 132, 18);
  context.fillStyle = "#0b0f14";
  context.fill();
  context.font = "600 14px Arial, sans-serif";
  context.fillStyle = "#91a0ad";
  context.fillText("TOTAL XP", 104, 318);
  context.font = "700 68px Arial, sans-serif";
  const xpGradient = context.createLinearGradient(104, 0, 540, 0);
  xpGradient.addColorStop(0, "#5be000");
  xpGradient.addColorStop(1, "#b9e769");
  context.fillStyle = xpGradient;
  context.fillText(`${profile.totalXp.toLocaleString("en-US")} XP`, 104, 389);

  context.font = "600 14px Arial, sans-serif";
  context.fillStyle = "#91a0ad";
  context.fillText(`BADGES EARNED · ${earnedBadges.length}`, 76, 457);

  let badgeX = 76;
  context.font = "600 16px Arial, sans-serif";
  for (const badgeName of earnedBadges.length > 0 ? earnedBadges : ["Your first badge awaits"]) {
    const chipWidth = context.measureText(badgeName).width + 36;
    drawRoundedRect(context, badgeX, 475, chipWidth, 40, 10);
    context.fillStyle = earnedBadges.length > 0 ? "#2b1f06" : "#19212a";
    context.fill();
    context.strokeStyle = earnedBadges.length > 0 ? "#584211" : "#303b47";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = earnedBadges.length > 0 ? "#ffd57a" : "#a9b6c2";
    context.fillText(badgeName, badgeX + 18, 501);
    badgeX += chipWidth + 12;
  }

  context.font = "600 13px Arial, sans-serif";
  context.fillStyle = "#91a0ad";
  context.fillText("UNDERSTAND YOUR CODE. BUILD WITH CONFIDENCE.", 76, 562);
  context.textAlign = "right";
  context.fillStyle = "#5be000";
  context.fillText("gekonstruct.dev", 1124, 562);
  context.textAlign = "left";

  const dataUrl = canvas.toDataURL("image/png");
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new File([bytes], "gekonstruct-progress.png", { type: "image/png" });
}
