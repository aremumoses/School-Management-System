import { Gender } from '@prisma/client';

/** Canonical field name <- every header spelling we tolerate, normalized (lowercased, spaces/underscores/hyphens stripped). */
const HEADER_ALIASES: Record<string, string> = {
  firstname: 'firstName',
  lastname: 'lastName',
  surname: 'lastName',
  dateofbirth: 'dateOfBirth',
  dob: 'dateOfBirth',
  gender: 'gender',
  sex: 'gender',
  stateoforigin: 'stateOfOrigin',
  state: 'stateOfOrigin',
  lga: 'lga',
  localgovernment: 'lga',
  religion: 'religion',
  bloodgroup: 'bloodGroup',
  genotype: 'genotype',
  address: 'address',
  class: 'className',
  classname: 'className',
  arm: 'armName',
  armname: 'armName',
  guardianfirstname: 'guardianFirstName',
  guardianlastname: 'guardianLastName',
  guardiansurname: 'guardianLastName',
  guardianemail: 'guardianEmail',
  guardianphone: 'guardianPhone',
  guardianphonenumber: 'guardianPhone',
  relationship: 'guardianRelationship',
  guardianrelationship: 'guardianRelationship',
};

export function normalizeHeader(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  return HEADER_ALIASES[key] ?? null;
}

/**
 * Trims a cell's value down to a plain string; treats blank as null (never
 * as an error for optional fields). exceljs can hand back rich-text/formula
 * objects for unusually-formatted cells — those have no sensible plain-text
 * form, so they're treated as blank rather than risking a stringified
 * "[object Object]" silently passing validation.
 */
export function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return null;
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

const DATE_PATTERNS: {
  regex: RegExp;
  toDate: (m: RegExpMatchArray) => Date;
}[] = [
  // ISO: 2012-04-20. Built via Date.UTC (not `new Date(y, m, d)`, which
  // constructs in the server's *local* timezone) — toISOString() downstream
  // is UTC-based, so a local-time construction here can silently shift the
  // calendar date by a day depending on the server's timezone offset.
  {
    regex: /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    toDate: (m) =>
      new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))),
  },
  // DD/MM/YYYY (Nigerian convention) — also accepts DD-MM-YYYY
  {
    regex: /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/,
    toDate: (m) =>
      new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1]))),
  },
];

/** Accepts a real Date (exceljs gives these for date-formatted cells) or a tolerant set of string formats. Returns null if unparseable or implausible. */
export function parseFlexibleDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const str = cleanString(value);
  if (!str) return null;

  for (const { regex, toDate } of DATE_PATTERNS) {
    const match = regex.exec(str);
    if (match) {
      const date = toDate(match);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

export function parseGender(value: unknown): Gender | null {
  const str = cleanString(value)?.toUpperCase();
  if (!str) return null;
  if (str === 'MALE' || str === 'M') return Gender.MALE;
  if (str === 'FEMALE' || str === 'F') return Gender.FEMALE;
  return null;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}
