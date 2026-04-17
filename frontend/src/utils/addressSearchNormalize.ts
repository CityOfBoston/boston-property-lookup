/**
 * Normalize addresses and search queries so apartment/unit tokens in varied
 * formats (#, apt, no., standalone "a", etc.) do not break matching.
 */

const UNIT_TOKEN = '[\\w/-]+';

/** Lowercase id used for comparing user unit vs address unit. */
export function normalizeUnitId(u: string): string {
  return u
    .toLowerCase()
    .replace(/^#+/, '')
    .trim();
}

export function unitsMatch(a: string, b: string): boolean {
  const na = normalizeUnitId(a);
  const nb = normalizeUnitId(b);
  if (na === nb) return true;
  if (/^\d+$/.test(na) && /^\d+$/.test(nb)) {
    return parseInt(na, 10) === parseInt(nb, 10);
  }
  return false;
}

/**
 * Remove apartment / unit designators and the following unit token. Runs
 * repeatedly so strings like "# apt 48" collapse in one pass.
 */
export function stripApartmentSegments(s: string): string {
  let t = s.replace(/\s+/g, ' ').trim();
  let prev = '';
  const patterns = [
    new RegExp(`\\s+#\\s*${UNIT_TOKEN}`, 'gi'),
    new RegExp(
      `\\s+(?:apt|apartment|unit|ste|suite|rm|room)\\.?\\s*${UNIT_TOKEN}`,
      'gi'
    ),
    new RegExp(`\\s+no\\.\\s*${UNIT_TOKEN}`, 'gi'),
    // "no 48" as unit — require a digit so "no main st" is not stripped
    new RegExp(`\\s+\\bno\\s+\\d[\\w/-]*`, 'gi'),
    // Letter "a" as unit indicator before a numeric-led unit (e.g. "st a 48")
    new RegExp(`\\s+\\ba\\s+\\d[\\w/-]*`, 'gi'),
  ];
  while (t !== prev) {
    prev = t;
    for (const re of patterns) {
      t = t.replace(re, ' ');
    }
    t = t.replace(/\s+/g, ' ').trim();
  }
  return t;
}

/**
 * If the query ends with an explicit unit (apt / # / no / a …), return that
 * unit id for ranking; partial queries without a trailing unit return null.
 */
export function extractTrailingUnitFromQuery(q: string): string | null {
  const s = q.trim().toLowerCase().replace(/\s+/g, ' ');
  const patterns = [
    new RegExp(
      `\\s+(?:apt|apartment|unit|ste|suite|rm|room)\\.?\\s+(${UNIT_TOKEN})\\s*$`,
      'i'
    ),
    new RegExp(`\\s+#\\s*(${UNIT_TOKEN})\\s*$`, 'i'),
    new RegExp(`\\s+no\\.\\s*(${UNIT_TOKEN})\\s*$`, 'i'),
    new RegExp(`\\s+no\\s+(\\d[\\w/-]*)\\s*$`, 'i'),
    new RegExp(`\\s+a\\s+(\\d[\\w/-]*)\\s*$`, 'i'),
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return normalizeUnitId(m[1]);
  }
  return null;
}

/**
 * Best-effort unit id from a full address string (first match).
 */
export function extractUnitFromAddress(fullAddress: string): string | null {
  const lower = fullAddress.toLowerCase();
  const patterns = [
    new RegExp(`#\\s*(${UNIT_TOKEN})`),
    new RegExp(
      `\\b(?:apt|apartment|unit|ste|suite|rm|room)\\.?\\s*(${UNIT_TOKEN})`
    ),
    new RegExp(`\\bno\\.\\s*(${UNIT_TOKEN})`),
    new RegExp(`\\bno\\s+(\\d[\\w/-]*)`),
    new RegExp(`\\ba\\s+(\\d[\\w/-]*)\\b`),
  ];
  for (const re of patterns) {
    const m = lower.match(re);
    if (m) return normalizeUnitId(m[1]);
  }
  return null;
}

/** Lowercase + cleanup + expand street suffix abbreviations; strips units. */
export function normalizeAddressForSearch(s: string): string {
  let t = s
    .toLowerCase()
    .replace(/\s+\d{5}(?:-\d{4})?/g, ' ')
    .replace(/\s*,\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  t = stripApartmentSegments(t);

  const suffixExpansions: [RegExp, string][] = [
    [/\b(st|str)\b/g, 'street'],
    [/\b(ave|av)\b/g, 'avenue'],
    [/\b(rd)\b/g, 'road'],
    [/\b(pl)\b/g, 'place'],
    [/\b(sq)\b/g, 'square'],
    [/\b(ln)\b/g, 'lane'],
    [/\b(dr)\b/g, 'drive'],
    [/\b(ct)\b/g, 'court'],
    [/\b(cir)\b/g, 'circle'],
    [/\b(blvd)\b/g, 'boulevard'],
    [/\b(ter)\b/g, 'terrace'],
    [/\b(pkwy)\b/g, 'parkway'],
    [/\b(wy)\b/g, 'way'],
  ];
  for (const [re, full] of suffixExpansions) {
    t = t.replace(re, full);
  }
  return t.replace(/\s+/g, ' ').trim();
}
