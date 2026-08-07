import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, degrees, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export type InvoicePdfParty = {
  legalName: string;
  tradingName?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  postalCode: string;
  city: string;
  countryCode: string;
  taxId?: string | null;
  invoiceEmail: string;
  iban?: string | null;
  bic?: string | null;
  paymentNote?: string | null;
};

export type BuildInvoicePdfInput = {
  invoiceId: string;
  bookingId: string;
  locale: "en" | "de";
  currency: string;
  feeCents: number;
  performanceFormat: string;
  startsAtIso: string;
  endsAtIso: string;
  seller: InvoicePdfParty;
  buyer: InvoicePdfParty;
  issuedAt?: Date;
  /** Illustrative VAT rate for layout; sandbox defaults to 0. */
  vatRatePercent?: number;
};

const MARGIN = 48;
const INK = rgb(0.12, 0.12, 0.12);
const MUTED = rgb(0.42, 0.42, 0.42);
const RULE = rgb(0.78, 0.78, 0.78);
const HEADER_BG = rgb(0.93, 0.93, 0.93);
const MUSTER = rgb(0.84, 0.84, 0.84);

type Copy = {
  invoice: string;
  invoiceNo: string;
  invoiceDate: string;
  paymentTerms: string;
  dueDate: string;
  paymentTermsValue: string;
  description: string;
  date: string;
  qty: string;
  unitPrice: string;
  vatPercent: string;
  total: string;
  netTotal: string;
  vatLabel: string;
  amountDue: string;
  companyDetails: string;
  contact: string;
  paymentDetails: string;
  vatNo: string;
  phone: string;
  email: string;
  bank: string;
  iban: string;
  bic: string;
  note: string;
  specimenNote: string;
  salonNote: string;
};

function copyFor(locale: "en" | "de"): Copy {
  if (locale === "de") {
    return {
      invoice: "RECHNUNG",
      invoiceNo: "Rechnungsnr.",
      invoiceDate: "Rechnungsdatum",
      paymentTerms: "Zahlungsziel",
      dueDate: "Fällig am",
      paymentTermsValue: "Sofort",
      description: "Beschreibung",
      date: "Datum",
      qty: "Menge",
      unitPrice: "Einzelpreis",
      vatPercent: "MwSt. %",
      total: "Summe",
      netTotal: "Netto",
      vatLabel: "MwSt.",
      amountDue: "Gesamtbetrag",
      companyDetails: "Firmendaten",
      contact: "Kontakt",
      paymentDetails: "Zahlungsdaten",
      vatNo: "USt-IdNr. / Steuernr.",
      phone: "Telefon",
      email: "E-Mail",
      bank: "Bank",
      iban: "IBAN",
      bic: "BIC",
      note: "Hinweise",
      specimenNote:
        "MUSTER — kein eingereichtes Steuerdokument. Angaben zur Mehrwertsteuer sind illustrativ.",
      salonNote:
        "Salon stellt diese Rechnung zur Erleichterung bereit und zieht keine Zahlungen ein, verwahrt und leitet keine Gelder weiter.",
    };
  }
  return {
    invoice: "INVOICE",
    invoiceNo: "Invoice no.",
    invoiceDate: "Invoice date",
    paymentTerms: "Payment terms",
    dueDate: "Due date",
    paymentTermsValue: "Due on receipt",
    description: "Description",
    date: "Date",
    qty: "Qty",
    unitPrice: "Unit price",
    vatPercent: "VAT %",
    total: "Total",
    netTotal: "Net total",
    vatLabel: "VAT",
    amountDue: "Total amount due",
    companyDetails: "Company details",
    contact: "Contact",
    paymentDetails: "Payment details",
    vatNo: "VAT / tax ID",
    phone: "Phone",
    email: "Email",
    bank: "Bank",
    iban: "IBAN",
    bic: "BIC",
    note: "Notes",
    specimenNote:
      "SPECIMEN — not a filed tax document. VAT treatment shown is illustrative only.",
    salonNote:
      "Salon provides this invoice for convenience and does not collect, hold, or route payment.",
  };
}

function formatMoney(cents: number, currency: string, locale: "en" | "de") {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatDate(iso: string, locale: "en" | "de") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatInstantRange(
  startsAtIso: string,
  endsAtIso: string,
  locale: "en" | "de",
) {
  const start = new Date(startsAtIso);
  const end = new Date(endsAtIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startsAtIso} – ${endsAtIso}`;
  }
  const dateFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeFmt = new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (dateFmt.format(start) === dateFmt.format(end)) {
    return `${dateFmt.format(start)} ${timeFmt.format(start)}–${timeFmt.format(end)}`;
  }
  return `${dateFmt.format(start)} ${timeFmt.format(start)} – ${dateFmt.format(end)} ${timeFmt.format(end)}`;
}

function wrapText(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  if (!text) return [];
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
  return lines;
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  page.drawText(text, { x, y, size, font, color });
}

function drawAddressBlock(
  page: PDFPage,
  party: InvoicePdfParty,
  x: number,
  y: number,
  font: PDFFont,
  fontSize: number,
  boldName = true,
): number {
  let cursor = y;
  const name = party.tradingName?.trim() || party.legalName;
  drawText(page, name, x, cursor, font, boldName ? fontSize + 1 : fontSize);
  cursor -= fontSize + 4;
  if (party.tradingName?.trim() && party.legalName !== party.tradingName) {
    drawText(page, party.legalName, x, cursor, font, fontSize - 1, MUTED);
    cursor -= fontSize + 2;
  }
  const lines = [
    party.addressLine1,
    party.addressLine2?.trim() || null,
    `${party.postalCode} ${party.city}`,
    party.countryCode,
  ].filter(Boolean) as string[];
  for (const line of lines) {
    drawText(page, line, x, cursor, font, fontSize, MUTED);
    cursor -= fontSize + 3;
  }
  return cursor;
}

async function loadFont(): Promise<Uint8Array> {
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
  const size = 64;
  const textWidth = font.widthOfTextAtSize(label, size);
  page.drawText(label, {
    x: (width - textWidth) / 2,
    y: height / 2 - size / 3,
    size,
    font,
    color: MUSTER,
    rotate: degrees(28),
    opacity: 0.28,
  });
}

/**
 * Human-readable EU-style invoice PDF (sandbox specimen).
 * Not EN 16931 / ZUGFeRD — layout only until @jasy/zugferd is wired.
 */
export async function buildInvoicePdf(
  input: BuildInvoicePdfInput,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadFont());
  const page = pdf.addPage([595.28, 841.89]); // A4
  drawMusterWatermark(page, font);

  const { width, height } = page.getSize();
  const copy = copyFor(input.locale);
  const issuedAt = input.issuedAt ?? new Date();
  const vatRate = input.vatRatePercent ?? 0;
  const netCents = input.feeCents;
  const vatCents = Math.round((netCents * vatRate) / 100);
  const grossCents = netCents + vatCents;
  const invoiceNo = input.invoiceId.replace(/-/g, "").slice(0, 8).toUpperCase();
  const serviceDate = formatInstantRange(
    input.startsAtIso,
    input.endsAtIso,
    input.locale,
  );
  const issuedLabel = formatDate(issuedAt.toISOString(), input.locale);

  // Seller (top left)
  let y = height - MARGIN - 4;
  y = drawAddressBlock(page, input.seller, MARGIN, y, font, 10) - 4;

  // INVOICE title (top right)
  const titleSize = 28;
  const titleWidth = font.widthOfTextAtSize(copy.invoice, titleSize);
  drawText(
    page,
    copy.invoice,
    width - MARGIN - titleWidth,
    height - MARGIN - 8,
    font,
    titleSize,
  );

  // Meta block under title
  let metaY = height - MARGIN - 48;
  const metaRows: Array<[string, string]> = [
    [copy.invoiceNo, invoiceNo],
    [copy.invoiceDate, issuedLabel],
    [copy.paymentTerms, copy.paymentTermsValue],
    [copy.dueDate, issuedLabel],
  ];
  const metaLabelWidth = 110;
  for (const [label, value] of metaRows) {
    const labelX = width - MARGIN - metaLabelWidth - 90;
    drawText(page, label, labelX, metaY, font, 9, MUTED);
    drawText(page, value, width - MARGIN - 90, metaY, font, 9);
    metaY -= 14;
  }

  // Buyer
  y = Math.min(y, metaY) - 28;
  y = drawAddressBlock(page, input.buyer, MARGIN, y, font, 10) - 8;

  // Notes
  drawText(page, copy.note, MARGIN, y, font, 9, MUTED);
  y -= 13;
  for (const line of wrapText(copy.specimenNote, font, 9, width - MARGIN * 2)) {
    drawText(page, line, MARGIN, y, font, 9, MUTED);
    y -= 12;
  }
  if (input.seller.paymentNote?.trim()) {
    for (const line of wrapText(
      input.seller.paymentNote.trim(),
      font,
      9,
      width - MARGIN * 2,
    )) {
      drawText(page, line, MARGIN, y, font, 9, MUTED);
      y -= 12;
    }
  }
  y -= 16;

  // Table header
  const tableLeft = MARGIN;
  const tableRight = width - MARGIN;
  const cols = {
    description: tableLeft,
    date: tableLeft + 175,
    qty: tableLeft + 300,
    unit: tableLeft + 340,
    vat: tableLeft + 430,
    total: tableRight,
  };
  const headerTop = y + 6;
  const headerBottom = y - 16;
  page.drawRectangle({
    x: tableLeft,
    y: headerBottom,
    width: tableRight - tableLeft,
    height: headerTop - headerBottom,
    color: HEADER_BG,
  });
  page.drawLine({
    start: { x: tableLeft, y: headerTop },
    end: { x: tableRight, y: headerTop },
    thickness: 0.75,
    color: RULE,
  });
  page.drawLine({
    start: { x: tableLeft, y: headerBottom },
    end: { x: tableRight, y: headerBottom },
    thickness: 0.75,
    color: RULE,
  });

  const headerY = y - 8;
  drawText(page, copy.description, cols.description + 4, headerY, font, 8);
  drawText(page, copy.date, cols.date, headerY, font, 8);
  drawText(page, copy.qty, cols.qty, headerY, font, 8);
  drawText(page, copy.unitPrice, cols.unit, headerY, font, 8);
  drawText(page, copy.vatPercent, cols.vat, headerY, font, 8);
  const totalHeaderW = font.widthOfTextAtSize(copy.total, 8);
  drawText(page, copy.total, cols.total - totalHeaderW, headerY, font, 8);

  y = headerBottom - 18;
  const lineDesc = input.performanceFormat.trim() || "Performance";
  const descLines = wrapText(lineDesc, font, 9, 160);
  const unitLabel = formatMoney(netCents, input.currency, input.locale);
  const lineTotalLabel = formatMoney(netCents, input.currency, input.locale);
  const vatLabel = `${vatRate} %`;

  let rowY = y;
  for (let i = 0; i < Math.max(descLines.length, 1); i++) {
    if (descLines[i]) {
      drawText(page, descLines[i]!, cols.description + 4, rowY, font, 9);
    }
    if (i === 0) {
      drawText(page, formatDate(input.startsAtIso, input.locale), cols.date, rowY, font, 9);
      drawText(page, "1", cols.qty + 8, rowY, font, 9);
      drawText(page, unitLabel, cols.unit, rowY, font, 9);
      drawText(page, vatLabel, cols.vat, rowY, font, 9);
      const tw = font.widthOfTextAtSize(lineTotalLabel, 9);
      drawText(page, lineTotalLabel, cols.total - tw, rowY, font, 9);
    }
    rowY -= 12;
  }
  // Secondary date range under description
  for (const line of wrapText(serviceDate, font, 8, 160)) {
    drawText(page, line, cols.description + 4, rowY, font, 8, MUTED);
    rowY -= 11;
  }

  y = rowY - 8;
  page.drawLine({
    start: { x: tableLeft, y },
    end: { x: tableRight, y },
    thickness: 0.75,
    color: RULE,
  });

  // Totals
  y -= 22;
  const totalsX = tableRight - 200;
  const amountX = tableRight;
  const drawTotalRow = (
    label: string,
    value: string,
    size: number,
    bold = false,
  ) => {
    drawText(page, label, totalsX, y, font, size, bold ? INK : MUTED);
    const vw = font.widthOfTextAtSize(value, size);
    drawText(page, value, amountX - vw, y, font, size, INK);
    y -= size + 8;
  };
  drawTotalRow(
    copy.netTotal,
    formatMoney(netCents, input.currency, input.locale),
    10,
  );
  drawTotalRow(
    `${copy.vatLabel} ${vatRate} %`,
    formatMoney(vatCents, input.currency, input.locale),
    10,
  );
  drawTotalRow(
    copy.amountDue,
    formatMoney(grossCents, input.currency, input.locale),
    11,
    true,
  );

  // Footer
  y = Math.min(y - 24, 160);
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: width - MARGIN, y },
    thickness: 0.75,
    color: RULE,
  });
  y -= 18;

  const colW = (width - MARGIN * 2 - 24) / 3;
  const col1 = MARGIN;
  const col2 = MARGIN + colW + 12;
  const col3 = MARGIN + (colW + 12) * 2;

  const drawFooterCol = (
    title: string,
    lines: string[],
    x: number,
    startY: number,
  ) => {
    let cy = startY;
    drawText(page, title, x, cy, font, 8, MUTED);
    cy -= 12;
    for (const line of lines.filter(Boolean)) {
      for (const wrapped of wrapText(line, font, 8, colW)) {
        drawText(page, wrapped, x, cy, font, 8);
        cy -= 11;
      }
    }
  };

  drawFooterCol(
    copy.companyDetails,
    [
      input.seller.legalName,
      input.seller.addressLine1,
      `${input.seller.postalCode} ${input.seller.city}`,
      input.seller.countryCode,
      input.seller.taxId
        ? `${copy.vatNo}: ${input.seller.taxId}`
        : "",
    ],
    col1,
    y,
  );
  drawFooterCol(
    copy.contact,
    [
      input.seller.tradingName || input.seller.legalName,
      `${copy.email}: ${input.seller.invoiceEmail}`,
    ],
    col2,
    y,
  );
  drawFooterCol(
    copy.paymentDetails,
    [
      input.seller.iban ? `${copy.iban}: ${input.seller.iban}` : "",
      input.seller.bic ? `${copy.bic}: ${input.seller.bic}` : "",
      input.seller.paymentNote?.trim() || "",
      !input.seller.iban && !input.seller.paymentNote
        ? input.locale === "de"
          ? "Zahlungsdaten beim Verkäufer erfragen"
          : "Request payment details from seller"
        : "",
    ],
    col3,
    y,
  );

  // Bottom disclaimer
  let footY = 36;
  for (const line of wrapText(copy.salonNote, font, 7, width - MARGIN * 2)) {
    drawText(page, line, MARGIN, footY, font, 7, MUTED);
    footY -= 9;
  }
  drawText(
    page,
    `Booking ${input.bookingId.slice(0, 8)}`,
    MARGIN,
    18,
    font,
    7,
    MUTED,
  );

  return pdf.save();
}
