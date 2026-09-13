import assert from "node:assert/strict";
import {
  RECIPES,
  calculateLine,
  calculateProductionChain,
  getEffectiveRecipes,
  getOilHydrogenRecipeForMode,
  layoutProductionFlow,
} from "../app.js";
import { WIKI_RECIPES, WIKI_RECIPE_SOURCE } from "../wiki-recipes.js";

{
  assert.equal(WIKI_RECIPES.length, WIKI_RECIPE_SOURCE.recipeCount);
  assert.ok(WIKI_RECIPES.length >= 184);
  assert.equal(new Set(WIKI_RECIPES.map((recipe) => recipe.id)).size, WIKI_RECIPES.length);
  for (const outputName of ["钛合金", "宇宙矩阵", "奇异湮灭燃料棒", "重组式制造台", "引力导弹组"]) {
    assert.ok(WIKI_RECIPES.some((recipe) => recipe.outputs.some((output) => output.name === outputName)));
  }
}

const baseTitaniumAlloy = {
  outputName: "钛合金",
  recipeTime: 12,
  outputAmount: 4,
  machineSpeed: 1,
  productivityMultiplier: 1,
  speedMultiplier: 1,
  targetMode: "belt",
  customTarget: 0,
  outputBeltSpeed: 30,
  outputBeltCount: 1,
  stackSize: 4,
  ingredients: [
    { name: "钛块", amount: 4, belts: 1 },
    { name: "钢材", amount: 4, belts: 1 },
    { name: "硫酸", amount: 8, belts: 1 },
  ],
};

{
  for (const recipe of WIKI_RECIPES) {
    const primaryOutput = recipe.outputs[0];
    const config = {
      recipeId: recipe.id,
      outputName: primaryOutput.name,
      machineId: recipe.machineId,
      recipeTime: recipe.time,
      outputAmount: primaryOutput.amount,
      extraOutputs: recipe.outputs.slice(1),
      machineSpeed: 1,
      productivityMultiplier: 1,
      speedMultiplier: 1,
      targetMode: "custom",
      customTarget: 60,
      outputBeltSpeed: 30,
      outputBeltCount: 1,
      stackSize: 4,
      ingredients: recipe.ingredients,
    };
    const line = calculateLine(config);
    const chain = calculateProductionChain(config);
    const flow = layoutProductionFlow(chain.rows, chain.edges);

    assert.ok(Number.isFinite(line.outputPerMachine) && line.outputPerMachine > 0, recipe.id);
    assert.ok(Number.isFinite(line.machinesForTarget) && line.machinesForTarget > 0, recipe.id);
    assert.ok(line.constraints.length >= 1, recipe.id);
    assert.ok(chain.rows.length >= 1, recipe.id);
    assert.ok(chain.rows.every((row) => Number.isFinite(row.requiredPerMinute)), recipe.id);
    assert.equal(flow.nodes.length, chain.rows.length, recipe.id);
    assert.ok(flow.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y)), recipe.id);
    assert.ok(chain.edges.every((edge) => chain.rows.some((row) => row.nodeKey === edge.from)), recipe.id);
    assert.ok(chain.edges.every((edge) => chain.rows.some((row) => row.nodeKey === edge.to)), recipe.id);
    if (recipe.ingredients.length) assert.ok(chain.edges.length >= 1, recipe.id);
  }
}

{
  const result = calculateLine(baseTitaniumAlloy);
  assert.equal(result.outputPerMachine, 20);
  assert.equal(result.targetPerMinute, 7200);
  assert.equal(result.machinesForTarget, 360);
  assert.equal(result.lineMachineLimit, 180);
  assert.equal(result.fitsSingleLine, false);
  assert.equal(result.lineCountForTarget, 2);
}

{
  const result = calculateLine({
    ...baseTitaniumAlloy,
    targetMode: "custom",
    customTarget: 1800,
  });
  assert.equal(result.machinesForTarget, 90);
  assert.equal(result.fitsSingleLine, true);
}

{
  const result = calculateLine({
    ...baseTitaniumAlloy,
    productivityMultiplier: 1.25,
    speedMultiplier: 1,
  });
  assert.equal(result.outputPerMachine, 25);
  assert.equal(result.constraints[1].flowPerMachine, 20);
}

{
  const chain = calculateProductionChain({
    outputName: "电路板",
    machineId: "assembler-2",
    recipeTime: 1,
    outputAmount: 2,
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 120,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: [
      { name: "铁块", amount: 2, belts: 1 },
      { name: "铜块", amount: 1, belts: 1 },
    ],
  });
  const craftedByName = new Map(chain.craftedRows.map((row) => [row.name, row]));
  const rawByName = new Map(chain.rawRows.map((row) => [row.name, row]));
  const machineTotals = new Map(chain.machineTotals.map((row) => [row.machineName, row.machines]));

  assert.equal(craftedByName.get("电路板").machines, 1);
  assert.equal(craftedByName.get("铁块").machines, 2);
  assert.equal(craftedByName.get("铜块").machines, 1);
  assert.equal(rawByName.get("铁矿").requiredPerMinute, 120);
  assert.equal(rawByName.get("铜矿").requiredPerMinute, 60);
  assert.equal(machineTotals.get("制造台 Mk.II（1x）"), 1);
  assert.equal(machineTotals.get("电弧熔炉（1x）"), 3);
}

{
  const chain = calculateProductionChain(
    {
      outputName: "测试材料",
      machineId: "assembler-2",
      recipeTime: 1,
      outputAmount: 1,
      machineSpeed: 1,
      productivityMultiplier: 1,
      speedMultiplier: 1,
      targetMode: "custom",
      customTarget: 45,
      outputBeltSpeed: 30,
      outputBeltCount: 1,
      stackSize: 4,
      ingredients: [{ name: "晶格硅", amount: 1, belts: 1 }],
    },
    { recipeSelections: { 晶格硅: "wiki-063" } },
  );
  const latticeSilicon = chain.craftedRows.find((row) => row.name === "晶格硅");
  const craftedByName = new Map(chain.craftedRows.map((row) => [row.name, row]));
  const rawByName = new Map(chain.rawRows.map((row) => [row.name, row]));

  assert.equal(latticeSilicon.recipeId, "wiki-063");
  assert.ok(latticeSilicon.recipeChoices.length >= 2);
  assert.ok(craftedByName.has("高纯硅块"));
  assert.ok(craftedByName.has("硅石"));
  assert.ok(rawByName.has("石矿"));
  assert.ok(!rawByName.has("分形硅石"));
  assert.equal(latticeSilicon.machinesRaw, 1.5);
  assert.equal(latticeSilicon.machines, 2);
  assert.equal(chain.machineTotals.find((row) => row.machineName === "制造台 Mk.II（1x）").machinesRaw, 0.75);
}

{
  const recipes = getEffectiveRecipes([
    {
      id: "user-iron-plane",
      name: "铁块",
      outputName: "铁块",
      time: 1,
      outputAmount: 1,
      machineId: "smelter-plane",
      ingredients: [{ name: "铁矿", amount: 1, belts: 1 }],
    },
  ]);
  const chain = calculateProductionChain(
    {
      outputName: "电路板",
      machineId: "assembler-2",
      recipeTime: 1,
      outputAmount: 2,
      machineSpeed: 1,
      productivityMultiplier: 1,
      speedMultiplier: 1,
      targetMode: "custom",
      customTarget: 120,
      outputBeltSpeed: 30,
      outputBeltCount: 1,
      stackSize: 4,
      ingredients: [
        { name: "铁块", amount: 2, belts: 1 },
        { name: "铜块", amount: 1, belts: 1 },
      ],
    },
    { recipes },
  );
  const craftedByName = new Map(chain.craftedRows.map((row) => [row.name, row]));
  const machineTotals = new Map(chain.machineTotals.map((row) => [row.machineName, row.machines]));

  assert.equal(craftedByName.get("铁块").machineName, "位面熔炉（2x）");
  assert.equal(craftedByName.get("铁块").machines, 1);
  assert.equal(machineTotals.get("位面熔炉（2x）"), 1);
  assert.equal(machineTotals.get("电弧熔炉（1x）"), 1);
}

{
  const recipes = getEffectiveRecipes([
    {
      id: "user-refined-oil",
      name: "我的精炼油",
      outputName: "精炼油",
      time: 1,
      outputAmount: 1,
      machineId: "assembler-2",
      ingredients: [{ name: "原油", amount: 1, belts: 1 }],
    },
  ]);

  assert.ok(recipes.some((recipe) => recipe.id === "plasma-refining"));
  assert.ok(recipes.some((recipe) => recipe.id === "user-refined-oil"));
  assert.ok(recipes.some((recipe) => recipe.id === "custom"));
}

{
  const chain = calculateProductionChain({
    outputName: "精炼油",
    machineId: "refinery",
    recipeTime: 4,
    outputAmount: 2,
    extraOutputs: [{ name: "氢", amount: 1, belts: 1 }],
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 120,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: [{ name: "原油", amount: 2, belts: 1 }],
  });
  const craftedByName = new Map(chain.craftedRows.map((row) => [row.name, row]));
  const byproductByName = new Map(chain.byproductRows.map((row) => [row.name, row]));

  assert.equal(craftedByName.get("精炼油").machines, 4);
  assert.equal(byproductByName.get("氢").requiredPerMinute, 60);
}

{
  const chain = calculateProductionChain({
    outputName: "测试燃料",
    machineId: "assembler-2",
    recipeTime: 1,
    outputAmount: 1,
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 60,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: [{ name: "氢", amount: 1, belts: 1 }],
  });
  const craftedByName = new Map(chain.craftedRows.map((row) => [row.name, row]));
  const byproductByName = new Map(chain.byproductRows.map((row) => [row.name, row]));

  assert.equal(craftedByName.get("氢").machineName, "原油精炼厂（1x）");
  assert.equal(craftedByName.get("氢").machines, 4);
  assert.equal(byproductByName.get("精炼油").requiredPerMinute, 120);
}

{
  const plasma = RECIPES.find((recipe) => recipe.id === "plasma-refining");
  const oilOnly = getOilHydrogenRecipeForMode(plasma, "oil-only");
  const result = calculateLine({
    recipeId: oilOnly.id,
    outputName: oilOnly.outputName,
    machineId: oilOnly.machineId,
    recipeTime: oilOnly.time,
    outputAmount: oilOnly.outputAmount,
    extraOutputs: oilOnly.outputs.slice(1),
    processSteps: oilOnly.processSteps,
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 120,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: oilOnly.ingredients,
  });
  assert.equal(result.machinesForTarget, 6);
  assert.deepEqual(
    result.stepMachines.map((step) => [step.name, Math.ceil(step.machinesRaw - 1e-9)]),
    [
      ["等离子精炼", 3],
      ["重整精炼", 3],
    ],
  );
}

{
  const plasma = RECIPES.find((recipe) => recipe.id === "plasma-refining");
  const hydrogenOnly = getOilHydrogenRecipeForMode(plasma, "hydrogen-only");
  const result = calculateLine({
    recipeId: hydrogenOnly.id,
    outputName: hydrogenOnly.outputName,
    machineId: hydrogenOnly.machineId,
    recipeTime: hydrogenOnly.time,
    outputAmount: hydrogenOnly.outputAmount,
    extraOutputs: hydrogenOnly.outputs.slice(1),
    processSteps: hydrogenOnly.processSteps,
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 120,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: hydrogenOnly.ingredients,
  });
  const chain = calculateProductionChain({
    recipeId: hydrogenOnly.id,
    outputName: hydrogenOnly.outputName,
    machineId: hydrogenOnly.machineId,
    recipeTime: hydrogenOnly.time,
    outputAmount: hydrogenOnly.outputAmount,
    extraOutputs: hydrogenOnly.outputs.slice(1),
    processSteps: hydrogenOnly.processSteps,
    machineSpeed: 1,
    productivityMultiplier: 1,
    speedMultiplier: 1,
    targetMode: "custom",
    customTarget: 120,
    outputBeltSpeed: 30,
    outputBeltCount: 1,
    stackSize: 4,
    ingredients: hydrogenOnly.ingredients,
  });
  const hydrogenRow = chain.craftedRows.find((row) => row.name === "氢");
  const byproductByName = new Map(chain.byproductRows.map((row) => [row.name, row]));

  assert.equal(result.machinesForTarget, 9);
  assert.deepEqual(
    result.stepMachines.map((step) => [step.name, Math.ceil(step.machinesRaw - 1e-9)]),
    [
      ["等离子精炼", 3],
      ["X射线裂解", 6],
    ],
  );
  assert.equal(hydrogenRow.machines, 9);
  assert.equal(byproductByName.get("高能石墨").requiredPerMinute, 80);
}

console.log("calc.test.mjs passed");
