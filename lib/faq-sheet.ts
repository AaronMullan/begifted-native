/**
 * FAQ data from Google Sheets
 *
 * Set EXPO_PUBLIC_FAQ_SHEET_ID to your sheet's ID (from the URL:
 * https://docs.google.com/spreadsheets/d/<THIS_ID>/edit).
 * Optional: EXPO_PUBLIC_FAQ_SHEET_GID for the tab (default 0).
 *
 * Sheet format: first row = headers, then one row per FAQ.
 * Use columns "Question" and "Answer" (or "q" and "a"). Case-insensitive.
 */

export interface FaqItem {
  q: string;
  a: string;
}

const SHEET_ID = process.env.EXPO_PUBLIC_FAQ_SHEET_ID?.trim() || undefined;
const SHEET_GID = process.env.EXPO_PUBLIC_FAQ_SHEET_GID?.trim() || "0";

function getGvizUrl(): string | null {
  if (!SHEET_ID) return null;
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;
}

/**
 * Parse Google Visualization API response into FaqItem[].
 * Expects columns "Question"/"q" and "Answer"/"a" (case-insensitive).
 */
function parseGvizResponse(text: string): FaqItem[] {
  const start = text.indexOf("setResponse(");
  if (start === -1) throw new Error("Invalid Google Sheets response");
  const jsonStart = start + "setResponse(".length;
  let depth = 0;
  let end = -1;
  for (let i = jsonStart; i < text.length; i++) {
    const c = text[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end === -1) throw new Error("Could not parse Google Sheets JSON");
  const obj = JSON.parse(text.slice(jsonStart, end)) as {
    table?: {
      cols?: { label?: string }[];
      rows?: { c?: { v?: string }[] }[];
    };
  };
  const table = obj?.table;
  if (!table?.rows?.length) return [];

  const cols = table.cols ?? [];
  const labels = cols.map((c) => (c.label ?? "").trim().toLowerCase());
  const qIdx = labels.findIndex((l) => l === "question" || l === "q");
  const aIdx = labels.findIndex((l) => l === "answer" || l === "a");
  const questionCol = qIdx >= 0 ? qIdx : 0;
  const answerCol = aIdx >= 0 ? aIdx : 1;

  return table.rows
    .map((row) => {
      const q = row.c?.[questionCol]?.v ?? "";
      const a = row.c?.[answerCol]?.v ?? "";
      return { q: String(q).trim(), a: String(a).trim() };
    })
    .filter((item) => item.q || item.a);
}

/**
 * Fetch FAQs from the configured Google Sheet, or from the built-in fallback.
 */
export async function fetchFaqs(): Promise<FaqItem[]> {
  const url = getGvizUrl();
  if (!url) {
    const { faqs } = await import("../data/faqs");
    return faqs;
  }

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`FAQ sheet request failed: ${res.status}`);
  }
  const text = await res.text();
  return parseGvizResponse(text);
}
