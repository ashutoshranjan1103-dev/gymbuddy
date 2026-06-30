import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const analysisPath = path.join(projectRoot, "tmp", "research_analysis", "gymbuddy_research_analysis.json");
const outputDir = path.join(projectRoot, "outputs", "gymbuddy_user_research");
const outputPath = path.join(outputDir, "GymBuddy_User_Research_Analysis.xlsx");
const previewPath = path.join(outputDir, "dashboard_preview.png");

const data = JSON.parse(await fs.readFile(analysisPath, "utf8"));

const workbook = Workbook.create();
const dashboard = workbook.worksheets.add("Dashboard");
const tables = workbook.worksheets.add("Summary Tables");
const insights = workbook.worksheets.add("Insights");
const raw = workbook.worksheets.add("Raw Responses");

const colors = {
  green: "#1F7A4D",
  dark: "#162019",
  muted: "#667168",
  orange: "#DD6A2A",
  blue: "#24415B",
  paleGreen: "#F0F7EF",
  paleBlue: "#EEF6FF",
  paleOrange: "#FFF8EF",
  border: "#D9E3DB",
  white: "#FFFFFF",
};

function styleTitle(sheet, range, title, subtitle) {
  const titleRange = sheet.getRange(range);
  titleRange.merge();
  titleRange.values = [[title]];
  titleRange.format = {
    fill: colors.green,
    font: { bold: true, color: colors.white, size: 18 },
    wrapText: true,
  };
  const [start] = range.split(":");
  const [, end] = range.split(":");
  const row = Number(start.match(/\d+/)[0]);
  const col = start.match(/[A-Z]+/)[0];
  const endCol = end.match(/[A-Z]+/)[0];
  const subtitleCell = sheet.getRange(`${col}${row + 1}:${endCol}${row + 1}`);
  subtitleCell.merge();
  subtitleCell.values = [[subtitle]];
  subtitleCell.format = { font: { color: colors.muted, italic: true }, wrapText: true };
  sheet.getRange(`${col}${row}:${col}${row}`).format.rowHeight = 28;
  sheet.getRange(`${col}${row + 1}:${col}${row + 1}`).format.rowHeight = 42;
}

function writeTable(sheet, startCell, headers, rows, tableName) {
  const startCol = startCell.match(/[A-Z]+/)[0];
  const startRow = Number(startCell.match(/\d+/)[0]);
  const matrix = [headers, ...rows];
  const range = sheet.getRangeByIndexes(startRow - 1, colToIndex(startCol), matrix.length, headers.length);
  range.values = matrix;
  range.format.borders = { preset: "all", style: "thin", color: colors.border };
  const headerRange = sheet.getRangeByIndexes(startRow - 1, colToIndex(startCol), 1, headers.length);
  headerRange.format = { fill: colors.green, font: { bold: true, color: colors.white }, wrapText: true };
  try {
    const table = sheet.tables.add(range.address, true, tableName);
    table.showFilterButton = false;
    table.style = "TableStyleLight1";
  } catch {
    // The table API can reject duplicate names in reruns; range formatting still preserves the output.
  }
  return { startRow, startCol, rows: matrix.length, cols: headers.length, range };
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function pct(value) {
  return `${Math.round(value * 100)}%`;
}

function tableRows(name, percentKey = "percent") {
  return data.tables[name].map((row) => [row.label, row.count, row[percentKey] ?? row.percent]);
}

for (const sheet of [dashboard, tables, insights, raw]) {
  sheet.showGridLines = false;
}

styleTitle(
  dashboard,
  "A1:H1",
  "GymBuddy User Research Analysis",
  `${data.total_responses} survey responses from beginner, current, planning, and dropped-off gym users.`,
);

dashboard.getRange("A3:H3").values = [["PM Readout", "", "", "", "", "", "", ""]];
dashboard.getRange("A3:H3").merge();
dashboard.getRange("A3:H3").format = { fill: colors.paleBlue, font: { bold: true, color: colors.blue, size: 14 } };

const kpiRows = [
  data.kpis.slice(0, 4),
  data.kpis.slice(4, 7),
];
let kpiRow = 5;
for (const row of kpiRows) {
  let col = 0;
  for (const kpi of row) {
    const block = dashboard.getRangeByIndexes(kpiRow - 1, col, 3, 2);
    block.format = { fill: colors.paleGreen, borders: { preset: "outside", style: "thin", color: colors.border } };
    dashboard.getCell(kpiRow - 1, col).values = [[kpi.metric]];
    dashboard.getCell(kpiRow, col).values = [[kpi.display]];
    dashboard.getCell(kpiRow - 1, col).format = { font: { bold: true, color: colors.muted }, wrapText: true };
    dashboard.getCell(kpiRow, col).format = { font: { bold: true, color: colors.green, size: 16 }, wrapText: true };
    col += 2;
  }
  kpiRow += 4;
}

const insightsRows = data.insights.map((insight, index) => [
  index + 1,
  insight.title,
  insight.evidence,
  insight.product_decision,
]);
writeTable(dashboard, "A14", ["#", "Sharp Insight", "Evidence", "Product Decision"], insightsRows, "DashboardInsights");
dashboard.getRange("B15:D17").format = { wrapText: true };
dashboard.getRange("A15:D17").format.rowHeight = 62;

const problemRows = tableRows("problem");
writeTable(dashboard, "J2", ["Pain Point", "Count", "%"], problemRows, "ProblemChartData");
dashboard.getRange("L3:L8").format.numberFormat = "0%";
const chart1 = dashboard.charts.add("bar", dashboard.getRange(`J2:K${2 + problemRows.length}`));
chart1.title = "Biggest In-Gym Pain Points";
chart1.hasLegend = false;
chart1.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
chart1.yAxis = { numberFormatCode: "0" };
chart1.setPosition("A22", "H39");

const aiRows = tableRows("ai_trust");
writeTable(dashboard, "N2", ["AI Trust", "Count", "%"], aiRows, "AITrustChartData");
dashboard.getRange(`P3:P${2 + aiRows.length}`).format.numberFormat = "0%";
const chart2 = dashboard.charts.add("bar", dashboard.getRange(`N2:O${2 + aiRows.length}`));
chart2.title = "Trust in AI Weekly Plan";
chart2.hasLegend = false;
chart2.xAxis = { axisType: "textAxis", textStyle: { fontSize: 9 } };
chart2.yAxis = { numberFormatCode: "0" };
chart2.setPosition("I22", "P39");

const featureRows = data.tables.useful_features.slice(0, 7).map((row) => [row.label, row.count, row.percent_of_respondents]);
writeTable(dashboard, "R2", ["Useful Feature", "Count", "% Respondents"], featureRows, "FeatureChartData");
dashboard.getRange(`T3:T${2 + featureRows.length}`).format.numberFormat = "0%";
const chart3 = dashboard.charts.add("bar", dashboard.getRange(`R2:S${2 + featureRows.length}`));
chart3.title = "Most Desired App Features";
chart3.hasLegend = false;
chart3.xAxis = { axisType: "textAxis", textStyle: { fontSize: 8 } };
chart3.yAxis = { numberFormatCode: "0" };
chart3.setPosition("A41", "P60");

dashboard.getRange("J:U").format.columnWidth = 18;
dashboard.getRange("A:H").format.columnWidth = 16;
dashboard.getRange("C:D").format.columnWidth = 32;
dashboard.getRange("A1:U60").format.wrapText = true;

styleTitle(tables, "A1:F1", "Summary Tables", "Cleaned counts and percentages from the Google Form responses.");
let rowCursor = 4;
const summaryTables = [
  ["User Status", "status"],
  ["Gym Type", "gym_type"],
  ["Gym Tenure", "duration"],
  ["Days Went Last Week", "days_last_week"],
  ["In-Gym Clarity", "clarity"],
  ["Biggest Problem", "problem"],
  ["When Equipment Is Busy", "busy_action"],
  ["Skipped Due To Uncertainty", "skipped"],
  ["Current Workout Plan Source", "plan"],
  ["AI Weekly Plan Trust", "ai_trust"],
  ["Useful App Features", "useful_features", "percent_of_respondents"],
  ["Consistency Barriers", "hardest_themes"],
];

for (const [title, key, percentKey] of summaryTables) {
  tables.getRange(`A${rowCursor}`).values = [[title]];
  tables.getRange(`A${rowCursor}:C${rowCursor}`).merge();
  tables.getRange(`A${rowCursor}:C${rowCursor}`).format = { fill: colors.paleBlue, font: { bold: true, color: colors.blue } };
  const rows = tableRows(key, percentKey);
  writeTable(tables, `A${rowCursor + 1}`, ["Answer", "Count", "%"], rows, `Table_${key}`);
  tables.getRange(`C${rowCursor + 2}:C${rowCursor + 1 + rows.length}`).format.numberFormat = "0%";
  rowCursor += rows.length + 4;
}
tables.getRange("A:C").format.columnWidth = 26;
tables.getRange("A:C").format.wrapText = true;
tables.freezePanes.freezeRows(2);

styleTitle(insights, "A1:D1", "PM Insights & Product Implications", "Use this sheet directly in your Step 1 Market & User Research deliverable.");
writeTable(insights, "A4", ["#", "Sharp User Insight", "Research Evidence", "GymBuddy Product Decision"], insightsRows, "InsightsTable");
insights.getRange("B5:D7").format = { wrapText: true };
insights.getRange("A:D").format.columnWidth = 28;
insights.getRange("C:D").format.columnWidth = 42;

const quoteRows = data.quotes.map((quote, index) => [index + 1, quote]);
writeTable(insights, "A11", ["#", "User Quote / Open Text"], quoteRows, "QuoteTable");
insights.getRange("B12:B40").format = { wrapText: true };

const rawHeaders = Object.keys(data.raw_rows[0] ?? {});
const rawRows = data.raw_rows.map((row) => rawHeaders.map((header) => row[header]));
writeTable(raw, "A1", rawHeaders, rawRows, "RawResponses");
raw.getRange("A:P").format.columnWidth = 20;
raw.getRange("A:P").format.wrapText = true;
raw.freezePanes.freezeRows(1);

for (const sheet of [dashboard, tables, insights, raw]) {
  const used = sheet.getUsedRange();
  used.format.autofitRows();
}

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "Dashboard", autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "formula error scan",
});
console.log(errors.ndjson);

const exported = await SpreadsheetFile.exportXlsx(workbook);
await exported.save(outputPath);
console.log(outputPath);
