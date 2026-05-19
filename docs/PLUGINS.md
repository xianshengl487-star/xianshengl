# BlockForge Studio 插件市场

BlockForge 的插件采用声明式 `manifest.json`。插件不会执行第三方代码，而是给工作台贡献卡片、AI 提示、元素蓝图、兼容模组预设和文档入口。这样可以扩展软件能力，同时保持项目文件可读、可审查、可回退。

## 插件能做什么

| 能力 | 用途 |
| --- | --- |
| 工作台卡片 | 在插件工坊显示一个可点击入口，引导用户创建内容或打开提示 |
| 元素蓝图 | 一键生成物品、方块、配方、函数、建筑结构等可继续编辑的元素 |
| AI 提示 | 把 AI 输入框切换到特定任务，比如机械动力附属设计、材质生成、配方检查 |
| 兼容预设 | 安装插件时自动把外部模组 modId 写入项目兼容设置 |
| 文档链接 | 给用户保留官方 Wiki、GitHub、教程和 API 文档入口 |

## 当前内置插件

### 机械动力 DLC 工作室

适合制作 Create / 机械动力附属模组。安装后会加入 `create` 命名空间兼容预设，并提供这些入口：

- Create 依赖配置提示
- 扭矩加工机方块蓝图
- 齿轮合金材料蓝图
- 小型机械工坊建筑蓝图
- Create 风格材质提示
- Create 风格 Blockbench 模型提示
- Create 附属玩法设计提示
- Create 依赖检查提示

推荐流程：

1. 在“插件工坊”安装 `机械动力 DLC 工作室`。
2. 运行“生成扭矩加工机方块”，创建机器方块草稿。
3. 运行“生成齿轮合金材料”，创建中间材料。
4. 运行“小型机械工坊”，创建建筑结构。
5. 到“设置”检查 `create` 兼容项。
6. 到“工程输出”生成 Forge 工程。

说明：Create 的 Gradle 坐标会随发行渠道变化。插件默认只写入兼容依赖和命名空间，不强行写 Gradle 坐标，避免构建被错误坐标卡住。

### 配方查看器兼容桥

适合 JEI / EMI / REI 相关兼容工作。它提供：

- `jei` 与 `emi` 可选依赖预设
- 标签配方蓝图
- 配方查看器说明提示
- 配方清理与风险检查提示

适合在发布前检查：

- 配方结果是否存在
- 是否使用了通用标签
- 输入输出是否适合展示
- 是否缺少本地化说明

### 饰品槽与装备扩展工坊

适合 Curios / Trinkets 饰品、戒指、护符和被动效果。它提供：

- `curios` 与 `trinkets` 兼容预设
- 发条护符物品蓝图
- 被动饰品节点图提示
- NBT 能量、冷却、周期效果设计提示

### 农夫乐事厨房扩展

适合 Farmer's Delight 风格的生活向附属内容。它提供：

- `farmersdelight` 兼容预设
- 特色食物物品蓝图
- 作物、掉落、料理、药水效果的整条内容线提示
- 食物材质生成提示

### 魔法科技扩展包

适合 Botania / Thermal / Create 之间的跨模组材料与机器联动。它提供：

- `botania` 与 `thermal` 兼容预设
- 魔力灌注齿轮材料蓝图
- Thermal 风格机器设计提示
- 魔法科技联动玩法提示

## 兼容预设如何工作

插件里的 `compatibilityPresets` 会在安装时合并到项目的：

- `compatibility.externalMods`
- `compatibility.acceptedNamespaces`

生成器会根据这些设置输出：

- Forge: `mods.toml` 依赖块与兼容说明
- Fabric: `fabric.mod.json` 推荐依赖与兼容说明
- 项目根目录: `BLOCKFORGE_COMPATIBILITY.md`

如果预设里的 `gradleCoordinate` 为空，生成器不会写 Gradle 依赖，只保留兼容声明。这样更适合 Create、JEI、Curios 这类坐标需要按实际版本确认的生态模组。

## 插件文件位置

已安装插件保存在项目目录：

```text
editor/plugins/
```

每个插件包至少包含：

```text
manifest.json
installed.json
```

插件作者可以从软件里的“生成插件模板”开始，详细格式见 [插件作者文档](PLUGIN_AUTHORING.md)。
