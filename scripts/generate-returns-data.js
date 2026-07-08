import { readFileSync, writeFileSync } from "node:fs";

const filePath = "src/data/returns.csv";
const targetGeneratedRows = 2000;
const seedLinesToKeep = 26;

const markets = [
  "Germany",
  "Netherlands",
  "France",
  "Spain",
  "Italy",
  "United Kingdom",
  "Sweden",
  "Belgium",
  "Austria",
  "Poland",
  "Denmark",
  "Ireland",
  "Switzerland",
  "Portugal",
  "Norway",
  "Finland",
];
const partners = [
  "MedServ DE",
  "Hospital Partner NL",
  "BioClinique FR",
  "Iberia Health",
  "Clinica Nord IT",
  "NHS Trust Demo",
  "Nordic Care SE",
  "BeLux Diagnostics",
  "Alpen Klinik AT",
  "Warsaw Health PL",
  "Copenhagen Imaging",
  "Dublin Care IE",
  "Swiss Imaging AG",
  "Lisbon Diagnostics",
  "Oslo Care NO",
  "Helsinki Imaging",
];
const logisticsProviders = [
  "TransLine Europe",
  "NorthSea Freight",
  "EuroRoute Logistics",
  "MedMove Logistics",
  "BritShip Medical",
  "NordicRoute AB",
  "EastMed Transport",
  "Atlantic MedFreight",
  "Alpine Freight AG",
];
const owners = [
  "Anna Keller",
  "Joost Vermeer",
  "Claire Martin",
  "Marta Ruiz",
  "Luca Romano",
  "Sarah Collins",
  "Erik Lind",
  "Marie Dubois",
  "Thomas Gruber",
  "Piotr Nowak",
  "Freja Hansen",
  "Niamh Byrne",
  "Lena Meier",
  "Ines Silva",
  "Kari Olsen",
  "Aino Virtanen",
];
const statuses = [
  "Pickup pending",
  "In transit",
  "Customs hold",
  "Inspection pending",
  "Awaiting market action",
  "Return authorized",
  "Received",
  "Closed",
];
const delayReasons = [
  "Pickup missed",
  "Carrier handoff",
  "Missing export document",
  "Receiving backlog",
  "Missing due date",
  "Awaiting pickup window",
  "Disposition pending",
  "Normal transit",
  "Pickup capacity",
  "Missing local approval",
  "Inspection backlog",
  "Commodity code mismatch",
  "Awaiting packaging",
  "Customer site access",
  "Border processing",
  "Inspection queue",
  "Pickup reschedule",
  "Normal processing",
];
const serviceItems = [
  "X-ray detector module",
  "Ultrasound probe assembly",
  "MRI cooling pump",
  "CT gantry sensor",
  "Image reconstruction board",
  "Gradient amplifier card",
  "Detector calibration kit",
  "CT collimator module",
  "MRI RF coil",
  "Power distribution board",
];
const deviceItems = [
  "Patient monitor unit",
  "Defibrillator system",
  "Portable ultrasound unit",
  "Respiratory monitor",
  "Mobile C-arm",
  "Emergency care display",
  "Patient telemetry receiver",
  "Telemetry station",
  "Anesthesia workstation",
  "Vital signs monitor",
];

const originalLines = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
const seedLines = originalLines.slice(0, seedLinesToKeep);
const rows = [...seedLines];

for (let index = 0; index < targetGeneratedRows; index += 1) {
  const idNumber = 2001 + index;
  const returnType = index % 3 === 0 ? "Finished device" : "Service part";
  const marketIndex = index % markets.length;
  const status = statuses[(index * 7) % statuses.length];
  const closed = status === "Closed";
  const missingDueDate = index % 37 === 0 && !closed;
  const createdOffset = 8 + ((index * 11) % 84);
  const dueOffset = missingDueDate ? null : createdOffset - 28 + ((index * 5) % 34);
  const lastUpdateOffset = 1 + ((index * 3) % 18);
  const createdDate = dateMinusDays(createdOffset);
  const dueDate = dueOffset === null ? "" : dateMinusDays(dueOffset);
  const lastUpdateDate = dateMinusDays(lastUpdateOffset);
  const closedDate = closed ? dateMinusDays(Math.max(0, dueOffset ?? 3)) : "";
  const delayReason = missingDueDate ? "Missing due date" : delayReasons[(index * 13) % delayReasons.length];
  const itemDescription = returnType === "Finished device" ? deviceItems[index % deviceItems.length] : serviceItems[index % serviceItems.length];
  const quantity = 1 + (index % 6);
  const baseValue = returnType === "Finished device" ? 9000 : 6200;
  const valueEur = baseValue + ((index * 431) % 52000) + quantity * 1200;
  const notes = `Synthetic record: ${delayReason.toLowerCase()} noted for ${markets[marketIndex]} return; generated for scale testing only.`;

  rows.push(
    [
      `DXR-${idNumber}`,
      returnType,
      markets[marketIndex],
      partners[marketIndex],
      logisticsProviders[index % logisticsProviders.length],
      owners[marketIndex],
      status,
      createdDate,
      dueDate,
      lastUpdateDate,
      closedDate,
      itemDescription,
      quantity,
      valueEur,
      "EUR",
      delayReason,
      notes,
      "Synthetic generated demo data",
    ]
      .map(escapeCsv)
      .join(","),
  );
}

writeFileSync(filePath, `${rows.join("\n")}\n`);
console.log(`Wrote ${rows.length - 1} synthetic return records to ${filePath}`);

function dateMinusDays(days) {
  const snapshot = Date.UTC(2026, 6, 8);
  const date = new Date(snapshot - days * 86_400_000);
  return date.toISOString().slice(0, 10);
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}
