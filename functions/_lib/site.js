// 站点开关。暂停开放：true；恢复：改回 false，然后 npm run deploy 并 git push。
// 只拦访问，不改、不删 D1 / R2 / KV 里的云端数据。
export const SITE_CLOSED = false;

export const closedHtml = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta name="theme-color" content="#FFCC4D">
<title>饭Fun 暂停开放</title>
<style>
  :root{font-family:"Noto Sans SC",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#6B4226;background:linear-gradient(180deg,#FFF7E8,#FFFDF6 320px)}
  *{box-sizing:border-box}
  body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:32px 20px}
  .card{width:min(440px,100%);background:#fff;border:1px solid #F0E4CE;border-radius:18px;padding:36px 32px 32px;text-align:center;box-shadow:0 18px 60px rgba(107,66,38,.08)}
  .mark{width:52px;height:48px;margin:0 auto 18px;background:#FFCC4D;border-radius:16px 16px 8px 16px;display:grid;place-items:center;color:#6B4226;box-shadow:0 3px 10px rgba(242,166,90,.3)}
  .mark svg{width:28px;height:28px}
  .eyebrow{color:#C08A3E;font-size:9px;letter-spacing:2.1px}
  h1{font-family:"ZCOOL KuaiLe","Noto Sans SC",sans-serif;font-size:32px;font-weight:400;letter-spacing:4px;margin:10px 0 6px}
  h2{font-size:16px;font-weight:600;margin:0 0 16px}
  p{color:#A89678;font-size:13px;line-height:1.9;margin:0 0 10px}
  p:last-child{margin-bottom:0}
</style>
</head>
<body>
  <main class="card">
    <div class="mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 12h16a8 8 0 0 1-5.4 7.6c-.9.3-1.8.4-2.6.4s-1.7-.1-2.6-.4A8 8 0 0 1 4 12Z"/>
        <path d="M9 8c0-1.6 1-1.6 1-3.2M13 8c0-1.6 1-1.6 1-3.2M15.5 8.5c.6-1.2 1.4-1.2 1.4-2.7"/>
      </svg>
    </div>
    <div class="eyebrow">FANFUN</div>
    <h1>饭Fun</h1>
    <h2>暂停开放</h2>
    <p>网站暂时关闭，任何人目前都无法进入。</p>
    <p>菜谱、菜单、冰箱等云端数据都还在，不会删除。恢复开放后，用原来的账号登录即可继续。</p>
  </main>
</body>
</html>
`;
