import * as XLSX from "xlsx";

export type BulkEntry = {
  rowNumber: number; firstNames: string; surname: string; fullName: string;
  dateOfBirth: string; rating: number | null; club: string; gender: string;
  requestedSection: string;
};
export type BulkSection = {
  id: string; section_name: string; minimum_birth_year: number | null;
  maximum_birth_year: number | null; minimum_rating: number | null;
  maximum_rating: number | null; gender_restriction: string | null;
};
const text = (value: unknown) => String(value ?? "").trim();
const key = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function createBulkWorkbook(sections: BulkSection[] = [], eventName = "PCC tournament") {
  const book = XLSX.utils.book_new();
  const players = XLSX.utils.aoa_to_sheet([["First names", "Surname", "Date of birth", "Gender", "Rating", "Club/City", "Section"]]);
  players["!cols"] = [24,24,20,14,12,28,28].map(wch => ({wch}));
  XLSX.utils.book_append_sheet(book, players, "Players");
  const instructions = XLSX.utils.aoa_to_sheet([
    ["PCC bulk entry", eventName],
    ["Names", "Separate First names and Surname; no commas. Do not guess missing details."],
    ["Date of birth", "YYYY-MM-DD or DD/MM/YYYY"],
    ["Section", "Enter the exact event section name. Blank uses the importer's default or eligibility."],
    ["Eligibility", "Eligible requests are kept. Ineligible requests move to the only eligible section. Multiple matches need review."],
    ["Rating / Gender", "Required when section rules need them. Blank rating means unknown; zero means unrated."],
    ["Import", "Maximum 200 players per batch. Review assignments and fix errors before importing."],
  ]);
  instructions["!cols"] = [{wch:24},{wch:110}];
  XLSX.utils.book_append_sheet(book, instructions, "Instructions");
  const rules = XLSX.utils.aoa_to_sheet([["Section","Born from","Born through","Minimum rating","Maximum rating","Gender"], ...sections.map(s => [s.section_name,s.minimum_birth_year,s.maximum_birth_year,s.minimum_rating,s.maximum_rating,s.gender_restriction || "All"])]);
  rules["!cols"] = [28,18,18,18,18,18].map(wch => ({wch}));
  XLSX.utils.book_append_sheet(book, rules, "Sections");
  return book;
}

export function downloadBulkWorkbook(sections: BulkSection[] = [], eventName = "PCC tournament") {
  XLSX.writeFile(createBulkWorkbook(sections, eventName), "pcc-bulk-registration-v2.xlsx");
}

export function bulkDate(value: unknown): string {
  let parts: number[] | undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) parts = [value.getFullYear(), value.getMonth()+1, value.getDate()];
  else if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) parts = [date.y, date.m, date.d];
  } else {
    const iso = text(value).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    const local = text(value).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (iso) parts = [+iso[1], +iso[2], +iso[3]];
    else if (local) parts = [+local[3], +local[2], +local[1]];
  }
  if (!parts) return "";
  const [year, month, day] = parts;
  const date = new Date(Date.UTC(year,month-1,day));
  if (year < 1900 || date.getUTCFullYear() !== year || date.getUTCMonth()+1 !== month || date.getUTCDate() !== day || date > new Date()) return "";
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

export function parseBulkRows(rows: unknown[][]): { entries: BulkEntry[]; issues: string[] } {
  const firstHeaders = ["first names","first name","given names"];
  const lastHeaders = ["surname","last name","family name"];
  const headerIndex = rows.findIndex(row => row.some(c => firstHeaders.includes(key(text(c)))) && row.some(c => lastHeaders.includes(key(text(c)))) && row.some(c => key(text(c)) === "date of birth"));
  if (headerIndex < 0) return { entries: [], issues: ["Use separate First names, Surname and Date of birth columns. Download the current template."] };
  const headers = rows[headerIndex].map(c => key(text(c)));
  const col = (...names: string[]) => headers.findIndex(h => names.includes(h));
  const entries: BulkEntry[] = []; const issues: string[] = []; const seen = new Set<string>();
  rows.slice(headerIndex+1).forEach((row,index) => {
    const rowNumber = headerIndex+index+2;
    const firstNames = text(row[col(...firstHeaders)]); const surname = text(row[col(...lastHeaders)]);
    const dob = row[col("date of birth")];
    if (!firstNames && !surname && !text(dob) && row.every(c => !text(c))) return;
    const dateOfBirth = bulkDate(dob);
    if (!firstNames || !surname || !dateOfBirth || /[,，]/.test(firstNames+surname)) {
      issues.push(`Row ${rowNumber}: enter separate first names and surname without commas, and a valid date of birth.`); return;
    }
    const rawRating = text(row[col("rtg","rating")]);
    const rating = rawRating === "" ? null : Number(rawRating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 0 || rating > 4000)) { issues.push(`Row ${rowNumber}: invalid rating.`); return; }
    const fullName = `${firstNames} ${surname}`;
    const identity = key(fullName).split(" ").sort().join(" ")+dateOfBirth;
    if (seen.has(identity)) { issues.push(`Row ${rowNumber}: duplicate name and date of birth in this file.`); return; }
    seen.add(identity);
    const rawGender = key(text(row[col("gender")]));
    const gender = ["m","male","boy"].includes(rawGender) ? "Male" : ["f","female","girl"].includes(rawGender) ? "Female" : text(row[col("gender")]);
    entries.push({rowNumber,firstNames,surname,fullName,dateOfBirth,rating,gender,club:text(row[col("club/city","club","school")]),requestedSection:text(row[col("section","requested section")])});
  });
  if (entries.length > 200) return { entries: [], issues: [...issues,"This file contains more than 200 players. Split it into batches of at most 200; no rows were imported."] };
  return {entries,issues};
}

export function sectionIssue(entry: BulkEntry, section: BulkSection): string | null {
  const year = Number(entry.dateOfBirth.slice(0,4));
  if (section.minimum_birth_year !== null && year < section.minimum_birth_year) return "Outside the birth-year range";
  if (section.maximum_birth_year !== null && year > section.maximum_birth_year) return "Outside the birth-year range";
  if (section.gender_restriction && key(section.gender_restriction) !== "all" && key(section.gender_restriction) !== key(entry.gender)) return "Gender does not match";
  if ((section.minimum_rating !== null || section.maximum_rating !== null) && entry.rating === null) return "Rating needed to check eligibility";
  if (entry.rating !== null && ((section.minimum_rating !== null && entry.rating < section.minimum_rating) || (section.maximum_rating !== null && entry.rating > section.maximum_rating))) return "Outside the rating range";
  return null;
}

export function resolveBulkSection(entry: BulkEntry, sections: BulkSection[], fallbackId = "") {
  const requested = entry.requestedSection ? sections.filter(s => key(s.section_name) === key(entry.requestedSection)) : sections.filter(s => s.id === fallbackId);
  if (requested.length > 1) return { section: null, reason: "Section name is ambiguous. Rename the event's duplicate sections first." };
  if (requested[0] && !sectionIssue(entry,requested[0])) return {section:requested[0],reason:"Requested section accepted"};
  const eligible = sections.filter(s => !sectionIssue(entry,s));
  if (eligible.length === 1) return {section:eligible[0],reason:requested[0] ? `${sectionIssue(entry,requested[0])}; reassigned` : "Assigned by eligibility"};
  return {section:null,reason:eligible.length ? `Multiple eligible sections: ${eligible.map(s=>s.section_name).join(", ")}. Choose one in the sheet.` : "No eligible section. Check the player's details and event rules."};
}
