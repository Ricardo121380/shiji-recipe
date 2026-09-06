import { defineConfig } from 'vite'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function sourceId() {
  const h = createHash('sha256')
  const src = join(process.cwd(), 'src')
  for (const f of readdirSync(src).filter(x => /\.(js|css)$/.test(x)).sort()) {
    h.update(f)
    h.update(readFileSync(join(src, f)))
  }
  h.update(readFileSync(join(process.cwd(), 'index.html')))
  return h.digest('hex').slice(0, 12)
}

const BUILD_ID = sourceId()

// 相对路径 base，让构建产物可以部署在任意子路径（如 GitHub Pages 项目站点）
export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID) },
  plugins: [{
    name: 'shiji-build-id',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head><meta name="shiji-build" content="${BUILD_ID}">`)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID }) })
    },
  }],
})
