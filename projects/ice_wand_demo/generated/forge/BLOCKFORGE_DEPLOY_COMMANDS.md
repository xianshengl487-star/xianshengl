# BlockForge Forge 构建与部署命令

项目：Ice Wand Demo (ice_wand_demo)

已默认使用阿里云 Maven 公共仓库和阿里云 Gradle 插件仓库优先解析通用依赖，Forge 专用依赖走 MinecraftForge 官方仓库兜底。

说明：BMCLAPI 在部分 JDK/Gradle 组合下会出现 TLS 握手失败，BlockForge 默认不再把它写入 Gradle 仓库列表。

## Windows 本地客户端

```powershell
cd generated\forge
powershell -ExecutionPolicy Bypass -File .\blockforge-setup-env.ps1
powershell -ExecutionPolicy Bypass -File .\blockforge-check-env.ps1
powershell -ExecutionPolicy Bypass -File .\blockforge-deploy-local.ps1 -Build
```

如需用 winget 安装缺失工具：

```powershell
powershell -ExecutionPolicy Bypass -File .\blockforge-setup-env.ps1 -InstallMissing
```

## 仅构建

```powershell
cd generated\forge
powershell -ExecutionPolicy Bypass -File .\blockforge-check-env.ps1
gradle build
```

如果以后为项目加入 Gradle Wrapper，请把 `gradle build` 替换为 `.\gradlew.bat build`。

## 自定义 Minecraft 目录

```powershell
powershell -ExecutionPolicy Bypass -File .\blockforge-deploy-local.ps1 -Build -MinecraftDir "D:\Games\.minecraft"
```

部署脚本会把 `build/libs` 中最新的 jar 复制到 `<MinecraftDir>/mods`。
