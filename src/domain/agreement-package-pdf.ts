import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

export type AgreementPackageAddendum = {
  addendumNumber: number;
  title: string;
  /** Raw PDF bytes for the addendum file; omitted when unavailable. */
  pdfBytes?: Uint8Array | null;
};

export type BuildAgreementPackageInput = {
  agreementId: string;
  actName: string;
  venueName: string;
  termsVersion: number;
  germanBody: string;
  englishBody: string;
  addenda: AgreementPackageAddendum[];
  generatedAt?: Date;
};

export type BuiltAgreementPackage = {
  bytes: Uint8Array;
  fingerprint: string;
  pageCount: number;
};

const MARGIN = 54;
const COLUMN_GAP = 20;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const HEADER_SIZE = 11;
const FOOTER_SIZE = 8;
const TITLE_SIZE = 22;
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.4, 0.4, 0.4);
const RULE = rgb(0.75, 0.75, 0.75);
const MUSTER = rgb(0.82, 0.82, 0.82);

const SALON_DISCLAIMER_EN =
  "This agreement has been provided by Salon for the convenience of the undersigned. Salon is not a legal advisor and holds no responsibility for this agreement or the actions of the undersigned parties. When in doubt, consult a lawyer.";

const SALON_DISCLAIMER_DE =
  "Diese Vereinbarung wurde von Salon zur Erleichterung der unterzeichnenden Parteien bereitgestellt. Salon ist kein Rechtsberater und übernimmt keine Verantwortung für diese Vereinbarung oder das Handeln der unterzeichnenden Parteien. Im Zweifel wenden Sie sich an eine Anwältin oder einen Anwalt.";

/** Drop legacy sandbox banner lines from stored template bodies. */
export function stripSandboxLines(body: string): string {
  return body
    .split("\n")
    .filter((line) => !/^\s*SANDBOX\b/i.test(line.trim()))
    .join("\n");
}

/**
 * Normalize template bodies into readable paragraphs:
 * blank lines stay separators; single newlines become paragraph breaks
 * when the line looks like a labeled field (contains ":").
 */
export function normalizeAgreementBody(body: string): string {
  const cleaned = stripSandboxLines(body).trim();
  if (!cleaned) return "";
  if (/\n\s*\n/.test(cleaned)) {
    return cleaned;
  }
  return cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");
}

export function splitParagraphs(body: string): string[] {
  return normalizeAgreementBody(body)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function pairParagraphs(
  german: string[],
  english: string[],
): Array<{ de: string; en: string }> {
  const len = Math.max(german.length, english.length);
  const pairs: Array<{ de: string; en: string }> = [];
  for (let i = 0; i < len; i++) {
    pairs.push({
      de: german[i] ?? "",
      en: english[i] ?? "",
    });
  }
  return pairs;
}

export function fingerprintPdfBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function truncateFingerprint(fingerprint: string, chars = 16): string {
  return fingerprint.slice(0, chars);
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [""];
  const words = text.replace(/\n/g, " ").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

async function loadPackageFont(): Promise<Uint8Array> {
  const fontPath = path.join(
    process.cwd(),
    "assets",
    "fonts",
    "NotoSans-Regular.ttf",
  );
  const buf = await readFile(fontPath);
  return new Uint8Array(buf);
}

function drawMusterWatermark(page: PDFPage, font: PDFFont) {
  const { width, height } = page.getSize();
  const label = "MUSTER";
  const size = 72;
  const textWidth = font.widthOfTextAtSize(label, size);
  page.drawText(label, {
    x: (width - textWidth) / 2,
    y: height / 2 - size / 3,
    size,
    font,
    color: MUSTER,
    rotate: degrees(32),
    opacity: 0.35,
  });
}

function drawFooter(
  page: PDFPage,
  font: PDFFont,
  input: {
    pageIndex: number;
    pageCount: number;
    fingerprintShort: string;
    agreementShort: string;
  },
) {
  const { width } = page.getSize();
  page.drawLine({
    start: { x: MARGIN, y: 40 },
    end: { x: width - MARGIN, y: 40 },
    thickness: 0.5,
    color: RULE,
  });
  const label = `Seite ${input.pageIndex + 1} / ${input.pageCount}  ·  ${input.fingerprintShort}  ·  ${input.agreementShort}`;
  page.drawText(label, {
    x: MARGIN,
    y: 26,
    size: FOOTER_SIZE,
    font,
    color: MUTED,
    maxWidth: width - MARGIN * 2,
  });
}

function drawCoverPage(
  pdf: PDFDocument,
  font: PDFFont,
  input: BuildAgreementPackageInput,
) {
  const page = pdf.addPage();
  const { width, height } = page.getSize();
  drawMusterWatermark(page, font);

  let y = height - MARGIN - 8;
  page.drawText("Salon", {
    x: MARGIN,
    y,
    size: 14,
    font,
    color: INK,
  });
  y -= 10;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 1,
    color: INK,
  });

  y -= 48;
  page.drawText("Vereinbarung / Agreement", {
    x: MARGIN,
    y,
    size: TITLE_SIZE,
    font,
    color: INK,
  });

  y -= 28;
  page.drawText("Mustervereinbarung · Sample agreement", {
    x: MARGIN,
    y,
    size: 11,
    font,
    color: MUTED,
  });

  y -= 40;
  page.drawText("Parteien / Parties", {
    x: MARGIN,
    y,
    size: HEADER_SIZE,
    font,
    color: MUTED,
  });
  y -= 22;
  page.drawText(`Venue / Veranstaltungsort`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 16;
  page.drawText(input.venueName, {
    x: MARGIN,
    y,
    size: 14,
    font,
    color: INK,
  });
  y -= 28;
  page.drawText(`Act / Künstler`, {
    x: MARGIN,
    y,
    size: 9,
    font,
    color: MUTED,
  });
  y -= 16;
  page.drawText(input.actName, {
    x: MARGIN,
    y,
    size: 14,
    font,
    color: INK,
  });

  y -= 36;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 0.5,
    color: RULE,
  });
  y -= 24;

  const meta = [
    `Konditionen-Version / Terms version: ${input.termsVersion}`,
    `Referenz / Reference: ${input.agreementId}`,
    `Erstellt / Generated: ${(input.generatedAt ?? new Date()).toISOString().slice(0, 10)}`,
  ];
  for (const line of meta) {
    page.drawText(line, {
      x: MARGIN,
      y,
      size: 10,
      font,
      color: INK,
    });
    y -= 16;
  }

  y -= 28;
  page.drawText("Hinweis / Notice", {
    x: MARGIN,
    y,
    size: HEADER_SIZE,
    font,
    color: MUTED,
  });
  y -= 18;

  const disclaimerWidth = width - MARGIN * 2;
  for (const block of [SALON_DISCLAIMER_DE, SALON_DISCLAIMER_EN]) {
    const lines = wrapText(block, font, 9, disclaimerWidth);
    for (const line of lines) {
      if (y < 70) break;
      page.drawText(line, {
        x: MARGIN,
        y,
        size: 9,
        font,
        color: INK,
      });
      y -= 13;
    }
    y -= 12;
  }

  return page;
}

/**
 * Build the immutable bilingual agreement package PDF (cover + contract + addenda).
 */
export async function buildAgreementPackagePdf(
  input: BuildAgreementPackageInput,
): Promise<BuiltAgreementPackage> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const fontBytes = await loadPackageFont();
  const font = await pdf.embedFont(fontBytes);

  drawCoverPage(pdf, font, input);

  const germanParas = splitParagraphs(input.germanBody);
  const englishParas = splitParagraphs(input.englishBody);
  const pairs = pairParagraphs(germanParas, englishParas);

  const agreementShort = input.agreementId.slice(0, 8);

  const startContractPage = () => {
    const page = pdf.addPage();
    drawMusterWatermark(page, font);
    const { width, height } = page.getSize();
    const colWidth = (width - MARGIN * 2 - COLUMN_GAP) / 2;

    page.drawText("Deutsch — maßgeblich", {
      x: MARGIN,
      y: height - MARGIN,
      size: HEADER_SIZE,
      font,
      color: INK,
    });
    page.drawText("English — convenience", {
      x: MARGIN + colWidth + COLUMN_GAP,
      y: height - MARGIN,
      size: HEADER_SIZE,
      font,
      color: MUTED,
    });
    page.drawLine({
      start: { x: MARGIN, y: height - MARGIN - 8 },
      end: { x: MARGIN + colWidth, y: height - MARGIN - 8 },
      thickness: 0.75,
      color: INK,
    });
    page.drawLine({
      start: { x: MARGIN + colWidth + COLUMN_GAP, y: height - MARGIN - 8 },
      end: { x: width - MARGIN, y: height - MARGIN - 8 },
      thickness: 0.75,
      color: RULE,
    });

    return {
      page,
      width,
      colWidth,
      y: height - MARGIN - 28,
    };
  };

  let layout = startContractPage();

  for (const pair of pairs) {
    const deLines = wrapText(pair.de, font, FONT_SIZE, layout.colWidth);
    const enLines = wrapText(pair.en, font, FONT_SIZE, layout.colWidth);
    const blockLines = Math.max(deLines.length, enLines.length);
    const blockHeight = blockLines * LINE_HEIGHT + 12;

    if (layout.y - blockHeight < 56) {
      layout = startContractPage();
    }

    for (let i = 0; i < blockLines; i++) {
      const de = deLines[i] ?? "";
      const en = enLines[i] ?? "";
      layout.y -= LINE_HEIGHT;
      if (de) {
        layout.page.drawText(de, {
          x: MARGIN,
          y: layout.y,
          size: FONT_SIZE,
          font,
          color: INK,
        });
      }
      if (en) {
        layout.page.drawText(en, {
          x: MARGIN + layout.colWidth + COLUMN_GAP,
          y: layout.y,
          size: FONT_SIZE,
          font,
          color: INK,
        });
      }
    }
    layout.y -= 12;
  }

  for (const addendum of input.addenda) {
    const banner = pdf.addPage();
    drawMusterWatermark(banner, font);
    const { height, width } = banner.getSize();
    banner.drawText(
      `Anlage ${addendum.addendumNumber} / Addendum ${addendum.addendumNumber}`,
      {
        x: MARGIN,
        y: height - MARGIN - 20,
        size: 16,
        font,
        color: INK,
      },
    );
    banner.drawLine({
      start: { x: MARGIN, y: height - MARGIN - 30 },
      end: { x: width - MARGIN, y: height - MARGIN - 30 },
      thickness: 0.75,
      color: RULE,
    });
    const titleLines = wrapText(
      addendum.title,
      font,
      12,
      width - MARGIN * 2,
    );
    let ty = height - MARGIN - 52;
    for (const line of titleLines) {
      banner.drawText(line, {
        x: MARGIN,
        y: ty,
        size: 12,
        font,
        color: INK,
      });
      ty -= 16;
    }

    if (addendum.pdfBytes && addendum.pdfBytes.byteLength > 0) {
      try {
        const addendumDoc = await PDFDocument.load(addendum.pdfBytes, {
          ignoreEncryption: true,
        });
        const indices = addendumDoc.getPageIndices();
        const copied = await pdf.copyPages(addendumDoc, indices);
        for (const page of copied) {
          pdf.addPage(page);
          drawMusterWatermark(page, font);
        }
      } catch {
        const note = pdf.addPage();
        drawMusterWatermark(note, font);
        note.drawText(
          "Addendum PDF could not be embedded (unreadable or encrypted).",
          {
            x: MARGIN,
            y: note.getSize().height - MARGIN - 20,
            size: FONT_SIZE,
            font,
            color: rgb(0.5, 0.2, 0.2),
          },
        );
      }
    } else {
      const note = pdf.addPage();
      drawMusterWatermark(note, font);
      note.drawText("Addendum file bytes were not available at generate time.", {
        x: MARGIN,
        y: note.getSize().height - MARGIN - 20,
        size: FONT_SIZE,
        font,
        color: rgb(0.5, 0.2, 0.2),
      });
    }
  }

  const draftBytes = await pdf.save();
  const contentHash = fingerprintPdfBytes(draftBytes);
  const fingerprintShort = truncateFingerprint(contentHash);
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    drawFooter(pages[i]!, font, {
      pageIndex: i,
      pageCount: pages.length,
      fingerprintShort,
      agreementShort,
    });
  }

  const finalBytes = await pdf.save();
  return {
    bytes: finalBytes,
    fingerprint: fingerprintPdfBytes(finalBytes),
    pageCount: pages.length,
  };
}
