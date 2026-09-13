import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const API_URL =
  "https://wiki.biligame.com/dsp/api.php?action=query&prop=revisions&rvprop=content%7Cids%7Ctimestamp&rvslots=main&titles=MediaWiki%3ATest.json&format=json&formatversion=2";
const OUTPUT_URL = new URL("../wiki-recipes.js", import.meta.url);

const FACILITY_MACHINE_IDS = {
  采矿设备: "mining",
  轻型工业机甲: "mecha",
  抽水设备: "water-pump",
  抽油设备: "oil-extractor",
  巨星采集: "orbital-collector",
  黑雾残骸: "dark-fog",
  冶炼设备: "smelter-arc",
  制造台: "assembler-2",
  科研设备: "lab",
  精炼设备: "refinery",
  化工设备: "chemical",
  粒子对撞机: "collider",
  分馏设备: "fractionator",
  射线接收站: "ray-receiver",
  充电设备: "accumulator-charger",
};

const LEGACY_IDS = {
  钛合金: "titanium-alloy",
  铁块: "iron-ingot",
  铜块: "copper-ingot",
  磁铁: "magnet",
  钢材: "steel",
  石材: "stone-brick",
  玻璃: "glass",
  齿轮: "gear",
  磁线圈: "magnetic-coil",
  电路板: "circuit-board",
  电动机: "electric-motor",
  电磁涡轮: "em-turbine",
};

const normalizeName = (value) => String(value ?? "").replace(/\u00a0/g, " ").trim();

const normalizeEntries = (record) =>
  Object.entries(record ?? {}).map(([name, amount]) => ({
    name: normalizeName(name),
    amount: Number(amount),
    belts: 1,
  }));

const entrySignature = (entries) =>
  entries
    .map(({ name, amount }) => `${name}*${amount}`)
    .sort((a, b) => a.localeCompare(b, "zh-CN"))
    .join("+");

const choosePrimaryOutput = (outputs) => {
  const antimatter = outputs.find((output) => output.name === "反物质");
  if (antimatter) return antimatter;
  return outputs.reduce((primary, output) => (output.amount > primary.amount ? output : primary), outputs[0]);
};

const getSpecialRecipeName = (facility, ingredients, outputs) => {
  const inputNames = new Set(ingredients.map((item) => item.name));
  const outputNames = new Set(outputs.map((item) => item.name));

  if (facility === "精炼设备" && inputNames.has("原油") && outputNames.has("精炼油") && outputNames.has("氢")) {
    return "等离子精炼";
  }
  if (facility === "精炼设备" && inputNames.has("精炼油") && inputNames.has("氢") && outputNames.has("高能石墨")) {
    return "X 射线裂解";
  }
  if (facility === "精炼设备" && inputNames.has("煤矿") && outputNames.has("精炼油")) {
    return "重整精炼";
  }
  if (facility === "分馏设备" && inputNames.has("氢") && outputNames.has("重氢")) {
    return "重氢分馏";
  }
  return "";
};

const makeId = (record, index, primaryOutput, usedIds) => {
  const outputs = normalizeEntries(record.产物);
  const ingredients = normalizeEntries(record.原料);
  let id = LEGACY_IDS[primaryOutput.name];

  if (record.设施 === "精炼设备" && ingredients.some((item) => item.name === "原油") && outputs.some((item) => item.name === "氢")) {
    id = "plasma-refining";
  }
  if (!id || usedIds.has(id)) {
    id = `wiki-${String(index + 1).padStart(3, "0")}`;
  }
  usedIds.add(id);
  return id;
};

const response = await fetch(API_URL, {
  headers: { "user-agent": "dsp-single-line-calculator recipe importer" },
});
if (!response.ok) {
  throw new Error(`Wiki request failed: ${response.status} ${response.statusText}`);
}

const payload = await response.json();
const page = payload?.query?.pages?.[0];
const revision = page?.revisions?.[0];
const sourceText = revision?.slots?.main?.content;
if (!sourceText) {
  throw new Error("The Wiki response did not include MediaWiki:Test.json content.");
}

const records = JSON.parse(sourceText);
if (!Array.isArray(records) || records.length === 0) {
  throw new Error("The Wiki recipe data is empty or invalid.");
}

const primaryCounts = new Map();
for (const record of records) {
  const outputs = normalizeEntries(record.产物);
  if (!outputs.length) continue;
  const primary = choosePrimaryOutput(outputs);
  primaryCounts.set(primary.name, (primaryCounts.get(primary.name) ?? 0) + 1);
}

const usedIds = new Set();
const recipes = records.flatMap((record, index) => {
  const facility = normalizeName(record.设施);
  const ingredients = normalizeEntries(record.原料);
  const rawOutputs = normalizeEntries(record.产物);
  if (!rawOutputs.length) return [];

  const primaryOutput = choosePrimaryOutput(rawOutputs);
  const outputs = [primaryOutput, ...rawOutputs.filter((output) => output !== primaryOutput)];
  const specialName = getSpecialRecipeName(facility, ingredients, outputs);
  const duplicatedPrimary = (primaryCounts.get(primaryOutput.name) ?? 0) > 1;
  const recipeName = specialName ||
    (duplicatedPrimary
      ? `${primaryOutput.name}（${facility} · ${ingredients.map((item) => item.name).join(" + ") || "直接获取"}）`
      : outputs.map((output) => output.name).join(" + "));

  return [{
    id: makeId(record, index, primaryOutput, usedIds),
    name: recipeName,
    outputName: primaryOutput.name,
    outputAmount: primaryOutput.amount,
    outputs,
    time: Number(record.时间),
    machineId: FACILITY_MACHINE_IDS[facility] ?? "custom",
    facility,
    isExternalSource: ingredients.length === 0,
    proliferatorLevel: Number(record.增产 ?? 0),
    ingredients,
    source: "戴森球计划 BWIKI",
  }];
});

const metadata = {
  title: page.title,
  url: API_URL,
  revisionId: revision.revid,
  sourceUpdatedAt: revision.timestamp,
  importedAt: new Date().toISOString(),
  recordCount: records.length,
  recipeCount: recipes.length,
};

const output = `// Generated by scripts/import-wiki-recipes.mjs. Do not edit by hand.\n` +
  `export const WIKI_RECIPE_SOURCE = ${JSON.stringify(metadata, null, 2)};\n\n` +
  `export const WIKI_RECIPES = ${JSON.stringify(recipes, null, 2)};\n`;

await writeFile(OUTPUT_URL, output, "utf8");
console.log(`Imported ${recipes.length} recipes from Wiki revision ${revision.revid} into ${fileURLToPath(OUTPUT_URL)}.`);
