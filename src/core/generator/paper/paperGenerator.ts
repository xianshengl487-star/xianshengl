import fs from 'node:fs/promises';
import path from 'node:path';
import type { FunctionElement, LootTableElement, RecipeElement } from '../../../shared/types/elements';
import type { ProjectModel } from '../../../shared/types/project';

function javaPackagePath(pkg: string): string { return pkg.replace(/\./g, '/'); }
function className(id: string): string { return id.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(''); }
async function write(file: string, content: string) { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content, 'utf8'); }
async function writeJson(file: string, value: unknown) { await write(file, `${JSON.stringify(value, null, 2)}\n`); }

function deployCommandsMarkdown(project: ProjectModel): string {
  return `# BlockForge Paper 构建与部署命令

项目：${project.displayName} (${project.modId})

Paper 版是常见的 Bukkit/Spigot 兼容服务端插件骨架，默认优先使用 Paper 官方仓库与阿里云公共仓库。

## Windows 本地客户端

\`\`\`powershell
cd generated\\paper
powershell -ExecutionPolicy Bypass -File .\\blockforge-setup-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build
\`\`\`

## 仅构建

\`\`\`powershell
cd generated\\paper
powershell -ExecutionPolicy Bypass -File .\\blockforge-check-env.ps1
gradle build
\`\`\`

## 自定义服务端目录

\`\`\`powershell
powershell -ExecutionPolicy Bypass -File .\\blockforge-deploy-local.ps1 -Build -ServerDir "D:\\MinecraftServers\\Paper"
\`\`\`

部署脚本会把 \`build/libs\` 中最新的 jar 复制到 \`<ServerDir>/plugins\`。
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
  throw "未找到 Java。构建 Paper 插件前请安装 JDK 17。"
}

$versionText = ($javaVersion | Out-String)
if ($versionText -notmatch 'version "([0-9]+)') {
  Write-Warning "无法解析 Java 版本。Paper 插件推荐使用 JDK 17。"
} elseif ([int]$Matches[1] -ne 17) {
  Write-Warning "检测到 Java $($Matches[1])。Paper 插件推荐 JDK 17；如果构建失败，请切换到 JDK 17。"
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
  [string]$ServerDir = (Join-Path $env:APPDATA "PaperServer"),
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

$pluginsDir = Join-Path $ServerDir "plugins"
New-Item -ItemType Directory -Force -Path $pluginsDir | Out-Null
$target = Join-Path $pluginsDir $jar.Name
Copy-Item $jar.FullName $target -Force

Write-Host "[BlockForge] 已部署 ${project.modId}: $target"
Write-Host "[BlockForge] 请启动 Paper / Spigot / Bukkit 服务端并加载该插件。"
`;
}

export interface PaperGenerateInput {
  projectDir: string;
  project: ProjectModel;
  recipes?: RecipeElement[];
  lootTables?: LootTableElement[];
  functions?: FunctionElement[];
}

export async function generatePaperProject(input: PaperGenerateInput): Promise<{ root: string; copiedResources: number; preview: string }> {
  const { projectDir, project, recipes = [], lootTables = [], functions = [] } = input;
  const root = path.join(projectDir, 'generated/paper');
  const resolvedRoot = path.resolve(root);
  const resolvedProject = path.resolve(projectDir);
  if (!resolvedRoot.startsWith(resolvedProject)) throw new Error('拒绝清理项目目录之外的 generated/paper 文件夹。');
  await fs.rm(root, { recursive: true, force: true });
  const pkgDir = path.join(root, 'src/main/java', javaPackagePath(project.packageName));
  const resDir = path.join(root, 'src/main/resources');
  await fs.mkdir(root, { recursive: true });

  await write(path.join(root, 'settings.gradle'), `rootProject.name='${project.modId}'\n`);
  await write(path.join(root, 'build.gradle'), `plugins { id 'java' }\n\ngroup='${project.packageName}'\nversion='1.0.0'\nbase { archivesName = '${project.modId}' }\n\njava {\n    toolchain.languageVersion = JavaLanguageVersion.of(17)\n    withSourcesJar()\n}\n\ntasks.withType(JavaCompile).configureEach {\n    options.encoding = 'UTF-8'\n    options.release = 17\n}\n\nrepositories {\n    maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n    maven { name = 'PaperMC'; url = uri('https://repo.papermc.io/repository/maven-public/') }\n    mavenCentral()\n}\n\ndependencies {\n    compileOnly 'io.papermc.paper:paper-api:1.20.1-R0.1-SNAPSHOT'\n}\n\nprocessResources {\n    inputs.property 'version', project.version\n    filteringCharset = 'UTF-8'\n    filesMatching('plugin.yml') {\n        expand version: project.version\n    }\n}\n`);
  await write(path.join(root, 'gradle.properties'), `org.gradle.jvmargs=-Xmx2G -Dfile.encoding=UTF-8\norg.gradle.daemon=false\npaper_api_version=1.20.1-R0.1-SNAPSHOT\nmod_version=1.0.0\n`);
  await write(path.join(root, 'BLOCKFORGE_DEPLOY_COMMANDS.md'), deployCommandsMarkdown(project));
  await write(path.join(root, 'blockforge-setup-env.ps1'), setupEnvScript());
  await write(path.join(root, 'blockforge-check-env.ps1'), checkEnvScript());
  await write(path.join(root, 'blockforge-deploy-local.ps1'), deployLocalScript(project));

  const mainClass = className(project.modId) + 'Plugin';
  await write(path.join(pkgDir, `${mainClass}.java`), `package ${project.packageName};\n\nimport java.util.Objects;\nimport net.kyori.adventure.text.Component;\nimport org.bukkit.Bukkit;\nimport org.bukkit.command.Command;\nimport org.bukkit.command.CommandSender;\nimport org.bukkit.entity.Player;\nimport org.bukkit.event.EventHandler;\nimport org.bukkit.event.Listener;\nimport org.bukkit.event.player.PlayerJoinEvent;\nimport org.bukkit.plugin.java.JavaPlugin;\n\npublic final class ${mainClass} extends JavaPlugin implements Listener {\n    @Override\n    public void onEnable() {\n        saveDefaultConfig();\n        Bukkit.getPluginManager().registerEvents(this, this);\n        Objects.requireNonNull(getCommand("blockforge")).setExecutor(this::handleCommand);\n        getLogger().info("BlockForge Paper 插件已启用");\n    }\n\n    private boolean handleCommand(CommandSender sender, Command command, String label, String[] args) {\n        sender.sendMessage(Component.text("BlockForge Paper 插件已运行，接下来可以继续加指令和事件。"));\n        return true;\n    }\n\n    @EventHandler\n    public void onJoin(PlayerJoinEvent event) {\n        if (!getConfig().getBoolean("welcome-message.enabled", true)) return;\n        event.getPlayer().sendMessage(Component.text(getConfig().getString("welcome-message.text", "欢迎来到 BlockForge Paper 插件")));\n    }\n}\n`);

  await write(path.join(resDir, 'plugin.yml'), `name: ${JSON.stringify(project.displayName)}\nversion: \${version}\nmain: ${JSON.stringify(`${project.packageName}.${mainClass}`)}\ndescription: ${JSON.stringify(project.description)}\nauthor: ${JSON.stringify(project.author)}\napi-version: '1.20'\ncommands:\n  blockforge:\n    description: ${JSON.stringify('查看 BlockForge 插件状态')}\n    usage: /blockforge\n    aliases: [bf, bfstudio]\n`);
  await writeJson(path.join(resDir, 'config.yml'), {
    'welcome-message': {
      enabled: true,
      text: `欢迎来到 ${project.displayName}`
    }
  });

  if (recipes.length > 0 || lootTables.length > 0 || functions.length > 0) {
    await write(path.join(resDir, 'plugin-notes.md'), `# Paper 插件扩展提示\n\n当前项目更适合命令、监听器、权限和配置。\n仍然保留了 ${recipes.length} 个配方、${lootTables.length} 个战利品表、${functions.length} 个函数草稿，但这些更偏向模组 / 数据包内容。\n`);
  }

  const preview = [
    `Paper 插件工程已生成：${root}`,
    `主类：${project.packageName}.${mainClass}`,
    `命令：/blockforge`,
    `部署目录：plugins`
  ].join('\n');

  return { root, copiedResources: 0, preview };
}
