export type ShareCardFonts = {
  sans: string;
  mono: string;
};

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

async function loadBrandFonts(): Promise<ShareCardFonts> {
  const sansProbe = document.createElement("span");
  const monoProbe = document.createElement("span");
  for (const probe of [sansProbe, monoProbe]) {
    probe.textContent = "Gekonstruct";
    probe.style.position = "fixed";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
  }
  sansProbe.className = "font-sans";
  monoProbe.className = "font-mono";
  document.body.append(sansProbe, monoProbe);
  try {
    const sans = getComputedStyle(sansProbe).fontFamily;
    const mono = getComputedStyle(monoProbe).fontFamily;
    sansProbe.getBoundingClientRect();
    monoProbe.getBoundingClientRect();
    await document.fonts.ready;
    return { sans, mono };
  } finally {
    sansProbe.remove();
    monoProbe.remove();
  }
}

function drawCardFrame(
  context: CanvasRenderingContext2D,
  fonts: ShareCardFonts,
  category: string,
  accentColor: string,
) {
  context.fillStyle = "#0b0f14";
  context.fillRect(0, 0, 1200, 630);

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

  context.font = `700 20px ${fonts.sans}`;
  context.fillStyle = "#f1f5f9";
  context.fillText("GEKONSTRUCT", 76, 111);
  context.textAlign = "right";
  context.font = `600 14px ${fonts.mono}`;
  context.fillStyle = accentColor;
  context.fillText(category, 1124, 109);

  context.textAlign = "left";
  context.font = `600 13px ${fonts.mono}`;
  context.fillStyle = "#91a0ad";
  context.fillText("UNDERSTAND YOUR CODE. BUILD WITH CONFIDENCE.", 76, 562);
  context.textAlign = "right";
  context.font = `700 15px ${fonts.sans}`;
  context.fillStyle = accentColor;
  context.fillText("gekonstruct.dev", 1124, 562);
  context.textAlign = "left";
}

export async function createBrandedShareImage(input: {
  fileName: string;
  category: string;
  accentColor: string;
  drawContent: (context: CanvasRenderingContext2D, fonts: ShareCardFonts) => void;
}): Promise<File> {
  const fonts = await loadBrandFonts();
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the Gekonstruct share card.");

  drawCardFrame(context, fonts, input.category, input.accentColor);
  input.drawContent(context, fonts);

  const dataUrl = canvas.toDataURL("image/png");
  const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new File([bytes], input.fileName, { type: "image/png" });
}

export { drawRoundedRect };
