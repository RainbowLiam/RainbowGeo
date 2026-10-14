# RainbowGeo（文波地理）· 3D 地理教学工具集 v2.0

在线试用站（GitHub Pages）：8 款地理教学工具，浏览器直接运行，无需安装。

- **品牌**：RainbowGeo（英文主） · 文波地理（中文名，版权信息中注明）
- **性质**：在线试用版，仅用于课堂教学评估与体验
- **离线单文件版**：为商业授权产品，不在本仓库提供；联系 `rainbowgeo@qq.com`
- **v2.0 变化**：全部工具由单文件 HTML 重构为「HTML + CSS + JS」多文件结构（样式、脚本、库分离），并新增 2 款工具；地球仪与地形编辑器做了防拷贝混缩（terser 混淆压缩）

## 工具列表

| 工具 | 目录 | 版本 | 说明 |
|---|---|---|---|
| 3D 超级地球仪 | `tools/globe/` | V11.0A（混缩） | 昼夜、晨昏线、经纬网、公转、多源 CDN 智能加载 |
| 3D 世界地形图生成器 | `tools/terrain-gen/` | v2.0 | 全球地形可视化与智能 LOD 加载（地形数据外置懒加载） |
| 3D 超级地形编辑器 | `tools/terrain-edit/` | V12.0（混缩） | 实时抬升、雕刻、平滑、等高线、水系统、剖面 |
| 答题竞技场 | `tools/quiz/` | V3.0（新增） | 单人挑战 / 双人对战 / 抢答擂台，Excel/Word/PPT 一键导入 |
| 中国行政区划拼图 | `tools/china-map/` | V3.0（新增） | 单人拼图 / 识图挑战 / 轮廓识别 / 记忆挑战 / 探索地图 |
| 学生成绩条管理系统 | `tools/grades/` | — | 成绩条批量生成、编辑与 Word 导出 |
| 超级座位管理器 | `tools/seats/` | v2.0 | 教室座位智能编排、调整与导出 |
| 课堂点名器 | `tools/roll-call/` | v1.2 | 4 种风格 + 走马灯，Excel 导入名单随机点名 |

## 目录结构

```
rainbowgeo/
├── index.html                 # 品牌首页（8 款工具导航）
├── assets/
│   ├── css/app.css            # 共享样式（rg- 前缀隔离）
│   ├── js/boot.js             # 共享引导（品牌栏/版权栏自动注入）
│   └── img/brand-logo.jpg     # 品牌商标占位图（替换同名文件即全局生效）
└── tools/
    ├── globe/                 # 3D 超级地球仪（overlay 悬浮共享层）
    │   ├── index.html         #   页面结构 + 库引用
    │   ├── css/style.css      #   样式（已压缩）
    │   └── js/
    │       ├── loader.js      #   多源 CDN 探测 + importmap 注入 + 主程序装载（已压缩）
    │       ├── app.js         #   主程序模块（terser 混淆压缩，防拷贝）
    │       └── china-borders.js # 中国边界数据
    ├── terrain-gen/           # 地形生成器
    │   ├── index.html
    │   ├── css/style.css
    │   ├── js/app.js          # 自包含模块（已压缩产物）
    │   └── data/              # 地形 PNG（懒加载）
    ├── terrain-edit/          # 地形编辑器（混缩）
    │   ├── index.html
    │   ├── css/style.css      # 已压缩
    │   ├── js/
    │   │   ├── loader.js      # CDN 探测 + importmap 注入 + 主程序装载（已压缩）
    │   │   └── app.js         # 主程序模块（terser 混淆压缩，防拷贝）
    │   ├── bgm.mp3            # 背景音乐
    │   ├── gada.mp3           # 提示音效
    │   └── RJ.json            # 预设配置数据
    ├── quiz/                  # 答题竞技场（新增）
    │   ├── index.html
    │   ├── css/style.css
    │   └── js/app.js
    ├── china-map/             # 中国行政区划拼图（新增）
    │   ├── index.html
    │   ├── css/style.css
    │   └── js/app.js
    ├── grades/  seats/  roll-call/
    │   ├── index.html
    │   ├── css/style.css
    │   └── js/app.js
    └── _demo/                 # 共享层接入示例（非站点内容）
```

每个工具的 `index.html` 只保留页面结构与资源引用：`<link>` 指向 `css/style.css`，`<script src>` 指向 `js/app*.js`，第三方库（three.js / SheetJS / ECharts / mammoth / JSZip）统一经 CDN 引用。

## 本地预览

任选其一：

1. 直接双击 `index.html` 打开（部分功能受 file:// 限制，推荐方式 2）
2. 起本地静态服务器（推荐）：
   ```bash
   cd rainbowgeo
   python3 -m http.server 8080
   # 浏览器访问 http://localhost:8080
   ```
   或
   ```bash
   npx serve .
   ```

## 部署到 GitHub Pages

1. **推送本目录**（将 `rainbowgeo/` 作为仓库根目录）：
   ```bash
   cd rainbowgeo
   git add .
   git commit -m "RainbowGeo v2.0：8 款工具，多文件结构重构"
   git push
   ```
2. **开启 Pages**：仓库 Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` / root → Save
3. **生效**：约 1 分钟后访问 `https://<你的用户名>.github.io/<仓库名>/`

> 注意：`.nojekyll` 已包含，确保下划线开头的 `_demo/` 等目录不被 Jekyll 忽略；`_shots/` 自检截图已通过 `.gitignore` 排除。若仍以「上传 zip」方式发布，工作流 `unzip.yml` 会在 push 时自动解压 `rainbowgeo-root.zip`（无该文件时自动跳过，不影响直接推送）。

## 技术要点

- 第三方库通过 CDN 加载（three.js / SheetJS / ECharts / mammoth / JSZip，jsDelivr / unpkg / npmmirror 多源），有网优先联网
- 3D 工具采用 **importmap + ES Module**：`importmap` 必须内联在 HTML 中；主程序模块以外部 `js/app.js` 装载，由 `js/loader.js` 先探测 CDN 源、注入 importmap 再导入
- 地形生成器的地形 PNG 外置懒加载：首屏体积显著下降
- 共享层（`assets/`）统一注入品牌栏 + 版权栏 + 试用水印，`window.RainbowGeo` 命名空间可供工具页调用
- **防拷贝混缩**：3D 超级地球仪、3D 超级地形编辑器的主程序与加载器经 terser `compress + mangle` 混淆压缩，样式经 clean-css 压缩；未压缩源码不随仓库发布
- 在线版为多文件结构，不可直接"另存为单文件"使用；离线单文件版为独立出售产品

## 版权声明

© 2026 RainbowGeo（文波地理）· 保留所有权利

本仓库全部工具为在线试用版本。未经 RainbowGeo 授权，禁止商用、转载、二次分发。商业授权、离线单文件版采购请联系：`rainbowgeo@qq.com`
