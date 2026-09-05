# 食记 · 菜单制作

轻量的中文菜谱管理网页，使用原生 JavaScript、CSS 和 Vite。

**线上地址：https://ricardo121380.github.io/shiji-recipe/**

源码托管在 GitHub（[Ricardo121380/shiji-recipe](https://github.com/Ricardo121380/shiji-recipe)），推送 main 分支后由 GitHub Actions 自动构建并发布到 GitHub Pages。

## 启动

```bash
npm install
npm run dev -- --port 5173
```

访问 http://127.0.0.1:5173 。生产构建执行 `npm run build`，输出在 `dist/`。

## 功能

- 手动录入菜品名称、简介、分类、用时、人份和食材。
- 添加、删除烹饪步骤，编辑和删除菜谱。
- 上传 JPG、PNG、WebP 图片，最大 10MB，自动缩放到最长边 1400px 并压缩。
- 按名称、简介和食材搜索，按分类筛选，收藏菜谱。
- 将菜品加入今日菜单，预览并使用浏览器打印或保存为 PDF。
- 保存至浏览器 localStorage，支持导出 JSON 数据。暂未提供导入界面。
- 桌面与手机响应式布局。

初次使用提供四道示例菜谱。示例图片来自 Unsplash，字体来自 Google Fonts，需要联网；用户上传的图片以压缩后的数据保存在当前浏览器。

当前版本没有账户、服务器存储或跨设备同步。清除站点数据会删除本地菜谱。浏览器存储空间不足时会提示保存失败，并保留原有数据。
