// 程式碼截圖產生器：語法上色（highlight.js）＋截圖（puppeteer）
// 用法見同目錄 README.md
const fs = require('fs');
const path = require('path');

const here = __dirname;
const srcRoot = path.resolve(here, '..', '..', 'subsidy-eligibility', 'src', 'main', 'java', 'com', 'example', 'subsidy');
const pptrDir = process.argv[2];
if (!pptrDir) {
  console.error('用法：node codeshot.cjs <含 puppeteer 的 node_modules 路徑>');
  process.exit(1);
}
const hljs = require(path.join(here, 'node_modules', 'highlight.js'));
const puppeteer = require(path.join(pptrDir, 'puppeteer'));

const FAIL_CODES = [
  'INVALID_SUBSIDY_TYPE', 'INVALID_BIRTH_DATE', 'INVALID_NATIONAL_ID', 'UNDER_AGE',
  'OUT_OF_SERVICE_HOURS', 'OUT_OF_APPLICATION_PERIOD', 'ALREADY_APPLIED_THIS_MONTH',
];

/** 從 start 起找第一個與 start 同縮排的右大括號 */
function blockEnd(lines, start) {
  const indent = lines[start].match(/^\s*/)[0];
  for (let i = start + 1; i < lines.length; i++) if (lines[i] === indent + '}') return i;
  return lines.length - 1;
}

const shots = [
  {
    out: 'api-entry',
    title: 'API 入口：輸入 3 個 String，輸出 Boolean',
    segments: [
      {
        file: 'controller/EligibilityController.java',
        start: l => l.startsWith('@RestController'),
        end: (lines, s) => blockEnd(lines, s + 2),
        // 略過欄位與建構子
        skip: lines => {
          const f = lines.findIndex(l => l.includes('private final EligibilityService'));
          return [f, f + 1, f + 2, f + 3, f + 4, f + 5];
        },
        hit: l => l.includes('@PostMapping'),
      },
      {
        file: 'dto/EligibilityRequest.java',
        start: l => l.startsWith('public record EligibilityRequest'),
        end: (lines, s) => s,
      },
      {
        file: 'dto/EligibilityResponse.java',
        start: l => l.includes('public static EligibilityResponse of('),
        end: (lines, s) => blockEnd(lines, s),
        hit: l => l.includes('ReasonCode.ELIGIBLE'),
      },
    ],
  },
  {
    out: 'eligibility-service',
    title: '核心驗證邏輯：7 道檢查依序執行，遇到第一個失敗即回傳',
    segments: [{
      file: 'service/EligibilityService.java',
      start: l => l.includes('private EligibilityResponse evaluate('),
      end: (lines, s) => blockEnd(lines, s),
      // 7 道檢查的回傳行以綠底標示
      hit: l => l.includes('return result(') && FAIL_CODES.some(kw => l.includes(kw)),
    }],
  },
  {
    out: 'national-id-validator',
    title: '身分證字號驗證：正規化、格式、檢查碼',
    segments: [{
      file: 'validation/NationalIdValidator.java',
      start: l => l.startsWith('/** 中華民國身分證字號驗證'),
      end: lines => lines.length - 1,
      // 略過私有建構子
      skip: lines => {
        const c = lines.findIndex(l => l.includes('private NationalIdValidator()'));
        return [c, c + 1, c + 2];
      },
    }],
  },
];

/** 將 highlight.js 的整段 HTML 切成逐行，跨行的 span 在每行重新開啟 */
function splitLines(html) {
  const out = [];
  let open = [];
  for (const raw of html.split('\n')) {
    const stack = [...open];
    const re = /<span[^>]*>|<\/span>/g;
    let m;
    while ((m = re.exec(raw))) {
      if (m[0] === '</span>') stack.pop(); else stack.push(m[0]);
    }
    out.push(open.join('') + raw + '</span>'.repeat(stack.length));
    open = stack;
  }
  return out;
}

function renderSegment(seg, multi) {
  const lines = fs.readFileSync(path.join(srcRoot, seg.file), 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '').split('\n');
  const s = lines.findIndex(seg.start);
  if (s < 0) throw new Error(`找不到起始行：${seg.file}`);
  const e = seg.end(lines, s);
  const html = splitLines(hljs.highlight(lines.slice(s, e + 1).join('\n'), { language: 'java' }).value);
  const skip = new Set(seg.skip ? seg.skip(lines) : []);
  let rows = multi ? `<tr class="seg"><td colspan="2">${path.basename(seg.file)}</td></tr>` : '';
  let prev = -1;
  for (let i = s; i <= e; i++) {
    if (skip.has(i)) continue;
    if (prev >= 0 && i !== prev + 1) rows += '<tr class="gap"><td class="ln">⋮</td><td></td></tr>';
    prev = i;
    const src = lines[i];
    const hit = seg.hit && seg.hit(src);
    rows += `<tr${hit ? ' class="hit"' : ''}><td class="ln">${i + 1}</td><td class="code">${html[i - s] || ' '}</td></tr>`;
  }
  return rows;
}

function render(shot) {
  const multi = shot.segments.length > 1;
  const label = multi ? shot.segments.map(g => path.basename(g.file, '.java')).join(' · ') : path.basename(shot.segments[0].file);
  const rows = shot.segments.map(g => renderSegment(g, multi)).join('\n');
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>${label}</title><style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { background:#F2F4F3; padding:28px; font-family:"Microsoft JhengHei","Noto Sans TC",sans-serif; display:inline-block; }
  .win { background:#FFF; border-radius:14px; box-shadow:0 8px 28px rgba(0,0,0,.12); overflow:hidden; border:1px solid #E3E8E5; }
  .bar { display:flex; align-items:center; gap:14px; padding:12px 18px; border-bottom:1px solid #E3E8E5; background:#FAFBFA; }
  .dots i { display:inline-block; width:12px; height:12px; border-radius:50%; margin-right:6px; }
  .file { font-family:Consolas,monospace; font-size:15px; font-weight:700; color:#1F2A24; }
  .title { font-size:15px; color:#0B3D22; background:#E8F6EE; border-radius:999px; padding:4px 12px; }
  table { border-collapse:collapse; margin:10px 0 16px; }
  td { font-family:Consolas,"Cascadia Mono","Microsoft JhengHei",monospace; font-size:16px; line-height:1.6; white-space:pre; vertical-align:top; }
  .ln { color:#8A958F; text-align:right; padding:0 16px 0 20px; }
  .code { padding-right:12px; color:#1F2A24; }
  .badge { width:44px; padding-right:16px; }
  .badge span { display:inline-block; width:24px; height:24px; line-height:24px; text-align:center; border-radius:50%; background:#00A651; color:#fff; font-size:13px; font-weight:700; font-family:"Microsoft JhengHei",sans-serif; }
  tr.hit td { background:#F2FAF5; }
  tr.hit td.ln { box-shadow: inset 3px 0 0 #00A651; }
  tr.seg td { font-family:Consolas,monospace; font-size:13px; font-weight:700; color:#5F6B66; padding:14px 20px 4px; border-top:1px dashed #D5DCD8; }
  tr.seg:first-child td { border-top:0; padding-top:4px; }
  tr.gap td { line-height:1; color:#B8C2BD; }
  .hljs-keyword, .hljs-literal { color:#A626A4; }
  .hljs-type, .hljs-title.class_ { color:#0B7A75; }
  .hljs-title.function_ { color:#2563C9; }
  .hljs-string { color:#3F8F2F; }
  .hljs-number { color:#B76B01; }
  .hljs-comment { color:#7B8780; font-style:italic; }
  .hljs-meta { color:#B76B01; }
</style></head><body><div class="win">
  <div class="bar"><span class="file">${label}</span><span class="title">${shot.title}</span></div>
  <table>${rows}</table></div></body></html>`;
}

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1800, height: 900, deviceScaleFactor: 2 });
  for (const shot of shots) {
    const htmlPath = path.join(here, shot.out + '.html');
    fs.writeFileSync(htmlPath, render(shot), 'utf8');
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle0' });
    await (await page.$('body')).screenshot({ path: path.join(here, shot.out + '.png') });
    console.log('ok', shot.out);
  }
  await browser.close();
})();
