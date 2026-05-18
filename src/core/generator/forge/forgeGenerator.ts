import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectModel } from '../../../shared/types/project';
import type { BlockElement, FunctionElement, ItemElement, LootTableElement, RecipeElement } from '../../../shared/types/elements';
import type { BlockForgeIR } from '../../../shared/types/logic';
import { copyResourcesToForge } from '../../resources/resourceService';
import { generateCooldowns, generateForgeEventHandler, generateGameActions, generateItemUtils } from './forgeEventGenerator';

function javaPackagePath(pkg: string): string { return pkg.replace(/\./g, '/'); }
function className(id: string): string { return id.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(''); }
function constantName(id: string): string { return id.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase(); }
function resourceId(modId: string, id: string): string { return id.includes(':') ? id : `${modId}:${id}`; }
async function write(file: string, content: string) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content, 'utf8'); }
async function writeJson(file: string, value: unknown) { await write(file, `${JSON.stringify(value, null, 2)}\n`); }

export interface ForgeGenerateInput {
  projectDir: string;
  project: ProjectModel;
  items: ItemElement[];
  blocks: BlockElement[];
  recipes?: RecipeElement[];
  lootTables?: LootTableElement[];
  functions?: FunctionElement[];
  logicIR?: BlockForgeIR[];
}

function blockPropertiesCode(block: BlockElement): string {
  const props = block.properties;
  const light = Number(props.lightLevel || 0);
  const requiresTool = props.requiresCorrectTool ? '.requiresCorrectToolForDrops()' : '';
  const lightCode = light > 0 ? `.lightLevel(state -> ${Math.max(0, Math.min(15, light))})` : '';
  return `BlockBehaviour.Properties.of().mapColor(MapColor.STONE).strength(${Number(props.hardness || 3)}f, ${Number(props.resistance || 3)}f).sound(SoundType.${props.soundType || 'STONE'})${lightCode}${requiresTool}`;
}

function numberOr(value: unknown, fallback: number): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function intOr(value: unknown, fallback: number): number {
  return Math.round(numberOr(value, fallback));
}

function javaFloat(value: number): string {
  return `${Number(value.toFixed(3))}f`;
}

function itemTierCode(tier: string | undefined): string {
  const allowed = new Set(['WOOD', 'STONE', 'IRON', 'GOLD', 'DIAMOND', 'NETHERITE']);
  const normalized = String(tier || 'IRON').toUpperCase();
  return allowed.has(normalized) ? `Tiers.${normalized}` : 'Tiers.IRON';
}

function isDurableItem(item: ItemElement): boolean {
  const kind = item.properties.itemKind || 'generic';
  return kind === 'magic_wand' || kind.startsWith('weapon_') || kind.startsWith('tool_') || numberOr(item.properties.durability, 0) > 0;
}

function itemPropertiesCode(item: ItemElement): string {
  const props = item.properties;
  const durable = isDurableItem(item);
  const stackSize = durable ? 1 : Math.max(1, Math.min(64, intOr(props.maxStackSize, 64)));
  const durability = durable ? Math.max(1, intOr(props.durability, 250)) : 0;
  let code = `new Item.Properties().stacksTo(${stackSize})`;
  if (durability > 0) code += `.durability(${durability})`;
  if (props.fireResistant) code += '.fireResistant()';
  if (props.itemKind === 'food') {
    const nutrition = Math.max(0, intOr(props.foodNutrition, 4));
    const saturation = Math.max(0, numberOr(props.foodSaturation, 0.3));
    const alwaysEat = props.alwaysEat ? '.alwaysEat()' : '';
    code += `.food(new FoodProperties.Builder().nutrition(${nutrition}).saturationMod(${javaFloat(saturation)})${alwaysEat}.build())`;
  }
  return code;
}

function itemFactoryCode(item: ItemElement): string {
  const props = item.properties;
  const kind = props.itemKind || 'generic';
  const tier = itemTierCode(props.tier);
  const itemProps = itemPropertiesCode(item);
  const attackDamage = numberOr(props.attackDamage, kind.includes('axe') ? 6 : 4);
  const attackSpeed = numberOr(props.attackSpeed, kind.includes('axe') ? -3.1 : -2.4);
  if (kind === 'weapon_sword') return `new SwordItem(${tier}, ${intOr(attackDamage, 4)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'weapon_axe' || kind === 'tool_axe') return `new AxeItem(${tier}, ${javaFloat(attackDamage)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'tool_pickaxe') return `new PickaxeItem(${tier}, ${intOr(attackDamage, 1)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'tool_shovel') return `new ShovelItem(${tier}, ${javaFloat(attackDamage)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  if (kind === 'tool_hoe') return `new HoeItem(${tier}, ${intOr(attackDamage, -2)}, ${javaFloat(attackSpeed)}, ${itemProps})`;
  return `new Item(${itemProps})`;
}

function recipeJson(project: ProjectModel, recipe: RecipeElement): unknown {
  const props = recipe.properties;
  const result = { item: resourceId(project.modId, props.result), count: Number(props.count || 1) };
  if (props.recipeType === 'shaped') {
    const key = Object.fromEntries(Object.entries(props.key || { A: 'minecraft:stone' }).map(([slot, item]) => [slot, { item: resourceId(project.modId, item) }]));
    return { type: 'minecraft:crafting_shaped', category: props.category || 'misc', pattern: props.pattern?.length ? props.pattern : ['A'], key, result };
  }
  if (props.recipeType === 'smelting') {
    return {
      type: 'minecraft:smelting',
      category: props.category || 'misc',
      ingredient: { item: resourceId(project.modId, props.input || 'minecraft:stone') },
      result: resourceId(project.modId, props.result),
      experience: Number(props.experience || 0),
      cookingtime: Number(props.cookingTime || 200)
    };
  }
  return {
    type: 'minecraft:crafting_shapeless',
    category: props.category || 'misc',
    ingredients: (props.ingredients?.length ? props.ingredients : ['minecraft:stone']).map(item => ({ item: resourceId(project.modId, item) })),
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
      entries: [{ type: 'minecraft:item', name: resourceId(project.modId, props.drop) }],
      functions
    }]
  };
}

function deployCommandsMarkdown(project: ProjectModel): string {
  return `# BlockForge Forge 构建与部署命令

项目：${project.displayName} (${project.modId})

已默认使用阿里云 Maven 公共仓库和阿里云 Gradle 插件仓库优先解析通用依赖，Forge 专用依赖走 MinecraftForge 官方仓库兜底。

说明：BMCLAPI 在部分 JDK/Gradle 组合下会出现 TLS 握手失败，BlockForge 默认不再把它写入 Gradle 仓库列表。

## Windows 本地客户端

\`\`\`powershell
cd generated\\forge
powershell -ExecutionPolicy Bypass -File .\\blockforge-setup-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build
\`\`\`

如需用 winget 安装缺失工具：

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\blockforge-setup-env.ps1 -InstallMissing
\`\`\`

## 仅构建

\`\`\`powershell
cd generated\\forge
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
gradle build
\`\`\`

如果以后为项目加入 Gradle Wrapper，请把 \`gradle build\` 替换为 \`.\\gradlew.bat build\`。

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
  throw "未找到 Java。构建 Forge 1.20.1 模组前请安装 JDK 17。"
}

$versionText = ($javaVersion | Out-String)
if ($versionText -notmatch 'version "([0-9]+)') {
  Write-Warning "无法解析 Java 版本。Forge 1.20.1 推荐使用 JDK 17。"
} elseif ([int]$Matches[1] -ne 17) {
  Write-Warning "检测到 Java $($Matches[1])。Forge 1.20.1 面向 JDK 17；如果构建失败，请切换到 JDK 17。"
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
Write-Host "[BlockForge] 请启动 Minecraft Forge ${project.minecraftVersion} 并启用该模组。"
`;
}

export async function generateForgeProject(input: ForgeGenerateInput): Promise<{ root: string; copiedResources: number }> {
  const { projectDir, project, items, blocks, recipes = [], lootTables = [], functions = [], logicIR = [] } = input;
  const root = path.join(projectDir, 'generated/forge');
  const resolvedRoot = path.resolve(root);
  const resolvedProject = path.resolve(projectDir);
  if (!resolvedRoot.startsWith(resolvedProject)) throw new Error('拒绝清理项目目录之外的 generated/forge 文件夹。');
  await fs.rm(root, { recursive: true, force: true });
  const pkgDir = path.join(root, 'src/main/java', javaPackagePath(project.packageName));
  const resDir = path.join(root, 'src/main/resources');
  await fs.mkdir(root, { recursive: true });

  await write(path.join(root, 'settings.gradle'), `pluginManagement {\n    repositories {\n        maven { name = 'Aliyun Gradle Plugin'; url = uri('https://maven.aliyun.com/repository/gradle-plugin') }\n        maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n        maven { name = 'MinecraftForge Official'; url = uri('https://maven.minecraftforge.net/') }\n        gradlePluginPortal()\n        mavenCentral()\n    }\n}\n\nrootProject.name='${project.modId}'\n`);
  await write(path.join(root, 'build.gradle'), `plugins { id 'net.minecraftforge.gradle' version '[6.0,6.2)' }\n\ngroup='${project.packageName}'\nversion='1.0.0'\n\njava { toolchain.languageVersion = JavaLanguageVersion.of(17) }\n\ntasks.withType(JavaCompile).configureEach {\n    options.encoding = 'UTF-8'\n}\n\nminecraft { mappings channel: 'official', version: '${project.minecraftVersion}' }\n\nrepositories {\n    maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n    maven { name = 'Aliyun Central'; url = uri('https://maven.aliyun.com/repository/central') }\n    maven { name = 'MinecraftForge Official'; url = uri('https://maven.minecraftforge.net/') }\n    mavenCentral()\n}\n\ndependencies { minecraft 'net.minecraftforge:forge:${project.minecraftVersion}-47.2.0' }\n\njar { manifest { attributes(['Specification-Title': '${project.modId}', 'Specification-Version': '1', 'Implementation-Title': project.name, 'Implementation-Version': project.version]) } }\n`);
  await write(path.join(root, 'gradle.properties'), 'org.gradle.jvmargs=-Xmx2G -Dfile.encoding=UTF-8\norg.gradle.daemon=false\n');
  await write(path.join(root, 'BLOCKFORGE_DEPLOY_COMMANDS.md'), deployCommandsMarkdown(project));
  await write(path.join(root, 'blockforge-setup-env.ps1'), setupEnvScript());
  await write(path.join(root, 'blockforge-check-env.ps1'), checkEnvScript());
  await write(path.join(root, 'blockforge-deploy-local.ps1'), deployLocalScript(project));

  const modClass = className(project.modId) + 'Mod';
  await write(path.join(pkgDir, `${modClass}.java`), `package ${project.packageName};\n\nimport com.mojang.logging.LogUtils;\nimport net.minecraftforge.fml.common.Mod;\nimport net.minecraftforge.eventbus.api.IEventBus;\nimport net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;\nimport org.slf4j.Logger;\nimport ${project.packageName}.registry.ModItems;\nimport ${project.packageName}.registry.ModBlocks;\nimport ${project.packageName}.registry.ModCreativeTabs;\n\n@Mod(${modClass}.MODID)\npublic class ${modClass} {\n    public static final String MODID = "${project.modId}";\n    public static final Logger LOGGER = LogUtils.getLogger();\n\n    public ${modClass}() {\n        IEventBus bus = FMLJavaModLoadingContext.get().getModEventBus();\n        ModBlocks.register(bus);\n        ModItems.register(bus);\n        ModCreativeTabs.register(bus);\n    }\n}\n`);

  await write(path.join(pkgDir, 'registry/ModItems.java'), `package ${project.packageName}.registry;\n\nimport net.minecraft.world.food.FoodProperties;\nimport net.minecraft.world.item.AxeItem;\nimport net.minecraft.world.item.BlockItem;\nimport net.minecraft.world.item.HoeItem;\nimport net.minecraft.world.item.Item;\nimport net.minecraft.world.item.PickaxeItem;\nimport net.minecraft.world.item.ShovelItem;\nimport net.minecraft.world.item.SwordItem;\nimport net.minecraft.world.item.Tiers;\nimport net.minecraftforge.registries.DeferredRegister;\nimport net.minecraftforge.registries.ForgeRegistries;\nimport net.minecraftforge.registries.RegistryObject;\nimport net.minecraftforge.eventbus.api.IEventBus;\nimport ${project.packageName}.${modClass};\n\npublic class ModItems {\n    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, ${modClass}.MODID);\n${items.map(i => `    public static final RegistryObject<Item> ${constantName(i.id)} = ITEMS.register("${i.id}", () -> ${itemFactoryCode(i)});`).join('\n')}\n${blocks.map(b => `    public static final RegistryObject<Item> ${constantName(b.id)}_ITEM = ITEMS.register("${b.id}", () -> new BlockItem(ModBlocks.${constantName(b.id)}.get(), new Item.Properties()));`).join('\n')}\n\n    public static void register(IEventBus bus) { ITEMS.register(bus); }\n}\n`);

  await write(path.join(pkgDir, 'registry/ModBlocks.java'), `package ${project.packageName}.registry;\n\nimport net.minecraft.world.level.block.Block;\nimport net.minecraft.world.level.block.SoundType;\nimport net.minecraft.world.level.block.state.BlockBehaviour;\nimport net.minecraft.world.level.material.MapColor;\nimport net.minecraftforge.registries.DeferredRegister;\nimport net.minecraftforge.registries.ForgeRegistries;\nimport net.minecraftforge.registries.RegistryObject;\nimport net.minecraftforge.eventbus.api.IEventBus;\nimport ${project.packageName}.${modClass};\n\npublic class ModBlocks {\n    public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, ${modClass}.MODID);\n${blocks.map(b => `    public static final RegistryObject<Block> ${constantName(b.id)} = BLOCKS.register("${b.id}", () -> new Block(${blockPropertiesCode(b)}));`).join('\n')}\n\n    public static void register(IEventBus bus) { BLOCKS.register(bus); }\n}\n`);

  await write(path.join(pkgDir, 'registry/ModCreativeTabs.java'), `package ${project.packageName}.registry;\n\nimport net.minecraft.core.registries.Registries;\nimport net.minecraft.network.chat.Component;\nimport net.minecraft.world.item.CreativeModeTab;\nimport net.minecraft.world.item.ItemStack;\nimport net.minecraft.world.item.Items;\nimport net.minecraftforge.eventbus.api.IEventBus;\nimport net.minecraftforge.registries.DeferredRegister;\nimport net.minecraftforge.registries.RegistryObject;\nimport ${project.packageName}.${modClass};\n\npublic class ModCreativeTabs {\n    public static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, ${modClass}.MODID);\n    public static final RegistryObject<CreativeModeTab> MAIN_TAB = TABS.register("${project.modId}_tab", () -> CreativeModeTab.builder()\n        .title(Component.translatable("itemGroup.${project.modId}"))\n        .icon(() -> new ItemStack(Items.CRAFTING_TABLE))\n        .displayItems((params, output) -> {\n${items.map(i => `            output.accept(ModItems.${constantName(i.id)}.get());`).join('\n')}\n${blocks.map(b => `            output.accept(ModItems.${constantName(b.id)}_ITEM.get());`).join('\n')}\n        }).build());\n    public static void register(IEventBus bus) { TABS.register(bus); }\n}\n`);

  if (logicIR.length > 0) {
    await write(path.join(pkgDir, 'logic/Cooldowns.java'), generateCooldowns(project.packageName));
    await write(path.join(pkgDir, 'logic/BlockForgeItemUtils.java'), generateItemUtils(project.packageName));
    await write(path.join(pkgDir, 'logic/BlockForgeGameActions.java'), generateGameActions(project.packageName));
    for (const [index, ir] of logicIR.entries()) {
      const code = generateForgeEventHandler(project.packageName, ir).replace(/GeneratedEventHandlers/g, `GeneratedEventHandlers${index + 1}`);
      await write(path.join(pkgDir, `logic/GeneratedEventHandlers${index + 1}.java`), code);
    }
  }

  await write(path.join(resDir, 'META-INF/mods.toml'), `modLoader="javafml"\nloaderVersion="[47,)"\nlicense="${project.license}"\n[[mods]]\nmodId="${project.modId}"\nversion="1.0.0"\ndisplayName="${project.displayName}"\nauthors="${project.author}"\ndescription='''${project.description}'''\n`);
  await writeJson(path.join(resDir, 'pack.mcmeta'), { pack: { pack_format: 15, description: project.displayName } });

  const zh: Record<string, string> = { [`itemGroup.${project.modId}`]: project.displayName };
  const en: Record<string, string> = { [`itemGroup.${project.modId}`]: project.displayName };
  for (const i of items) { zh[`item.${project.modId}.${i.id}`] = i.displayName.zh_cn; en[`item.${project.modId}.${i.id}`] = i.displayName.en_us; }
  for (const b of blocks) { zh[`block.${project.modId}.${b.id}`] = b.displayName.zh_cn; en[`block.${project.modId}.${b.id}`] = b.displayName.en_us; }
  await writeJson(path.join(resDir, `assets/${project.modId}/lang/zh_cn.json`), zh);
  await writeJson(path.join(resDir, `assets/${project.modId}/lang/en_us.json`), en);

  for (const i of items) await writeJson(path.join(resDir, `assets/${project.modId}/models/item/${i.id}.json`), { parent: 'item/generated', textures: { layer0: `${project.modId}:item/${i.properties.texture || i.id}` } });
  for (const b of blocks) {
    await writeJson(path.join(resDir, `assets/${project.modId}/models/block/${b.id}.json`), { parent: 'block/cube_all', textures: { all: `${project.modId}:block/${b.properties.textureAll || b.id}` } });
    await writeJson(path.join(resDir, `assets/${project.modId}/models/item/${b.id}.json`), { parent: `${project.modId}:block/${b.id}` });
    await writeJson(path.join(resDir, `assets/${project.modId}/blockstates/${b.id}.json`), { variants: { '': { model: `${project.modId}:block/${b.id}` } } });
  }

  for (const recipe of recipes) await writeJson(path.join(resDir, `data/${project.modId}/recipes/${recipe.id}.json`), recipeJson(project, recipe));
  for (const loot of lootTables) await writeJson(path.join(resDir, `data/${project.modId}/loot_tables/blocks/${loot.properties.targetBlock || loot.id}.json`), lootTableJson(project, loot));
  for (const fn of functions) await write(path.join(resDir, `data/${project.modId}/functions/${fn.id}.mcfunction`), `${fn.properties.commands.trim()}\n`);

  const copied = await copyResourcesToForge(projectDir, project.modId);
  return { root, copiedResources: copied.length };
}
