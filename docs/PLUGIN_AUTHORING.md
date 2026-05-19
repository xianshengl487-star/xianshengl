# BlockForge 插件开发指南

BlockForge 插件用于把工作台扩展成一个可分享的平台。插件当前采用声明式 `manifest.json`，可以贡献工作台卡片、快捷动作、AI 提示、元素蓝图和教程链接，但不会执行第三方 JavaScript。

## 适合做什么

- 做一组常用元素蓝图，例如武器、工具、矿石、机器方块、药水、附魔、配方。
- 做 AI 提示预设，例如材质生成、模型生成、节点逻辑、整项工程改造。
- 做玩法包入口，例如“会呼吸的矿石”“自动种植方块”“服务端欢迎指令”。
- 做教程入口，把团队自己的制作规范、GitHub 文档或视频教程挂到插件工坊。

## 插件包结构

把下列文件夹打包成 `.zip`，扩展名也可以改成 `.bfplugin`：

```text
my_plugin.bfplugin
├─ manifest.json
├─ README.md
├─ icon.png
├─ docs/
└─ assets/
```

`manifest.json` 是唯一必需文件。安装后插件会保存到当前项目的 `editor/plugins/`，可以跟随项目快照一起保存。BlockForge 也提供“导出”按钮，可以把已安装插件重新打包成 `.bfplugin` 分享给别人。

## 最小 manifest

```json
{
  "kind": "blockforge.plugin",
  "schemaVersion": "0.1.0",
  "id": "example.magic_tools",
  "name": "魔法工具扩展",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "给 BlockForge 增加魔法工具蓝图和 AI 提示。",
  "compatibleBlockForge": "0.1.0",
  "compatibleMinecraft": ["1.20.1"],
  "compatibleLoaders": ["forge", "fabric"],
  "tags": ["magic", "tools"],
  "safety": "declarative",
  "allowExecutableCode": false,
  "contributes": {
    "cards": [
      {
        "id": "magic_pickaxe_card",
        "title": "会唱歌的魔法镐",
        "description": "创建一个带音效和粒子提示的工具蓝图。",
        "tone": "ore",
        "actionId": "magic_pickaxe_action",
        "tags": ["tool", "particle"]
      }
    ],
    "actions": [
      {
        "id": "magic_pickaxe_action",
        "label": "生成魔法镐蓝图",
        "description": "创建一个耐久、伤害、速度已经配置好的工具元素。",
        "kind": "create_element_blueprint",
        "blueprint": {
          "id": "magic_pickaxe",
          "label": "魔法镐",
          "kind": "tool",
          "elementId": "singing_pickaxe",
          "zhName": "会唱歌的魔法镐",
          "description": "挖矿时可以触发音效和粒子逻辑的工具。",
          "properties": {
            "itemKind": "tool_pickaxe",
            "maxStackSize": 1,
            "durability": 512,
            "tier": "DIAMOND",
            "attackDamage": 2,
            "attackSpeed": -2.8,
            "texture": "singing_pickaxe"
          }
        }
      }
    ],
    "aiPrompts": [
      {
        "id": "magic_tool_logic",
        "label": "魔法工具逻辑",
        "target": "logic",
        "prompt": "生成一个工具挖掘方块时播放音效、生成粒子、并根据变量累计能量的节点图草案。",
        "description": "适合接到红石逻辑节点。"
      }
    ],
    "docs": [
      {
        "id": "author_guide",
        "title": "插件作者说明",
        "url": "https://github.com/xianshengl487-star/xianshengl",
        "description": "项目主页与后续文档入口。"
      }
    ]
  }
}
```

## 贡献点

| 字段 | 用途 |
| --- | --- |
| `cards` | 在“插件工坊”显示的创意卡片，可绑定一个 action。 |
| `actions` | 可执行的安全动作，例如打开页面、写入 AI 提示、创建元素蓝图。 |
| `aiPrompts` | 给聊天、节点、贴图、模型、特色玩法、工程大改提供提示词。 |
| `elementBlueprints` | 直接生成物品、工具、方块、药水、附魔、配方、掉落表等元素草稿。 |
| `docs` | 插件文档链接。 |

## 支持的 action.kind

| kind | 说明 |
| --- | --- |
| `open_view` | 打开 BlockForge 内置页面。 |
| `set_ai_prompt` | 把插件提示词写入对应 AI 输入框。 |
| `create_element_blueprint` | 根据蓝图创建元素并进入属性编辑器。 |
| `open_external_doc` | 打开 http/https 文档链接。 |

## 支持的元素蓝图 kind

`item`、`tool`、`block`、`recipe`、`loot_table`、`function`、`mob_effect`、`potion`、`enchantment`。

工具建议使用 `kind: "tool"`，再用 `properties.itemKind` 细分为 `tool_pickaxe`、`tool_axe`、`tool_shovel`、`tool_hoe`、`weapon_sword` 或 `weapon_axe`。

## 安全边界

- 插件不能直接执行 JavaScript。
- 插件不能读取本机 API Key。
- 插件不能直接写入 `generated/`、`exports/`、`logs/`。
- AI 提示只能写入输入框或草案，不会绕过用户确认直接改 Java。
- 插件包应避免包含真实密钥、私人服务器地址或个人聊天记录。

## 推荐发布流程

1. 在“插件工坊”生成插件模板。
2. 编辑 `manifest.json`，先只保留 1 个卡片和 1 个动作。
3. 导入插件包，确认卡片、动作和蓝图可以运行。
4. 加入更多 AI 提示、文档和元素蓝图。
5. 用“导出”按钮生成 `.bfplugin`。
6. 发布到 GitHub，并在 README 里说明支持的 Minecraft 版本、加载器和使用方式。
