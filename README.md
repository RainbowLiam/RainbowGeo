# RainbowGeo（文波地理）· 3D 地理教学工具集

在线试用站（GitHub Pages）：5 款地理教学工具，浏览器直接运行，无需安装。

- **品牌**：RainbowGeo（英文主） · 文波地理（中文名，版权信息中注明）
- **性质**：在线试用版，仅用于课堂教学评估与体验
- **离线单文件版**：为商业授权产品，不在本仓库提供；联系 `rainbowliam@163.com`

## 工具列表

| 工具 | 目录 | 说明 |
|---|---|---|
| 3D 超级地球仪 | `tools/globe/` | 昼夜、晨昏线、经纬网、公转与标注联动的三维地球模型 |
| 3D 世界地形图生成器 | `tools/terrain-gen/` | 全球地形可视化与智能 LOD 加载（地形数据外置懒加载） |
| 3D 超级地形编辑器 | `tools/terrain-edit/` | 实时抬升、雕刻与平滑的三维地形编辑沙盘 |
| 学生成绩条管理系统 | `tools/grades/` | 成绩条批量生成、编辑与 Word 导出 |
| 超级座位管理器 v2.0 | `tools/seats/` | 教室座位智能编排、调整与导出 |

## 目录结构

```
rainbowgeo/
├── index.html                 # 品牌首页（工具导航）
├── assets/
│   ├── css/app.css            # 共享样式（rg- 前缀隔离）
│   ├── js/boot.js             # 共享引导（品牌栏/版权栏自动注入）
│   └── img/brand-logo.jpg     # 品牌商标占位图（替换同名文件即全局生效）
└── tools/
    ├── globe/index.html
    ├── terrain-gen/index.html + data/（地形 PNG，懒加载）
    ├── terrain-edit/index.html
    ├── grades/index.html
    ├── seats/index.html
    └── _demo/                 # 共享层接入示例（非站点内容）
```

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

1. **创建仓库**：GitHub 新建仓库（如 `rainbowgeo`，Public 或 Private 均可，Pages 需 Public 或 Pro 会员 Private）
2. **推送本目录**（将 `rainbowgeo/` 作为仓库根目录）：
   ```bash
   cd rainbowgeo
   git init
   git add .
   git commit -m "RainbowGeo 在线试用站 v1.0"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. **开启 Pages**：仓库 Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `main` / root → Save
4. **生效**：约 1 分钟后访问 `https://<你的用户名>.github.io/<仓库名>/`

> 注意：`.nojekyll` 已包含，确保下划线开头的 `_demo/` 等目录不被 Jekyll 忽略；`_shots/` 自检截图已通过 `.gitignore` 排除。

## 技术要点

- 在线版库通过 CDN 加载（three.js / SheetJS / ECharts，jsDelivr 等多源），有网优先联网
- 地形生成器的地形 PNG 外置懒加载：首屏体积 5.51 MB → 0.59 MB
- 共享层（`assets/`）统一注入品牌栏 + 版权栏 + 试用水印，`window.RainbowGeo` 命名空间可供工具页调用
- 在线版为模块化结构，不可直接"另存为单文件"使用；离线单文件版为独立出售产品

## 版权声明

© 2026 RainbowGeo（文波地理）· 保留所有权利

本仓库全部工具为在线试用版本。未经 RainbowGeo 授权，禁止商用、转载、二次分发。商业授权、离线单文件版采购请联系：`rainbowliam@163.com`
