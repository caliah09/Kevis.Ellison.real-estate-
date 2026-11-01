/**
 * Renders Kevis's social posts from posts.json.
 *
 * For each post it writes two files to social/out/:
 *   <slug>.png             the 1080x1080 image to upload
 *   <slug>-instagram.png   a phone preview with the caption, to send for approval
 *
 *   node render.js            render every post
 *   node render.js 1205       render only posts whose slug contains "1205"
 *
 * Needs Playwright (see README.md) and an internet connection for the Google Fonts.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'posts.json'), 'utf8'));
const fileUrl = (p) => pathToFileURL(path.isAbsolute(p) ? p : path.join(ROOT, p)).href;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// What each status puts on the ribbon and in the big lettering.
const STATUS = {
  'sold': { ribbon: 'SOLD', big: ['JUST', 'SOLD'] },
  'under-contract': { ribbon: 'UNDER CONTRACT', big: ['UNDER', 'CONTRACT'] },
  'coming-soon': { ribbon: 'COMING SOON', big: ['COMING', 'SOON'] },
};

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600&display=swap">';

/* ------------------------------------------------------------------ */
/* The post: full photo, red diagonal ribbon, big status, headshot and */
/* quiet details along the bottom. Laid out at 380px, exported 1080px. */
/* ------------------------------------------------------------------ */
const POST_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff}
.t{position:relative;width:380px;height:380px;overflow:hidden;background:#0B0B0B;color:#fff;font-family:'Archivo',sans-serif}
.t>img.ph{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:saturate(1.05) contrast(1.05)}
.shade{position:absolute;inset:0;background:
  linear-gradient(to bottom,rgba(8,8,8,.62) 0%,rgba(8,8,8,.30) 24%,rgba(8,8,8,0) 42%),
  linear-gradient(to top,rgba(8,8,8,.86) 0%,rgba(8,8,8,.45) 18%,rgba(8,8,8,0) 34%)}
.ribbon{position:absolute;z-index:4;background:#D0161E;color:#fff;font-weight:800;text-transform:uppercase;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,.35);transform:rotate(-45deg)}
.ribbon::before,.ribbon::after{content:"";position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,.55)}
.ribbon::before{top:3px}.ribbon::after{bottom:3px}
.r1{left:-53px;top:28px;width:200px;padding:7px 0;font-size:17px;letter-spacing:.24em}
.r2{left:-68px;top:46px;width:260px;padding:7px 0;font-size:10.5px;letter-spacing:.16em}
.logo{position:absolute;top:18px;right:18px;width:86px;opacity:.82;z-index:3}
.logo img{width:100%;display:block}
.big{position:absolute;left:0;right:0;top:30px;text-align:center;z-index:2}
.big .w{font-weight:900;text-transform:uppercase;line-height:.86;letter-spacing:-.01em;font-size:50px;text-shadow:0 2px 16px rgba(0,0,0,.45)}
.big.two{top:52px}
.big.two .w{font-size:38px}
.big .sub{margin-top:7px;font-size:9px;font-weight:600;letter-spacing:.06em;color:#E2E2E2;text-shadow:0 1px 8px rgba(0,0,0,.5)}
.agent{position:absolute;left:16px;bottom:16px;display:flex;align-items:center;gap:9px;z-index:2}
.face{width:52px;height:52px;border-radius:50%;border:2px solid #fff;background-position:44% 28%;background-size:150%;background-repeat:no-repeat;box-shadow:0 3px 12px rgba(0,0,0,.4);flex:none}
.agent .nm{font-size:12.5px;font-weight:800;line-height:1.1}
.agent .rl{margin-top:2px;font-size:7.5px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#CFCFCF}
.agent .tel{margin-top:3px;font-size:9.5px;font-weight:600;color:#F2F2F2}
.det{position:absolute;right:16px;bottom:18px;text-align:right;z-index:2}
.det .ad{font-size:11px;font-weight:700;letter-spacing:.01em;color:#F2F2F2}
.det .pr{margin-top:2px;font-size:15px;font-weight:800}
.det .sp{margin-top:2px;font-size:8.5px;font-weight:500;letter-spacing:.04em;color:#CFCFCF}
.det .lc{margin-top:3px;font-size:6.5px;font-weight:500;letter-spacing:.06em;color:#B5B5B5}
.rule{position:absolute;right:16px;bottom:72px;width:30px;height:2px;background:#D0161E;z-index:2}
.rule.tall{bottom:82px}
`;

function postHtml(p) {
  const a = data.agent;
  const s = STATUS[p.status];
  if (!s) throw new Error(`${p.slug}: status must be one of ${Object.keys(STATUS).join(', ')}`);
  const long = s.ribbon.length > 6;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slug)}</title>${FONTS}<style>${POST_CSS}</style></head><body>
<div class="t">
  <img class="ph" src="${fileUrl(p.photo)}" alt="" style="object-position:${esc(p.photoPosition || '50% 50%')}">
  <div class="shade"></div>
  <div class="ribbon ${long ? 'r2' : 'r1'}">${esc(s.ribbon)}</div>
  <div class="logo"><img src="${fileUrl(a.logo)}" alt="Linda Blue Real Estate"></div>
  <div class="big${long ? ' two' : ''}"><div class="w">${esc(s.big[0])}<br>${esc(s.big[1])}</div><div class="sub">${esc(p.subtitle)}</div></div>
  <div class="agent"><span class="face" style="background-image:url('${fileUrl(a.headshot)}')"></span>
    <div><div class="nm">${esc(a.name)}</div><div class="rl">${esc(a.role)}</div><div class="tel">${esc(a.phone)}</div></div></div>
  <div class="rule${p.courtesy ? ' tall' : ''}"></div>
  <div class="det"><div class="ad">${esc(p.address)}</div><div class="pr">${esc(p.price)}</div><div class="sp">${esc(p.specs)}</div>${p.courtesy ? `<div class="lc">${esc(p.courtesy)}</div>` : ''}</div>
</div></body></html>`;
}

/* ------------------------------------------------------------------ */
/* Instagram phone preview, for sending to Kevis before posting.       */
/* No likes or comments are shown, so nothing in it is made up.        */
/* ------------------------------------------------------------------ */
const IG_CSS = `
*{margin:0;padding:0;box-sizing:border-box}
body{background:#ECEAE6;font-family:'Inter',-apple-system,'Segoe UI',sans-serif;color:#0B0B0B}
.stage{width:470px;padding:30px 40px;display:flex;justify-content:center}
.phone{width:390px;height:844px;border-radius:54px;background:#0A0A0A;padding:12px;box-shadow:0 30px 60px -20px rgba(0,0,0,.35),0 0 0 2px #2b2b2b inset}
.screen{width:100%;height:100%;border-radius:43px;background:#fff;overflow:hidden;position:relative}
.island{position:absolute;top:10px;left:50%;transform:translateX(-50%);width:110px;height:32px;border-radius:20px;background:#000;z-index:5}
.status{height:50px;display:flex;align-items:center;justify-content:space-between;padding:8px 30px 0 34px;font-size:15px;font-weight:600}
.status .r{display:flex;gap:6px;align-items:center}
.status .bat{width:24px;height:12px;border:1.5px solid #000;border-radius:3px;position:relative}
.status .bat::after{content:"";position:absolute;inset:1.5px;right:4px;background:#000;border-radius:1px}
.status .bars{display:flex;gap:1.5px;align-items:flex-end}.status .bars i{width:3px;background:#000;border-radius:1px}
svg{width:24px;height:24px;fill:none;stroke:#0B0B0B;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round}
svg.fill{fill:#0B0B0B;stroke:none}
.ph{display:flex;align-items:center;gap:10px;padding:8px 12px}
.av{width:34px;height:34px;border-radius:50%;padding:2px;background:conic-gradient(#FEDA75,#FA7E1E,#D62976,#962FBF,#4F5BD5,#FEDA75)}
.av span{display:block;width:100%;height:100%;border-radius:50%;border:2px solid #fff;background-position:44% 28%;background-size:150%;background-repeat:no-repeat}
.ph .u{font-size:13.5px;font-weight:600;line-height:1.15}
.ph .loc{font-size:11.5px;color:#262626}
.ph .dots{margin-left:auto}
.img{width:366px;height:366px;display:block}
.acts{display:flex;align-items:center;gap:15px;padding:10px 12px 6px}
.acts .save{margin-left:auto}
.cap{padding:2px 12px 0;font-size:13.5px;line-height:1.42}
.cap b{font-weight:600}
.cap .tags{color:#00376B}
.when{padding:6px 12px 0;font-size:11px;color:#737373;text-transform:uppercase;letter-spacing:.02em}
.nav{position:absolute;left:0;right:0;bottom:0;height:72px;border-top:1px solid #DBDBDB;background:#fff;display:flex;justify-content:space-around;padding-top:12px}
.nav .me{width:26px;height:26px;border-radius:50%;border:2px solid #0B0B0B;background-position:44% 28%;background-size:150%;background-repeat:no-repeat}
.home-ind{position:absolute;left:50%;bottom:8px;transform:translateX(-50%);width:134px;height:5px;border-radius:3px;background:#000}
`;
const ICON = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.3 7.6 3.7 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.5 0 5.9 3.6 4.5 7.3-1.8 4.6-9.3 9.2-9.3 9.2z"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M20.7 16.2A9 9 0 1 0 17 19.9l3.8 1.1z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M21.5 3 3 10.2l7.2 3 3 7.3zM10.2 13.2 21.5 3"/></svg>',
  save: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5.2L5 21V3h14z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21"/></svg>',
  reels: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M3 8h18M8.5 3l3 5M14.5 3l3 5M10 11.5v6l5-3z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 8v8M8 12h8"/></svg>',
  dots: '<svg viewBox="0 0 24 24" class="fill"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
};

function instagramHtml(p, postPng) {
  const a = data.agent;
  const face = `background-image:url('${fileUrl(a.headshot)}')`;
  const tags = [data.hashtags, p.extraHashtags].filter(Boolean).join(' ');
  const bars = [4, 6, 8, 11].map((h) => `<i style="height:${h}px"></i>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(p.slug)}</title>${FONTS}<style>${IG_CSS}</style></head><body>
<div class="stage"><div class="phone"><div class="screen"><div class="island"></div>
<div class="status"><span>9:41</span><span class="r"><span class="bars">${bars}</span><span class="bat"></span></span></div>
<div class="ph"><span class="av"><span style="${face}"></span></span><div><div class="u">${esc(a.instagram)}</div><div class="loc">${esc(a.location)}</div></div><span class="dots">${ICON.dots}</span></div>
<img class="img" src="${fileUrl(postPng)}" alt="">
<div class="acts">${ICON.heart}${ICON.comment}${ICON.send}<span class="save">${ICON.save}</span></div>
<div class="cap"><b>${esc(a.instagram)}</b> ${esc(p.caption)} <span class="tags">${esc(tags)}</span></div>
<div class="when">Just now</div>
<div class="nav">${ICON.home}${ICON.search}${ICON.plus}${ICON.reels}<span class="me" style="${face}"></span></div><div class="home-ind"></div>
</div></div></div></body></html>`;
}

/* ------------------------------------------------------------------ */
async function main() {
  const filter = process.argv[2];
  const posts = data.posts.filter((p) => !filter || p.slug.includes(filter));
  if (!posts.length) throw new Error(`No post slug contains "${filter}"`);
  for (const p of posts) for (const f of [p.photo, data.agent.headshot, data.agent.logo]) {
    if (!fs.existsSync(path.join(ROOT, f))) throw new Error(`${p.slug}: missing file ${f}`);
  }
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 470, height: 904 }, deviceScaleFactor: 1080 / 380 });
  const tmp = path.join(OUT, '.render.html');
  const load = async (html) => {
    fs.writeFileSync(tmp, html);
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
  };

  for (const p of posts) {
    const postPng = path.join(OUT, `${p.slug}.png`);
    await load(postHtml(p));
    if (!(await page.evaluate(() => document.fonts.check('900 16px "Archivo"')))) console.warn('  warning: Archivo font did not load (offline?)');
    await page.locator('.t').screenshot({ path: postPng });

    await page.setViewportSize({ width: 470, height: 904 });
    await load(instagramHtml(p, postPng));
    const fits = await page.evaluate(() => document.querySelector('.when').getBoundingClientRect().bottom <= document.querySelector('.nav').getBoundingClientRect().top);
    if (!fits) console.warn(`  warning: ${p.slug} caption runs under the Instagram menu bar in the preview; shorten it or accept the overlap`);
    await page.locator('.stage').screenshot({ path: path.join(OUT, `${p.slug}-instagram.png`) });
    console.log(`rendered ${p.slug}`);
  }
  fs.rmSync(tmp, { force: true });
  await browser.close();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
