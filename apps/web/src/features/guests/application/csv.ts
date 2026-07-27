import {
  GUEST_RSVP_STATUSES,
  guestInputSchema,
  type GuestImportInput,
} from "../schemas/guest.schema";

type CsvGuest = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  guest_group: string | null;
  plus_ones_allowed: number;
  dietary_requirements?: string | null;
  accessibility_notes?: string | null;
  rsvp_status: (typeof GUEST_RSVP_STATUSES)[number];
};

const HEADER_ALIASES: Record<string, string> = {
  firstname: "first_name",
  first_name: "first_name",
  lastname: "last_name",
  last_name: "last_name",
  email: "email",
  phone: "phone",
  group: "guest_group",
  guestgroup: "guest_group",
  guest_group: "guest_group",
  plusones: "plus_ones_allowed",
  plus_ones: "plus_ones_allowed",
  plusonesallowed: "plus_ones_allowed",
  plus_ones_allowed: "plus_ones_allowed",
  dietary: "dietary_requirements",
  dietaryrequirements: "dietary_requirements",
  dietary_requirements: "dietary_requirements",
  accessibility: "accessibility_notes",
  accessibilitynotes: "accessibility_notes",
  accessibility_notes: "accessibility_notes",
  rsvp: "rsvp_status",
  rsvpstatus: "rsvp_status",
  rsvp_status: "rsvp_status",
};

function normalizeHeader(value: string) {
  const key = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return HEADER_ALIASES[key] ?? key;
}

function parseRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

export function parseGuestCsv(csv: string): GuestImportInput[] {
  const rows = parseRows(csv.replace(/^\uFEFF/, ""));
  if (rows.length < 2) {
    throw new Error("CSV must contain a header and at least one guest.");
  }

  const headers = rows[0]!.map(normalizeHeader);
  for (const required of ["first_name", "last_name"]) {
    if (!headers.includes(required)) {
      throw new Error(`CSV is missing required "${required}" column.`);
    }
  }

  return rows.slice(1).map((values, rowIndex) => {
    const source = Object.fromEntries(
      headers.map((header, index) => [header, values[index]?.trim() ?? ""]),
    );
    const parsed = guestInputSchema.omit({ id: true }).safeParse({
      bookingId: null,
      firstName: source.first_name,
      lastName: source.last_name,
      email: source.email || null,
      phone: source.phone || null,
      guestGroup: source.guest_group || "General",
      plusOnesAllowed: source.plus_ones_allowed || 0,
      dietaryRequirements: source.dietary_requirements || null,
      accessibilityNotes: source.accessibility_notes || null,
      rsvpStatus: source.rsvp_status || "pending",
    });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid guest row";
      throw new Error(`CSV row ${rowIndex + 2}: ${message}.`);
    }
    return parsed.data;
  });
}

function safeSpreadsheetCell(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number | null | undefined) {
  const safe = safeSpreadsheetCell(String(value ?? ""));
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildGuestCsv(
  guests: CsvGuest[],
  options: { includeSensitive?: boolean } = {},
) {
  const includeSensitive = options.includeSensitive === true;
  const headers = [
    "first_name",
    "last_name",
    "guest_group",
    "plus_ones_allowed",
    "rsvp_status",
    ...(includeSensitive
      ? ["email", "phone", "dietary_requirements", "accessibility_notes"]
      : []),
  ];

  const lines = guests.map((guest) => {
    const values: Array<string | number | null | undefined> = [
      guest.first_name,
      guest.last_name,
      guest.guest_group,
      guest.plus_ones_allowed,
      guest.rsvp_status,
      ...(includeSensitive
        ? [
            guest.email,
            guest.phone,
            guest.dietary_requirements,
            guest.accessibility_notes,
          ]
        : []),
    ];
    return values.map(csvCell).join(",");
  });

  return [headers.join(","), ...lines].join("\r\n");
}
