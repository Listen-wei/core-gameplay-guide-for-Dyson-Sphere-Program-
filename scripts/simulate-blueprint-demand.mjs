import { WIKI_RECIPES } from "../wiki-recipes.js";

const targets = [
  { recipeId: "wiki-101", name: "宇宙矩阵", rate: 120 },
  { recipeId: "wiki-096", name: "太阳帆", rate: 120 },
  { recipeId: "wiki-109", name: "小型运载火箭", rate: 10 },
];

// 成熟珍奇路线；副产物不跨模块抵扣，结果偏保守但更容易稳定运行。
const selectedRecipeByOutput = {
  金刚石: "wiki-087",
  晶格硅: "wiki-088",
  碳纳米管: "wiki-061",
  石墨烯: "wiki-058",
  光子合并器: "wiki-095",
  粒子容器: "wiki-126",
  临界光子: "wiki-183",
  精炼油: "plasma-refining",
  卡西米尔晶体: "wiki-054",
};

const rawInputs = new Set([
  "铁矿",
  "铜矿",
  "煤矿",
  "氢",
  "重氢",
  "有机晶体",
  "钛石",
  "硅石",
  "刺笋结晶",
  "分形硅石",
  "原油",
  "可燃冰",
  "金伯利矿石",
  "石矿",
  "水",
  "硫酸",
  "单极磁石",
  "光栅石",
]);

const recipesById = new Map(WIKI_RECIPES.map((recipe) => [recipe.id, recipe]));
const candidatesByOutput = new Map();
for (const recipe of WIKI_RECIPES.filter((item) => !item.isExternalSource)) {
  const output = recipe.outputs?.[0];
  if (!output?.name) continue;
  const candidates = candidatesByOutput.get(output.name) || [];
  candidates.push(recipe);
  candidatesByOutput.set(output.name, candidates);
}

const crafted = new Map();
const raw = new Map();

function chooseRecipe(outputName) {
  const selectedId = selectedRecipeByOutput[outputName];
  if (selectedId) return recipesById.get(selectedId);
  const candidates = candidatesByOutput.get(outputName) || [];
  if (candidates.length !== 1) {
    throw new Error(`产物“${outputName}”需要显式选择配方，候选：${candidates.map((item) => item.id).join(", ")}`);
  }
  return candidates[0];
}

function addRecipeDemand(recipe, outputRate) {
  const output = recipe.outputs[0];
  const cyclesPerMinute = outputRate / output.amount;
  const machineRate = (60 / recipe.time) * output.amount;
  const current = crafted.get(recipe.id) || {
    recipe,
    outputRate: 0,
    machines: 0,
  };
  current.outputRate += outputRate;
  current.machines += outputRate / machineRate;
  crafted.set(recipe.id, current);

  for (const ingredient of recipe.ingredients) {
    addOutputDemand(ingredient.name, cyclesPerMinute * ingredient.amount);
  }
}

function addOutputDemand(outputName, rate) {
  if (rawInputs.has(outputName)) {
    raw.set(outputName, (raw.get(outputName) || 0) + rate);
    return;
  }
  addRecipeDemand(chooseRecipe(outputName), rate);
}

for (const target of targets) addRecipeDemand(recipesById.get(target.recipeId), target.rate);

function blueprintFor(recipe) {
  const output = recipe.outputs[0].name;
  if (recipe.facility === "冶炼设备") return recipe.ingredients.length > 1 ? "alloy" : "smelt";
  if (recipe.facility === "化工设备") return "chemical";
  if (recipe.facility === "精炼设备") return "refinery";
  if (recipe.facility === "分馏设备") return "fractionator";
  if (recipe.facility === "粒子对撞机") return output === "反物质" ? "photons" : "collider";
  if (recipe.facility === "射线接收站") return "photons";
  if (recipe.facility === "充电设备") return "energy";
  if (recipe.facility === "科研设备") return output === "宇宙矩阵" ? "white-science" : "science";
  if (recipe.facility === "制造台") {
    if (output === "粒子宽带") return "broadband";
    if (output === "太阳帆") return "sails";
    if (output === "小型运载火箭") return "rockets";
    if (recipe.ingredients.length <= 2) return "two-input";
    if (recipe.ingredients.length === 3) return "three-input";
    return "multi-input";
  }
  throw new Error(`未映射设备：${recipe.facility}`);
}

const capacity = {
  smelt: 24,
  alloy: 12,
  "two-input": 24,
  "three-input": 8,
  "multi-input": 4,
  chemical: 16,
  refinery: 8,
  fractionator: 40,
  collider: 8,
  science: 30,
  "white-science": 30,
  broadband: 16,
  sails: 4,
  rockets: 1,
};

const moduleTotals = new Map();
for (const row of crafted.values()) {
  const blueprint = blueprintFor(row.recipe);
  if (blueprint === "photons") continue;
  const modules = Math.ceil(row.machines / capacity[blueprint] - 1e-9);
  moduleTotals.set(blueprint, (moduleTotals.get(blueprint) || 0) + modules);
}

const receiverMachines = crafted.get("wiki-183")?.machines || 0;
const antimatterMachines = crafted.get("wiki-100")?.machines || 0;
moduleTotals.set("photons", Math.max(Math.ceil(receiverMachines / 10), Math.ceil(antimatterMachines / 2)));
moduleTotals.set("outpost", [...raw.keys()].filter((name) => !["氢", "重氢"].includes(name)).length);
moduleTotals.set("orbital", ["氢", "重氢"].filter((name) => raw.has(name)).length);

const facilityTotals = new Map();
const facilityRoundedTotals = new Map();
for (const row of crafted.values()) {
  facilityTotals.set(row.recipe.facility, (facilityTotals.get(row.recipe.facility) || 0) + row.machines);
  facilityRoundedTotals.set(
    row.recipe.facility,
    (facilityRoundedTotals.get(row.recipe.facility) || 0) + Math.ceil(row.machines - 1e-9),
  );
}

console.log("并行目标：白糖 120/min + 太阳帆 120/min + 小型火箭 10/min");
console.log("口径：无增产、1×设备、成熟珍奇路线、副产物不抵扣。\n");
console.log("设施精确需求：");
for (const [facility, machines] of [...facilityTotals].sort((a, b) => b[1] - a[1])) {
  console.log(`${facility}\t精确 ${machines.toFixed(2)}\t逐配方向上取整 ${facilityRoundedTotals.get(facility)}`);
}

console.log("\n施工图模块数（每种成品分别向上取整）：");
for (const [blueprint, modules] of [...moduleTotals].sort((a, b) => b[1] - a[1])) {
  console.log(`${blueprint}\t${modules}`);
}

console.log("\n外部输入：");
for (const [name, rate] of [...raw].sort((a, b) => b[1] - a[1])) {
  console.log(`${name}\t${rate.toFixed(2)}/min`);
}
