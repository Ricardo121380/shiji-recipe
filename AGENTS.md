# 饭Fun项目约定（重要，后续所有会话必须遵守）

> 品牌名沿革：食记 → 饭饭 → 饭Fun（2026-09-05）。仓库名、网址、localStorage 键名均保持不变。

## 访问网址已固定（2026-09-05 与用户确认，不得更改）

- GitHub Pages（**主地址，对外分享一律用这个**）：https://ricardo121380.github.io/shiji-recipe/
- Cloudflare Pages（备用线路）：https://shiji-recipe.pages.dev/

任何后续改动都不得更换访问网址：

- 不要重命名 GitHub 仓库 `Ricardo121380/shiji-recipe`（重命名会使 github.io 地址永久失效，用户书签全部作废）。
- 不要重命名 Cloudflare Pages 项目 `shiji-recipe`（重命名会使 pages.dev 地址失效）。
- 不要迁移到其他域名或托管平台，除非用户明确提出。
- `git push` 到 main 只更新内容、网址不变，这是唯一允许的发布方式。

## 数据安全约定（防「菜谱消失」类事故复发）

- 菜谱数据存在用户浏览器 localStorage，按「域名 + 浏览器」隔离，这是产品特性不是 bug。
- 存储键：`shiji-state-v2` 为当前数据；`shiji-recipes-v1` 是旧版遗留键，**永远只读保留**，作为损坏恢复与迁移来源，任何改动不得写入或删除它。
- 任何数据结构变更必须保持向后兼容（旧键可迁移），`load()` 的逐级回退逻辑（v2 损坏 → v1 迁移 → 种子数据）不得移除。
- 「导出备份」「导入备份」是用户数据跨线路搬家的唯一通道，新增字段时保持两种备份格式兼容。

## 构建与部署

- `vite.config.js` 的 `base` 必须保持相对路径 `'./'`，两个线路分别挂在域名子路径和根路径，改成绝对路径会直接白屏。
- GitHub Pages：推送 main 后 `.github/workflows/deploy.yml` 自动构建发布。
- Cloudflare Pages：`npm run deploy` 手动发布，发布内容必须与 GitHub Pages 同版本。
