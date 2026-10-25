<div align="center">

<img src="docs/readme/hero.svg" width="100%" alt="兔岚咪 TORAMI — 奶油粉色、蝴蝶结与 YUHA 的桌面小心动" />

# 兔岚咪 · TORAMI

**让 YUHA 的一点点可爱，在你的 Mac 桌面住下来。**

Hearts2Hearts · YUHA · TORAMUI / 토라뮈 / 兔岚咪

<p>
  <img alt="macOS 13+ · Apple Silicon" src="https://img.shields.io/badge/macOS_13%2B-Apple_Silicon-9e7489?style=flat-square" />
  <img alt="Chinese and Korean interface" src="https://img.shields.io/badge/界面-中文_·_한국어-e5a4bd?style=flat-square" />
  <img alt="Version 0.5.1" src="https://img.shields.io/badge/version-0.5.1-caa486?style=flat-square" />
  <img alt="Original code is MIT licensed" src="https://img.shields.io/badge/code-MIT-b78ba5?style=flat-square" />
</p>

[认识兔岚咪](#meet-torami) · [和她玩](#play) · [启动项目](#start) · [开发与定制](#develop) · [素材与致谢](#credits)

</div>

<a id="meet-torami"></a>

## 🎀 你的桌面，来了一位小住客

她会眨眼、晃耳朵，走累了就坐一会儿；被摸摸时冒出小爱心，害羞时把长耳朵折下来挡住脸。把她轻轻放到窗口上，她会沿着顶边走到边缘，再跳回桌面。

这个项目从 **YUHA 和兔岚咪的小表情**出发，把那句熟悉的“兔岚咪生气了，哼！”做成了可以点出来的桌面互动：小拳拳贴脸、鼓脸、转头，再配上短短的韩语原声。

<p align="center">
  <img src="docs/readme/moments.svg" width="100%" alt="三张兔岚咪心情卡：日常陪伴、耳朵遮脸、生气了哼" />
</p>

> **Fan-made, with love.** 一个献给 Hearts2Hearts、YUHA 和兔岚咪的粉丝桌宠项目。角色采用可编辑的矢量绘制，非官方应用。

<a id="play"></a>

## ♡ 和她玩一会儿

| 小动作 | 兔岚咪的回应 |
| :--- | :--- |
| **轻轻点一下** | 摸摸、冒爱心；睡着时会醒来。 |
| **双击** | 开心挥手，轻轻跳一下。 |
| **拖起来再松手** | 拎起、下落、落地轻弹；快速甩动后松手还能抛出去。 |
| **害羞** | 折下长耳朵遮眼睛，再偷偷看一眼。 |
| **生气了，哼！** | YUHA 的 **2.35 秒韩语原声**，配合鼓脸、贴脸小拳拳和转头；声音可关闭。 |
| **放到窗口顶边** | 站稳后沿顶边走，到边缘再跳回桌面；窗口移动时会跟着移动。 |
| **自己去玩 / 跟随鼠标** | 在桌面巡逻、坐下、摇摆，或者跟着鼠标的横向位置走。 |
| **再来一只** | 最多五只兔岚咪，各自独立互动。 |

### 安静陪伴，也很认真

- **全屏时躲起来**：系统绿色按钮全屏、视频内全屏都会自动隐藏，退出后恢复；兼容刘海屏。
- **中韩切换**：菜单、气泡、统计和提示支持 **中文 / 한국어**，切换不会打断当前动作。
- **透明、置顶、可拖动**：透明区域让鼠标穿过，也可以开启整个桌宠的鼠标穿透。
- **记住你的习惯**：大小、声音、语言、巡逻、全屏隐藏，以及首只桌宠的位置与睡眠状态会保存。
- **本地运行**：无需联网，不读取窗口标题或内容，不申请屏幕录制、摄像头或麦克风权限。

<details>
<summary><b>🎛 右键菜单与快捷键</b></summary>

右键菜单只有七个一级入口：**互动、陪伴方式、暂停、声音、设置、语言、退出**。

| 想做什么 | 去哪里找 |
| :--- | :--- |
| 摸摸 / 害羞 / 生气 / 开心跳跃 | 互动 |
| 自由活动 / 跟随 / 坐下 / 摇摆 / 睡觉 | 陪伴方式 |
| 大小 / 自动巡逻 / 全屏隐藏 | 设置 |
| 多只管理 / 统计 / 鼠标穿透 / 隐藏 / 重置位置 | 设置 |
| 中文 / 한국어 | 语言 / 언어 |

**`⌘ ⇧ T`** 隐藏或找回所有兔岚咪，鼠标穿透时会恢复交互。全屏隐藏期间不会被强行叫出。

菜单栏里的小兔子也能找回桌宠。移走最后一只后，应用仍留在菜单栏，可以重新召唤。

</details>

<details>
<summary><b>🪟 关于站在窗口上，以及轻轻推窗口</b></summary>

把兔岚咪的脚靠近其他应用**露出的窗口顶边**，再松手。上方需要留得下整只兔岚咪，所以最大化窗口通常不适合停留。

她会沿顶边走到边缘再跳下；关闭桌面自动巡逻也可以这样玩。指定坐下或睡觉可以让她留在窗口上，恢复自由活动后继续走。窗口消失或顶边被遮住时，她会掉下来。

**设置 → 窗口互动 → 轻轻推窗口**可把站着的窗口向侧边推约 120 点。“推过的窗口归位”会尝试恢复原位置，退出时也会尝试归还。

推窗口需要 macOS **辅助功能**权限，仅在主动选择这个动作时提示。没有这项权限，其他互动照常可用。

</details>

<a id="start"></a>

## 🍓 把兔岚咪接回桌面

当前目标平台：**Apple 芯片 Mac · macOS 13 或更新版本**。

### 从源码启动

先安装 Node.js、npm 和 Xcode Command Line Tools，然后运行：

```bash
git clone https://github.com/yigechen07/torami.git
cd torami
npm ci
npm start
```

第一次启动会生成角色页面、图标，并编译读取 macOS 窗口边界的小工具。

### 打包成应用

```bash
npm run package
```

完成后打开 `release/mac-arm64/兔岚咪.app`。生成 DMG 可使用 `npm run dist`。

当前为本地粉丝试作，应用未经过 Apple Developer 签名或公证；仓库提供源码，构建产物不会提交到 Git。

<a id="develop"></a>

## 🧵 给她缝一点新花样

桌宠使用 **Electron + 分层 SVG + CSS 动画**，通过小型 Swift 工具读取窗口边界。没有 Live2D 模型依赖，角色和动作都可以直接编辑。

```text
torami/
├── src/pet/                 # 兔岚咪角色、动作、气泡与中韩翻译
│   ├── torami.svg           # 可编辑的分层矢量角色
│   ├── pet.css              # 呼吸、走路、害羞与生气动作
│   ├── performance.js       # 原声与表情的时间轴
│   └── i18n.js              # 中文 / 한국어
├── src/pet-controller.cjs   # 拖拽、互动、窗口行走与单只行为
├── src/fullscreen.cjs       # 系统 / 刘海屏 / 视频全屏识别
├── src/popup-menu.cjs       # 原生菜单与子菜单显示
├── native/                 # macOS 窗口边界与显式推窗口
├── scripts/                # 生成页面、图标和 README 插画
└── test/                   # 物理、落点、设置与全屏回归检查
```

| 命令 | 用途 |
| :--- | :--- |
| `npm test` | 物理边界、窗口遮挡、落地、设置恢复、中韩翻译与全屏判断。 |
| `npm run check` | JavaScript 语法检查。 |
| `npm run smoke` | 实际启动 Electron，验证原声、菜单、多只、窗口行走及系统 / 视频全屏。 |
| `npm run icons` | 重新生成角色页面、图标和原生工具。 |
| `node scripts/build-readme-art.cjs` | 从同一份角色 SVG 重新生成 README 插画。 |

`smoke` 使用独立临时设置，声音输出静音，不改日常位置。独立的 AppKit 全屏验证窗口位于 `test/fixtures/fullscreen.swift`，覆盖绿色按钮全屏与视频式全屏浮层。

想加新的可爱动作，可以从角色图层和 `pet.css` 开始；想改互动逻辑，先看 `pet-controller.cjs`。更多实现记录见[参考视频功能对照](docs/reference-features.md)。

<details>
<summary><b>💌 几个小问题</b></summary>

**兔岚咪不见了？** 先退出全屏，再点击菜单栏小兔子或按 `⌘ ⇧ T`。也可以在设置中重置位置。

**为什么放不到窗口上？** 确认已开启窗口互动，顶边露出，且窗口上方有足够空间容纳兔岚咪。

**怎么停止声音？** 右键关闭“声音”，动作仍会保留。暂停会同时暂停移动、动画与声音。

**支持 Windows / Intel Mac 吗？** 当前打包与原生窗口互动面向 Apple 芯片 Mac，其他平台尚未验证。

**设置放在哪里？** `~/Library/Application Support/兔岚咪/settings.json`，保存在本机。

</details>

<a id="credits"></a>

## ♡ 灵感、素材与致谢

这个小项目的心动来源是 **Hearts2Hearts 的 YUHA 与 TORAMUI**，也感谢桌宠社区带来的互动灵感。

- **角色**：手工绘制的兔岚咪矢量粉丝试作，非官方立绘或原版动画帧。
- **YUHA 原声**：来自 [삐진 토라뮈 모음집](https://www.youtube.com/shorts/nwy38Jg5PHQ) 的 2.35 秒片段，原始韩语，无合成或克隆声音；[来源与处理记录](src/assets/audio/README.md)。
- **桌宠实现参考**：[AHaldner/desktop-pet](https://github.com/AHaldner/desktop-pet)、[IvenKooLab/desktop-pet](https://github.com/IvenKooLab/desktop-pet)。
- **窗口互动参考**：[凉凉最爱4536 的桌宠视频](https://www.douyin.com/video/7699216927968808243)，功能独立实现，未打包视频作者的角色帧或程序。

本项目的原创代码采用 [MIT License](LICENSE)。**角色形象、名称、相关商标与第三方录音不属于 MIT 授权范围**，相关权利归各自权利人所有。完整说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

<p align="center">
  <img src="docs/readme/footer.svg" width="100%" alt="Made with little hearts — for YUHA, TORAMUI and your everyday" />
</p>
