import { defineConfig } from 'vite'

// 相对路径 base，让构建产物可以部署在任意子路径（如 GitHub Pages 项目站点）
export default defineConfig({
  base: './',
})
