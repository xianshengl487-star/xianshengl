param(
  [string]$MinecraftDir = (Join-Path $env:APPDATA ".minecraft"),
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

if ($Build) {
  if (Test-Path ".\gradlew.bat") {
    & .\gradlew.bat build
  } elseif (Get-Command gradle -ErrorAction SilentlyContinue) {
    & gradle build
  } else {
    throw "Gradle 不可用。请安装 Gradle、加入 Gradle Wrapper，或从 BlockForge Studio 中构建。"
  }
}

$libs = Join-Path $Root "build\libs"
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

Write-Host "[BlockForge] 已部署 ice_wand_demo: $target"
Write-Host "[BlockForge] 请启动 Minecraft Forge 1.20.1 并启用该模组。"
