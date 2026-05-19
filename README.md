<p align="center">
  <img src="assets/github-banner.svg" alt="BlockForge Studio banner" width="100%">
</p>

<h1 align="center">BlockForge Studio</h1>

<p align="center">
  一个偏向 VS Code 工作流、面向 Minecraft Java 模组制作的桌面编辑器。
  它把项目、元素、材质、节点逻辑、GUI、Forge/Fabric/Paper 生成、构建日志和 AI 辅助放进同一个工作台。
</p>

<p align="center">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-Desktop-47848F?style=for-the-badge&logo=electron&logoColor=white">
  <img alt="React" src="https://img.shields.io/badge/React-UI-61DAFB?style=for-the-badge&logo=react&logoColor=111827">
  <img alt="Forge" src="https://img.shields.io/badge/Forge-1.20.1-F16436?style=for-the-badge">
  <img alt="Chinese UI" src="https://img.shields.io/badge/中文界面-优先-2563EB?style=for-the-badge">
</p>

## 项目愿景

BlockForge Studio 不是网页玩具，而是一个本地桌面软件。它希望把“做一个能运行的 Minecraft 模组”变成一条更顺手的路线：先创建项目，再放置物品、方块、药水、附魔、配方和战利品表，随后绘制材质、编辑 3D 模型、连接事件节点，最后生成工程并构建 jar。

它的界面正在向“像 VS Code 一样组织项目，像 MCreator 一样低门槛制作内容”的方向靠近。首版重点是闭环可用，后续会继续补更完整的 Forge/Fabric/Paper 生态能力。

## 已有能力

| 模块 | 内容 |
| --- | --- |
| 桌面工作台 | Electron + React，四区布局，项目树、编辑区、属性区、日志区 |
| 项目系统 | 新建/打开项目、最近项目、快照、导出、完成项目列表 |
| 元素编辑 | 物品、工具、方块、配方、战利品表、mcfunction、药水、附魔、状态效果 |
| 武器装备 | 剑、斧、弓、弩、盾、手枪、步枪、霰弹枪、魔能枪、长枪、战锤、匕首、护甲、食物 |
| 资源编辑 | PNG 导入、内置像素绘制器、独立材质窗口、Blockbench/Minecraft JSON 模型导入与编辑 |
| 节点逻辑 | 事件、条件、动作、变量、NBT、弹丸发射、世界操作、Forge 事件代码预览 |
| GUI 草图 | 标签、按钮、图片、物品槽等基础可视化界面控件 |
| 工程生成 | Forge 1.20.1 工程生成，Fabric/Paper 基础生成，部署脚本，构建前快照 |
| 模组兼容 | 外部模组依赖清单、JEI/Jade/Curios/Create/GeckoLib/Patchouli/Architectury 预设、外部命名空间管理 |
| AI 辅助 | DeepSeek、MIMO、Ollama、LM Studio、OpenAI-compatible 预设；支持对话、材质草稿、模型草稿、节点草案和工程变更计划 |
| 插件扩展 | 声明式插件包、内置插件目录、插件卡片、AI 提示、元素蓝图、文档链接 |

## 快速开始

```bash
npm install
npm run dev
```

启动桌面壳：

```bash
npm run start
```

常用校验：

```bash
npm run typecheck
npm run build
```

## 推荐环境

| 项目 | 建议 |
| --- | --- |
| Node.js | 18 或更高 |
| Java | JDK 17 |
| Minecraft | 1.20.1 |
| Forge | 47.x |
| 系统 | 当前主要按 Windows 本地路径打磨 |

## 基本工作流

1. 在工作台创建或打开项目。
2. 在“方块/物品”里创建核心元素。
3. 在“材质资源”里导入或绘制贴图，必要时编辑 Blockbench JSON 模型。
4. 在“红石逻辑”里创建事件图，添加变量、NBT 条件和动作节点。
5. 在“GUI 容器”里草拟界面。
6. 在“工程输出”里生成 Forge/Fabric/Paper 工程。
7. 构建 jar，检查日志，把成果放到 `exports/`。

## 模组兼容

设置页可以维护外部模组依赖。添加兼容项后，生成器会把依赖写进工程文件：

- Forge：写入 `mods.toml` 和 `build.gradle`
- Fabric：写入 `fabric.mod.json` 推荐依赖和 `build.gradle`
- 项目根：生成 `BLOCKFORGE_COMPATIBILITY.md`

预设里已经放了常见入口：JEI、Jade、Curios、Create、GeckoLib、Patchouli、Architectury。配方和掉落表里也可以直接使用外部 ID，例如 `create:andesite_alloy` 或 `#forge:ingots/copper`。

## AI 与隐私

AI Key 保存到本机应用配置，不写入项目导出包。AI 大改动默认需要先生成计划，再由用户确认应用。发布前可以运行隐私扫描，避免把 API Key、本机路径或临时草稿带到 GitHub。

```bash
npm run privacy:scan
```

## 项目状态

当前版本仍在快速迭代中。目标不是一次做完所有 MCreator 级功能，而是先把“创建内容、生成工程、构建或给出清楚错误”这条路径跑顺，再逐步把事件、模型、动画、服务端插件和第三方扩展补完整。

## 插件开发

插件文档见 [docs/PLUGIN_AUTHORING.md](docs/PLUGIN_AUTHORING.md)。插件目前走声明式安全模型，适合扩展工作台卡片、AI 提示、元素蓝图和文档入口。
## 插件市场

最新版已经加入独立插件页面：[docs/PLUGINS.md](docs/PLUGINS.md)。

当前内置插件包括机械动力 DLC 工作室、配方查看器兼容桥、饰品槽与装备扩展工坊、农夫乐事厨房扩展、魔法科技扩展包、世界动效实验室、服务端插件工具箱和幻想维度工具箱。插件可以提供工作台卡片、AI 提示、元素蓝图、兼容模组预设和文档入口。
