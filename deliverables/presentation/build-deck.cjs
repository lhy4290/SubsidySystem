// 簡報檔產生器：依 07-presentation-draft.md 產生 08-presentation.pptx
// 用法：cd deliverables/presentation; npm install; node build-deck.cjs
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const D = path.resolve(__dirname, '..');
const img = p => path.join(D, p);
const OUT = path.join(D, '08-presentation.pptx');

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 英吋
pres.title = '全國補助線上申請平台：系統設計與優化提案';
pres.author = '劉姮妤';

// 文字一律標為 zh-TW：PowerPoint 才會套用中文換行規則，避免「；」「、」被排到行首
const LANG = 'zh-TW';
const withLang = o => ({ lang: LANG, ...(o || {}) });
const addSlideRaw = pres.addSlide.bind(pres);
pres.addSlide = (...args) => {
  const s = addSlideRaw(...args);
  const addText = s.addText.bind(s);
  const addTable = s.addTable.bind(s);
  s.addText = (text, opts) => addText(
    Array.isArray(text) ? text.map(r => ({ ...r, options: withLang(r.options) })) : text, withLang(opts));
  s.addTable = (rows, opts) => addTable(
    rows.map(r => r.map(c => (typeof c === 'string' ? { text: c, options: withLang() } : { ...c, options: withLang(c.options) }))), withLang(opts));
  return s;
};

const F = 'Microsoft JhengHei';
const MONO = 'Consolas';
const W = 13.333;
const M = 0.5;
const CW = W - 2 * M;

const C = {
  ink: '1F2A24', muted: '5F6B66', green: '00A651', deep: '0B3D22', soft: 'E8F6EE',
  tint: 'F2F4F3', stripe: 'F7F9F8', line: 'D5DCD8', red: 'B3261E', redSoft: 'FDECEC',
  amber: '7A4A00', amberSoft: 'FFF6E5', white: 'FFFFFF', paleGreen: 'B9E4CA',
};

// 版面基準：內容起始 y、內容下緣（有頁尾欄／無頁尾欄）
const TOP = 1.45;
const BOT = 6.0;
const BOT_NF = 6.85;
// 字級：同類內容跨頁一致
const FS = {
  body: 13,      // 主講頁內文
  label: 14,     // 內文中的粗體標籤
  section: 16,   // 區塊標題、卡片標題
  cap: 10,       // 圖下說明
  foot: 11,      // 頁尾【跨系統】【個資】欄
  note: 10.5,    // 灰色註記
  callout: 12,   // 情境／事件框
  tMain: 12.5,   // 主講頁表格
  tApp: 12,      // 附錄表格
};

// 估算標籤寬度：中日韓字元較寬
function tagWidth(text, size) {
  let w = 0;
  for (const ch of text) w += /[⺀-￿]/.test(ch) ? size / 72 * 1.02 : size / 72 * 0.56;
  return w + 0.36;
}

function header(s, tag, title, dark = false) {
  const tw = tagWidth(tag, 11);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: M, y: 0.38, w: tw, h: 0.32, rectRadius: 0.16,
    fill: { color: C.green }, line: { color: C.green },
  });
  s.addText(tag, {
    x: M, y: 0.38, w: tw, h: 0.32, margin: 0, align: 'center', valign: 'middle',
    fontFace: F, fontSize: 11, bold: true, color: C.white,
  });
  s.addText(title, {
    x: M, y: 0.78, w: CW, h: 0.55, margin: 0, valign: 'middle',
    fontFace: F, fontSize: 22, bold: true, color: dark ? C.white : C.ink,
  });
}

function pageLabel(s, label, dark = false) {
  s.addText(label, {
    x: W - M - 1.2, y: 7.06, w: 1.2, h: 0.28, margin: 0, align: 'right',
    fontFace: F, fontSize: 9, color: dark ? C.paleGreen : C.muted,
  });
}

// 底部【跨系統】【個資】欄
function footer(s, items) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: M, y: 6.3, w: CW, h: 0.7, rectRadius: 0.08,
    fill: { color: C.soft }, line: { color: C.soft },
  });
  const runs = [];
  items.forEach(([label, text], i) => {
    runs.push({ text: label, options: { bold: true, color: C.deep } });
    runs.push({ text, options: { color: C.ink, breakLine: i < items.length - 1 } });
  });
  s.addText(runs, {
    x: M + 0.18, y: 6.3, w: CW - 0.36, h: 0.7, margin: 0, valign: 'middle',
    fontFace: F, fontSize: FS.foot, paraSpaceAfter: 2,
  });
}

// 標籤＋內文的段落組
function labeled(items, { labelColor = C.deep, size = 11, labelSize, gap = 6, sep = '' } = {}) {
  const runs = [];
  items.forEach(([label, text], i) => {
    const last = i === items.length - 1;
    // 標籤與內文同段時，段落間距取自段落第一個 run，需放在標籤上
    if (label) runs.push({ text: label + sep, options: { bold: true, color: labelColor, fontSize: labelSize || size, breakLine: !sep, paraSpaceAfter: sep ? gap : 0 } });
    runs.push({ text, options: { color: C.ink, fontSize: size, breakLine: !last, paraSpaceAfter: gap } });
  });
  return runs;
}

function card(s, x, y, w, h, fill = C.tint) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: 0.1, fill: { color: fill }, line: { color: fill } });
}

function callout(s, y, label, text, fill, labelColor) {
  card(s, M, y, CW, 0.55, fill);
  s.addText([
    { text: label, options: { bold: true, color: labelColor } },
    { text, options: { color: C.ink } },
  ], { x: M + 0.18, y, w: CW - 0.36, h: 0.55, margin: 0, valign: 'middle', fontFace: F, fontSize: FS.callout });
}

// 直向等高卡片：每張卡片一個標籤＋內文，填滿指定區域
function stackCards(s, items, { x, y, w, h, gap = 0.2 }) {
  const ch = (h - gap * (items.length - 1)) / items.length;
  items.forEach(([label, text], i) => {
    const cy = y + i * (ch + gap);
    card(s, x, cy, w, ch);
    s.addText(labeled([[label, text]], { size: FS.body, labelSize: FS.label, gap: 0 }), {
      x: x + 0.25, y: cy + 0.2, w: w - 0.5, h: ch - 0.4, margin: 0, valign: 'top', fontFace: F,
    });
  });
}

// 表頭留白固定，各表表頭等高；pad 只加在內文列，用來把表格撐滿版面
function table(s, head, rows, { x = M, y = TOP, w = CW, colW, fontSize = 10, pad = 0.08 } = {}) {
  const headMargin = [0.08, 0.1, 0.08, 0.1];
  const bodyMargin = [pad, 0.1, pad, 0.1];
  const data = [head.map(t => ({ text: t, options: { bold: true, color: C.white, fill: { color: C.deep }, margin: headMargin } }))]
    .concat(rows.map((r, i) => r.map(t => ({ text: t, options: { fill: { color: i % 2 ? C.stripe : C.white }, margin: bodyMargin } }))));
  s.addTable(data, {
    x, y, w, colW, fontFace: F, fontSize, color: C.ink, valign: 'middle',
    border: { type: 'solid', pt: 0.75, color: C.line }, margin: bodyMargin, autoPage: false,
  });
}

// 備忘稿：與 09-speech-script.md 相同（每分鐘 200 單位估算）
const SCRIPT = {
  '1': [19, '我用三個原則回答三道題。試營運的問題主要有兩個：開跑當天流量暴增，上線前兩週還在改規則。加上題目要求的個資，就是流量會爆、規則會變、個資要保護。'],
  '2': [38, '使用者選完類別，系統先看類別開不開放；沒開放就直接顯示下次可申請時間，不用排隊。開放的話，租金補貼量最大，走獨立通道，再依負載決定直接進場，或進等候室領號碼牌。四種錯誤各有處理：排太久可以先離開，滿載告知重試時間，類別不符顯示原因，地區暫停顯示恢復時間。Web 和 App 只差在通知方式。'],
  '3': [38, '架構上，尖峰在進 Gateway 之前就擋下：CDN 擋機器人，等候室放在邊緣層發號碼牌。限流看登入身分或裝置，不看 IP，行動網路很多人共用一個 IP。申請服務判斷資格、用 Redis 原子寫入防重複就回應；寫資料庫和傳主管部會交給 Kafka 非同步處理，資料庫唯一鍵是最後一道。跨系統一律 mTLS 加簽章，只傳必要欄位。'],
  '4': [41, '我選需求階段。情境是上線前兩週，國土署要延長租金補貼受理日，另一個部會反對。第一，產出。規則規格書寫明哪個部會決定、誰簽核，不接受口頭變更；需求追溯表讓規則一改就知道要測什麼。第二，取捨。凍結期只接受參數變更。談不攏就以簽核為準，先照原規則上線，新規則放在 Feature Flag 後面。要多蒐集個資或多傳欄位的變更，延到下一版。'],
  '5': [20, '第三，出事。參數設錯由我負責：先切回旗標止血，再用稽核 log 的身分證雜湊找出受影響的人推播通知，三十分鐘內向上報告。事後改成雙人覆核，測試沒過不上線。'],
  '6': [39, '題三後端用 Java 和 Spring Boot。輸入三個字串，回傳 eligible 布林值和原因代碼，前端據此決定畫面。七道檢查依序執行，遇到第一個失敗就回傳。查詢和送件拆成兩支 API，查詢只讀，送件才原子寫入；兩支都用 POST，身分證不進網址和存取紀錄。七十四個測試涵蓋時段與受理日邊界、二月二十九日出生和多執行緒同時寫入。'],
  '7a': [12, '前端選 App。格式錯誤在送出前攔下；送出後先看 HTTP 狀態，忙線就排隊，成功再依原因代碼切換畫面。'],
  '7b': [21, '題目要求的三種錯誤各有一個畫面：格式錯誤標紅框，時段外顯示下次開放時間。重複申請用身分證雜湊、類別、年月當唯一鍵判斷，送件時原子寫入，資料庫唯一鍵再擋一次。'],
  '8': [27, '資料只存判斷資格、防重複和處理客訴需要的欄位，依據是個資法第五條。身分證只存雜湊，判斷是不是同一個人就夠了；生日判斷完年齡就不留。明碼只在傳給主管部會核定撥款的路上，加密暫存在 Kafka，不寫進任何資料表。'],
  '9': [20, '最後是兩個筆電實測。先查再寫，同時送件三百次全部重複受理，所以改成原子寫入。拿到 salt 和雜湊，三十三點九秒就還原身分證，所以正式環境改用 HMAC。謝謝。'],
};
const speak = (s, page) => s.addNotes(`講稿（約 ${SCRIPT[page][0]} 秒）\n${SCRIPT[page][1]}`);

// 讀 PNG 檔頭的寬高（IHDR），圖片重新產生後比例自動正確
function pngSize(file) {
  const buf = fs.readFileSync(img(file));
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}
const aspect = file => { const [w, h] = pngSize(file); return w / h; };

function image(s, file, { x, y, w, h }) {
  const r = aspect(file);
  if (w && !h) h = w / r;
  if (h && !w) w = h * r;
  s.addImage({ path: img(file), x, y, w, h });
  return { x, y, w, h };
}

// ---------- 封面 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.deep };
  s.addText('系統設計作品', { x: 0.9, y: 1.9, w: 11, h: 0.4, margin: 0, fontFace: F, fontSize: 14, color: C.paleGreen });
  s.addText('全國補助線上申請平台', { x: 0.9, y: 2.4, w: 11.5, h: 0.9, margin: 0, fontFace: F, fontSize: 42, bold: true, color: C.white });
  s.addText('系統設計與優化提案', { x: 0.9, y: 3.3, w: 11.5, h: 0.7, margin: 0, fontFace: F, fontSize: 28, color: C.white });
  s.addText([
    { text: '題一　', options: { bold: true, color: C.white } }, { text: '流程圖與架構圖', options: { color: C.paleGreen, breakLine: true } },
    { text: '題二　', options: { bold: true, color: C.white } }, { text: 'SDLC 情境決策', options: { color: C.paleGreen, breakLine: true } },
    { text: '題三　', options: { bold: true, color: C.white } }, { text: '後端 API、前端畫面、資料保存', options: { color: C.paleGreen } },
  ], { x: 0.9, y: 4.45, w: 8, h: 1.05, margin: 0, fontFace: F, fontSize: 14, paraSpaceAfter: 4 });
  s.addText('劉姮妤', { x: 0.9, y: 6.1, w: 5, h: 0.45, margin: 0, fontFace: F, fontSize: 18, bold: true, color: C.white });
}

// ---------- 1 問題定義 ----------
{
  const s = pres.addSlide();
  header(s, '問題定義', '三個設計原則貫穿三道題：流量會爆、規則會變、個資要保護');
  s.addText('多項補助整合為單一平台，提供 Web 與 App 兩種入口；租金補貼 300 億、上看 75 萬戶（題目提供數據）。', {
    x: M, y: TOP, w: CW, h: 0.4, margin: 0, fontFace: F, fontSize: FS.body, color: C.muted,
  });
  const cards = [
    ['01', '流量會爆', ['設計：排隊與擴縮預算受限', '測試：高峰流量難重現', '上線：開跑當天流量暴增'], '未開放就先擋下、不必排隊；開放後依類型與負載分流，超量進虛擬等候室'],
    ['02', '規則會變', ['需求：上線前 2 週改規則，跨部會意見不一致'], '規則集中成資料、74 個自動化測試；Feature Flag 切換新舊規則（設計）'],
    ['03', '個資要保護', ['題目要求：每題都要談跨系統與個資'], '只存身分證雜湊、log 遮罩；跨系統只傳必要欄位並加密'],
  ];
  const cw = (CW - 0.6) / 3;
  cards.forEach(([no, name, src, design], i) => {
    const x = M + i * (cw + 0.3);
    card(s, x, 2.05, cw, 4.3);
    s.addText(no, { x: x + 0.3, y: 2.3, w: 1.2, h: 0.6, margin: 0, fontFace: F, fontSize: 30, bold: true, color: C.green });
    s.addText(name, { x: x + 0.3, y: 2.95, w: cw - 0.6, h: 0.55, margin: 0, fontFace: F, fontSize: 24, bold: true, color: C.ink });
    // 「來源」「對應設計」各自固定起點，三張卡片同列對齊
    s.addText([
      { text: '來源', options: { bold: true, color: C.muted, fontSize: FS.cap, breakLine: true, paraSpaceAfter: 2 } },
      ...src.map((t, j) => ({ text: t, options: { color: C.ink, fontSize: FS.body + 1, breakLine: j < src.length - 1, paraSpaceAfter: 2 } })),
    ], { x: x + 0.3, y: 3.75, w: cw - 0.6, h: 1.15, margin: 0, valign: 'top', fontFace: F });
    s.addText([
      { text: '對應設計', options: { bold: true, color: C.muted, fontSize: FS.cap, breakLine: true, paraSpaceAfter: 2 } },
      { text: design, options: { color: C.ink, fontSize: FS.body + 1 } },
    ], { x: x + 0.3, y: 5.05, w: cw - 0.6, h: 1.15, margin: 0, valign: 'top', fontFace: F });
  });
  s.addText('題目要求逐項對照見附錄 A1。', { x: M, y: 6.55, w: CW, h: 0.3, margin: 0, fontFace: F, fontSize: FS.note, color: C.muted });
  pageLabel(s, '1');
  speak(s, '1');
}

// ---------- 2 題一 使用者流程 ----------
{
  const s = pres.addSlide();
  header(s, '題一｜使用者流程', '未開放就先擋下；開放後依類型和負載分流；4 種錯誤各有出口');
  image(s, '01-user-flow.png', { x: (W - 10.4) / 2, y: TOP, w: 10.4 });
  const cols = [
    ['分流策略（3 種）', '類型分流（租金補貼獨立通道）、動態分流（依通道負載）、虛擬等候室（號碼牌）'],
    ['錯誤處理（題目要求 4 種）', '排隊太久、伺服器滿載、申請類別不符、地區暫停，每種都告知下一步'],
    ['Web 與 App', '共用後端與流程，只差在通知：App 推播；Web 憑號碼牌回來或登入時提示'],
  ];
  const cw = (CW - 0.6) / 3;
  cols.forEach(([label, text], i) => {
    s.addText(labeled([[label, text]], { size: FS.cap, gap: 0, sep: '　' }), {
      x: M + i * (cw + 0.3), y: 5.62, w: cw, h: 0.4, margin: 0, valign: 'top', fontFace: F,
    });
  });
  footer(s, [
    ['【跨系統】', '登入時向內政部戶政取得戶籍地，只查一次，供地區分流使用。'],
    ['【個資】', '登入前的階段一（選類別、分流、排隊）不需輸入個資。'],
  ]);
  pageLabel(s, '2');
  speak(s, '2');
}

// ---------- 3 題一 系統架構 ----------
{
  const s = pres.addSlide();
  header(s, '題一｜系統架構', '尖峰擋在 Gateway 之前；同步只做判斷，寫入交給佇列；防重複有兩道關卡');
  // 圖高略小於內容區，讓右欄寬度足以避免孤字
  const im = image(s, '02-architecture.png', { x: M, y: TOP + 0.1, h: 4.35 });
  const x = im.x + im.w + 0.3;
  s.addText(labeled([
    ['邊緣層', 'CDN/WAF 擋機器人；虛擬等候室在這一層發號碼牌。'],
    ['限流', '依登入身分或裝置 token，登入前（選類別、排隊）用裝置 token。不依 IP：行動網路大量使用者共用同一個 IP，會誤擋。'],
    ['同步與非同步', '申請服務判斷資格、寫入 Redis 後即回應；Kafka 削峰，Worker 再寫 DB、傳主管部會。'],
    ['防重複', 'Redis SETNX 原子寫入擋第一道，DB 唯一鍵最後把關'],
  ], { size: FS.body, labelSize: FS.label, gap: 32 }), { x, y: TOP, w: W - M - x, h: BOT - TOP, margin: 0, valign: 'top', fontFace: F });
  footer(s, [
    ['【跨系統】', '戶政（驗證身分）、主管部會（核定）、金融機構（撥款）一律 mTLS ＋ API 簽章，只傳最少必要欄位。'],
    ['【個資】', 'DB 只存身分證雜湊；log 集中化前先遮罩身分證字號。'],
  ]);
  pageLabel(s, '3');
  speak(s, '3');
}

// ---------- 4 題二 產出與取捨 ----------
{
  const s = pres.addSlide();
  header(s, '題二｜需求階段', '需求階段：規則以簽核文件為準，凍結期只接受參數變更');
  callout(s, TOP, '情境（假設）：', '上線前 2 週，國土署要求租金補貼受理日由每月 1–10 日延長到 1–15 日；另一部會認為會排擠其他補助的尖峰容量而反對；高層要求如期上線。', C.amberSoft, C.amber);
  const lw = 6.55;
  s.addText('一、必須產出的文件與原因', { x: M, y: 2.2, w: lw, h: 0.38, margin: 0, fontFace: F, fontSize: FS.section, bold: true, color: C.deep });
  table(s, ['產出', '為什麼必須有'], [
    ['補助規則規格書（參數值、生效日、決策部會、簽核人）', '意見不一致時以書面簽核為準，不接受口頭變更；出事時查得到誰、何時決定'],
    ['需求追溯表（規則 → 程式參數 → 測試案例）', '規則一改，立刻知道要改哪個參數、重跑哪些測試'],
    ['跨系統介面規格', '規則若要多傳欄位，會連動戶政、主管部會、金融機構'],
    ['個資衝擊評估', '規則若要多蒐集個資，告知文字與保存方式都要跟著改'],
  ], { x: M, y: 2.7, w: lw, colW: [2.6, 3.95], fontSize: FS.tMain, pad: 0.15 });
  const rx = M + lw + 0.4;
  s.addText('二、理想做不到時的取捨', { x: rx, y: 2.2, w: W - M - rx, h: 0.38, margin: 0, fontFace: F, fontSize: FS.section, bold: true, color: C.deep });
  s.addText(labeled([
    ['理想：', '規則凍結後才開發，改了就完整重測；上線前 2 週做不到。'],
    ['決策：', '凍結期只接受參數變更（日期、年齡、時段）。簽核前照原規則上線，新規則放在 Feature Flag（設計）後面，簽核後再開。'],
    ['題三程式：', '受理日期寫成資料，集中在 SubsidyType 一處，改規則只動一行；改完跑 74 個測試，幾秒內知道有沒有改壞。目前改參數仍要重新部署，正式環境移到設定檔後就不用。'],
    ['延後：', '需要新欄位、多傳或多蒐集個資的變更，延到下一版。'],
  ], { size: FS.body, labelSize: FS.body, gap: 30, sep: ' ' }), { x: rx, y: 2.75, w: W - M - rx, h: BOT - 2.75, margin: 0, valign: 'top', fontFace: F });
  footer(s, [
    ['【跨系統】', '產出介面規格；要多傳欄位給其他系統的變更，延到下一版。'],
    ['【個資】', '產出個資衝擊評估；要多蒐集個資的變更，延到下一版。'],
  ]);
  pageLabel(s, '4');
  speak(s, '4');
}

// ---------- 5 題二 出事後負責 ----------
{
  const s = pres.addSlide();
  header(s, '題二｜出事後負責', '參數設錯由我負責：分鐘級切回、用雜湊找出受影響的人、30 分鐘內第一報');
  callout(s, TOP, '事件（假設）：', '新規則簽核通過、旗標開啟，但參數誤設為 1–5 日（應為 1–15 日），6 日起的申請人被誤判為「不在受理期間」。', C.redSoft, C.red);
  const widths = [3.1, 5.4, CW - 3.1 - 5.4 - 0.6];
  const cols = [
    ['負責', [
      { text: '「凍結期接受參數變更」是我的決策，由我負責。', options: { breakLine: true, paraSpaceAfter: 8 } },
      { text: '先止血，不先追究誰輸錯。' },
    ]],
    ['補救', [
      '切回旗標，恢復舊規則 1–10 日（設計上為執行期切換，不必重新部署）',
      '修正參數為 1–15 日，覆核後重新開啟旗標',
      '用稽核 log 的原因代碼、時間、身分證雜湊，撈出受影響的人',
      'App 推播通知；Web 使用者登入時提示，並發布公告',
    ].map((t, i, a) => ({ text: t, options: { bullet: { type: 'number' }, breakLine: i < a.length - 1, paraSpaceAfter: 6 } }))],
    ['向上說明', [
      { text: '30 分鐘內第一報：', options: { bold: true } },
      { text: '影響人數、時段、已採取措施', options: { breakLine: true, paraSpaceAfter: 8 } },
      { text: '事後根因報告：', options: { bold: true } },
      { text: '參數只有一人輸入、沒有覆核；改為雙人覆核，自動化測試設為上線前必要關卡' },
    ]],
  ];
  let x = M;
  cols.forEach(([title, runs], i) => {
    card(s, x, 2.2, widths[i], 3.15);
    s.addText(title, { x: x + 0.25, y: 2.4, w: widths[i] - 0.5, h: 0.4, margin: 0, fontFace: F, fontSize: FS.section, bold: true, color: C.deep });
    s.addText(runs, { x: x + 0.25, y: 2.95, w: widths[i] - 0.5, h: 2.25, margin: 0, valign: 'top', fontFace: F, fontSize: FS.body, color: C.ink });
    x += widths[i] + 0.3;
  });
  s.addText('改善後的規則變更：簽核、改參數、雙人覆核、跑 74 個測試、開旗標。', {
    x: M, y: 5.55, w: CW, h: 0.45, margin: 0, valign: 'middle', fontFace: F, fontSize: FS.section, bold: true, color: C.deep,
  });
  footer(s, [['【個資】', '用稽核 log 的身分證雜湊比對受影響名單，不需為了通知另外保存電話或 Email。']]);
  pageLabel(s, '5');
  speak(s, '5');
}

// ---------- 6 題三 後端 API ----------
{
  const s = pres.addSlide();
  header(s, '題三｜後端 API', '後端 API：輸入 3 個 String，7 道檢查依序執行，回傳 Boolean 與原因代碼');
  const im = image(s, 'code-screenshots/eligibility-service.png', { x: M, y: TOP, h: BOT - TOP });
  const x = im.x + im.w + 0.35;
  const w = W - M - x;
  const head = (t, y) => s.addText(t, { x, y, w, h: 0.32, margin: 0, valign: 'top', fontFace: F, fontSize: FS.label, bold: true, color: C.deep });
  head('兩支 API', TOP);
  s.addText([
    { text: 'POST /api/v1/subsidies/eligibility', options: { fontFace: MONO } },
    { text: '　資格查詢，只讀', options: { breakLine: true } },
    { text: 'POST /api/v1/subsidies/applications', options: { fontFace: MONO } },
    { text: '　送件，檢查通過後原子寫入' },
  ], { x, y: 1.82, w, h: 0.5, margin: 0, valign: 'top', fontFace: F, fontSize: 11.5, color: C.ink, paraSpaceAfter: 2 });
  head('回應範例（租金補貼，11/16 19:02 查詢）', 2.48);
  card(s, x, 2.85, w, 1.3);
  s.addText('{\n  "eligible": false,\n  "reasonCode": "OUT_OF_SERVICE_HOURS",\n  "nextAvailableAt": "2026-12-01T09:00:00+08:00"\n}', {
    x: x + 0.18, y: 2.85, w: w - 0.36, h: 1.3, margin: 0, valign: 'middle', fontFace: MONO, fontSize: 11.5, color: C.ink,
  });
  s.addText('eligible 即題目要求的 Boolean', { x: x + 0.18, y: 3.84, w: w - 0.36, h: 0.26, margin: 0, align: 'right', fontFace: F, fontSize: FS.note, color: C.muted });
  head('檢查順序（左圖綠底各行），遇到第一個失敗即回傳', 4.32);
  s.addText('1 類別、2 生日、3 身分證格式與檢查碼、4 年滿 20 歲、5 每日 09:00–18:00、6 各類別受理日、7 本月是否已受理', {
    x, y: 4.67, w, h: 0.5, margin: 0, valign: 'top', fontFace: F, fontSize: FS.body, color: C.ink,
  });
  head('測試', 5.3);
  s.addText('JUnit 5 共 74 個，全部通過：時段與受理日邊界、2/29 出生；32 條執行緒同時寫入同一鍵，200 輪都只有 1 筆成功。', {
    x, y: 5.65, w, h: 0.5, margin: 0, valign: 'top', fontFace: F, fontSize: FS.body, color: C.ink,
  });
  footer(s, [
    ['【個資】', '用 POST 不用 GET，身分證字號不會出現在 URL 和 access log；log 只記遮罩值 A12****789；JSON 格式錯誤時不記錄原始內容。'],
    ['【附錄】', 'Controller、Request、Response 原始碼見附錄 A3。'],
  ]);
  pageLabel(s, '6');
  speak(s, '6');
}

// ---------- 7a 題三 前端程式流程 ----------
{
  const s = pres.addSlide();
  header(s, '題三｜前端程式流程', '前端（App）：格式錯誤在送出前攔下；送出後依 HTTP 狀態與原因代碼分流');
  const fh = 4.75;
  image(s, '03-frontend-flow.png', { x: (W - fh * aspect('03-frontend-flow.png')) / 2, y: TOP, h: fh });
  s.addText(labeled([
    ['送出前：', '先正規化（全形轉半形、去前後空白、轉大寫），再逐欄即時驗證格式；勾選個資同意後才能送出。'],
    ['送出後：', '429/503 進排隊畫面；逾時保留輸入、可重試；200 依 eligible 與原因代碼顯示對應畫面。'],
  ], { size: FS.cap, gap: 4, sep: ' ' }), { x: M, y: 6.35, w: CW - 1.4, h: 0.5, margin: 0, valign: 'top', fontFace: F });
  pageLabel(s, '7a');
  speak(s, '7a');
}

// ---------- 7b 題三 前端畫面 ----------
{
  const s = pres.addSlide();
  header(s, '題三｜前端畫面', '從查詢到結果的 5 個畫面；題目要求的 3 種錯誤各對應一個畫面');
  const screens = [
    [1, '申請表單', '個資告知寫明資料用途與利用對象，勾選同意才能送出'],
    [2, '錯誤處理 1｜格式驗證', '紅框加紅字說明原因，送出按鈕停用'],
    [4, '可受理', '身分證只顯示遮罩值；按「送出申請」才寫入，後端重跑全部檢查'],
    [5, '錯誤處理 2｜開放時段', '11/26 19:05 查詢，下次開放 12/15 09:00：同時考慮時段與受理日期'],
    [6, '錯誤處理 3｜當月已受理', '唯一鍵（身分證雜湊、類別、年月）；送件時原子寫入，DB 唯一鍵為最終防線'],
  ];
  const slot = CW / screens.length;
  const ph = 3.6;
  const pw = ph * aspect('04-wireframe-1-slide.png');
  screens.forEach(([n, label, text], i) => {
    const sx = M + i * slot;
    s.addImage({ path: img(`04-wireframe-${n}-slide.png`), x: sx + (slot - pw) / 2, y: TOP, w: pw, h: ph });
    s.addText(labeled([[label, text]], { size: FS.cap, gap: 0, labelColor: label.startsWith('錯誤') ? C.red : C.deep }), {
      // 第 5 欄框寬略窄，避免最後一行只剩一個字；左緣與其他欄一致
      x: sx + 0.06, y: TOP + ph + 0.12, w: i === 4 ? slot - 0.45 : slot - 0.12, h: BOT - (TOP + ph + 0.12), margin: 0, valign: 'top', fontFace: F,
    });
  });
  footer(s, [
    ['【跨系統】', '畫面 1 告知資料將提供主管機關審核、金融機構撥款。'],
    ['【個資】', '畫面只顯示遮罩後的身分證字號；生日只用於年齡檢核，不保存。'],
  ]);
  pageLabel(s, '7b');
  speak(s, '7b');
}

// ---------- 8 題三 資料保存 ----------
{
  const s = pres.addSlide();
  header(s, '題三｜資料保存', '只存判斷資格、防重複、處理客訴所需的最少欄位；身分證只存雜湊，生日不存');
  const tw = 8.35;
  table(s, ['資料', '為什麼要存', '個資', '保護方式', '保存期限'], [
    ['身分證雜湊', '防重複的唯一鍵；客訴時查此人紀錄', '是（假名化）', '正規化後雜湊；正式環境改 HMAC，金鑰放 KMS', '核撥後 5 年\n（假設）'],
    ['補助類別、申請年月', '唯一鍵其餘兩欄；「每月一次」依年月判斷', '否', '—', '同上'],
    ['受理時間、來源管道、地區', '客訴舉證；比較 Web 與 App 效能；地區分流', '間接', '時間由伺服器寫入；地區只存縣市', '同上'],
    ['稽核 log（原因代碼、遮罩身分證）', '說明為何不受理；異常分析', '是（部分）', '遮罩；不存原始輸入', '1 年（假設）'],
    ['申請編號', '客服查詢與跨系統對帳，不拿身分證當對外識別碼', '否', '隨機產生', '核撥後 5 年\n（假設）'],
  ], { x: M, y: TOP, w: tw, colW: [1.55, 2.05, 1.3, 1.9, 1.55], fontSize: FS.tMain, pad: 0.15 });
  const rx = M + tw + 0.35;
  const rw = W - M - rx;
  card(s, rx, TOP, rw, BOT - TOP);
  s.addText('刻意不保存', { x: rx + 0.25, y: TOP + 0.2, w: rw - 0.5, h: 0.4, margin: 0, fontFace: F, fontSize: FS.section, bold: true, color: C.deep });
  s.addText('個資法第 5 條：不得逾越特定目的之必要範圍', { x: rx + 0.25, y: TOP + 0.62, w: rw - 0.5, h: 0.3, margin: 0, fontFace: F, fontSize: FS.note, color: C.muted });
  s.addText(labeled([
    ['身分證明碼', '雜湊就能判斷是否同一人；明碼不寫入任何資料表，只在傳送途中加密暫存'],
    ['出生年月日', '判斷完只留結果'],
    ['姓名、地址、電話、Email', '資格判斷用不到；通知改用 App 推播與 Web 登入時提示'],
    ['API 請求原始內容', '內含身分證與生日'],
  ], { size: FS.body, labelSize: FS.label, gap: 14 }), { x: rx + 0.25, y: TOP + 1.1, w: rw - 0.5, h: BOT - TOP - 1.25, margin: 0, valign: 'top', fontFace: F });
  footer(s, [
    ['【跨系統】', 'Worker 把身分證明碼加密傳給主管部會核定撥款；明碼只在 Kafka 加密保留 7 天（假設），不寫入任何資料表。'],
    ['【個資】', '完整欄位表見附錄 A5；期限屆滿依個資法第 11 條刪除。'],
  ]);
  pageLabel(s, '8');
  speak(s, '8');
}

// ---------- 9 結語 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.deep };
  header(s, '結語', '兩個本機實測改變了設計', true);
  const stats = [
    ['300 / 300', '先查詢再寫入，兩步之間隔 1 ms，同一人同時送出 2 個請求：300 次試驗全部被重複受理', '原子寫入 ＋ DB 唯一鍵'],
    ['33.9 秒', '取得 salt 與雜湊值後，筆電 CPU 還原出身分證字號；全台約 5.2 億個合法字號，最多 2.9 分鐘試完', '正式環境用 HMAC，金鑰放 KMS 與 DB 分開保管'],
  ];
  const cw = (CW - 0.4) / 2;
  stats.forEach(([num, desc, fix], i) => {
    const x = M + i * (cw + 0.4);
    card(s, x, TOP, cw, 4.75, C.white);
    s.addText(num, { x: x + 0.3, y: TOP + 0.3, w: cw - 0.6, h: 1.2, margin: 0, valign: 'middle', fontFace: F, fontSize: 60, bold: true, color: C.green });
    s.addText(desc, { x: x + 0.3, y: TOP + 1.75, w: cw - 0.6, h: 1.1, margin: 0, valign: 'top', fontFace: F, fontSize: FS.section, color: C.ink });
    card(s, x + 0.3, TOP + 3.05, cw - 0.6, 1.35, C.soft);
    s.addText([
      { text: '改為', options: { bold: true, color: C.green, breakLine: true, paraSpaceAfter: 4 } },
      { text: fix, options: { bold: true, color: C.deep } },
    ], { x: x + 0.45, y: TOP + 3.05, w: cw - 0.9, h: 1.35, margin: 0, valign: 'middle', fontFace: F, fontSize: FS.section });
  });
  s.addText('數據為本機實測。', { x: M, y: 6.45, w: CW, h: 0.3, margin: 0, fontFace: F, fontSize: FS.note, color: C.paleGreen });
  pageLabel(s, '9', true);
  speak(s, '9');
}

// ---------- 附錄目錄 ----------
{
  const s = pres.addSlide();
  s.background = { color: C.deep };
  s.addText('附錄', { x: 0.9, y: 1.4, w: 6, h: 0.9, margin: 0, fontFace: F, fontSize: 40, bold: true, color: C.white });
  s.addText('供審閱與追問，口頭報告不講', { x: 0.9, y: 2.3, w: 8, h: 0.4, margin: 0, fontFace: F, fontSize: 14, color: C.paleGreen });
  const items = [
    ['A1', '題目要求對照表'], ['A2', '實驗驗證紀錄'], ['A3', '程式碼截圖原尺寸'], ['A4', '6 個畫面與說明'],
    ['A5', '完整資料保存表'], ['A6', '題二備案：上線維運'], ['A7', '設計假設與正式環境考量'],
  ];
  const runs = [];
  items.forEach(([k, v], i) => {
    runs.push({ text: k + '　', options: { bold: true, color: C.white } });
    runs.push({ text: v, options: { color: C.paleGreen, breakLine: i < items.length - 1 } });
  });
  s.addText(runs, { x: 0.9, y: 3.1, w: 8, h: 3.4, margin: 0, valign: 'top', fontFace: F, fontSize: 16, paraSpaceAfter: 8 });
}

// ---------- A1 題目要求對照表 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A1', '題目要求對照表');
  table(s, ['題目要求', '對應頁面'], [
    ['題一：使用者流程，Web 與 App 都要畫', '第 2 頁（兩個入口；通知方式不同）'],
    ['題一：分流策略至少 2 種', '第 2 頁（類型分流、動態分流、排隊機制）'],
    ['題一：排隊太久、伺服器滿載、申請類別不符、地區暫停', '第 2 頁'],
    ['題一：架構圖含 API Gateway、Load Balancer、後端、DB、Cache、Queue', '第 3 頁'],
    ['題二：產出文件與必要性', '第 4 頁'],
    ['題二：理想做不到時如何取捨', '第 4 頁'],
    ['題二：上線後出問題如何負責、補救、向上說明', '第 5 頁'],
    ['題三：Java 後端、關鍵程式碼截圖', '第 6 頁、附錄 A3'],
    ['題三：輸入 3 個 String、輸出 Boolean', '第 6 頁'],
    ['題三：年滿 20 歲、09:00–18:00、各類別受理日', '第 6 頁（檢查 4、5、6）'],
    ['題三：前端擇一（App），從查詢到結果', '第 7a、7b 頁'],
    ['題三：程式流程圖', '第 7a 頁'],
    ['題三：輸入格式驗證、開放時段、重複申請', '第 7b 頁（畫面 2、5、6）'],
    ['題三：保存哪些資料、為什麼', '第 8 頁、附錄 A5'],
    ['每題都談跨系統資料傳遞', '題一第 2、3 頁；題二第 4 頁；題三第 7b、8 頁'],
    ['每題都談個資', '題一第 2、3 頁；題二第 4、5 頁；題三第 6、7b、8 頁'],
  ], { y: TOP, colW: [6.6, 5.733], fontSize: FS.tApp, pad: 0.05 });
  pageLabel(s, 'A1');
}

// ---------- A2 實驗驗證紀錄 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A2', '實驗驗證：8 項實測，各改了一個設計決定');
  table(s, ['驗證項目', '實測結果', '設計決定'], [
    ['生日解析', 'ofPattern("yyyy-MM-dd") 把 2023-02-29 默默改成 2023-02-28', '改用 LocalDate.parse 嚴格解析'],
    ['去除空白', 'trim() 去不掉中文輸入法的全形空白', '改用 strip()'],
    ['格式比對', 'find() 讓尾端帶換行的輸入通過', '改用 matches()'],
    ['欄位型別', 'DTO 用 enum 或 LocalDate 時，錯誤格式在反序列化就回 400，原因代碼 1、2 永遠不出現', 'DTO 欄位全部用 String，由 Service 驗證'],
    ['錯誤訊息', 'Jackson 例外訊息帶出原始輸入，包含身分證與生日', '統一處理 JSON 錯誤，不記錄例外訊息'],
    ['遮罩', 'substring 寫法遇到 "A12" 拋例外', '遮罩可處理任意輸入'],
    ['重複申請', '先查後寫，300 次試驗 300 次重複受理', '原子寫入'],
    ['雜湊還原', '33.9 秒還原身分證字號', '正式環境改 HMAC'],
  ], { y: TOP, colW: [1.6, 6.0, 4.733], fontSize: FS.tApp, pad: 0.16 });
  s.addText('以上為本機實測。', { x: M, y: 6.5, w: CW, h: 0.3, margin: 0, fontFace: F, fontSize: FS.note, color: C.muted });
  pageLabel(s, 'A2');
}

// ---------- A3 程式碼截圖 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A3', 'API 入口：輸入 3 個 String，eligible 為題目要求的 Boolean');
  const im = image(s, 'code-screenshots/api-entry.png', { x: M, y: TOP, h: BOT_NF - TOP });
  const x = im.x + im.w + 0.35;
  stackCards(s, [
    ['兩支 API 都用 POST', '身分證字號不進 URL 與 access log。'],
    ['DTO 三個欄位全部是 String', '格式錯誤由 Service 回對應的原因代碼，不會在反序列化階段變成 400。'],
    ['Boolean 產生位置', 'EligibilityResponse 第 24 行：code == ELIGIBLE 時 eligible 為 true。'],
  ], { x, y: TOP, w: W - M - x, h: BOT_NF - TOP });
  pageLabel(s, 'A3-1');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A3', '身分證字號驗證：正規化、格式、檢查碼');
  const im = image(s, 'code-screenshots/national-id-validator.png', { x: M, y: TOP, h: BOT_NF - TOP });
  const x = im.x + im.w + 0.35;
  stackCards(s, [
    ['正規化', 'strip() 去前後空白（含全形空白），toUpperCase(Locale.ROOT) 轉大寫。'],
    ['格式', '^[A-Z][12]\\d{8}$，用 matches() 比對整個字串。'],
    ['檢查碼', '首字母轉兩位數字，共 11 位數字依序乘上 1、9、8、7、6、5、4、3、2、1、1，加總能被 10 整除才合法。'],
    ['未支援', '新式居留證（第二碼 8、9），題目為選做。'],
  ], { x, y: TOP, w: W - M - x, h: BOT_NF - TOP });
  pageLabel(s, 'A3-2');
}

// ---------- A4 6 個畫面 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A4', '6 個畫面與說明（含畫面 3 排隊等候）');
  const notes = [
    '同意勾選後才能送出；告知內容含利用對象（個資法第 8 條），勾選的版本與時間會被記錄。',
    '離開欄位即檢查；錯誤欄位紅框＋下方紅字說明，任何欄位錯誤時送出按鈕停用。',
    '收到 429／503 時顯示；依 Retry-After 更新，號碼牌保存在裝置上。',
    'eligible = true；身分證只顯示遮罩值。按「送出申請」才呼叫 /applications，後端重跑全部檢查，超過 18:00 送出會改顯示畫面 5。',
    '11/26 19:05 查詢；下次時間同時考慮時段與受理日期，是 12/15 而非隔天。受理期間外使用同一版型。',
    '以（身分證雜湊、類別、年月）判斷；下次可申請時間取自 API 的 nextAvailableAt。送出時後端原子寫入再擋一次，避免同時送出兩次。',
  ];
  const slot = CW / 6;
  const ph = 3.85;
  const pw = ph * aspect('04-wireframe-1-slide.png');
  notes.forEach((t, i) => {
    const sx = M + i * slot;
    s.addImage({ path: img(`04-wireframe-${i + 1}-slide.png`), x: sx + (slot - pw) / 2, y: TOP, w: pw, h: ph });
    s.addText(t, { x: sx + 0.04, y: TOP + ph + 0.12, w: slot - 0.08, h: BOT_NF - (TOP + ph + 0.12), margin: 0, valign: 'top', fontFace: F, fontSize: FS.cap, color: C.ink });
  });
  pageLabel(s, 'A4');
}

// ---------- A5 完整資料保存表 ----------
const DD_HEAD = ['欄位名稱', '內容', '保存原因', '是否為個資', '保護方式', '保存期限'];
const DD_COLW = [1.75, 1.85, 3.62, 1.08, 2.9, 1.133];
{
  const s = pres.addSlide();
  header(s, '附錄 A5', '受理紀錄（applications）：只記錄受理成功的申請');
  s.addText('唯一鍵：(national_id_hash, subsidy_type, year_month)。不受理的結果記錄在稽核 log。', {
    x: M, y: TOP, w: CW, h: 0.3, margin: 0, fontFace: F, fontSize: FS.note, color: C.muted,
  });
  table(s, DD_HEAD, [
    ['application_id', '申請編號（UUID）', '客服查詢、申請進度追蹤、跨系統對帳的識別碼，避免以身分證字號當作對外識別', '否（單獨無法識別個人）', '隨機產生，不含任何個人資訊', '核撥完成後 5 年（假設）'],
    ['national_id_hash', '身分證字號雜湊值', '防重複申請的唯一鍵；不保存明碼也能判斷「同一人」', '是（假名化資料仍屬個資）', '正規化後以 SHA-256 加 salt 雜湊；正式環境改 HMAC，金鑰放 KMS 與 DB 分開保管', '核撥完成後 5 年（假設）'],
    ['subsidy_type', '補助類別代碼（RENT 等）', '唯一鍵的一部分；各類別申請量統計', '否', '—', '同上'],
    ['year_month', '申請年月（台北時間）', '唯一鍵的一部分；「每月一次」以此判斷', '否', '—', '同上'],
    ['applied_at', '受理時間（含時區）', '判斷時段與受理日期的依據；客訴時舉證幾點幾分受理', '間接', '由伺服器時鐘寫入，不採用前端時間', '同上'],
    ['channel', '來源管道（WEB / APP）', '比較 Web 與 App 的效能與錯誤率；分流容量規劃', '否', '由 API Gateway 依連線來源寫入', '同上'],
    ['region', '戶籍地縣市', '地區分流與地區暫停判斷；各縣市申請量統計', '間接', '只存縣市層級；來源為戶政查詢結果', '同上'],
    ['consent_version / consent_at', '同意的個資告知版本與時間', '證明蒐集時已依個資法第 8 條履行告知義務', '間接', '—', '同上'],
  ], { y: 1.85, colW: DD_COLW, fontSize: FS.tApp, pad: 0.08 });
  pageLabel(s, 'A5-1');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A5', '稽核 log（audit_log）：每一次查詢與送件都記錄，包含不受理');
  table(s, DD_HEAD, [
    ['request_id', '請求追蹤編號', '串連 Gateway、申請服務、Worker 的 log，追查單一請求', '否', '—', '1 年（假設）'],
    ['timestamp', '請求時間', '事件時間軸；客訴時舉證幾點幾分被拒', '否', '—', '1 年（假設）'],
    ['action', 'check / apply', '區分查詢與送件', '否', '—', '1 年（假設）'],
    ['national_id_hash', '身分證字號雜湊值', '客服以申請人提供的身分證字號算出雜湊，查出此人每一次的查詢與被拒原因', '是（假名化資料）', '同受理紀錄；格式不合法時不計算，留空', '1 年（假設）'],
    ['masked_national_id', '遮罩後身分證字號（A12****789）', '客服與資安人員閱讀 log 時不需看到完整號碼即可核對', '是（部分）', '遮罩；不合法輸入一律記為 (invalid-length) / (null)', '1 年（假設）'],
    ['reason_code', '驗證結果', '客訴時說明為何不受理；分析異常；統計各原因比例，評估規則調整的影響', '間接', '只存代碼，不存當時輸入的原始資料', '1 年（假設）'],
    ['source_ip', '來源 IP', '資安事件調查（機器人、撞庫）', '是', '存取權限限資安人員；log 只可附加、不可修改', '6 個月\n（假設）'],
  ], { y: TOP, colW: DD_COLW, fontSize: FS.tApp, pad: 0.18 });
  pageLabel(s, 'A5-2');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A5', '處理中的暫存資料與通知服務');
  s.addText('處理中的暫存資料', { x: M, y: TOP, w: CW, h: 0.34, margin: 0, fontFace: F, fontSize: FS.label, bold: true, color: C.deep });
  table(s, ['資料', '位置', '為何需要', '保護方式', '保存期限'], [
    ['身分證字號明碼', 'Kafka 申請訊息', 'Worker 傳給主管部會時，對方需要明碼才能核定與撥款；DB 只存雜湊，明碼只能來自這裡', '訊息欄位加密；Kafka 傳輸與落地皆加密；只有 Worker 有解密權限', 'Kafka 保留 7 天（假設）；傳送成功後不寫入任何資料表'],
    ['防重複鍵', 'Redis', '同步判斷重複申請（SETNX 原子寫入）', '只存雜湊鍵，不存明碼', '當月結束後 1 天到期'],
  ], { y: 1.85, colW: [1.6, 1.5, 3.8, 3.0, 2.433], fontSize: FS.tApp, pad: 0.12 });
  s.addText('通知服務（push_subscriptions）', { x: M, y: 3.7, w: CW, h: 0.34, margin: 0, fontFace: F, fontSize: FS.label, bold: true, color: C.deep });
  table(s, DD_HEAD, [
    ['national_id_hash', '身分證字號雜湊值', '推播的收件人識別：排隊輪到、受理結果、地區恢復受理、規則出錯時通知受影響的人；不需保存電話或 Email', '是（假名化資料）', '同受理紀錄', '登出或解除通知時刪除'],
    ['push_token', 'App 推播 token', '送出推播所需', '間接（可連結到特定裝置）', '只有通知服務可讀；不寫入 log', '同上；token 失效時刪除'],
  ], { y: 4.1, colW: DD_COLW, fontSize: FS.tApp, pad: 0.1 });
  s.addText('期限屆滿的處理：保存期限屆滿或特定目的消失時，依個資法第 11 條第 3 項主動刪除；稽核 log 到期後由 log 系統自動清除。保存期限為假設，正式上線以主管機關公告的檔案保存年限為準。', {
    x: M, y: 6.45, w: CW, h: 0.4, margin: 0, valign: 'top', fontFace: F, fontSize: FS.note, color: C.muted,
  });
  pageLabel(s, 'A5-3');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A5', '刻意不保存的資料（個資法第 5 條：最小必要原則）');
  table(s, ['資料', '不保存的原因'], [
    ['身分證字號明碼', '防重複只需要判斷是否同一人，雜湊值就夠用。明碼只在處理中短暫存在，傳送後即不保存，資料庫外洩時不會直接洩漏身分證字號'],
    ['出生年月日', '只在申請當下用來判斷是否年滿 20 歲。判斷完只保留結果（reason_code）；日後需要時可再向戶政查詢'],
    ['姓名、完整地址、電話、Email', '資格判斷用不到；通知改用 App 推播 token。這些資料由戶政與主管部會保管，本平台重複保存只會增加外洩風險'],
    ['使用者 GPS 或裝置定位', '地區分流依據的是戶籍地，不是使用者當下所在位置'],
    ['API 請求原始內容（request body）', '內含身分證字號與生日。格式錯誤時 Jackson 的例外訊息會帶出原始內容，因此錯誤處理統一不記錄例外訊息'],
    ['未送件的查詢結果（/eligibility）', '查詢只讀不寫，不進受理紀錄；只在稽核 log 保存原因代碼，用於客訴與異常分析'],
  ], { y: TOP, colW: [3.0, 9.333], fontSize: FS.tApp, pad: 0.27 });
  pageLabel(s, 'A5-4');
}

// ---------- A6 題二備案 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A6', '題二備案：上線維運');
  callout(s, TOP, '情境：', '補助開跑當天流量暴增，異常與客訴同時發生。', C.amberSoft, C.amber);
  table(s, ['小題', '重點'], [
    ['一、產出', '壓力測試報告與容量規劃；Runbook（每種異常的處理步驟與負責人）；監控告警門檻（錯誤率、排隊人數、回應時間）'],
    ['二、取捨', '真實高峰流量無法完全重現，所以用虛擬等候室限流，超過容量的人先排隊，保住系統。跨系統呼叫（戶政、主管部會）設逾時與降級，對方變慢時不拖垮本系統'],
    ['三、出事', '先降級非必要功能（例：申請進度查詢改讀快取），保住送件功能；對外公告預估恢復時間；事後用 APM 與 log 數據做根因分析。log 中的身分證已遮罩，調查時看不到完整號碼'],
  ], { y: 2.2, colW: [1.6, 10.733], fontSize: FS.tApp, pad: 0.45 });
  pageLabel(s, 'A6');
}

// ---------- A7 設計假設與正式環境考量 ----------
{
  const s = pres.addSlide();
  header(s, '附錄 A7', '設計假設（後端程式）');
  table(s, ['項目', '假設', '理由'], [
    ['時區', '一律以 Asia/Taipei 判斷', '題目寫「本地時間」；伺服器時區可能是 UTC，用錯會讓時段判斷偏 8 小時'],
    ['開放時段', '左閉右開：09:00:00 ≤ t < 18:00:00，18:00:00 整不受理', '「18:00 截止」通常指 18:00 起不再受理'],
    ['受理日期', '兩端都包含，例如租金補貼 1 日和 10 日都可以申請', '照題目字面'],
    ['滿 20 歲', '生日當天即滿 20 歲', '民法第 124 條年齡自出生日起算'],
    ['2/29 出生', '非閏年以 3/1 視為生日', '民法第 121 條；Java Period 的行為相同'],
    ['類別大小寫', '"rent" 視為 RENT', '降低前端傳值錯誤造成的客訴'],
    ['身分證字號空白', '先 strip() 去除前後空白，包含全形空白', '中文輸入法常打出全形空白；trim() 去不掉'],
    ['欄位為 null 或空白', '回 200 與對應的 INVALID_*', '避免拋例外變成 500'],
    ['重複申請', '唯一鍵（身分證雜湊、類別、年月），只記錄受理的申請', '題目要求檢驗當月是否已受理'],
    ['新式居留證', '未支援（第二碼 8、9 會被拒絕）', '題目為選做'],
  ], { y: TOP, colW: [1.9, 4.6, 5.833], fontSize: FS.tApp, pad: 0.13 });
  pageLabel(s, 'A7-1');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A7', '設計假設（簡報素材）');
  table(s, ['項目', '假設', '理由'], [
    ['排隊太久', '等候超過 30 分鐘即視為太久，保留號碼牌、允許先離開', '題目未定義門檻；30 分鐘後讓使用者不必守在畫面前'],
    ['登入與戶籍地', '以自然人憑證或 TW FidO 登入；登入時向內政部戶政查詢一次戶籍地，供地區分流使用', '地區分流依戶籍地，不由使用者自填，也不用裝置定位'],
    ['資料保存期限', '受理紀錄：核撥完成後 5 年；稽核 log：1 年；來源 IP：6 個月；Kafka 中的身分證明碼：7 天', '題目未規定；正式上線以主管機關公告的檔案保存年限為準'],
    ['題二情境', '上線前 2 週，國土署要求租金補貼受理日由 1–10 日延長到 1–15 日，另一部會反對；出事情境為參數誤設為 1–5 日', '題目允許自行假設情境'],
    ['Feature Flag', '只有設計、未實作；本實作修改受理日仍需重新部署', '正式環境把 SubsidyType 的受理日期移到設定檔，再以旗標切換新舊規則'],
  ], { y: TOP, colW: [1.9, 5.6, 4.833], fontSize: FS.tApp, pad: 0.3 });
  pageLabel(s, 'A7-2');
}
{
  const s = pres.addSlide();
  header(s, '附錄 A7', '正式環境考量：本實作未做的 5 項');
  table(s, ['項目', '現況', '正式環境做法'], [
    ['受理紀錄', '記憶體 ConcurrentHashMap', 'DB 資料表，在 (national_id_hash, subsidy_type, year_month) 建唯一鍵約束'],
    ['身分證雜湊', 'SHA-256 ＋ 固定 salt', 'HMAC-SHA256，金鑰放在 KMS 與資料庫分開保管。實測：取得 salt 與雜湊值後，筆電 CPU 用 33.9 秒就還原出身分證字號；全台約 5.2 億個合法字號，最多 2.9 分鐘就能全部試完'],
    ['身分驗證', '無，任何人可查任何身分證字號', '先以自然人憑證、TW FidO 等登入，身分證字號從登入憑證取得，不從請求內容取得'],
    ['生日', '使用者自行填寫', '向內政部戶政系統驗證生日與身分證字號是否相符'],
    ['補助類別路由', '類別放在 request body', 'API Gateway 依類別路由時，可改為放在路徑（/subsidies/{type}/...），Gateway 不必解析 body'],
  ], { y: TOP, colW: [1.8, 2.9, 7.633], fontSize: FS.tApp, pad: 0.34 });
  pageLabel(s, 'A7-3');
}

pres.writeFile({ fileName: OUT }).then(f => console.log('ok', f));
