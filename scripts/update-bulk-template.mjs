import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("public/templates/pcc-bulk-registration-template.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItemAt(0);
sheet.getRange("C5:I5").values = [["First names", "Surname", "Date of birth", "FED", "Rtg", "Club/City", "Gender"]];
sheet.getRange("C6:I8").values = [
  ["Thabo James", "Van der Merwe", "2012-04-05", "RSA", "", "Example school", "Male"],
  ["Basetsana", "Sedibe", "2013-01-03", "RSA", "", "Example school", "Female"],
  ["", "", "", "RSA", "", "", ""],
];
sheet.getRange("A1:H3").values = [["PCC Registration Platform bulk entry sheet", "", "", "", "polokwanechessclub.co.za", "", "", ""], ["Tournament Name & Date:", "", "", "Enter tournament name and date here", "", "", "", ""], ["Use separate First names and Surname columns. Do not enter surname-first names or commas.", "", "", "", "", "", "", ""]];
sheet.getRange("C5:I8").format.wrapText = false;
sheet.getRange("C5:I8").format.autofitColumns();
workbook.recalculate();
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save("public/templates/pcc-bulk-registration-template.xlsx");
