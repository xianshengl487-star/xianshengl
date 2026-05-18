param(
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

if (!(Get-Command gradle -ErrorAction SilentlyContinue) -and !(Test-Path ".\gradlew.bat")) {
  Write-Host "[BlockForge] 正在安装 Gradle..."
  winget install --id Gradle.Gradle -e
} else {
  Write-Host "[BlockForge] 已检测到 Gradle 或 Gradle Wrapper。"
}

Write-Host "[BlockForge] 环境安装命令已完成。如果 PATH 有变化，请重启终端。"
