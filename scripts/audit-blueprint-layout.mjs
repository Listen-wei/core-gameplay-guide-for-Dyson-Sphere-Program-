import { readFileSync } from "node:fs";

const atlasPath = new URL("../戴森球计划模块化蓝图图册.html", import.meta.url);
const source = readFileSync(atlasPath, "utf8");

const expectedBlueprints = [
  "starter",
  "bus-market",
  "blue-line",
  "defense",
  "red-line",
  "first-trip",
  "yellow-line",
  "tower-switch",
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
  "power",
];

const buttonIds = [...source.matchAll(/data-blueprint=&quot;([^&]+)&quot;/g)].map((match) => match[1]);
const uniqueButtonIds = new Set(buttonIds);
const failures = [];

if (buttonIds.length !== expectedBlueprints.length || uniqueButtonIds.size !== expectedBlueprints.length) {
  failures.push(`蓝图入口应为 ${expectedBlueprints.length} 个且不能重复，实际为 ${buttonIds.length} 个`);
}

for (const id of expectedBlueprints) {
  if (!uniqueButtonIds.has(id)) failures.push(`缺少蓝图入口：${id}`);
}

const withoutFractionatorReturn = source.replace("←←← 氢回流", "");
if (withoutFractionatorReturn.includes("←")) {
  failures.push("发现非分馏回流用途的左向箭头；右侧供给塔布局必须让成品向右入塔");
}

const requiredRules = [
  "本阶段只拍这些",
  "上一阶段验收全部通过才进入下一阶段",
  "铁·铜·石三矿总线 + 分段建筑超市",
  "钛块 ≥2,000，高纯硅块 ≥800",
  "五色糖直转宇宙矩阵 120/min",
  "左侧需求塔直接出料 → 输入主干分流到每个设备子块",
  "中央三带固定按 A / 成品 / B 排列",
  "单图只画 8 台标准子块",
  "所有分拣器跨度不超过 2 条带",
  "单图只画 4 台标准子块",
  "每台安装 5 入 1 出共 6 根分拣器",
  "所有固体/液体输入主干都要分给上下两块",
  "精炼油、氢、高能石墨使用三条独立输出带",
  "反物质和氢分别用两根分拣器送入两条独立右行带",
  "四种成品禁止混带、禁止共箱",
  "两套传送带绝不相连",
  "中央共享一条燃料带",
  "塔 1 需求 A/B/C，塔 2 需求 D/E，右侧第 3 塔/限量仓只收成品",
  "下排 12 台同样能同时取得 A/B",
  "8 台每台都能取得 A/B/C",
];

for (const rule of requiredRules) {
  if (!source.includes(rule)) failures.push(`缺少施工约束：${rule}`);
}

const forbiddenAmbiguities = [
  "← 成品",
  "← 主产物",
  "← 矩阵",
  "← 宇宙矩阵",
  "← 反物质 / 氢",
  "← 精炼油 / 石墨",
  "供给塔\n满 / 空分槽",
];

for (const phrase of forbiddenAmbiguities) {
  if (source.includes(phrase)) failures.push(`仍存在含糊标注：${phrase}`);
}

if (failures.length) {
  console.error("蓝图物理布局审计失败：");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`蓝图物理布局审计通过：${expectedBlueprints.length}/${expectedBlueprints.length}`);
  console.log("成品方向：全部向右进入供给塔；唯一左向箭头为分馏氢回流。");
  console.log("多输入、双产物、限量仓与跨星球充放电隔离规则：全部存在。");
}
