const emptyOrganisationValues = new Set(["", "-", "n/a", "na", "none", "unknown"]);

const preferredNames = new Map<string, string>([
  ["polokwane chess club", "Polokwane Chess Club"],
  ["university of limpopo", "University of Limpopo"],
  ["ul chess", "University of Limpopo"],
  ["ul chess club", "University of Limpopo"],
  ["vaal university of technology", "Vaal University of Technology"],
  ["sefako makgatho medical university", "Sefako Makgatho Medical University"],
  ["sefako makgatho health sciences university", "Sefako Makgatho Health Sciences University"],
  ["tshwane university of technology", "Tshwane University of Technology"],
  ["university of mpumalanga", "University of Mpumalanga"],
]);

export function organisationNameKey(value: string | null | undefined) {
  const cleaned = value?.replace(/\s+/g, " ").trim() ?? "";
  const key = cleaned.toLocaleLowerCase("en-ZA");

  return emptyOrganisationValues.has(key) ? "" : key;
}

export function canonicalOrganisationName(value: string | null | undefined) {
  const key = organisationNameKey(value);
  if (!key) return null;

  return preferredNames.get(key) ?? value!.replace(/\s+/g, " ").trim();
}

export function uniqueOrganisationNames(values: Array<string | null | undefined>) {
  const names = new Map<string, string>();

  values.forEach((value) => {
    const name = canonicalOrganisationName(value);
    const key = organisationNameKey(name);
    if (name && key && !names.has(key)) names.set(key, name);
  });

  return [...names.values()].sort((left, right) => left.localeCompare(right));
}
