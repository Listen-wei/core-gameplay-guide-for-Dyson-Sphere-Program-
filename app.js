import { WIKI_RECIPES, WIKI_RECIPE_SOURCE } from "./wiki-recipes.js?v=20260721-1";

export const BELTS = [
  { id: "belt-1", name: "传送带 Mk.I（6/s）", speedPerSecond: 6 },
  { id: "belt-2", name: "传送带 Mk.II（12/s）", speedPerSecond: 12 },
  { id: "belt-3", name: "传送带 Mk.III（30/s）", speedPerSecond: 30 },
];

export const MACHINES = [
  { id: "mining", name: "采矿设备（基准 1x）", speed: 1 },
  { id: "mecha", name: "轻型工业机甲（基准 1x）", speed: 1 },
  { id: "water-pump", name: "抽水设备（基准 1x）", speed: 1 },
  { id: "oil-extractor", name: "抽油设备（基准 1x）", speed: 1 },
  { id: "orbital-collector", name: "巨星采集（基准 1x）", speed: 1 },
  { id: "dark-fog", name: "黑雾残骸（基准 1x）", speed: 1 },
  { id: "assembler-1", name: "制造台 Mk.I（0.75x）", speed: 0.75 },
  { id: "assembler-2", name: "制造台 Mk.II（1x）", speed: 1 },
  { id: "assembler-3", name: "制造台 Mk.III（1.5x）", speed: 1.5 },
  { id: "smelter-arc", name: "电弧熔炉（1x）", speed: 1 },
  { id: "smelter-plane", name: "位面熔炉（2x）", speed: 2 },
  { id: "smelter-negentropy", name: "负熵熔炉（3x）", speed: 3 },
  { id: "chemical", name: "化工厂（1x）", speed: 1 },
  { id: "chemical-quantum", name: "量子化工厂（2x）", speed: 2 },
  { id: "refinery", name: "原油精炼厂（1x）", speed: 1 },
  { id: "collider", name: "微型粒子对撞机（1x）", speed: 1 },
  { id: "fractionator", name: "分馏设备（基准 1x）", speed: 1 },
  { id: "ray-receiver", name: "射线接收站（基准 1x）", speed: 1 },
  { id: "accumulator-charger", name: "充电设备（基准 1x）", speed: 1 },
  { id: "lab", name: "矩阵研究站（1x）", speed: 1 },
  { id: "custom", name: "自定义速度", speed: 1 },
];

export const PROLIFERATORS = [
  { id: "none", name: "无增产/加速", productivity: 1, speed: 1 },
  { id: "mk1-product", name: "增产剂 Mk.I：额外产物 +12.5%", productivity: 1.125, speed: 1 },
  { id: "mk2-product", name: "增产剂 Mk.II：额外产物 +20%", productivity: 1.2, speed: 1 },
  { id: "mk3-product", name: "增产剂 Mk.III：额外产物 +25%", productivity: 1.25, speed: 1 },
  { id: "mk1-speed", name: "增产剂 Mk.I：生产加速 +25%", productivity: 1, speed: 1.25 },
  { id: "mk2-speed", name: "增产剂 Mk.II：生产加速 +50%", productivity: 1, speed: 1.5 },
  { id: "mk3-speed", name: "增产剂 Mk.III：生产加速 +100%", productivity: 1, speed: 2 },
  { id: "custom", name: "自定义倍率", productivity: 1, speed: 1 },
];

export const OIL_HYDROGEN_MODES = [
  { id: "keep", name: "保留全部产物" },
  { id: "oil-only", name: "只要精炼油（氢重整为油）" },
  { id: "hydrogen-only", name: "只要氢（油裂解为氢）" },
];

export const RECIPES = [
  ...WIKI_RECIPES,
  {
    id: "custom",
    name: "自定义配方",
    outputName: "目标产物",
    time: 1,
    outputAmount: 1,
    machineId: "assembler-2",
    ingredients: [{ name: "原料 A", amount: 1, belts: 1 }],
  },
];

const EPSILON = 1e-9;
const STORAGE_KEY = "dsp-single-line-recipes-v1";
const FLOW_COMPLETION_STORAGE_KEY = "dsp-flow-completion-v1";

const byId = (list, id) => list.find((item) => item.id === id) ?? list[0];
const positive = (value, fallback = 1) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};
const normalizeName = (value) => String(value || "").trim();
const isUserRecipe = (recipeOrId) => String(recipeOrId?.id ?? recipeOrId).startsWith("user-");
const cloneRecipe = (recipe) => ({
  ...recipe,
  outputs: (recipe.outputs ?? []).map((output) => ({ ...output })),
  ingredients: (recipe.ingredients ?? []).map((ingredient) => ({ ...ingredient })),
  processSteps: (recipe.processSteps ?? []).map((step) => ({ ...step })),
});
const createUserRecipeId = () => `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const formatNumber = (value, digits = 2) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 2),
  }).format(value);
const formatExact = (value, digits = 2) =>
  new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);

const normalizeOutput = (output, fallbackName = "未命名产物") => ({
  name: normalizeName(output?.name) || fallbackName,
  amount: positive(output?.amount),
  belts: positive(output?.belts),
});

export function getRecipeOutputs(recipe) {
  const legacyPrimaryName = normalizeName(recipe.outputName || recipe.name) || "目标产物";
  const legacyPrimary = {
    name: legacyPrimaryName,
    amount: positive(recipe.outputAmount),
    belts: positive(recipe.outputBelts),
  };
  const rawOutputs = Array.isArray(recipe.outputs) && recipe.outputs.length ? recipe.outputs : [legacyPrimary];
  const normalized = rawOutputs
    .map((output, index) => normalizeOutput(output, index === 0 ? legacyPrimaryName : "副产物"))
    .filter((output) => output.name && output.amount > 0);
  const primaryIndex = normalized.findIndex((output) => normalizeName(output.name) === legacyPrimaryName);
  const primary = primaryIndex >= 0 ? normalized[primaryIndex] : legacyPrimary;
  const secondary = normalized.filter((_, index) => index !== primaryIndex && normalizeName(_.name) !== normalizeName(primary.name));

  return [primary, ...secondary];
}

const getPrimaryOutput = (recipe) => getRecipeOutputs(recipe)[0];
const getSecondaryOutputs = (recipe) => getRecipeOutputs(recipe).slice(1);
const getRecipeLabel = (recipe) => {
  const outputs = getRecipeOutputs(recipe);
  const outputNames = outputs.map((output) => output.name).join(" + ");
  return recipe.name === outputNames ? recipe.name : `${recipe.name}：${outputNames}`;
};
const hasOilHydrogenOutputs = (recipe) => {
  const outputNames = new Set(getRecipeOutputs(recipe).map((output) => normalizeName(output.name)));
  return outputNames.has("精炼油") && outputNames.has("氢");
};

export const getOilHydrogenRecipeForMode = (recipe, mode) => {
  if (!hasOilHydrogenOutputs(recipe) || mode === "keep") return cloneRecipe(recipe);

  if (mode === "oil-only") {
    return {
      ...cloneRecipe(recipe),
      name: `${recipe.name}（只要精炼油）`,
      outputName: "精炼油",
      outputAmount: 3,
      outputs: [{ name: "精炼油", amount: 3 }],
      ingredients: [
        { name: "原油", amount: 2, belts: 1 },
        { name: "煤矿", amount: 1, belts: 1 },
      ],
      processSteps: [
        { name: "等离子精炼", machineId: "refinery", time: 4, cycles: 1 },
        { name: "重整精炼", machineId: "refinery", time: 4, cycles: 1 },
      ],
      modeNote: "净产物模式：使用重整精炼把等离子精炼产生的氢转换为精炼油。",
    };
  }

  if (mode === "hydrogen-only") {
    return {
      ...cloneRecipe(recipe),
      name: `${recipe.name}（只要氢）`,
      outputName: "氢",
      outputAmount: 3,
      outputs: [
        { name: "氢", amount: 3 },
        { name: "高能石墨", amount: 2, belts: 1 },
      ],
      ingredients: [{ name: "原油", amount: 2, belts: 1 }],
      processSteps: [
        { name: "等离子精炼", machineId: "refinery", time: 4, cycles: 1 },
        { name: "X射线裂解", machineId: "refinery", time: 4, cycles: 2 },
      ],
      modeNote: "净产物模式：使用 X 射线裂解把等离子精炼产生的精炼油转换为氢，并副产高能石墨。",
    };
  }

  return cloneRecipe(recipe);
};

export function getEffectiveRecipes(userRecipes = [], baseRecipes = RECIPES) {
  const customRecipe = baseRecipes.find((recipe) => recipe.id === "custom");
  const builtInRecipes = baseRecipes.filter((recipe) => recipe.id !== "custom");
  const visibleRecipes = [...builtInRecipes.map(cloneRecipe), ...userRecipes.map(cloneRecipe)];

  return customRecipe ? [...visibleRecipes, cloneRecipe(customRecipe)] : visibleRecipes;
}

const loadUserRecipes = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(cloneRecipe) : [];
  } catch {
    return [];
  }
};

const saveUserRecipes = (recipes) => {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
};

const loadFlowCompletionState = () => {
  if (typeof localStorage === "undefined") return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(FLOW_COMPLETION_STORAGE_KEY) || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, nodeKeys]) => Array.isArray(nodeKeys)),
    );
  } catch {
    return {};
  }
};

const saveFlowCompletionState = (state) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FLOW_COMPLETION_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 完成标记属于辅助状态；存储空间不可用时仍允许正常计算。
  }
};

const getProcessSteps = (recipe, fallbackMachineId, fallbackTime) => {
  const steps = Array.isArray(recipe.processSteps) && recipe.processSteps.length
    ? recipe.processSteps
    : [{ name: recipe.name || "生产", machineId: fallbackMachineId, time: fallbackTime, cycles: 1 }];

  return steps.map((step) => {
    const machine = byId(MACHINES, step.machineId || fallbackMachineId);
    return {
      name: step.name || machine.name,
      machine,
      machineId: machine.id,
      time: positive(step.time, fallbackTime),
      cycles: positive(step.cycles),
    };
  });
};

const getRecipeRates = (recipe, productivityMultiplier, speedMultiplier, targetOutputName) => {
  const machine = byId(MACHINES, recipe.machineId);
  const recipeTime = positive(recipe.time);
  const outputs = getRecipeOutputs(recipe);
  const targetOutput =
    outputs.find((output) => normalizeName(output.name) === normalizeName(targetOutputName)) ?? outputs[0];
  const outputAmount = positive(targetOutput.amount);
  const machineSpeed = positive(recipe.machineSpeed, machine.speed);
  const processSteps = getProcessSteps(recipe, machine.id, recipeTime).map((step) => {
    const stepSpeed = step.machine.id === machine.id ? machineSpeed : step.machine.speed;
    return {
      ...step,
      cyclesPerMachine: (60 / step.time) * stepSpeed * speedMultiplier,
    };
  });
  const machineMinutesPerBundle = processSteps.reduce((total, step) => total + step.cycles / step.cyclesPerMachine, 0);
  const cyclesPerMachine = 1 / machineMinutesPerBundle;
  return {
    recipeTime,
    outputAmount,
    targetOutput,
    outputs,
    byproductOutputs: outputs.filter((output) => normalizeName(output.name) !== normalizeName(targetOutput.name)),
    machine,
    machineSpeed,
    cyclesPerMachine,
    processSteps,
    machineMinutesPerBundle,
    outputPerMachine: cyclesPerMachine * outputAmount * productivityMultiplier,
  };
};

export function calculateLine(config) {
  const recipeTime = positive(config.recipeTime);
  const outputAmount = positive(config.outputAmount);
  const machineSpeed = positive(config.machineSpeed);
  const productivityMultiplier = positive(config.productivityMultiplier);
  const speedMultiplier = positive(config.speedMultiplier);
  const machine = byId(MACHINES, config.machineId);
  const processRecipe = {
    name: config.outputName || "生产",
    machineId: config.machineId || machine.id,
    machineSpeed,
    time: recipeTime,
    processSteps: config.processSteps ?? [],
  };
  const processSteps = getProcessSteps(processRecipe, machine.id, recipeTime).map((step) => {
    const stepSpeed = step.machine.id === machine.id ? machineSpeed : step.machine.speed;
    return {
      ...step,
      cyclesPerMachine: (60 / step.time) * stepSpeed * speedMultiplier,
    };
  });
  const machineMinutesPerBundle = processSteps.reduce((total, step) => total + step.cycles / step.cyclesPerMachine, 0);
  const bundlesPerMachine = 1 / machineMinutesPerBundle;
  const outputBeltSpeed = positive(config.outputBeltSpeed);
  const outputBeltCount = positive(config.outputBeltCount);
  const stackSize = positive(config.stackSize);
  const extraOutputs = (config.extraOutputs ?? [])
    .map((output) => ({
      name: normalizeName(output.name) || "未命名副产物",
      amount: positive(output.amount),
      belts: positive(output.belts),
    }))
    .filter((output) => output.amount > 0);
  const ingredients = (config.ingredients ?? [])
    .map((ingredient) => ({
      name: String(ingredient.name || "未命名原料").trim() || "未命名原料",
      amount: positive(ingredient.amount),
      belts: positive(ingredient.belts),
    }))
    .filter((ingredient) => ingredient.amount > 0);

  const cyclesPerMinute = bundlesPerMachine;
  const outputPerMachine = bundlesPerMachine * outputAmount * productivityMultiplier;
  const outputBeltCapacity = outputBeltSpeed * 60 * outputBeltCount * stackSize;
  const targetPerMinute =
    config.targetMode === "custom" ? positive(config.customTarget, outputBeltCapacity) : outputBeltCapacity;
  const machinesForTargetRaw = targetPerMinute / outputPerMachine;
  const bundlesForTarget = targetPerMinute / (outputAmount * productivityMultiplier);
  const stepMachines = processSteps.map((step) => ({
    name: step.name,
    machineName: step.machine.name,
    machinesRaw: (bundlesForTarget * step.cycles) / step.cyclesPerMachine,
  }));
  const machinesForTarget = Math.max(
    1,
    stepMachines.reduce((total, step) => total + Math.ceil(step.machinesRaw - EPSILON), 0),
  );
  const actualOutputForTarget = machinesForTarget * outputPerMachine;
  const targetUtilization = targetPerMinute / actualOutputForTarget;

  const constraints = [
    {
      id: "output",
      name: `${config.outputName || "产物"}输出`,
      capacityPerMinute: outputBeltCapacity,
      flowPerMachine: outputPerMachine,
      machineLimit: Math.floor(outputBeltCapacity / outputPerMachine + EPSILON),
      source: `${formatNumber(outputBeltSpeed)} /秒 × ${formatNumber(stackSize)} 堆叠 × ${formatNumber(outputBeltCount)} 条`,
    },
    ...extraOutputs.map((output, index) => {
      const outputPerMachineForExtra = cyclesPerMinute * output.amount * productivityMultiplier;
      const capacityPerMinute = outputBeltSpeed * 60 * output.belts * stackSize;
      return {
        id: `extra-output-${index}`,
        name: `${output.name}副产物输出`,
        capacityPerMinute,
        flowPerMachine: outputPerMachineForExtra,
        machineLimit: Math.floor(capacityPerMinute / outputPerMachineForExtra + EPSILON),
        source: `${formatNumber(outputBeltSpeed)} /秒 × ${formatNumber(stackSize)} 堆叠 × ${formatNumber(output.belts)} 条`,
      };
    }),
    ...ingredients.map((ingredient, index) => {
      const inputPerMachine = cyclesPerMinute * ingredient.amount;
      const capacityPerMinute = outputBeltSpeed * 60 * ingredient.belts * stackSize;
      return {
        id: `input-${index}`,
        name: `${ingredient.name}输入`,
        capacityPerMinute,
        flowPerMachine: inputPerMachine,
        machineLimit: Math.floor(capacityPerMinute / inputPerMachine + EPSILON),
        source: `${formatNumber(outputBeltSpeed)} /秒 × ${formatNumber(stackSize)} 堆叠 × ${formatNumber(ingredient.belts)} 条`,
      };
    }),
  ];

  const lineMachineLimit = Math.min(...constraints.map((constraint) => constraint.machineLimit));
  const lineOutputPerMinute = lineMachineLimit * outputPerMachine;
  const lineCountForTarget =
    lineMachineLimit > 0 ? Math.ceil(machinesForTarget / lineMachineLimit) : Number.POSITIVE_INFINITY;
  const bottlenecks = constraints.filter((constraint) => constraint.machineLimit === lineMachineLimit);

  return {
    cyclesPerMinute,
    outputPerMachine,
    targetPerMinute,
    machinesForTarget,
    machinesForTargetRaw,
    actualOutputForTarget,
    targetUtilization,
    lineMachineLimit,
    lineOutputPerMinute,
    lineCountForTarget,
    constraints,
    bottlenecks,
    stepMachines,
    fitsSingleLine: machinesForTarget <= lineMachineLimit,
  };
}

export function calculateProductionChain(config, options = {}) {
  const recipes = options.recipes ?? RECIPES;
  const recipeSelections = options.recipeSelections ?? {};
  const productivityMultiplier = positive(config.productivityMultiplier);
  const speedMultiplier = positive(config.speedMultiplier);
  const targetPerMinute = positive(config.chainTargetPerMinute, calculateLine(config).targetPerMinute);
  const recipesByOutput = new Map();

  for (const recipe of recipes.filter((item) => item.id !== "custom" && !item.isExternalSource)) {
    const outputs = getRecipeOutputs(recipe);
    const primaryOutput = outputs[0];
    const ingredientNames = new Set((recipe.ingredients ?? []).map((ingredient) => normalizeName(ingredient.name)));
    if (primaryOutput?.name && !ingredientNames.has(normalizeName(primaryOutput.name))) {
      const outputName = normalizeName(primaryOutput.name);
      const candidates = recipesByOutput.get(outputName) ?? [];
      candidates.push({ recipe, output: primaryOutput, isPrimary: true });
      recipesByOutput.set(outputName, candidates);
    }
  }

  for (const recipe of recipes.filter((item) => item.id !== "custom" && !item.isExternalSource)) {
    const ingredientNames = new Set((recipe.ingredients ?? []).map((ingredient) => normalizeName(ingredient.name)));
    for (const output of getSecondaryOutputs(recipe)) {
      const outputName = normalizeName(output.name);
      if (outputName && !ingredientNames.has(outputName) && !recipesByOutput.has(outputName)) {
        recipesByOutput.set(outputName, [{ recipe, output, isPrimary: false }]);
      }
    }
  }

  const chooseRecipeForOutput = (outputName) => {
    const candidates = recipesByOutput.get(outputName) ?? [];
    const selectedRecipeId = recipeSelections[outputName];
    const selected = candidates.find((candidate) => candidate.recipe.id === selectedRecipeId) ?? candidates.at(-1);
    return selected ? { ...selected, candidates } : null;
  };

  const rootRecipe = {
    id: "__root__",
    sourceRecipeId: config.recipeId,
    name: config.outputName || "目标产物",
    outputName: config.outputName || "目标产物",
    time: config.recipeTime,
    outputAmount: config.outputAmount,
    outputs: [
      { name: config.outputName || "目标产物", amount: config.outputAmount },
      ...(config.extraOutputs ?? []),
    ],
    machineId: config.machineId,
    machineSpeed: config.machineSpeed,
    processSteps: config.processSteps ?? [],
    ingredients: config.ingredients ?? [],
  };
  const crafted = new Map();
  const rawInputs = new Map();
  const edges = new Map();
  const warnings = [];

  const addEdge = (from, to, itemName, requiredPerMinute) => {
    const key = `${from}\u0000${to}\u0000${itemName}`;
    const existing = edges.get(key) ?? {
      from,
      to,
      itemName,
      requiredPerMinute: 0,
    };
    existing.requiredPerMinute += requiredPerMinute;
    edges.set(key, existing);
  };

  const addRawInput = (name, requiredPerMinute, depth, reason = "未录入配方") => {
    const key = normalizeName(name) || "未命名原料";
    const nodeKey = `raw:${key}`;
    const existing = rawInputs.get(key) ?? {
      nodeKey,
      kind: "raw",
      name: key,
      requiredPerMinute: 0,
      depth,
      reason,
    };
    existing.requiredPerMinute += requiredPerMinute;
    existing.depth = Math.max(existing.depth, depth);
    rawInputs.set(key, existing);
    return nodeKey;
  };

  const addCrafted = (recipe, requiredPerMinute, depth, rates, recipeCandidates = []) => {
    const key =
      recipe.id === "__root__"
        ? `root:${normalizeName(rates.targetOutput.name)}`
        : `recipe:${recipe.id}:${normalizeName(rates.targetOutput.name)}`;
    const byproducts = rates.byproductOutputs.map((output) => ({
      name: output.name,
      amount: output.amount,
      requiredPerMinute: (requiredPerMinute / (rates.outputAmount * productivityMultiplier)) * output.amount * productivityMultiplier,
    }));
    const bundlesPerMinute = requiredPerMinute / (rates.outputAmount * productivityMultiplier);
    const stepMachinesRaw = rates.processSteps.map((step) => ({
      name: step.name,
      machineName: step.machine.name,
      machineId: step.machineId,
      cycles: step.cycles,
      machinesRaw: (bundlesPerMinute * step.cycles) / step.cyclesPerMachine,
    }));
    const existing = crafted.get(key) ?? {
      nodeKey: key,
      kind: "crafted",
      recipeId: recipe.id,
      sourceRecipeId: recipe.sourceRecipeId ?? recipe.id,
      isRoot: recipe.id === "__root__",
      name: rates.targetOutput.name,
      recipeName: recipe.name || rates.targetOutput.name,
      recipeChoices: recipeCandidates.map((candidate) => ({
        id: candidate.recipe.id,
        name: getRecipeLabel(candidate.recipe),
      })),
      requiredPerMinute: 0,
      machineId: recipe.machineId,
      machineName: rates.machine.name,
      outputPerMachine: rates.outputPerMachine,
      machinesRaw: 0,
      depth,
      recipeTime: rates.recipeTime,
      outputAmount: rates.outputAmount,
      byproducts: [],
      stepMachinesRaw: [],
    };
    existing.requiredPerMinute += requiredPerMinute;
    existing.machinesRaw += requiredPerMinute / rates.outputPerMachine;
    existing.depth = Math.max(existing.depth, depth);
    for (const stepMachine of stepMachinesRaw) {
      const existingStep = existing.stepMachinesRaw.find((item) => item.name === stepMachine.name && item.machineName === stepMachine.machineName);
      if (existingStep) {
        existingStep.machinesRaw += stepMachine.machinesRaw;
      } else {
        existing.stepMachinesRaw.push({ ...stepMachine });
      }
    }
    for (const byproduct of byproducts) {
      const existingByproduct = existing.byproducts.find((item) => normalizeName(item.name) === normalizeName(byproduct.name));
      if (existingByproduct) {
        existingByproduct.requiredPerMinute += byproduct.requiredPerMinute;
      } else {
        existing.byproducts.push({ ...byproduct });
      }
    }
    crafted.set(key, existing);
    return key;
  };

  const visitRecipe = (recipe, requiredPerMinute, targetOutputName, depth, stack, recipeCandidates = []) => {
    const rates = getRecipeRates(recipe, productivityMultiplier, speedMultiplier, targetOutputName);
    const currentNodeKey = addCrafted(recipe, requiredPerMinute, depth, rates, recipeCandidates);

    const cyclesNeeded = requiredPerMinute / (rates.outputAmount * productivityMultiplier);
    for (const ingredient of recipe.ingredients ?? []) {
      const ingredientName = normalizeName(ingredient.name);
      const ingredientRequired = cyclesNeeded * positive(ingredient.amount);
      const child = chooseRecipeForOutput(ingredientName);
      const childKey = ingredientName;

      if (!child) {
        const rawNodeKey = addRawInput(ingredientName, ingredientRequired, depth + 1);
        addEdge(rawNodeKey, currentNodeKey, ingredientName, ingredientRequired);
        continue;
      }

      if (stack.has(childKey)) {
        warnings.push(`${ingredientName} 被检测为循环配方，已按外部输入处理。`);
        const rawNodeKey = addRawInput(ingredientName, ingredientRequired, depth + 1, "循环配方");
        addEdge(rawNodeKey, currentNodeKey, ingredientName, ingredientRequired);
        continue;
      }

      const childNodeKey = visitRecipe(
        child.recipe,
        ingredientRequired,
        child.output.name,
        depth + 1,
        new Set([...stack, childKey]),
        child.candidates,
      );
      addEdge(childNodeKey, currentNodeKey, ingredientName, ingredientRequired);
    }
    return currentNodeKey;
  };

  visitRecipe(rootRecipe, targetPerMinute, config.outputName || "目标产物", 0, new Set([normalizeName(config.outputName)]));

  const craftedRows = [...crafted.values()].map((row) => ({
    ...row,
    stepMachines: row.stepMachinesRaw.map((step) => ({
      ...step,
      machines: Math.max(1, Math.ceil(step.machinesRaw - EPSILON)),
    })),
  }));
  craftedRows.forEach((row) => {
    row.machines = row.stepMachines.reduce((total, step) => total + step.machines, 0);
  });
  const rawRows = [...rawInputs.values()];
  const machineTotalsByName = new Map();
  const byproductTotalsByName = new Map();

  for (const row of craftedRows) {
    for (const step of row.stepMachines) {
      const label = row.stepMachines.length > 1 ? `${step.machineName} / ${step.name}` : step.machineName;
      const total = machineTotalsByName.get(label) ?? { machines: 0, machinesRaw: 0 };
      total.machines += step.machines;
      total.machinesRaw += step.machinesRaw;
      machineTotalsByName.set(label, total);
    }
    for (const byproduct of row.byproducts ?? []) {
      byproductTotalsByName.set(
        byproduct.name,
        (byproductTotalsByName.get(byproduct.name) ?? 0) + byproduct.requiredPerMinute,
      );
    }
  }

  const rows = [...rawRows, ...craftedRows].sort((a, b) => {
    if (b.depth !== a.depth) return b.depth - a.depth;
    if (a.kind !== b.kind) return a.kind === "raw" ? -1 : 1;
    return a.name.localeCompare(b.name, "zh-CN");
  });

  return {
    targetPerMinute,
    rows,
    edges: [...edges.values()],
    craftedRows,
    rawRows,
    byproductRows: [...byproductTotalsByName.entries()].map(([name, requiredPerMinute]) => ({ name, requiredPerMinute })),
    machineTotals: [...machineTotalsByName.entries()].map(([machineName, total]) => ({ machineName, ...total })),
    warnings,
  };
}

export function layoutProductionFlow(rows, edges, options = {}) {
  const nodeWidth = options.nodeWidth ?? 224;
  const nodeHeight = options.nodeHeight ?? 176;
  const columnGap = options.columnGap ?? 92;
  const rowGap = options.rowGap ?? 24;
  const padding = options.padding ?? 24;
  const maxDepth = Math.max(0, ...rows.map((row) => row.depth));
  const columns = new Map();

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    columns.set(depth, rows.filter((row) => row.depth === depth));
  }

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const column = columns.get(depth);
    const parentOrder = new Map((columns.get(depth - 1) ?? []).map((row, index) => [row.nodeKey, index]));
    column.sort((a, b) => {
      const getParentRank = (row) => {
        const ranks = edges
          .filter((edge) => edge.from === row.nodeKey && parentOrder.has(edge.to))
          .map((edge) => parentOrder.get(edge.to));
        return ranks.length ? ranks.reduce((sum, rank) => sum + rank, 0) / ranks.length : Number.POSITIVE_INFINITY;
      };
      const rankDifference = getParentRank(a) - getParentRank(b);
      if (Number.isFinite(rankDifference) && Math.abs(rankDifference) > EPSILON) return rankDifference;
      if (a.kind !== b.kind) return a.kind === "raw" ? -1 : 1;
      return a.name.localeCompare(b.name, "zh-CN");
    });
  }

  const maxRows = Math.max(1, ...[...columns.values()].map((column) => column.length));
  const height = padding * 2 + maxRows * nodeHeight + Math.max(0, maxRows - 1) * rowGap;
  const width = padding * 2 + (maxDepth + 1) * nodeWidth + maxDepth * columnGap;
  const nodes = [];

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    const column = columns.get(depth);
    const columnHeight = column.length * nodeHeight + Math.max(0, column.length - 1) * rowGap;
    const yOffset = padding + (height - padding * 2 - columnHeight) / 2;
    const x = padding + (maxDepth - depth) * (nodeWidth + columnGap);
    column.forEach((row, index) => {
      nodes.push({
        row,
        nodeKey: row.nodeKey,
        x,
        y: yOffset + index * (nodeHeight + rowGap),
        width: nodeWidth,
        height: nodeHeight,
      });
    });
  }

  return { width, height, nodeWidth, nodeHeight, nodes };
}

function setupApp() {
  const form = document.querySelector("#line-form");
  const recipeSearch = document.querySelector("#recipe-search");
  const recipeSelect = document.querySelector("#recipe-select");
  const recipeFilterCount = document.querySelector("#recipe-filter-count");
  const recipeResults = document.querySelector("#recipe-results");
  const wikiRecipeCount = document.querySelector("#wiki-recipe-count");
  const newRecipe = document.querySelector("#new-recipe");
  const saveRecipe = document.querySelector("#save-recipe");
  const deleteRecipe = document.querySelector("#delete-recipe");
  const recipeMessage = document.querySelector("#recipe-message");
  const outputName = document.querySelector("#output-name");
  const recipeTime = document.querySelector("#recipe-time");
  const outputAmount = document.querySelector("#output-amount");
  const oilHydrogenMode = document.querySelector("#oil-hydrogen-mode");
  const machineSelect = document.querySelector("#machine-select");
  const machineSpeed = document.querySelector("#machine-speed");
  const proliferatorSelect = document.querySelector("#proliferator-select");
  const productivityMultiplier = document.querySelector("#productivity-multiplier");
  const speedMultiplier = document.querySelector("#speed-multiplier");
  const targetMode = document.querySelector("#target-mode");
  const outputBelt = document.querySelector("#output-belt");
  const outputBeltCount = document.querySelector("#output-belt-count");
  const stackSize = document.querySelector("#stack-size");
  const customTarget = document.querySelector("#custom-target");
  const outputsList = document.querySelector("#outputs-list");
  const outputTemplate = document.querySelector("#output-row-template");
  const inputsList = document.querySelector("#inputs-list");
  const inputTemplate = document.querySelector("#input-row-template");
  const metricGrid = document.querySelector("#metric-grid");
  const constraintTable = document.querySelector("#constraint-table");
  const chainNote = document.querySelector("#chain-note");
  const chainSummary = document.querySelector("#chain-summary");
  const chainFlowchart = document.querySelector("#chain-flowchart");
  const flowCompletionProgress = document.querySelector("#flow-completion-progress");
  const fitBadge = document.querySelector("#fit-badge");
  const addOutput = document.querySelector("#add-output");
  const addInput = document.querySelector("#add-input");
  const resetExample = document.querySelector("#reset-example");
  let userRecipes = loadUserRecipes();
  let flowCompletionByScope = loadFlowCompletionState();
  let currentRecipes = getEffectiveRecipes(userRecipes);
  let currentDisplayRecipe = null;
  const chainRecipeSelections = {};

  wikiRecipeCount.textContent = new Intl.NumberFormat("zh-CN").format(WIKI_RECIPE_SOURCE.recipeCount);

  const addOptions = (select, list, options = {}) => {
    select.replaceChildren(
      ...list.map((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        const tag = options.showRecipeSource && isUserRecipe(item) ? "（自定义）" : "";
        option.textContent = `${getRecipeLabel(item)}${tag}`;
        return option;
      }),
    );
  };

  const setRecipeMessage = (message = "") => {
    recipeMessage.textContent = message;
  };

  const updateRecipeResultSelection = (selectedId) => {
    for (const button of recipeResults.querySelectorAll(".recipe-result")) {
      const selected = button.dataset.recipeId === selectedId;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-current", selected ? "true" : "false");
    }
  };

  const renderRecipeResults = (recipes, selectedId) => {
    recipeResults.replaceChildren(
      ...recipes.map((recipe) => {
        const button = document.createElement("button");
        const title = document.createElement("strong");
        const meta = document.createElement("span");
        const formula = document.createElement("small");
        const ingredients = (recipe.ingredients ?? []).length
          ? recipe.ingredients.map((ingredient) => `${ingredient.name} × ${formatNumber(ingredient.amount)}`).join(" + ")
          : "直接获取";
        const outputs = getRecipeOutputs(recipe)
          .map((output) => `${output.name} × ${formatNumber(output.amount)}`)
          .join(" + ");

        button.type = "button";
        button.className = "recipe-result";
        button.dataset.recipeId = recipe.id;
        title.textContent = `${getRecipeLabel(recipe)}${isUserRecipe(recipe) ? "（自定义）" : ""}`;
        meta.textContent = `${recipe.facility || byId(MACHINES, recipe.machineId).name} · ${formatNumber(recipe.time)} 秒`;
        formula.textContent = `${ingredients} → ${outputs}`;
        button.replaceChildren(title, meta, formula);
        return button;
      }),
    );
    recipeResults.scrollTop = 0;
    updateRecipeResultSelection(selectedId);
  };

  const refreshRecipeOptions = (selectedId = recipeSelect.value) => {
    currentRecipes = getEffectiveRecipes(userRecipes);
    const query = normalizeName(recipeSearch.value).toLocaleLowerCase("zh-CN");
    const visibleRecipes = query
      ? currentRecipes
          .map((recipe, index) => {
            const recipeNames = [recipe.name, ...getRecipeOutputs(recipe).map((output) => output.name)]
              .filter(Boolean)
              .map((name) => normalizeName(name).toLocaleLowerCase("zh-CN"));
            const ingredientNames = (recipe.ingredients ?? [])
              .map((ingredient) => normalizeName(ingredient.name).toLocaleLowerCase("zh-CN"));
            const facility = normalizeName(recipe.facility).toLocaleLowerCase("zh-CN");
            let score = Number.POSITIVE_INFINITY;
            if (recipeNames.some((name) => name === query)) score = 0;
            else if (recipeNames.some((name) => name.startsWith(query))) score = 1;
            else if (recipeNames.some((name) => name.includes(query))) score = 2;
            else if (ingredientNames.some((name) => name === query)) score = 3;
            else if (ingredientNames.some((name) => name.includes(query))) score = 4;
            else if (facility.includes(query)) score = 5;
            return { recipe, index, score };
          })
          .filter((item) => Number.isFinite(item.score))
          .sort((a, b) => a.score - b.score || a.index - b.index)
          .map((item) => item.recipe)
      : currentRecipes;

    addOptions(recipeSelect, visibleRecipes, { showRecipeSource: true });
    const nextId = query
      ? visibleRecipes[0]?.id
      : visibleRecipes.some((recipe) => recipe.id === selectedId)
        ? selectedId
        : visibleRecipes[0]?.id;
    if (nextId) recipeSelect.value = nextId;
    recipeSelect.disabled = visibleRecipes.length === 0;
    renderRecipeResults(visibleRecipes, nextId);
    recipeFilterCount.textContent = query
      ? `匹配 ${visibleRecipes.length} 条，共 ${currentRecipes.length} 条可选配方`
      : `共 ${currentRecipes.length} 条可选配方`;
    return nextId;
  };

  const addIngredientRow = (ingredient = { name: "", amount: 1, belts: 1 }) => {
    const row = inputTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".ingredient-name").value = ingredient.name;
    row.querySelector(".ingredient-amount").value = ingredient.amount;
    row.querySelector(".ingredient-belts").value = ingredient.belts;
    inputsList.append(row);
  };

  const addOutputRow = (output = { name: "", amount: 1, belts: 1 }) => {
    const row = outputTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector(".extra-output-name").value = output.name;
    row.querySelector(".extra-output-amount").value = output.amount;
    row.querySelector(".extra-output-belts").value = output.belts ?? 1;
    outputsList.append(row);
  };

  const readExtraOutputs = () =>
    [...outputsList.querySelectorAll(".output-row")].map((row) => ({
      name: row.querySelector(".extra-output-name").value,
      amount: row.querySelector(".extra-output-amount").value,
      belts: row.querySelector(".extra-output-belts").value,
    }));

  const readIngredients = () =>
    [...inputsList.querySelectorAll(".input-row")].map((row) => ({
      name: row.querySelector(".ingredient-name").value,
      amount: row.querySelector(".ingredient-amount").value,
      belts: row.querySelector(".ingredient-belts").value,
    }));

  const setRecipe = (recipeId) => {
    const recipe = byId(currentRecipes, recipeId);
    const modeEnabled = hasOilHydrogenOutputs(recipe);
    oilHydrogenMode.disabled = !modeEnabled;
    if (!modeEnabled) {
      oilHydrogenMode.value = "keep";
    }
    currentDisplayRecipe = getOilHydrogenRecipeForMode(recipe, oilHydrogenMode.value);
    const primaryOutput = getPrimaryOutput(currentDisplayRecipe);
    outputName.value = primaryOutput.name;
    recipeTime.value = currentDisplayRecipe.time;
    outputAmount.value = primaryOutput.amount;
    machineSelect.value = currentDisplayRecipe.machineId;
    machineSpeed.value = currentDisplayRecipe.machineSpeed ?? byId(MACHINES, currentDisplayRecipe.machineId).speed;
    outputsList.replaceChildren();
    getSecondaryOutputs(currentDisplayRecipe).forEach(addOutputRow);
    inputsList.replaceChildren();
    currentDisplayRecipe.ingredients.forEach(addIngredientRow);
    deleteRecipe.disabled = !isUserRecipe(recipe);
    updateRecipeResultSelection(recipe.id);
    calculateAndRender();
  };

  const getConfig = () => {
    const belt = byId(BELTS, outputBelt.value);
    const proliferator = byId(PROLIFERATORS, proliferatorSelect.value);
    return {
      recipeId: recipeSelect.value,
      outputName: outputName.value,
      machineId: machineSelect.value,
      recipeTime: recipeTime.value,
      outputAmount: outputAmount.value,
      extraOutputs: readExtraOutputs(),
      processSteps: currentDisplayRecipe?.processSteps ?? [],
      modeNote: currentDisplayRecipe?.modeNote ?? "",
      machineSpeed: machineSpeed.value,
      productivityMultiplier: productivityMultiplier.value || proliferator.productivity,
      speedMultiplier: speedMultiplier.value || proliferator.speed,
      targetMode: targetMode.value,
      customTarget: customTarget.value,
      outputBeltSpeed: belt.speedPerSecond,
      outputBeltCount: outputBeltCount.value,
      stackSize: stackSize.value,
      ingredients: readIngredients(),
    };
  };

  const makeMetric = (label, value, detail = "") => {
    const metric = document.createElement("article");
    metric.className = "metric";
    metric.innerHTML = `<span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ""}`;
    return metric;
  };

  const makePill = (label, value) => {
    const pill = document.createElement("div");
    pill.className = "summary-pill";
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");
    labelElement.textContent = label;
    valueElement.textContent = value;
    pill.replaceChildren(labelElement, valueElement);
    return pill;
  };

  const getRecipeFromForm = (id) => {
    const output = normalizeName(outputName.value) || "未命名产物";
    return {
      id,
      name: output,
      outputName: output,
      outputAmount: positive(outputAmount.value),
      outputs: [
        { name: output, amount: positive(outputAmount.value) },
        ...readExtraOutputs()
          .map((extraOutput) => ({
            name: normalizeName(extraOutput.name) || "未命名副产物",
            amount: positive(extraOutput.amount),
            belts: positive(extraOutput.belts),
          }))
          .filter((extraOutput) => extraOutput.amount > 0),
      ],
      time: positive(recipeTime.value),
      machineId: machineSelect.value,
      machineSpeed: positive(machineSpeed.value, byId(MACHINES, machineSelect.value).speed),
      processSteps: currentDisplayRecipe?.processSteps ?? [],
      modeNote: currentDisplayRecipe?.modeNote ?? "",
      ingredients: readIngredients()
        .map((ingredient) => ({
          name: normalizeName(ingredient.name) || "未命名原料",
          amount: positive(ingredient.amount),
          belts: positive(ingredient.belts),
        }))
        .filter((ingredient) => ingredient.amount > 0),
    };
  };

  const persistUserRecipes = (recipes, selectedId = recipeSelect.value) => {
    userRecipes = recipes.map(cloneRecipe);
    saveUserRecipes(userRecipes);
    refreshRecipeOptions(selectedId);
  };

  const saveCurrentRecipe = () => {
    const output = normalizeName(outputName.value);
    if (!output) {
      setRecipeMessage("请先填写产物名称，再保存配方。");
      return;
    }

    const selectedUserRecipe = userRecipes.find((recipe) => recipe.id === recipeSelect.value);
    const sameOutputRecipe = userRecipes.find((recipe) => normalizeName(getPrimaryOutput(recipe).name) === output);
    const targetId = selectedUserRecipe?.id ?? sameOutputRecipe?.id ?? createUserRecipeId();
    const savedRecipe = getRecipeFromForm(targetId);
    const nextRecipes = userRecipes.filter(
      (recipe) => recipe.id !== targetId && normalizeName(getPrimaryOutput(recipe).name) !== normalizeName(getPrimaryOutput(savedRecipe).name),
    );

    nextRecipes.push(savedRecipe);
    persistUserRecipes(nextRecipes, savedRecipe.id);
    deleteRecipe.disabled = false;
    setRecipeMessage(`${getPrimaryOutput(savedRecipe).name} 已保存到配方库。链路计算会优先使用这条配方。`);
    calculateAndRender();
  };

  const startNewRecipe = () => {
    recipeSearch.value = "";
    refreshRecipeOptions("custom");
    recipeSelect.value = "custom";
    outputName.value = "新配方";
    recipeTime.value = 1;
    outputAmount.value = 1;
    oilHydrogenMode.value = "keep";
    oilHydrogenMode.disabled = true;
    machineSelect.value = "assembler-2";
    machineSpeed.value = byId(MACHINES, "assembler-2").speed;
    currentDisplayRecipe = null;
    outputsList.replaceChildren();
    inputsList.replaceChildren();
    addIngredientRow({ name: "原料 A", amount: 1, belts: 1 });
    deleteRecipe.disabled = true;
    setRecipeMessage("正在编辑一条未保存的新配方。填好后点“保存到配方库”。");
    calculateAndRender();
  };

  const deleteSelectedRecipe = () => {
    const selectedRecipe = currentRecipes.find((recipe) => recipe.id === recipeSelect.value);
    if (!selectedRecipe || !isUserRecipe(selectedRecipe)) {
      setRecipeMessage("只能删除你保存的自定义配方；内置配方不会被删除。");
      return;
    }

    const output = normalizeName(getPrimaryOutput(selectedRecipe).name);
    const nextRecipes = userRecipes.filter((recipe) => recipe.id !== selectedRecipe.id);
    userRecipes = nextRecipes.map(cloneRecipe);
    saveUserRecipes(userRecipes);
    currentRecipes = getEffectiveRecipes(userRecipes);

    const fallbackRecipe = currentRecipes.find((recipe) => normalizeName(getPrimaryOutput(recipe).name) === output) ?? byId(currentRecipes, "custom");
    refreshRecipeOptions(fallbackRecipe.id);
    setRecipe(fallbackRecipe.id);
    setRecipeMessage(`${getPrimaryOutput(selectedRecipe).name} 的自定义配方已删除。`);
  };

  const updateRecipeMachine = (sourceRecipeId, machineId) => {
    const sourceRecipe = currentRecipes.find((recipe) => recipe.id === sourceRecipeId);
    if (!sourceRecipe || sourceRecipe.id === "custom") return;

    const output = normalizeName(getPrimaryOutput(sourceRecipe).name);
    const existingOverride =
      userRecipes.find((recipe) => recipe.id === sourceRecipeId) ??
      userRecipes.find((recipe) => normalizeName(getPrimaryOutput(recipe).name) === output);
    const updatedRecipe = cloneRecipe(existingOverride ?? sourceRecipe);
    updatedRecipe.id = existingOverride?.id ?? createUserRecipeId();
    updatedRecipe.machineId = machineId;
    delete updatedRecipe.machineSpeed;

    const nextRecipes = userRecipes.filter(
      (recipe) => recipe.id !== updatedRecipe.id && normalizeName(getPrimaryOutput(recipe).name) !== output,
    );
    nextRecipes.push(updatedRecipe);
    persistUserRecipes(nextRecipes, recipeSelect.value);
    setRecipeMessage(`${getPrimaryOutput(updatedRecipe).name} 的设备已改为 ${byId(MACHINES, machineId).name}。`);
    calculateAndRender();
  };

  const renderProductionChain = (config, result) => {
    const chain = calculateProductionChain(
      { ...config, chainTargetPerMinute: result.targetPerMinute },
      { recipes: currentRecipes, recipeSelections: chainRecipeSelections },
    );
    const machineSummary = chain.machineTotals.length
      ? chain.machineTotals
          .map((item) => `${item.machineName} ${formatNumber(item.machines, 0)} 台（精确 ${formatExact(item.machinesRaw)}）`)
          .join("，")
      : "无";
    const rawSummary = chain.rawRows.length
      ? chain.rawRows
          .map((item) => `${item.name} ${formatNumber(item.requiredPerMinute)} /分钟`)
          .join("，")
      : "无外部输入";
    const byproductSummary = chain.byproductRows.length
      ? chain.byproductRows
          .map((item) => `${item.name} ${formatNumber(item.requiredPerMinute)} /分钟`)
          .join("，")
      : "无";

    chainNote.textContent = `按当前目标 ${formatNumber(chain.targetPerMinute)} ${config.outputName || "产物"}/分钟递归展开，箭头从上游资源指向目标产物。${config.modeNote ? `${config.modeNote} ` : ""}副产物会汇总展示，但暂不自动抵扣其他分支需求。`;
    chainSummary.replaceChildren(
      makePill("设备汇总", machineSummary),
      makePill("原始/外部输入", rawSummary),
      makePill("副产物/盈余", byproductSummary),
    );
    const maxDepth = Math.max(0, ...chain.rows.map((row) => row.depth));
    const availableWidth = chainFlowchart.parentElement.clientWidth || 640;
    const compactGap = 28;
    const compactPadding = 16;
    const fittingNodeWidth = Math.floor(
      (availableWidth - compactPadding * 2 - maxDepth * compactGap) / (maxDepth + 1),
    );
    const fitsWithoutScrolling = fittingNodeWidth >= 168;
    const layout = layoutProductionFlow(chain.rows, chain.edges, {
      nodeWidth: fitsWithoutScrolling ? Math.min(224, fittingNodeWidth) : 168,
      columnGap: fitsWithoutScrolling ? compactGap : 72,
      padding: compactPadding,
    });
    const completionScope = `${config.recipeId || "custom"}::${normalizeName(config.outputName) || "目标产物"}`;
    const completedNodeKeys = new Set(flowCompletionByScope[completionScope] ?? []);
    const positionByKey = new Map(layout.nodes.map((node) => [node.nodeKey, node]));
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    const definitions = document.createElementNS(svgNamespace, "defs");
    const marker = document.createElementNS(svgNamespace, "marker");
    const arrow = document.createElementNS(svgNamespace, "path");
    const edgeGroup = document.createElementNS(svgNamespace, "g");
    const labelGroup = document.createElementNS(svgNamespace, "g");
    const nodesLayer = document.createElement("div");

    chainFlowchart.style.width = `${layout.width}px`;
    chainFlowchart.style.height = `${layout.height}px`;
    chainFlowchart.dataset.completionScope = completionScope;
    svg.classList.add("chain-flow-edges");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    svg.setAttribute("viewBox", `0 0 ${layout.width} ${layout.height}`);
    svg.setAttribute("aria-hidden", "true");
    marker.id = "chain-flow-arrow";
    marker.setAttribute("viewBox", "0 0 10 10");
    marker.setAttribute("refX", "9");
    marker.setAttribute("refY", "5");
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("orient", "auto-start-reverse");
    arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
    marker.append(arrow);
    definitions.append(marker);

    for (const edge of chain.edges) {
      const source = positionByKey.get(edge.from);
      const target = positionByKey.get(edge.to);
      if (!source || !target) continue;
      const x1 = source.x + source.width;
      const y1 = source.y + source.height / 2;
      const x2 = target.x;
      const y2 = target.y + target.height / 2;
      const midpoint = (x1 + x2) / 2;
      const path = document.createElementNS(svgNamespace, "path");
      const title = document.createElementNS(svgNamespace, "title");
      path.classList.add("flow-edge");
      path.setAttribute("d", `M ${x1} ${y1} C ${midpoint} ${y1}, ${midpoint} ${y2}, ${x2} ${y2}`);
      path.setAttribute("marker-end", "url(#chain-flow-arrow)");
      title.textContent = `${edge.itemName} ${formatNumber(edge.requiredPerMinute)} /分钟`;
      path.append(title);
      edgeGroup.append(path);

      if (chain.edges.length <= 16 && !fitsWithoutScrolling) {
        const label = document.createElementNS(svgNamespace, "text");
        label.classList.add("flow-edge-label");
        label.setAttribute("x", String(midpoint));
        label.setAttribute("y", String((y1 + y2) / 2 - 7));
        label.setAttribute("text-anchor", "middle");
        label.textContent = `${formatNumber(edge.requiredPerMinute)} /分`;
        labelGroup.append(label);
      }
    }

    svg.append(definitions, edgeGroup, labelGroup);
    nodesLayer.className = "chain-flow-nodes";

    for (const node of layout.nodes) {
      const row = node.row;
      const element = document.createElement("article");
      const toggle = document.createElement("button");
      const header = document.createElement("header");
      const name = document.createElement("strong");
      const tag = document.createElement("span");
      const rate = document.createElement("div");
      const machineLine = document.createElement("div");
      const detail = document.createElement("small");
      const byproductText = row.byproducts?.length
        ? `副产物：${row.byproducts
            .map((byproduct) => `${byproduct.name} ${formatNumber(byproduct.requiredPerMinute)} /分`)
            .join("，")}`
        : "";
      const stepText = row.stepMachines?.length > 1
        ? row.stepMachines
            .map((step) => `${step.name} ${formatNumber(step.machines, 0)} 台（精确 ${formatExact(step.machinesRaw)}）`)
            .join("，")
        : "";
      const typeLabel = row.kind === "raw" ? "外部输入" : row.isRoot ? "目标" : "生产";
      const isCompleted = completedNodeKeys.has(row.nodeKey);

      element.className = `flow-node ${row.kind === "raw" ? "raw" : row.isRoot ? "target" : "crafted"}`;
      element.classList.toggle("completed", isCompleted);
      element.style.left = `${node.x}px`;
      element.style.top = `${node.y}px`;
      element.style.width = `${node.width}px`;
      element.style.height = `${node.height}px`;
      toggle.type = "button";
      toggle.className = "flow-node-toggle";
      toggle.dataset.nodeKey = row.nodeKey;
      toggle.dataset.completionScope = completionScope;
      toggle.dataset.nodeName = row.name;
      toggle.setAttribute("aria-pressed", String(isCompleted));
      toggle.setAttribute("aria-label", `${isCompleted ? "取消" : "标记"}${row.name}的完成状态`);
      toggle.title = isCompleted ? `取消完成：${row.name}` : `标记完成：${row.name}`;
      name.textContent = row.name;
      tag.dataset.typeLabel = typeLabel;
      tag.textContent = `${isCompleted ? "✓ " : ""}${typeLabel}`;
      header.replaceChildren(name, tag);
      rate.className = "flow-node-rate";
      rate.textContent = `${formatNumber(row.requiredPerMinute)} /分钟`;
      machineLine.className = "flow-node-machine";

      if (row.kind === "raw") {
        machineLine.textContent = row.reason;
        detail.textContent = "作为上游资源输入";
      } else if (!row.isRoot) {
        const controls = [];
        if (row.recipeChoices?.length > 1) {
          const recipeSelectElement = document.createElement("select");
          recipeSelectElement.className = "chain-recipe-select";
          recipeSelectElement.dataset.outputName = row.name;
          recipeSelectElement.setAttribute("aria-label", `选择 ${row.name} 的生产配方`);
          recipeSelectElement.replaceChildren(
            ...row.recipeChoices.map((recipe) => {
              const option = document.createElement("option");
              option.value = recipe.id;
              option.textContent = recipe.name;
              return option;
            }),
          );
          recipeSelectElement.value = row.recipeId;
          controls.push(recipeSelectElement);
        }
        const machineSelectElement = document.createElement("select");
        machineSelectElement.className = "chain-machine-select";
        machineSelectElement.dataset.recipeId = row.sourceRecipeId;
        machineSelectElement.setAttribute("aria-label", `修改 ${row.name} 的制造设备`);
        machineSelectElement.replaceChildren(
          ...MACHINES.map((machine) => {
            const option = document.createElement("option");
            option.value = machine.id;
            option.textContent = machine.name;
            return option;
          }),
        );
        machineSelectElement.value = row.machineId;
        controls.push(machineSelectElement);
        machineLine.replaceChildren(...controls);
        detail.textContent = `取整 ${formatNumber(row.machines, 0)} 台 · 精确 ${formatExact(row.machinesRaw)} 台${stepText ? ` · ${stepText}` : ` · 单机 ${formatNumber(row.outputPerMachine)} /分`}`;
      } else {
        machineLine.textContent = row.machineName;
        detail.textContent = `取整 ${formatNumber(row.machines, 0)} 台 · 精确 ${formatExact(row.machinesRaw)} 台${stepText ? ` · ${stepText}` : ` · 单机 ${formatNumber(row.outputPerMachine)} /分`}`;
      }

      if (byproductText) detail.textContent += ` · ${byproductText}`;
      element.replaceChildren(toggle, header, rate, machineLine, detail);
      nodesLayer.append(element);
    }

    chainFlowchart.replaceChildren(svg, nodesLayer);
    flowCompletionProgress.textContent = `已完成 ${completedNodeKeys.size}/${layout.nodes.length}`;
    chainFlowchart.parentElement.scrollLeft = 0;
    chainFlowchart.parentElement.scrollTop = 0;
  };

  const calculateAndRender = () => {
    const config = getConfig();
    const result = calculateLine(config);
    const outputLabel = outputName.value || "产物";

    customTarget.disabled = targetMode.value !== "custom";
    if (targetMode.value === "belt") {
      customTarget.value = formatNumber(result.targetPerMinute, 2).replace(/,/g, "");
    }

    const stepDetail = result.stepMachines?.length > 1
      ? `；步骤 ${result.stepMachines
          .map((step) => `${step.name} ${formatNumber(Math.ceil(step.machinesRaw - EPSILON), 0)} 台（精确 ${formatExact(step.machinesRaw)}）`)
          .join("，")}`
      : "";
    const targetDetail = `目标 ${formatNumber(result.targetPerMinute)} ${outputLabel}/分钟，最后一台利用率 ${formatNumber(result.targetUtilization * 100, 1)}%${stepDetail}`;
    const lineDetail =
      result.lineMachineLimit > 0
        ? `预计产出 ${formatNumber(result.lineOutputPerMinute)} ${outputLabel}/分钟`
        : "单台设备流量已超过当前传送带能力";
    const splitDetail = result.fitsSingleLine
      ? "当前单线设置可以达到目标"
      : `建议拆成 ${formatNumber(result.lineCountForTarget, 0)} 条线，或提高带速/堆叠/输入带数`;

    metricGrid.replaceChildren(
      makeMetric("单机产出", `${formatNumber(result.outputPerMachine)} /分钟`, `配方循环 ${formatNumber(result.cyclesPerMinute)} 次/分钟`),
      makeMetric("目标设备", `${formatNumber(result.machinesForTarget, 0)} 台`, `精确需求 ${formatExact(result.machinesForTargetRaw)} 台；${targetDetail}`),
      makeMetric("单线满带上限", `${formatNumber(result.lineMachineLimit, 0)} 台`, lineDetail),
      makeMetric("单线可行性", result.fitsSingleLine ? "可达" : "不足", splitDetail),
    );

    const bottleneckIds = new Set(result.bottlenecks.map((constraint) => constraint.id));
    constraintTable.replaceChildren(
      ...result.constraints.map((constraint) => {
        const row = document.createElement("div");
        row.className = `constraint-row${bottleneckIds.has(constraint.id) ? " bottleneck" : ""}`;
        row.innerHTML = `
          <strong>${constraint.name}${bottleneckIds.has(constraint.id) ? "（瓶颈）" : ""}</strong>
          <span>${formatNumber(constraint.capacityPerMinute)} /分钟<small>${constraint.source}</small></span>
          <span>${formatNumber(constraint.machineLimit, 0)} 台<small>单机 ${formatNumber(constraint.flowPerMachine)} /分钟</small></span>
        `;
        return row;
      }),
    );

    renderProductionChain(config, result);

    fitBadge.textContent = result.fitsSingleLine ? "单线可达" : "需要扩线";
    fitBadge.className = `status-badge ${result.fitsSingleLine ? "ok" : "warn"}`;
  };

  refreshRecipeOptions("titanium-alloy");
  addOptions(machineSelect, MACHINES);
  addOptions(proliferatorSelect, PROLIFERATORS);
  addOptions(oilHydrogenMode, OIL_HYDROGEN_MODES);
  addOptions(outputBelt, BELTS);

  proliferatorSelect.value = "none";
  oilHydrogenMode.value = "keep";
  productivityMultiplier.value = 1;
  speedMultiplier.value = 1;
  outputBelt.value = "belt-3";
  outputBeltCount.value = 1;
  stackSize.value = 4;
  targetMode.value = "belt";

  recipeSelect.addEventListener("change", () => {
    setRecipeMessage("");
    oilHydrogenMode.value = "keep";
    setRecipe(recipeSelect.value);
  });
  recipeResults.addEventListener("click", (event) => {
    const button = event.target.closest(".recipe-result");
    if (!button) return;
    const selectedRecipe = currentRecipes.find((recipe) => recipe.id === button.dataset.recipeId);
    if (!selectedRecipe) return;
    recipeSelect.value = selectedRecipe.id;
    oilHydrogenMode.value = "keep";
    setRecipe(selectedRecipe.id);
    setRecipeMessage(`已加载「${getRecipeLabel(selectedRecipe)}」。`);
  });
  recipeSearch.addEventListener("input", () => {
    const selectedId = refreshRecipeOptions(recipeSelect.value);
    if (!selectedId) {
      setRecipeMessage("没有匹配的配方，请换一个关键词。");
      return;
    }
    const selectedRecipe = currentRecipes.find((recipe) => recipe.id === selectedId);
    setRecipeMessage(`按 Enter 加载「${getRecipeLabel(selectedRecipe)}」，也可以直接点击下方任意配方。`);
  });
  recipeSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const selectedRecipe = currentRecipes.find((recipe) => recipe.id === recipeSelect.value);
    if (!selectedRecipe || recipeSelect.disabled) {
      setRecipeMessage("没有可加载的配方，请换一个关键词。");
      return;
    }
    oilHydrogenMode.value = "keep";
    setRecipe(selectedRecipe.id);
    setRecipeMessage(`已加载「${getRecipeLabel(selectedRecipe)}」。`);
  });
  oilHydrogenMode.addEventListener("change", () => {
    setRecipeMessage("");
    setRecipe(recipeSelect.value);
  });
  newRecipe.addEventListener("click", startNewRecipe);
  saveRecipe.addEventListener("click", saveCurrentRecipe);
  deleteRecipe.addEventListener("click", deleteSelectedRecipe);
  machineSelect.addEventListener("change", () => {
    machineSpeed.value = byId(MACHINES, machineSelect.value).speed;
    calculateAndRender();
  });
  proliferatorSelect.addEventListener("change", () => {
    const proliferator = byId(PROLIFERATORS, proliferatorSelect.value);
    productivityMultiplier.value = proliferator.productivity;
    speedMultiplier.value = proliferator.speed;
    calculateAndRender();
  });
  addInput.addEventListener("click", () => {
    addIngredientRow({ name: "新原料", amount: 1, belts: 1 });
    calculateAndRender();
  });
  addOutput.addEventListener("click", () => {
    addOutputRow({ name: "副产物", amount: 1, belts: 1 });
    calculateAndRender();
  });
  resetExample.addEventListener("click", () => {
    recipeSearch.value = "";
    refreshRecipeOptions("titanium-alloy");
    const titaniumRecipe = currentRecipes.find((recipe) => normalizeName(getPrimaryOutput(recipe).name) === "钛合金") ?? byId(currentRecipes, "titanium-alloy");
    recipeSelect.value = titaniumRecipe.id;
    proliferatorSelect.value = "none";
    oilHydrogenMode.value = "keep";
    productivityMultiplier.value = 1;
    speedMultiplier.value = 1;
    outputBelt.value = "belt-3";
    outputBeltCount.value = 1;
    stackSize.value = 4;
    targetMode.value = "belt";
    setRecipe(titaniumRecipe.id);
  });
  chainFlowchart.addEventListener("change", (event) => {
    if (event.target.matches(".chain-recipe-select")) {
      chainRecipeSelections[event.target.dataset.outputName] = event.target.value;
      calculateAndRender();
      return;
    }
    if (event.target.matches(".chain-machine-select")) {
      updateRecipeMachine(event.target.dataset.recipeId, event.target.value);
    }
  });
  chainFlowchart.addEventListener("click", (event) => {
    const toggle = event.target.closest(".flow-node-toggle");
    if (!toggle) return;

    const element = toggle.closest(".flow-node");
    const tag = element.querySelector("header span");
    const scope = toggle.dataset.completionScope;
    const nodeKey = toggle.dataset.nodeKey;
    const completedNodeKeys = new Set(flowCompletionByScope[scope] ?? []);
    const isCompleted = !completedNodeKeys.has(nodeKey);

    if (isCompleted) completedNodeKeys.add(nodeKey);
    else completedNodeKeys.delete(nodeKey);

    if (completedNodeKeys.size) flowCompletionByScope[scope] = [...completedNodeKeys];
    else delete flowCompletionByScope[scope];
    saveFlowCompletionState(flowCompletionByScope);

    element.classList.toggle("completed", isCompleted);
    toggle.setAttribute("aria-pressed", String(isCompleted));
    toggle.setAttribute("aria-label", `${isCompleted ? "取消" : "标记"}${toggle.dataset.nodeName}的完成状态`);
    toggle.title = isCompleted ? `取消完成：${toggle.dataset.nodeName}` : `标记完成：${toggle.dataset.nodeName}`;
    tag.textContent = `${isCompleted ? "✓ " : ""}${tag.dataset.typeLabel}`;
    flowCompletionProgress.textContent = `已完成 ${completedNodeKeys.size}/${chainFlowchart.querySelectorAll(".flow-node").length}`;
  });
  inputsList.addEventListener("click", (event) => {
    if (!event.target.matches(".remove-button")) return;
    event.target.closest(".input-row").remove();
    if (!inputsList.children.length) {
      addIngredientRow({ name: "原料 A", amount: 1, belts: 1 });
    }
    calculateAndRender();
  });
  outputsList.addEventListener("click", (event) => {
    if (!event.target.matches(".remove-button")) return;
    event.target.closest(".output-row").remove();
    calculateAndRender();
  });
  form.addEventListener("input", (event) => {
    if (event.target === recipeSearch) return;
    calculateAndRender();
  });
  form.addEventListener("change", calculateAndRender);

  setRecipe(recipeSelect.value || "titanium-alloy");
}

if (typeof document !== "undefined") {
  setupApp();
}
