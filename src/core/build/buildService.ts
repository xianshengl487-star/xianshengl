import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { createSnapshot } from '../snapshot/snapshotService';
import { readProject } from '../project/projectService';
import { loaderOutputFolder, loaderShortName, type LoaderId } from '../../shared/types/project';

const BUNDLED_GRADLE_VERSION = '8.14.4';
const GRADLE_DISTRIBUTION_URLS = [
  process.env.BLOCKFORGE_GRADLE_DISTRIBUTION_URL,
  `https://mirrors.cloud.tencent.com/gradle/gradle-${BUNDLED_GRADLE_VERSION}-bin.zip`,
  `https://services.gradle.org/distributions/gradle-${BUNDLED_GRADLE_VERSION}-bin.zip`
].filter(Boolean) as string[];

export interface BuildResult {
  success: boolean;
  logFile: string;
  jarFiles: string[];
  copiedToExports: string[];
  javaOk: boolean;
  gradleCommand: string;
  message: string;
}

function appendLog(onLog: ((line: string) => void) | undefined, text: string) {
  onLog?.(text);
}

async function exists(file: string): Promise<boolean> {
  try { await fs.stat(file); return true; } catch { return false; }
}

function quoteForShell(value: string): string {
  if (/^[\w.-]+$/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

async function run(command: string, args: string[], cwd: string, onLog?: (line: string) => void, shell = false): Promise<{ code: number; log: string }> {
  let log = '';
  return await new Promise(resolve => {
    const child = shell
      ? spawn([quoteForShell(command), ...args].join(' '), [], { cwd, shell: true })
      : spawn(command, args, { cwd, shell: false });
    child.stdout.on('data', d => { const s = String(d); log += s; appendLog(onLog, s); });
    child.stderr.on('data', d => { const s = String(d); log += s; appendLog(onLog, s); });
    child.on('error', error => {
      const s = `${error.message}\n`;
      log += s;
      appendLog(onLog, s);
      resolve({ code: 1, log });
    });
    child.on('close', code => resolve({ code: code ?? 1, log }));
  });
}

function parseJavaMajor(output: string): number | null {
  const match = output.match(/version "(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  if (match[1] === '1' && match[2]) return Number(match[2]);
  return Number(match[1]);
}

async function checkJava17(projectDir: string, onLog?: (line: string) => void): Promise<{ ok: boolean; major: number | null }> {
  const result = await run('java', ['-version'], projectDir, onLog);
  const output = result.log;
  const major = parseJavaMajor(output);
  return { ok: result.code === 0 && major !== null && major >= 17, major };
}

function localGradleCacheDir(): string {
  return process.env.BLOCKFORGE_GRADLE_HOME
    || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.blockforge'), 'BlockForgeStudio', 'gradle');
}

function downloadFile(url: string, target: string, onLog?: (line: string) => void, redirects = 0): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, response => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        if (redirects > 5) {
          reject(new Error('下载 Gradle 时重定向次数过多。'));
          return;
        }
        const nextUrl = new URL(response.headers.location, url).toString();
        downloadFile(nextUrl, target, onLog, redirects + 1).then(resolve, reject);
        return;
      }
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`下载失败，HTTP 状态码 ${response.statusCode}：${url}`));
        return;
      }
      const total = Number(response.headers['content-length'] || 0);
      let received = 0;
      let lastLogged = 0;
      const file = createWriteStream(target);
      response.on('data', chunk => {
        received += chunk.length;
        if (total > 0) {
          const percent = Math.floor((received / total) * 100);
          if (percent >= lastLogged + 20) {
            lastLogged = percent;
            onLog?.(`Gradle 下载进度 ${percent}%...\n`);
          }
        }
      });
      response.pipe(file);
      file.on('finish', () => file.close(error => error ? reject(error) : resolve()));
      file.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function extractZip(zipFile: string, destination: string, onLog?: (line: string) => void): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  const result = process.platform === 'win32'
    ? await run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `Expand-Archive -LiteralPath '${zipFile.replace(/'/g, "''")}' -DestinationPath '${destination.replace(/'/g, "''")}' -Force`], destination, onLog)
    : await run('unzip', ['-q', zipFile, '-d', destination], destination, onLog);
  if (result.code !== 0) throw new Error(`解压 Gradle 发行包失败：${result.log}`);
}

async function ensureBundledGradle(onLog?: (line: string) => void): Promise<string> {
  const cacheDir = localGradleCacheDir();
  const gradleDir = path.join(cacheDir, `gradle-${BUNDLED_GRADLE_VERSION}`);
  const executable = process.platform === 'win32'
    ? path.join(gradleDir, 'bin', 'gradle.bat')
    : path.join(gradleDir, 'bin', 'gradle');
  if (await exists(executable)) return executable;

  const zipFile = path.join(cacheDir, `gradle-${BUNDLED_GRADLE_VERSION}-bin.zip`);
  await fs.mkdir(cacheDir, { recursive: true });
  if (!(await exists(zipFile))) {
    let lastError: unknown;
    for (const [index, url] of GRADLE_DISTRIBUTION_URLS.entries()) {
      try {
        onLog?.(`正在下载 Gradle ${BUNDLED_GRADLE_VERSION}（镜像 ${index + 1}/${GRADLE_DISTRIBUTION_URLS.length}）：${url}\n`);
        await fs.rm(zipFile, { force: true });
        await downloadFile(url, zipFile, onLog);
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        onLog?.(`Gradle 镜像下载失败：${error instanceof Error ? error.message : String(error)}\n`);
      }
    }
    if (lastError) throw lastError;
  }
  onLog?.(`正在解压 Gradle ${BUNDLED_GRADLE_VERSION}...\n`);
  await extractZip(zipFile, cacheDir, onLog);
  if (!(await exists(executable))) throw new Error(`解压后没有找到 Gradle 可执行文件：${executable}`);
  return executable;
}

async function systemGradleAvailable(cwd: string): Promise<boolean> {
  const command = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = await run(command, ['gradle'], cwd);
  return result.code === 0;
}

async function findGradleCommand(forgeDir: string, onLog?: (line: string) => void): Promise<{ command: string; args: string[]; label: string }> {
  const wrapper = process.platform === 'win32' ? path.join(forgeDir, 'gradlew.bat') : path.join(forgeDir, 'gradlew');
  if (await exists(wrapper)) return { command: wrapper, args: ['build'], label: '项目自带 Gradle Wrapper' };
  if (await systemGradleAvailable(forgeDir)) return { command: 'gradle', args: ['build'], label: '系统 Gradle' };
  const bundled = await ensureBundledGradle(onLog);
  return { command: bundled, args: ['build'], label: `BlockForge Gradle ${BUNDLED_GRADLE_VERSION}` };
}

const BAD_FORGE_REPOSITORY_PATTERN = /bmclapi2\.bangbang93\.com|mirrors\.cernet\.edu\.cn\/bmclapi/i;

function gradleSingleQuoted(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sanitizedSettingsGradle(rootProjectName: string): string {
  return `pluginManagement {\n    repositories {\n        maven { name = 'Aliyun Gradle Plugin'; url = uri('https://maven.aliyun.com/repository/gradle-plugin') }\n        maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n        maven { name = 'MinecraftForge Official'; url = uri('https://maven.minecraftforge.net/') }\n        gradlePluginPortal()\n        mavenCentral()\n    }\n}\n\nrootProject.name='${gradleSingleQuoted(rootProjectName)}'\n`;
}

function sanitizedRepositoriesBlock(): string {
  return `repositories {\n    maven { name = 'Aliyun Public'; url = uri('https://maven.aliyun.com/repository/public') }\n    maven { name = 'Aliyun Central'; url = uri('https://maven.aliyun.com/repository/central') }\n    maven { name = 'MinecraftForge Official'; url = uri('https://maven.minecraftforge.net/') }\n    mavenCentral()\n}`;
}

function replaceTopLevelRepositoriesBlock(content: string, block: string): string {
  const match = /(^|\n)repositories\s*\{/m.exec(content);
  if (!match) {
    const dependencyIndex = content.indexOf('\ndependencies');
    if (dependencyIndex >= 0) return `${content.slice(0, dependencyIndex).trimEnd()}\n\n${block}\n${content.slice(dependencyIndex)}`;
    return `${content.trimEnd()}\n\n${block}\n`;
  }

  const start = match.index + (match[1] === '\n' ? 1 : 0);
  const openBrace = content.indexOf('{', start);
  let depth = 0;
  for (let index = openBrace; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return `${content.slice(0, start)}${block}${content.slice(index + 1)}`;
      }
    }
  }
  return `${content.trimEnd()}\n\n${block}\n`;
}

function ensureJavaCompileUtf8(content: string): string {
  if (content.includes("options.encoding = 'UTF-8'")) return content;
  const block = "\ntasks.withType(JavaCompile).configureEach {\n    options.encoding = 'UTF-8'\n}\n";
  const javaLine = /java\s*\{[^\r\n]*\}\r?\n/.exec(content);
  if (javaLine) {
    const insertAt = javaLine.index + javaLine[0].length;
    return `${content.slice(0, insertAt)}${block}${content.slice(insertAt)}`;
  }
  const minecraftIndex = content.indexOf('\nminecraft');
  if (minecraftIndex >= 0) return `${content.slice(0, minecraftIndex)}${block}${content.slice(minecraftIndex)}`;
  return `${content.trimEnd()}\n${block}\n`;
}

async function patchGradleUtf8Properties(forgeDir: string): Promise<boolean> {
  const propertiesFile = path.join(forgeDir, 'gradle.properties');
  const current = await exists(propertiesFile) ? await fs.readFile(propertiesFile, 'utf8') : '';
  let next = current;
  if (/^org\.gradle\.jvmargs=/m.test(next)) {
    next = next.replace(/^org\.gradle\.jvmargs=(.*)$/m, (_match, value: string) => {
      const args = String(value);
      return args.includes('-Dfile.encoding=UTF-8')
        ? `org.gradle.jvmargs=${args}`
        : `org.gradle.jvmargs=${args.trim()} -Dfile.encoding=UTF-8`;
    });
  } else {
    next = `org.gradle.jvmargs=-Xmx2G -Dfile.encoding=UTF-8\n${next}`;
  }
  if (!/^org\.gradle\.daemon=/m.test(next)) next = `${next.trimEnd()}\norg.gradle.daemon=false\n`;
  if (next !== current) {
    await fs.writeFile(propertiesFile, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
    return true;
  }
  return false;
}

async function patchForgeRepositories(forgeDir: string, onLog?: (line: string) => void): Promise<boolean> {
  let changed = false;
  const settingsFile = path.join(forgeDir, 'settings.gradle');
  const buildFile = path.join(forgeDir, 'build.gradle');

  if (await exists(settingsFile)) {
    const settings = await fs.readFile(settingsFile, 'utf8');
    const rootProjectName = settings.match(/rootProject\.name\s*=\s*['"]([^'"]+)['"]/)?.[1] || path.basename(path.dirname(forgeDir));
    if (
      BAD_FORGE_REPOSITORY_PATTERN.test(settings)
      || settings.includes('dependencyResolutionManagement')
      || settings.includes('RepositoriesMode.FAIL_ON_PROJECT_REPOS')
      || !settings.includes('maven.minecraftforge.net')
    ) {
      await fs.writeFile(settingsFile, sanitizedSettingsGradle(rootProjectName), 'utf8');
      changed = true;
    }
  }

  if (await exists(buildFile)) {
    const build = await fs.readFile(buildFile, 'utf8');
    let next = build;
    if (
      BAD_FORGE_REPOSITORY_PATTERN.test(build)
      || !build.includes('maven.aliyun.com/repository/public')
      || !build.includes('maven.minecraftforge.net')
    ) {
      next = replaceTopLevelRepositoriesBlock(next, sanitizedRepositoriesBlock());
    }
    next = ensureJavaCompileUtf8(next);
    if (next !== build) {
      await fs.writeFile(buildFile, next, 'utf8');
      changed = true;
    }
  }

  if (await patchGradleUtf8Properties(forgeDir)) changed = true;

  if (changed) {
    onLog?.('已更新 Forge 构建配置：使用阿里云通用仓库 + MinecraftForge 官方仓库，并固定 Java 源码 UTF-8 编码。\n');
  }
  return changed;
}

export async function buildForgeJar(projectDir: string, onLog?: (line: string) => void): Promise<BuildResult> {
  const logsDir = path.join(projectDir, 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `build_${Date.now()}.log`);
  let log = '';
  const capture = (line: string) => { log += line; onLog?.(line); };

  try {
    await createSnapshot(projectDir, 'before_build');
    capture('构建前快照已创建。\n');
  } catch (error) {
    capture(`创建构建前快照失败：${error instanceof Error ? error.message : String(error)}\n`);
  }

  const forgeDir = path.join(projectDir, 'generated/forge');
  if (!(await exists(path.join(forgeDir, 'build.gradle')))) {
    const message = '还没有生成 Forge 工程。请先执行“生成 Forge”。';
    capture(`${message}\n`);
    await fs.writeFile(logFile, log, 'utf8');
    return { success: false, logFile, jarFiles: [], copiedToExports: [], javaOk: false, gradleCommand: '', message };
  }
  await patchForgeRepositories(forgeDir, capture);

  capture('正在检查 Java 17...\n');
  const java = await checkJava17(projectDir, capture);
  const javaOk = java.ok;
  if (!javaOk) {
    const message = '未检测到 JDK 17。请安装并配置 JDK 17 后再次构建。';
    capture(`${message}\n`);
    await fs.writeFile(logFile, log, 'utf8');
    return { success: false, logFile, jarFiles: [], copiedToExports: [], javaOk, gradleCommand: '', message };
  }
  if (java.major && java.major !== 17) {
    capture(`检测到 Java ${java.major}。Forge 1.20.1 推荐使用 Java 17；如果 Gradle 或 Forge 构建失败，请安装 JDK 17 并把它放到 PATH 最前面。\n`);
  }

  const gradle = await findGradleCommand(forgeDir, capture);
  capture(`正在运行 ${gradle.label}：${gradle.command} ${gradle.args.join(' ')}\n`);
  const result = await run(gradle.command, gradle.args, forgeDir, capture, true);
  const libsDir = path.join(forgeDir, 'build/libs');
  let jarFiles: string[] = [];
  try { jarFiles = (await fs.readdir(libsDir)).filter(f => f.endsWith('.jar')).map(f => path.join(libsDir, f)); } catch {}

  const exportsDir = path.join(projectDir, 'exports');
  await fs.mkdir(exportsDir, { recursive: true });
  const copiedToExports: string[] = [];
  for (const jar of jarFiles) {
    const target = path.join(exportsDir, path.basename(jar));
    await fs.copyFile(jar, target);
    copiedToExports.push(target);
  }
  await fs.writeFile(logFile, log, 'utf8');

  const success = result.code === 0 && jarFiles.length > 0;
  const message = success
    ? `构建成功。已复制 ${copiedToExports.length} 个 jar 到 exports。`
    : result.code === 0
      ? 'Gradle 已结束，但 build/libs 中没有找到 jar。'
      : 'Gradle 构建失败。请查看已保存的日志。';
  return { success, logFile, jarFiles, copiedToExports, javaOk, gradleCommand: gradle.command, message };
}

function generatedRootForLoader(loader: LoaderId): string {
  return path.join('generated', loaderOutputFolder(loader));
}

async function buildGeneratedProjectJar(
  projectDir: string,
  loader: LoaderId,
  onLog?: (line: string) => void
): Promise<BuildResult> {
  const logsDir = path.join(projectDir, 'logs');
  await fs.mkdir(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `build_${loader}_${Date.now()}.log`);
  let log = '';
  const capture = (line: string) => { log += line; onLog?.(line); };
  const projectRoot = path.join(projectDir, generatedRootForLoader(loader));

  try {
    await createSnapshot(projectDir, `before_build_${loader}`);
    capture('构建前快照已创建。\n');
  } catch (error) {
    capture(`创建构建前快照失败：${error instanceof Error ? error.message : String(error)}\n`);
  }

  if (!(await exists(path.join(projectRoot, 'build.gradle')))) {
    const label = loaderShortName(loader);
    const message = `还没有生成 ${label} 工程。请先执行“生成工程”。`;
    capture(`${message}\n`);
    await fs.writeFile(logFile, log, 'utf8');
    return { success: false, logFile, jarFiles: [], copiedToExports: [], javaOk: false, gradleCommand: '', message };
  }

  capture('正在检查 Java 17...\n');
  const java = await checkJava17(projectDir, capture);
  const javaOk = java.ok;
  if (!javaOk) {
    const message = '未检测到 JDK 17。请安装并配置 JDK 17 后再次构建。';
    capture(`${message}\n`);
    await fs.writeFile(logFile, log, 'utf8');
    return { success: false, logFile, jarFiles: [], copiedToExports: [], javaOk, gradleCommand: '', message };
  }
  if (java.major && java.major !== 17) {
    capture(`检测到 Java ${java.major}。${loaderShortName(loader)} 1.20.1 推荐使用 Java 17；如果构建失败，请安装 JDK 17 并把它放到 PATH 最前面。\n`);
  }

  const gradle = await findGradleCommand(projectRoot, capture);
  capture(`正在运行 ${gradle.label}：${gradle.command} ${gradle.args.join(' ')}\n`);
  const result = await run(gradle.command, gradle.args, projectRoot, capture, true);
  const libsDir = path.join(projectRoot, 'build/libs');
  let jarFiles: string[] = [];
  try { jarFiles = (await fs.readdir(libsDir)).filter(f => f.endsWith('.jar')).map(f => path.join(libsDir, f)); } catch {}

  const exportsDir = path.join(projectDir, 'exports');
  await fs.mkdir(exportsDir, { recursive: true });
  const copiedToExports: string[] = [];
  for (const jar of jarFiles) {
    const target = path.join(exportsDir, path.basename(jar));
    await fs.copyFile(jar, target);
    copiedToExports.push(target);
  }
  await fs.writeFile(logFile, log, 'utf8');

  const success = result.code === 0 && jarFiles.length > 0;
  const message = success
    ? `构建成功。已复制 ${copiedToExports.length} 个 jar 到 exports。`
    : result.code === 0
      ? 'Gradle 已结束，但 build/libs 中没有找到 jar。'
      : 'Gradle 构建失败。请查看已保存的日志。';
  return { success, logFile, jarFiles, copiedToExports, javaOk, gradleCommand: gradle.command, message };
}

export async function buildFabricJar(projectDir: string, onLog?: (line: string) => void): Promise<BuildResult> {
  return buildGeneratedProjectJar(projectDir, 'fabric', onLog);
}

export async function buildPaperJar(projectDir: string, onLog?: (line: string) => void): Promise<BuildResult> {
  return buildGeneratedProjectJar(projectDir, 'paper', onLog);
}

export async function buildProjectJar(projectDir: string, onLog?: (line: string) => void): Promise<BuildResult> {
  const project = await readProject(projectDir);
  if (project.primaryLoader === 'fabric') return buildFabricJar(projectDir, onLog);
  if (project.primaryLoader === 'paper') return buildPaperJar(projectDir, onLog);
  return buildForgeJar(projectDir, onLog);
}
