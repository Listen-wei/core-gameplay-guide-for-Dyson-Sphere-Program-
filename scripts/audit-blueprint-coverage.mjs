import { WIKI_RECIPES } from "../wiki-recipes.js";

const blueprintIds = new Set([
  "outpost",
  "orbital",
  "smelt",
  "alloy",
  "two-input",
  "three-input",
  "multi-input",
  "chemical",
  "refinery",
  "fractionator",
  "collider",
  "science",
  "white-science",
  "photons",
  "broadband",
  "logistics",
  "sails",
  "rockets",
  "energy",
]);

const logisticsOutputs = new Set([
  "行星内物流运输站",
  "星际物流运输站",
  "物流运输机",
  "星际物流运输船",
]);

function primaryOutput(recipe) {
  return recipe.outputs?.[0]?.name || recipe.outputName || recipe.name;
}

function mapRecipe(recipe) {
  const output = primaryOutput(recipe);

  if (recipe.facility === "轻型工业机甲") return { status: "not-required", reason: "机甲手工采集" };
  if (recipe.facility === "黑雾残骸") return { status: "not-required", reason: "黑雾掉落，不是施工产线" };
  if (["采矿设备", "抽水设备", "抽油设备"].includes(recipe.facility)) return { status: "covered", blueprint: "outpost" };
  if (recipe.facility === "巨星采集") return { status: "covered", blueprint: "orbital" };
  if (recipe.facility === "冶炼设备") return { status: "covered", blueprint: recipe.ingredients.length > 1 ? "alloy" : "smelt" };
  if (recipe.facility === "化工设备") return { status: "covered", blueprint: "chemical" };
  if (recipe.facility === "精炼设备") return { status: "covered", blueprint: "refinery" };
  if (recipe.facility === "分馏设备") return { status: "covered", blueprint: "fractionator" };
  if (recipe.facility === "粒子对撞机") return { status: "covered", blueprint: output === "反物质" ? "photons" : "collider" };
  if (recipe.facility === "射线接收站") return { status: "covered", blueprint: "photons" };
  if (recipe.facility === "充电设备") return { status: "covered", blueprint: "energy" };
  if (recipe.facility === "科研设备") return { status: "covered", blueprint: output === "宇宙矩阵" ? "white-science" : "science" };

  if (recipe.facility === "制造台") {
    if (output === "粒子宽带") return { status: "covered", blueprint: "broadband" };
    if (output === "太阳帆") return { status: "covered", blueprint: "sails" };
    if (output === "小型运载火箭") return { status: "covered", blueprint: "rockets" };
    if (logisticsOutputs.has(output)) return { status: "covered", blueprint: "logistics" };
    if (recipe.ingredients.length <= 2) return { status: "covered", blueprint: "two-input" };
    if (recipe.ingredients.length === 3) return { status: "covered", blueprint: "three-input" };
    return { status: "covered", blueprint: "multi-input" };
  }

  return { status: "uncovered", reason: `未知设备类型：${recipe.facility}` };
}

const rows = WIKI_RECIPES.map((recipe) => ({ recipe, result: mapRecipe(recipe) }));
const invalidMappings = rows.filter(({ result }) => result.blueprint && !blueprintIds.has(result.blueprint));
const uncovered = rows.filter(({ result }) => result.status === "uncovered");
const notRequired = rows.filter(({ result }) => result.status === "not-required");
const covered = rows.filter(({ result }) => result.status === "covered");
const internal = rows.filter(({ recipe }) => !recipe.isExternalSource);
const internalCovered = internal.filter(({ result }) => result.status === "covered");

const usage = new Map();
for (const { result } of covered) usage.set(result.blueprint, (usage.get(result.blueprint) || 0) + 1);

console.log(`配方总数：${rows.length}`);
console.log(`可建造配方：${internal.length}；已覆盖：${internalCovered.length}`);
console.log(`外部采集/接收且有施工图：${covered.length - internalCovered.length}`);
console.log(`无需产线图：${notRequired.length}`);
console.log(`未覆盖：${uncovered.length}；无效映射：${invalidMappings.length}`);
console.log("\n按蓝图归类：");
for (const [blueprint, count] of [...usage].sort((a, b) => b[1] - a[1])) {
  console.log(`${blueprint}\t${count}`);
}

if (notRequired.length) {
  console.log("\n无需产线图的来源：");
  for (const { recipe, result } of notRequired) console.log(`${recipe.name}\t${result.reason}`);
}

if (uncovered.length || invalidMappings.length || internalCovered.length !== internal.length) {
  process.exitCode = 1;
}
