/**
 * Curated ISO 639-1 world languages for profile multi-select.
 * Ordered with Berlin-relevant languages first, then A–Z by English name.
 */

export type WorldLanguage = {
  code: string;
  labelEn: string;
  labelDe: string;
};

const PRIORITY = [
  "de",
  "en",
  "fr",
  "es",
  "it",
  "tr",
  "pl",
  "ar",
  "ru",
  "uk",
] as const;

const ALL: WorldLanguage[] = [
  { code: "af", labelEn: "Afrikaans", labelDe: "Afrikaans" },
  { code: "am", labelEn: "Amharic", labelDe: "Amharisch" },
  { code: "ar", labelEn: "Arabic", labelDe: "Arabisch" },
  { code: "az", labelEn: "Azerbaijani", labelDe: "Aserbaidschanisch" },
  { code: "be", labelEn: "Belarusian", labelDe: "Belarussisch" },
  { code: "bg", labelEn: "Bulgarian", labelDe: "Bulgarisch" },
  { code: "bn", labelEn: "Bengali", labelDe: "Bengalisch" },
  { code: "bs", labelEn: "Bosnian", labelDe: "Bosnisch" },
  { code: "ca", labelEn: "Catalan", labelDe: "Katalanisch" },
  { code: "cs", labelEn: "Czech", labelDe: "Tschechisch" },
  { code: "cy", labelEn: "Welsh", labelDe: "Walisisch" },
  { code: "da", labelEn: "Danish", labelDe: "Dänisch" },
  { code: "de", labelEn: "German", labelDe: "Deutsch" },
  { code: "el", labelEn: "Greek", labelDe: "Griechisch" },
  { code: "en", labelEn: "English", labelDe: "Englisch" },
  { code: "es", labelEn: "Spanish", labelDe: "Spanisch" },
  { code: "et", labelEn: "Estonian", labelDe: "Estnisch" },
  { code: "eu", labelEn: "Basque", labelDe: "Baskisch" },
  { code: "fa", labelEn: "Persian", labelDe: "Persisch" },
  { code: "fi", labelEn: "Finnish", labelDe: "Finnisch" },
  { code: "fr", labelEn: "French", labelDe: "Französisch" },
  { code: "ga", labelEn: "Irish", labelDe: "Irisch" },
  { code: "gl", labelEn: "Galician", labelDe: "Galicisch" },
  { code: "gu", labelEn: "Gujarati", labelDe: "Gujarati" },
  { code: "he", labelEn: "Hebrew", labelDe: "Hebräisch" },
  { code: "hi", labelEn: "Hindi", labelDe: "Hindi" },
  { code: "hr", labelEn: "Croatian", labelDe: "Kroatisch" },
  { code: "hu", labelEn: "Hungarian", labelDe: "Ungarisch" },
  { code: "hy", labelEn: "Armenian", labelDe: "Armenisch" },
  { code: "id", labelEn: "Indonesian", labelDe: "Indonesisch" },
  { code: "is", labelEn: "Icelandic", labelDe: "Isländisch" },
  { code: "it", labelEn: "Italian", labelDe: "Italienisch" },
  { code: "ja", labelEn: "Japanese", labelDe: "Japanisch" },
  { code: "ka", labelEn: "Georgian", labelDe: "Georgisch" },
  { code: "kk", labelEn: "Kazakh", labelDe: "Kasachisch" },
  { code: "km", labelEn: "Khmer", labelDe: "Khmer" },
  { code: "kn", labelEn: "Kannada", labelDe: "Kannada" },
  { code: "ko", labelEn: "Korean", labelDe: "Koreanisch" },
  { code: "ku", labelEn: "Kurdish", labelDe: "Kurdisch" },
  { code: "lt", labelEn: "Lithuanian", labelDe: "Litauisch" },
  { code: "lv", labelEn: "Latvian", labelDe: "Lettisch" },
  { code: "mk", labelEn: "Macedonian", labelDe: "Mazedonisch" },
  { code: "ml", labelEn: "Malayalam", labelDe: "Malayalam" },
  { code: "mn", labelEn: "Mongolian", labelDe: "Mongolisch" },
  { code: "mr", labelEn: "Marathi", labelDe: "Marathi" },
  { code: "ms", labelEn: "Malay", labelDe: "Malaiisch" },
  { code: "mt", labelEn: "Maltese", labelDe: "Maltesisch" },
  { code: "my", labelEn: "Burmese", labelDe: "Birmanisch" },
  { code: "nb", labelEn: "Norwegian (Bokmål)", labelDe: "Norwegisch (Bokmål)" },
  { code: "ne", labelEn: "Nepali", labelDe: "Nepalesisch" },
  { code: "nl", labelEn: "Dutch", labelDe: "Niederländisch" },
  {
    code: "nn",
    labelEn: "Norwegian (Nynorsk)",
    labelDe: "Norwegisch (Nynorsk)",
  },
  { code: "pa", labelEn: "Punjabi", labelDe: "Punjabi" },
  { code: "pl", labelEn: "Polish", labelDe: "Polnisch" },
  { code: "ps", labelEn: "Pashto", labelDe: "Paschtu" },
  { code: "pt", labelEn: "Portuguese", labelDe: "Portugiesisch" },
  { code: "ro", labelEn: "Romanian", labelDe: "Rumänisch" },
  { code: "ru", labelEn: "Russian", labelDe: "Russisch" },
  { code: "sk", labelEn: "Slovak", labelDe: "Slowakisch" },
  { code: "sl", labelEn: "Slovenian", labelDe: "Slowenisch" },
  { code: "so", labelEn: "Somali", labelDe: "Somali" },
  { code: "sq", labelEn: "Albanian", labelDe: "Albanisch" },
  { code: "sr", labelEn: "Serbian", labelDe: "Serbisch" },
  { code: "sv", labelEn: "Swedish", labelDe: "Schwedisch" },
  { code: "sw", labelEn: "Swahili", labelDe: "Suaheli" },
  { code: "ta", labelEn: "Tamil", labelDe: "Tamil" },
  { code: "te", labelEn: "Telugu", labelDe: "Telugu" },
  { code: "th", labelEn: "Thai", labelDe: "Thai" },
  { code: "tl", labelEn: "Tagalog", labelDe: "Tagalog" },
  { code: "tr", labelEn: "Turkish", labelDe: "Türkisch" },
  { code: "uk", labelEn: "Ukrainian", labelDe: "Ukrainisch" },
  { code: "ur", labelEn: "Urdu", labelDe: "Urdu" },
  { code: "uz", labelEn: "Uzbek", labelDe: "Usbekisch" },
  { code: "vi", labelEn: "Vietnamese", labelDe: "Vietnamesisch" },
  { code: "yi", labelEn: "Yiddish", labelDe: "Jiddisch" },
  { code: "zh", labelEn: "Chinese", labelDe: "Chinesisch" },
];

const byCode = new Map(ALL.map((lang) => [lang.code, lang]));

export const WORLD_LANGUAGES: WorldLanguage[] = (() => {
  const prioritySet = new Set<string>(PRIORITY);
  const head = PRIORITY.map((code) => byCode.get(code)!).filter(Boolean);
  const rest = ALL.filter((lang) => !prioritySet.has(lang.code)).sort((a, b) =>
    a.labelEn.localeCompare(b.labelEn),
  );
  return [...head, ...rest];
})();

export function languageLabel(code: string, locale: "en" | "de"): string {
  const lang = byCode.get(code.trim().toLowerCase());
  if (!lang) return code.trim();
  return locale === "de" ? lang.labelDe : lang.labelEn;
}

/** Display stored codes (e.g. `de,en`) as localized full names. */
export function formatLanguageList(
  raw: string | null | undefined,
  locale: "en" | "de",
): string {
  const codes = parseLanguageCodes(raw);
  if (codes.length > 0) {
    return codes.map((code) => languageLabel(code, locale)).join(", ");
  }
  // Legacy free-text values (e.g. "Other") — show as stored.
  return raw?.trim() ?? "";
}

export function parseLanguageCodes(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const codes = raw
    .split(/[,|;]/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const unique: string[] = [];
  for (const code of codes) {
    if (byCode.has(code) && !unique.includes(code)) {
      unique.push(code);
    }
  }
  return unique;
}

export function serializeLanguageCodes(codes: string[]): string {
  return codes
    .map((code) => code.trim().toLowerCase())
    .filter((code) => byCode.has(code))
    .join(",");
}

export function isKnownLanguageCode(code: string): boolean {
  return byCode.has(code.trim().toLowerCase());
}
