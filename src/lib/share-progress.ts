import { BADGES, BADGE_IDS } from "@/lib/badges";
import {
  createBrandedShareImage,
  drawRoundedRect,
  type ShareCardFonts,
} from "@/lib/share-card";

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

function fitText(context: CanvasRenderingContext2D, text: string, width: number): string {
  let fitted = text;
  while (fitted.length > 1 && context.measureText(`${fitted}…`).width > width) {
    fitted = fitted.slice(0, -1);
  }
  return fitted === text ? text : `${fitted.trimEnd()}…`;
}

export async function createProgressShareImage(profile: {
  displayName: string;
  totalXp: number;
  badges: readonly string[];
}): Promise<File> {
  const displayName = profile.displayName.replace(/\s+/g, " ").trim() || "Gekonstruct learner";
  const earnedBadges = BADGE_IDS.filter((id) => profile.badges.includes(id)).map(
    (id) => BADGES[id].name,
  );

  return createBrandedShareImage({
    fileName: "gekonstruct-progress.png",
    category: "LEARNING ACHIEVEMENT",
    accentColor: "#5be000",
    drawContent: (context: CanvasRenderingContext2D, fonts: ShareCardFonts) => {
      context.font = `700 15px ${fonts.mono}`;
      context.fillStyle = "#ffc53d";
      context.fillText("NOT JUST VIBE-CODING", 76, 160);
      context.font = `700 46px ${fonts.sans}`;
      context.fillStyle = "#f1f5f9";
      context.fillText(fitText(context, displayName, 1048), 76, 218);
      context.font = `400 20px ${fonts.sans}`;
      context.fillStyle = "#a9b6c2";
      context.fillText("is learning how their code works", 76, 250);

      drawRoundedRect(context, 76, 282, 1048, 132, 18);
      context.fillStyle = "#0b0f14";
      context.fill();
      context.font = `600 14px ${fonts.mono}`;
      context.fillStyle = "#91a0ad";
      context.fillText("TOTAL XP", 104, 318);
      context.font = `700 68px ${fonts.sans}`;
      const xpGradient = context.createLinearGradient(104, 0, 540, 0);
      xpGradient.addColorStop(0, "#5be000");
      xpGradient.addColorStop(1, "#b9e769");
      context.fillStyle = xpGradient;
      context.fillText(`${profile.totalXp.toLocaleString("en-US")} XP`, 104, 389);

      context.font = `600 14px ${fonts.mono}`;
      context.fillStyle = "#91a0ad";
      context.fillText(`BADGES EARNED · ${earnedBadges.length}`, 76, 457);

      let badgeX = 76;
      context.font = `600 16px ${fonts.sans}`;
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
    },
  });
}
