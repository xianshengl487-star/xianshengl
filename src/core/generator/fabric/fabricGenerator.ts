import fs from 'node:fs/promises';
import path from 'node:path';
import type { BlockElement, EnchantmentElement, EnchantmentSlot, FunctionElement, ItemElement, LootTableElement, MobEffectElement, PotionElement, PotionEffectSpec, RecipeElement, StructureElement, ToolElement } from '../../../shared/types/elements';
import type { BlockForgeIR } from '../../../shared/types/logic';
import type { ProjectModel } from '../../../shared/types/project';
import { copyResourcesToGenerated } from '../../resources/resourceService';
import { structureFunctionCommands } from '../structureFunctionGenerator';

type ItemLikeElement = ItemElement | ToolElement;

function javaPackagePath(pkg: string): string { return pkg.replace(/\./g, '/'); }
function className(id: string): string { return id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(''); }
function constantName(id: string): string { return id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase(); }
function resourceId(modId: string, id: string): string { return id.includes(':') ? id : `${modId}:${id}`; }
function tagId(modId: string, id: string): string { return resourceId(modId, id.replace(/^#/, '')); }
function ingredientJson(modId: string, id: string): { item: string } | { tag: string } {
  return id.trim().startsWith('#') ? { tag: tagId(modId, id.trim()) } : { item: resourceId(modId, id.trim()) };
}
function lootEntryJson(modId: string, id: string): { type: string; name: string; expand?: boolean } {
  return id.trim().startsWith('#')
    ? { type: 'minecraft:tag', name: tagId(modId, id.trim()), expand: true }
    : { type: 'minecraft:item', name: resourceId(modId, id.trim()) };
}
async function write(file: string, content: string) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content, 'utf8'); }
async function writeJson(file: string, value: unknown) { await write(file, `${JSON.stringify(value, null, 2)}\n`); }

function numberOr(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function intOr(value: unknown, fallback: number): number {
  return Math.round(numberOr(value, fallback));
}

function compatibilityEntries(project: ProjectModel) {
  return Array.isArray(project.compatibility?.externalMods) ? project.compatibility.externalMods.filter(entry => entry.modId) : [];
}

function fabricDependencyLine(entry: { dependencyType: string; gradleCoordinate: string }): string {
  if (!entry.gradleCoordinate) return '';
  if (entry.dependencyType === 'runtimeOnly') return `    runtimeOnly "${entry.gradleCoordinate}"`;
  if (entry.dependencyType === 'compileOnly' || entry.dependencyType === 'optional') return `    modCompileOnly "${entry.gradleCoordinate}"`;
  return `    modImplementation "${entry.gradleCoordinate}"`;
}

function compatibilityReadme(project: ProjectModel): string {
  const entries = compatibilityEntries(project);
  if (entries.length === 0) return `# ${project.displayName} Compatibility\n\n暂无外部模组依赖。\n`;
  return `# ${project.displayName} Compatibility\n\n${entries.map(entry => `- ${entry.displayName || entry.modId} (${entry.modId})\n  - 类型: ${entry.dependencyType}\n  - 范围: ${entry.versionRange || '[0,)'}\n  - 侧: ${entry.side}\n  - 坐标: ${entry.gradleCoordinate || '未填写'}\n  - 备注: ${entry.note || '无'}`).join('\n')}\n`;
}

function javaFloat(value: number): string {
  return `${Number(value.toFixed(3))}f`;
}

function itemTierCode(tier: string | undefined): string {
  const allowed = new Set(['WOOD', 'STONE', 'IRON', 'GOLD', 'DIAMOND', 'NETHERITE']);
  const normalized = String(tier || 'IRON').toUpperCase();
  return allowed.has(normalized) ? `Tiers.${normalized}` : 'Tiers.IRON';
}

function isDurableItem(item: ItemLikeElement): boolean {
  const kind = item.properties.itemKind || 'generic';
  return kind === 'magic_wand' || kind.startsWith('weapon_') || kind.startsWith('tool_') || kind.startsWith('armor_') || numberOr(item.properties.durability, 0) > 0;
}

function itemPropertiesCode(item: ItemLikeElement): string {
  const props = item.properties;
  const durable = isDurableItem(item);
  const stackSize = durable ? 1 : Math.max(1, Math.min(64, intOr(props.maxStackSize, 64)));
  const durability = durable ? Math.max(1, intOr(props.durability, 250)) : 0;
  let code = `new Item.Properties().stacksTo(${stackSize})`;
  if (durability > 0) code += `.durability(${durability})`;
  if (props.rarity) code += `.rarity(Rarity.${String(props.rarity).toUpperCase()})`;
  if (props.fireResistant) code += '.fireResistant()';
  if (props.canRepair === false) code += '.setNoRepair()';
  if (props.useDuration !== undefined) code += `.useDuration(${Math.max(1, intOr(props.useDuration, 32))})`;
  if (props.useAnimation && props.useAnimation !== 'none') code += `.useAnimation(UseAnim.${String(props.useAnimation).toUpperCase()})`;
  if (props.itemKind === 'food') {
    const nutrition = Math.max(0, intOr(props.foodNutrition, 4));
    const saturation = Math.max(0, numberOr(props.foodSaturation, 0.3));
    const alwaysEat = props.alwaysEat ? '.alwaysEat()' : '';
    const meat = props.foodIsMeat ? '.meat()' : '';
    code += `.food(new FoodProperties.Builder().nutrition(${nutrition}).saturationMod(${javaFloat(saturation)})${meat}${alwaysEat}.build())`;
  }
  return code;
}

function itemFactoryCode(item: ItemLikeElement): string {
  const props = item.properties;
  const kind = props.itemKind || 'generic';
  const tier = itemTierCode(props.tier);
  const itemProps = itemPropertiesCode(item);
  const attackDamage = numberOr(props.attackDamage, kind.includes('axe') ? 6 : 4);
  const attackSpeed = numberOr(props.attackSpeed, kind.includes('axe') ? -3.1 : -2.4);
  if (kind === 'weapon_sword') return `new SwordItem(${tier}, ${intOr(attackDamage, 4)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'weapon_axe' || kind === 'tool_axe') return `new AxeItem(${tier}, ${javaFloat(attackDamage)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'weapon_bow') return `new BowItem(${itemProps})`;
  if (kind === 'weapon_crossbow') return `new CrossbowItem(${itemProps})`;
  if (kind === 'weapon_pistol' || kind === 'weapon_rifle' || kind === 'weapon_shotgun' || kind === 'weapon_magic_gun') return `new CrossbowItem(${itemProps})`;
  if (kind === 'weapon_spear') return `new net.minecraft.world.item.TridentItem(${itemProps})`;
  if (kind === 'weapon_hammer') return `new AxeItem(${tier}, ${javaFloat(attackDamage)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'weapon_dagger') return `new SwordItem(${tier}, ${intOr(attackDamage, 2)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'weapon_shield') return `new ShieldItem(${itemProps})`;
  if (kind === 'armor_helmet') return `new ArmorItem(ArmorMaterials.IRON, ArmorItem.Type.HELMET, ${itemProps})`;
  if (kind === 'armor_chestplate') return `new ArmorItem(ArmorMaterials.IRON, ArmorItem.Type.CHESTPLATE, ${itemProps})`;
  if (kind === 'armor_leggings') return `new ArmorItem(ArmorMaterials.IRON, ArmorItem.Type.LEGGINGS, ${itemProps})`;
  if (kind === 'armor_boots') return `new ArmorItem(ArmorMaterials.IRON, ArmorItem.Type.BOOTS, ${itemProps})`;
  if (kind === 'tool_pickaxe') return `new PickaxeItem(${tier}, ${intOr(attackDamage, 1)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'tool_shovel') return `new ShovelItem(${tier}, ${javaFloat(attackDamage)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'tool_hoe') return `new HoeItem(${tier}, ${intOr(attackDamage, -2)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  return `new Item(${itemProps})`;
}

function fabricBuildDependencies(project: ProjectModel): string {
  const base = [
    `    minecraft 'com.mojang:minecraft:${project.minecraftVersion}'`,
    `    modImplementation 'net.fabricmc:fabric-loader:0.14.19'`,
    `    modImplementation 'net.fabricmc.fabric-api:fabric-api:0.91.0+1.20.1'`
  ];
  for (const entry of compatibilityEntries(project)) {
    const line = fabricDependencyLine(entry);
    if (line) base.push(line);
  }
  return base.join('\n');
}

function blockPropertiesCode(block: BlockElement): string {
  const props = block.properties;
  const light = Number(props.lightLevel || 0);
  const requiresTool = props.requiresCorrectTool ? '.requiresTool()' : '';
  const sound = String(props.soundType || 'STONE').toUpperCase();
  const lightCode = light > 0 ? `.luminance(state -> ${Math.max(0, Math.min(15, light))})` : '';
  return `FabricBlockSettings.copyOf(Blocks.STONE).strength(${Number(props.hardness || 3)}f, ${Number(props.resistance || 3)}f).sounds(SoundType.${sound})${lightCode}${requiresTool}`;
}

function recipeJson(project: ProjectModel, recipe: RecipeElement): unknown {
  const props = recipe.properties;
  const result = { item: resourceId(project.modId, props.result), count: Number(props.count || 1) };
  if (props.recipeType === 'shaped') {
    const key = Object.fromEntries(Object.entries(props.key || { A: 'minecraft:stone' }).map(([slot, item]) => [slot, ingredientJson(project.modId, item)]));
    return { type: 'minecraft:crafting_shaped', category: props.category || 'misc', pattern: props.pattern?.length ? props.pattern : ['A'], key, result };
  }
  if (props.recipeType === 'smelting') {
    return {
      type: 'minecraft:smelting',
      category: props.category || 'misc',
      ingredient: ingredientJson(project.modId, props.input || 'minecraft:stone'),
      result: resourceId(project.modId, props.result),
      experience: Number(props.experience || 0),
      cookingtime: Number(props.cookingTime || 200)
    };
  }
  return {
    type: 'minecraft:crafting_shapeless',
    category: props.category || 'misc',
    ingredients: (props.ingredients?.length ? props.ingredients : ['minecraft:stone']).map(item => ingredientJson(project.modId, item)),
    result
  };
}

function lootTableJson(project: ProjectModel, loot: LootTableElement): unknown {
  const props = loot.properties;
  const min = Number(props.minCount || 1);
  const max = Number(props.maxCount || min);
  const functions = min === max
    ? [{ function: 'minecraft:set_count', count: min }]
    : [{ function: 'minecraft:set_count', count: { type: 'minecraft:uniform', min, max } }];
  return {
    type: 'minecraft:block',
    pools: [{
      rolls: 1,
      entries: [lootEntryJson(project.modId, props.drop)],
      functions
    }]
  };
}

function javaColorInt(value: string | undefined, fallback = '#7dd3fc'): string {
  const normalized = String(value || fallback).trim().replace(/^#/, '');
  const color = /^[0-9a-fA-F]{6}$/.test(normalized) ? normalized : fallback.replace(/^#/, '');
  return `0x${color.toUpperCase()}`;
}

function mobEffectCategoryCode(effect: MobEffectElement): string {
  const category = effect.properties.category || 'beneficial';
  if (category === 'harmful') return 'MobEffectCategory.HARMFUL';
  if (category === 'neutral') return 'MobEffectCategory.NEUTRAL';
  return 'MobEffectCategory.BENEFICIAL';
}

function potionEffectCode(project: ProjectModel, spec: PotionEffectSpec): string {
  const effectId = resourceId(project.modId, spec.effect || 'minecraft:speed');
  const duration = Math.max(1, intOr(spec.duration, 200));
  const amplifier = Math.max(0, intOr(spec.amplifier, 0));
  return `new MobEffectInstance(effect("${effectId}"), ${duration}, ${amplifier}, ${Boolean(spec.ambient)}, ${spec.visible !== false}, ${spec.showIcon !== false})`;
}

function enchantmentRarityCode(enchantment: EnchantmentElement): string {
  const rarity = String(enchantment.properties.rarity || 'rare').toUpperCase();
  return `Enchantment.Rarity.${rarity === 'VERY_RARE' ? 'VERY_RARE' : rarity}`;
}

function enchantmentSlots(enchantment: EnchantmentElement): EnchantmentSlot[] {
  const slots: EnchantmentSlot[] = enchantment.properties.slots?.length ? enchantment.properties.slots : ['mainhand'];
  return slots.includes('any') ? ['mainhand', 'offhand', 'head', 'chest', 'legs', 'feet'] : slots;
}

function enchantmentCategoryCode(enchantment: EnchantmentElement): string {
  const slots = enchantmentSlots(enchantment);
  if (slots.every(slot => ['head', 'chest', 'legs', 'feet'].includes(slot))) return 'EnchantmentCategory.ARMOR';
  if (slots.includes('head') && slots.length === 1) return 'EnchantmentCategory.ARMOR_HEAD';
  if (slots.includes('chest') && slots.length === 1) return 'EnchantmentCategory.ARMOR_CHEST';
  if (slots.includes('legs') && slots.length === 1) return 'EnchantmentCategory.ARMOR_LEGS';
  if (slots.includes('feet') && slots.length === 1) return 'EnchantmentCategory.ARMOR_FEET';
  if (slots.includes('mainhand')) return 'EnchantmentCategory.WEAPON';
  return 'EnchantmentCategory.BREAKABLE';
}

function equipmentSlotCode(slot: EnchantmentSlot): string {
  if (slot === 'offhand') return 'EquipmentSlot.OFFHAND';
  if (slot === 'head') return 'EquipmentSlot.HEAD';
  if (slot === 'chest') return 'EquipmentSlot.CHEST';
  if (slot === 'legs') return 'EquipmentSlot.LEGS';
  if (slot === 'feet') return 'EquipmentSlot.FEET';
  return 'EquipmentSlot.MAINHAND';
}

function enchantmentFactoryCode(enchantment: EnchantmentElement): string {
  const props = enchantment.properties;
  const slots = enchantmentSlots(enchantment).map(equipmentSlotCode).join(', ');
  const maxLevel = Math.max(1, intOr(props.maxLevel, 1));
  const minCost = Math.max(1, intOr(props.minCost, 1));
  const maxCost = Math.max(minCost, intOr(props.maxCost, 25));
  return `new Enchantment(${enchantmentRarityCode(enchantment)}, ${enchantmentCategoryCode(enchantment)}, new EquipmentSlot[] { ${slots} }) {
        @Override public int getMaxLevel() { return ${maxLevel}; }
        @Override public int getMinCost(int level) { return ${minCost} + (level - 1) * 10; }
        @Override public int getMaxCost(int level) { return ${maxCost} + (level - 1) * 10; }
        @Override public boolean isTreasureOnly() { return ${Boolean(props.treasureOnly)}; }
        @Override public boolean isCurse() { return ${Boolean(props.curse)}; }
        @Override public boolean isDiscoverable() { return ${props.discoverable !== false}; }
    }`;
}

function deployCommandsMarkdown(project: ProjectModel): string {
  return `# BlockForge Fabric 构建与部署命令

项目：${project.displayName} (${project.modId})

Fabric 版默认优先使用阿里云公共仓库和 Fabric 官方仓库，避免把 BMCLAPI 写进工程。

## Windows 本地客户端

\`\`\`powershell
cd generated\\fabric
powershell -ExecutionPolicy Bypass -File .\\blockforge-setup-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build
\`\`\`

## 仅构建

\`\`\`powershell
cd generated\\fabric
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
gradle build
\`\`\`

## 自定义 Minecraft 目录

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build -MinecraftDir "D:\\Games\\.minecraft"
\`\`\`

部署脚本会把 \`build/libs\` 中最新的 jar 复制到 \`<MinecraftDir>/mods\`。
`;
}

function setupEnvScript(): string {
  return `param(
  [switch]$InstallMissing
)

$ErrorActionPreference = "Stop"
$jdkCommand = "winget install --id EclipseAdoptium.Temurin.17.JDK -e"
$gradleCommand = "winget install --id Gradle.Gradle -e"

Write-Host "[BlockForge] 推荐的环境安装命令："
Write-Host "  $jdkCommand"
Write-Host "  $gradleCommand"
Write-Host ""

if (!$InstallMissing) {
  Write-Host "[BlockForge] 当前仅显示命令，不会安装。添加 -InstallMissing 才会执行 winget 安装。"
  exit 0
}

if (!(Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "未找到 winget。请手动安装 JDK 17 和 Gradle，或使用 BlockForge Studio 的“构建 jar”入口。"
}

if (!(Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Host "[BlockForge] 正在安装 JDK 17..."
  winget install --id EclipseAdoptium.Temurin.17.JDK -e
} else {
  Write-Host "[BlockForge] 已检测到 Java。请运行 blockforge-check-env.ps1 确认版本。"
}

if (!(Get-Command gradle -ErrorAction SilentlyContinue) -and !(Test-Path ".\\gradlew.bat")) {
  Write-Host "[BlockForge] 正在安装 Gradle..."
  winget install --id Gradle.Gradle -e
} else {
  Write-Host "[BlockForge] 已检测到 Gradle 或 Gradle Wrapper。"
}

Write-Host "[BlockForge] 环境安装命令已完成。如果 PATH 有变化，请重启终端。"
`;
}

function checkEnvScript(): string {
  return `$ErrorActionPreference = "Stop"
Write-Host "[BlockForge] 正在检查 Java..."
try {
  $javaVersion = & java -version 2>&1
  $javaVersion | ForEach-Object { Write-Host $_ }
} catch {
  throw "未找到 Java。构建 Fabric 1.20.1 模组前请安装 JDK 17。"
}

$versionText = ($javaVersion | Out-String)
if ($versionText -notmatch 'version "([0-9]+)') {
  Write-Warning "无法解析 Java 版本。Fabric 1.20.1 推荐使用 JDK 17。"
} elseif ([int]$Matches[1] -ne 17) {
  Write-Warning "检测到 Java $($Matches[1])。Fabric 1.20.1 面向 JDK 17；如果构建失败，请切换到 JDK 17。"
}

if (Test-Path ".\\gradlew.bat") {
  Write-Host "[BlockForge] 已找到 Gradle Wrapper。"
} elseif (Get-Command gradle -ErrorAction SilentlyContinue) {
  Write-Host "[BlockForge] 已找到系统 Gradle。"
} else {
  Write-Warning "未找到 Gradle Wrapper 或系统 Gradle。请使用 BlockForge Studio 的“构建 jar”入口，或安装 Gradle。"
}

Write-Host "[BlockForge] 环境检查完成。"
`;
}

function deployLocalScript(project: ProjectModel): string {
  return `param(
  [string]$MinecraftDir = (Join-Path $env:APPDATA ".minecraft"),
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if ($Build) {
  if (Test-Path ".\\gradlew.bat") {
    & .\\gradlew.bat build
  } elseif (Get-Command gradle -ErrorAction SilentlyContinue) {
    & gradle build
  } else {
    throw "Gradle 不可用。请安装 Gradle、加入 Gradle Wrapper，或从 BlockForge Studio 中构建。"
  }
}

$libs = Join-Path $Root "build\\libs"
if (!(Test-Path $libs)) {
  throw "没有找到 build/libs 文件夹。请先完成构建再部署。"
}

$jar = Get-ChildItem $libs -Filter "*.jar" |
  Where-Object { $_.Name -notmatch "sources|javadoc|dev-shadow" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (!$jar) {
  throw "build/libs 中没有找到可部署的 jar。"
}

$modsDir = Join-Path $MinecraftDir "mods"
New-Item -ItemType Directory -Force -Path $modsDir | Out-Null
$target = Join-Path $modsDir $jar.Name
Copy-Item $jar.FullName $target -Force

Write-Host "[BlockForge] 已部署 ${project.modId}: $target"
Write-Host "[BlockForge] 请启动 Minecraft Fabric ${project.minecraftVersion} 并启用该模组。"
`;
}

export interface FabricGenerateInput {
  projectDir: string;
  project: ProjectModel;
  items: ItemLikeElement[];
  blocks: BlockElement[];
  recipes?: RecipeElement[];
  lootTables?: LootTableElement[];
  functions?: FunctionElement[];
  mobEffects?: MobEffectElement[];
  potions?: PotionElement[];
  enchantments?: EnchantmentElement[];
  structures?: StructureElement[];
  logicIR?: BlockForgeIR[];
}

export async function generateFabricProject(input: FabricGenerateInput): Promise<{ root: string; copiedResources: number; preview: string }> {
  const { projectDir, project, items, blocks, recipes = [], lootTables = [], functions = [], mobEffects = [], potions = [], enchantments = [], structures = [], logicIR = [] } = input;
  const root = path.join(projectDir, 'generated/fabric');
  const resolvedRoot = path.resolve(root);
  const resolvedProject = path.resolve(projectDir);
  if (!resolvedRoot.startsWith(resolvedProject)) throw new Error('拒绝清理项目目录之外的 generated/fabric 文件夹。');
  await fs.rm(root, { recursive: true, force: true });
  const pkgDir = path.join(root, 'src/main/java', javaPackagePath(project.packageName));
  const resDir = path.join(root, 'src/main/resources');
  await fs.mkdir(root, { recursive: true });

  await write(path.join(root, 'settings.gradle'), `pluginManagement {\n    repositories {\n        maven { name = 'Aliyun Gradle Plugin'; url = uri('https://maven.aliyun.com/repository/gradle-plugin') }\n        maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n        maven { name = 'Fabric'; url = uri('https://maven.fabricmc.net/') }\n        gradlePluginPortal()\n        mavenCentral()\n    }\n}\n\nrootProject.name='${project.modId}'\n`);
  await write(path.join(root, 'build.gradle'), `plugins { id 'fabric-loom' version '1.16-SNAPSHOT' }\n\ngroup='${project.packageName}'\nversion='1.0.0'\nbase { archivesName = '${project.modId}' }\n\njava {\n    toolchain.languageVersion = JavaLanguageVersion.of(17)\n    withSourcesJar()\n}\n\ntasks.withType(JavaCompile).configureEach {\n    options.encoding = 'UTF-8'\n    options.release = 17\n}\n\nrepositories {\n    maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n    maven { name = 'Fabric'; url = uri('https://maven.fabricmc.net/') }\n    mavenCentral()\n}\n\nminecraft {\n    mappings loom.officialMojangMappings()\n}\n\ndependencies {\n${fabricBuildDependencies(project)}\n}\n\nprocessResources {\n    inputs.property 'version', project.version\n    filteringCharset = 'UTF-8'\n    filesMatching('fabric.mod.json') {\n        expand version: project.version\n    }\n}\n`);
  await write(path.join(root, 'gradle.properties'), `org.gradle.jvmargs=-Xmx2G -Dfile.encoding=UTF-8\norg.gradle.daemon=false\nminecraft_version=${project.minecraftVersion}\nmod_version=1.0.0\n`);
  await write(path.join(root, 'BLOCKFORGE_DEPLOY_COMMANDS.md'), deployCommandsMarkdown(project));
  await write(path.join(root, 'blockforge-setup-env.ps1'), setupEnvScript());
  await write(path.join(root, 'blockforge-check-env.ps1'), checkEnvScript());
  await write(path.join(root, 'blockforge-deploy-local.ps1'), deployLocalScript(project));

  const modClass = className(project.modId) + 'Mod';
  await write(path.join(pkgDir, `${modClass}.java`), `package ${project.packageName};\n\nimport net.fabricmc.api.ModInitializer;\nimport org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;\n\npublic class ${modClass} implements ModInitializer {\n    public static final String MODID = "${project.modId}";\n    public static final Logger LOGGER = LoggerFactory.getLogger(MODID);\n\n    @Override\n    public void onInitialize() {\n        ModBlocks.register();\n        ModItems.register();\n        ModMobEffects.register();\n        ModPotions.register();\n        ModEnchantments.register();\n        ModCreativeTabs.register();\n        LOGGER.info(\"Loaded {}\", MODID);\n    }\n}\n`);

  await write(path.join(pkgDir, 'ModItems.java'), `package ${project.packageName};\n\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.food.FoodProperties;\nimport net.minecraft.world.item.ArmorItem;\nimport net.minecraft.world.item.ArmorMaterials;\nimport net.minecraft.world.item.AxeItem;\nimport net.minecraft.world.item.BlockItem;\nimport net.minecraft.world.item.BowItem;\nimport net.minecraft.world.item.CrossbowItem;\nimport net.minecraft.world.item.HoeItem;\nimport net.minecraft.world.item.Item;\nimport net.minecraft.world.item.ItemStack;\nimport net.minecraft.world.item.PickaxeItem;\nimport net.minecraft.world.item.Rarity;\nimport net.minecraft.world.item.ShieldItem;\nimport net.minecraft.world.item.ShovelItem;\nimport net.minecraft.world.item.SwordItem;\nimport net.minecraft.world.item.Tiers;\nimport net.minecraft.world.item.UseAnim;\nimport net.minecraft.core.registries.Registries;\nimport net.minecraft.world.item.CreativeModeTab;\nimport net.minecraft.network.chat.Component;\nimport net.minecraft.world.item.Items;\nimport net.minecraft.core.Registry;\n\npublic class ModItems {\n${items.map(i => `    public static final Item ${constantName(i.id)} = Registry.register(BuiltInRegistries.ITEM, new ResourceLocation(${modClass}.MODID, "${i.id}"), ${itemFactoryCode(i)});`).join('\n')}\n${blocks.map(b => `    public static final Item ${constantName(b.id)}_ITEM = Registry.register(BuiltInRegistries.ITEM, new ResourceLocation(${modClass}.MODID, "${b.id}"), new BlockItem(ModBlocks.${constantName(b.id)}, new Item.Properties()));`).join('\n')}\n\n    public static void register() {}\n}\n`);

  await write(path.join(pkgDir, 'ModBlocks.java'), `package ${project.packageName};\n\nimport net.fabricmc.fabric.api.object.builder.v1.block.FabricBlockSettings;\nimport net.minecraft.core.Registry;\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.level.block.Block;\nimport net.minecraft.world.level.block.Blocks;\nimport net.minecraft.world.level.block.SoundType;\n\npublic class ModBlocks {\n${blocks.map(b => `    public static final Block ${constantName(b.id)} = Registry.register(BuiltInRegistries.BLOCK, new ResourceLocation(${modClass}.MODID, "${b.id}"), new Block(${blockPropertiesCode(b)}));`).join('\n')}\n\n    public static void register() {}\n}\n`);

  await write(path.join(pkgDir, 'ModMobEffects.java'), `package ${project.packageName};\n\nimport net.minecraft.core.Registry;\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.effect.MobEffect;\nimport net.minecraft.world.effect.MobEffectCategory;\n\npublic class ModMobEffects {\n${mobEffects.map(effect => `    public static final MobEffect ${constantName(effect.id)} = Registry.register(BuiltInRegistries.MOB_EFFECT, new ResourceLocation(${modClass}.MODID, "${effect.id}"), new MobEffect(${mobEffectCategoryCode(effect)}, ${javaColorInt(effect.properties.color)}) {});`).join('\n')}\n\n    public static void register() {}\n}\n`);

  await write(path.join(pkgDir, 'ModPotions.java'), `package ${project.packageName};\n\nimport net.minecraft.core.Registry;\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.effect.MobEffect;\nimport net.minecraft.world.effect.MobEffectInstance;\nimport net.minecraft.world.item.alchemy.Potion;\n\npublic class ModPotions {\n${potions.map(potion => `    public static final Potion ${constantName(potion.id)} = Registry.register(BuiltInRegistries.POTION, new ResourceLocation(${modClass}.MODID, "${potion.id}"), new Potion("${potion.id}", ${(potion.properties.effects?.length ? potion.properties.effects : [{ effect: 'minecraft:speed', duration: 200, amplifier: 0 }]).map(spec => potionEffectCode(project, spec)).join(', ')}));`).join('\n')}\n\n    private static MobEffect effect(String id) {\n        return BuiltInRegistries.MOB_EFFECT.getOptional(new ResourceLocation(id)).orElse(null);\n    }\n\n    public static void register() {}\n}\n`);

  await write(path.join(pkgDir, 'ModEnchantments.java'), `package ${project.packageName};\n\nimport net.minecraft.core.Registry;\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.entity.EquipmentSlot;\nimport net.minecraft.world.item.enchantment.Enchantment;\nimport net.minecraft.world.item.enchantment.EnchantmentCategory;\nimport net.minecraft.world.item.enchantment.Enchantment.Rarity;\n\npublic class ModEnchantments {\n${enchantments.map(enchantment => `    public static final Enchantment ${constantName(enchantment.id)} = Registry.register(BuiltInRegistries.ENCHANTMENT, new ResourceLocation(${modClass}.MODID, "${enchantment.id}"), ${enchantmentFactoryCode(enchantment)});`).join('\n')}\n\n    public static void register() {}\n}\n`);

  await write(path.join(pkgDir, 'ModCreativeTabs.java'), `package ${project.packageName};\n\nimport net.minecraft.core.Registry;\nimport net.minecraft.core.registries.BuiltInRegistries;\nimport net.minecraft.network.chat.Component;\nimport net.minecraft.resources.ResourceLocation;\nimport net.minecraft.world.item.CreativeModeTab;\nimport net.minecraft.world.item.ItemStack;\nimport net.minecraft.world.item.Items;\n\npublic class ModCreativeTabs {\n    public static final CreativeModeTab MAIN_TAB = Registry.register(BuiltInRegistries.CREATIVE_MODE_TAB, new ResourceLocation(${modClass}.MODID, "${project.modId}_tab"), CreativeModeTab.builder()\n        .title(Component.translatable("itemGroup.${project.modId}"))\n        .icon(() -> new ItemStack(Items.CRAFTING_TABLE))\n        .displayItems((params, output) -> {\n${items.map(i => `            output.accept(ModItems.${constantName(i.id)});`).join('\n')}\n${blocks.map(b => `            output.accept(ModItems.${constantName(b.id)}_ITEM);`).join('\n')}\n        })\n        .build());\n\n    public static void register() {}\n}\n`);
  await write(path.join(root, 'BLOCKFORGE_COMPATIBILITY.md'), compatibilityReadme(project));

  if (logicIR.length > 0) {
    await write(path.join(pkgDir, 'logic/README.md'), `# Fabric 节点逻辑预览\n\n当前节点图数量：${logicIR.length}\n\n首版已经保存了节点图和 IR，但 Fabric 的事件代码适配仍在补齐中。\n你可以先继续编辑节点图、变量和 NBT，后续版本会把这些图再转换成 Fabric 事件代码。\n`);
    await writeJson(path.join(resDir, 'assets/blockforge/logic-preview.json'), logicIR);
  }

  await write(path.join(resDir, 'fabric.mod.json'), JSON.stringify({
    schemaVersion: 1,
    id: project.modId,
    version: '${version}',
    name: project.displayName,
    description: project.description,
    authors: [project.author],
    environment: '*',
    entrypoints: {
      main: [`${project.packageName}.${modClass}`]
    },
    depends: {
      minecraft: project.minecraftVersion,
      java: '>=17',
      'fabric-loader': '>=0.14.19',
      'fabric-api': '*'
    },
    recommends: Object.fromEntries(compatibilityEntries(project).filter(entry => entry.dependencyType === 'optional').map(entry => [entry.modId, entry.versionRange || '*']))
  }, null, 2));

  await writeJson(path.join(resDir, `assets/${project.modId}/lang/zh_cn.json`), { [`itemGroup.${project.modId}`]: project.displayName });
  await writeJson(path.join(resDir, `assets/${project.modId}/lang/en_us.json`), { [`itemGroup.${project.modId}`]: project.displayName });

  for (const i of items) {
    const modelName = i.properties.model?.trim();
    const value = modelName && modelName !== i.id
      ? { parent: `${project.modId}:item/${modelName}` }
      : { parent: 'item/generated', textures: { layer0: `${project.modId}:item/${i.properties.texture || i.id}` } };
    await writeJson(path.join(resDir, `assets/${project.modId}/models/item/${i.id}.json`), value);
  }
  for (const b of blocks) {
    const modelName = b.properties.model?.trim() || b.id;
    if (modelName === b.id) {
      await writeJson(path.join(resDir, `assets/${project.modId}/models/block/${b.id}.json`), { parent: 'block/cube_all', textures: { all: `${project.modId}:block/${b.properties.textureAll || b.id}` } });
    }
    await writeJson(path.join(resDir, `assets/${project.modId}/models/item/${b.id}.json`), { parent: `${project.modId}:block/${modelName}` });
    await writeJson(path.join(resDir, `assets/${project.modId}/blockstates/${b.id}.json`), { variants: { '': { model: `${project.modId}:block/${modelName}` } } });
  }

  for (const recipe of recipes) await writeJson(path.join(resDir, `data/${project.modId}/recipes/${recipe.id}.json`), recipeJson(project, recipe));
  for (const loot of lootTables) await writeJson(path.join(resDir, `data/${project.modId}/loot_tables/blocks/${loot.properties.targetBlock || loot.id}.json`), lootTableJson(project, loot));
  for (const fn of functions) await write(path.join(resDir, `data/${project.modId}/functions/${fn.id}.mcfunction`), `${fn.properties.commands.trim()}\n`);
  for (const structure of structures) {
    await write(path.join(resDir, `data/${project.modId}/functions/structures/${structure.id}.mcfunction`), `${structureFunctionCommands(project, structure).join('\n')}\n`);
  }

  const copied = await copyResourcesToGenerated(projectDir, project.modId, 'fabric');
  const preview = [
    `Fabric 工程已生成：${root}`,
    `资源复制数量：${copied.length}`,
    `主类：${project.packageName}.${modClass}`,
    `模组 ID：${project.modId}`,
    logicIR.length > 0 ? `节点图数量：${logicIR.length}` : '节点图：未生成额外 Fabric 事件代码'
  ].join('\n');
  return { root, copiedResources: copied.length, preview };
}
