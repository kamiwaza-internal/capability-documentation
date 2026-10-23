import {deflateRawSync, deflateSync} from 'node:zlib';

// Dependency-free writers for the evidence downloads. Output is deterministic: no timestamps,
// so the same records always produce the same bytes and the same SHA-256.

// ---- PDF: the 14 standard fonts, WinAnsi encoding, real text (selectable and machine-readable) ----

// Advance widths (1/1000 em) for ASCII 32..126, from the standard AFMs.
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELVETICA_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
const WIN_ANSI = {'‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '·': 0xb7};
const ASCII_FALLBACK = {'→': '->', '≥': '>=', '≤': '<=', '…': '...', ' ': ' '};

const codes = text => [...String(text)].flatMap(char => {
  const code = char.codePointAt(0);
  if (code >= 32 && code < 127) return [code];
  if (WIN_ANSI[char]) return [WIN_ANSI[char]];
  if (ASCII_FALLBACK[char]) return [...ASCII_FALLBACK[char]].map(c => c.charCodeAt(0));
  if (code >= 0xa0 && code <= 0xff) return [code];
  return char === '\t' ? [32] : [63];
});
const FONTS = {F1: HELVETICA, F2: HELVETICA_BOLD, F3: null};
const width = (list, size, font) => font === 'F3' ? list.length * 600 * size / 1000
  : list.reduce((sum, code) => sum + (FONTS[font][code - 32] ?? 556), 0) * size / 1000;
const pdfString = list => '(' + list.map(code => code === 40 || code === 41 || code === 92 ? '\\' + String.fromCharCode(code)
  : code < 127 ? String.fromCharCode(code) : '\\' + code.toString(8).padStart(3, '0')).join('') + ')';

// Inline Markdown subset: **bold** and `code`. Everything else is literal text.
function words(text, base) {
  const out = [];
  for (const token of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/).filter(Boolean)) {
    const font = token.startsWith('**') ? 'F2' : token.startsWith('`') ? 'F3' : base;
    const body = font === base ? token : token.slice(font === 'F2' ? 2 : 1, font === 'F2' ? -2 : -1);
    body.split(/(\s+)/).forEach(part => {
      if (!part) return;
      if (/^\s+$/.test(part)) { if (out.length) out.at(-1).space = true; return; }
      out.push({codes: codes(part), font, space: false});
    });
  }
  return out;
}

// Greedy wrap into lines of words; a word wider than the line (hashes, ids) breaks by character.
function wrap(text, maxWidth, size, base) {
  const lines = [];
  let line = [], used = 0;
  const spaceWidth = font => width([32], size, font);
  for (const word of words(text, base)) {
    const gap = line.length && line.at(-1).space ? spaceWidth(line.at(-1).font) : 0;
    let w = width(word.codes, size, word.font);
    if (line.length && used + gap + w > maxWidth) { lines.push(line); line = []; used = 0; }
    let piece = word;
    while (w > maxWidth) {
      let cut = piece.codes.length - 1;
      while (cut > 1 && width(piece.codes.slice(0, cut), size, piece.font) > maxWidth) cut--;
      lines.push([{...piece, codes: piece.codes.slice(0, cut), space: false}]);
      piece = {...piece, codes: piece.codes.slice(cut)};
      w = width(piece.codes, size, piece.font);
    }
    used += (line.length && line.at(-1).space ? spaceWidth(line.at(-1).font) : 0) + w;
    line.push(piece);
  }
  if (line.length) lines.push(line);
  return lines.length ? lines : [[]];
}


// Brand palette (site/src/css/custom.css): teal #18645d, deep teal #102f32, mint #91d5c3, hero text #f3faf7.
const COLOR = {
  text: '0.11 0.12 0.13', muted: '0.40 0.42 0.45', brand: '0.094 0.392 0.365', deep: '0.063 0.184 0.196',
  mint: '0.569 0.835 0.765', hero: '0.953 0.980 0.969', white: '1 1 1', rule: '0.86 0.89 0.89',
  zebra: '0.957 0.976 0.971', callout: '0.918 0.965 0.953',
};
// Status tones: a tinted fill, a dark ink for text on it, and the solid dot. The label text always carries the meaning.
const TONES = {
  green: {fill: '0.87 0.95 0.90', ink: '0.05 0.35 0.19', solid: '0.13 0.55 0.33'},
  amber: {fill: '0.99 0.94 0.83', ink: '0.52 0.31 0.02', solid: '0.85 0.55 0.10'},
  red: {fill: '0.98 0.89 0.89', ink: '0.58 0.11 0.11', solid: '0.78 0.20 0.20'},
  grey: {fill: '0.92 0.93 0.94', ink: '0.30 0.32 0.35', solid: '0.58 0.60 0.63'},
};

const W = 612, H = 792, M = 54, TOP = H - 58, BOTTOM = 64, MAX = W - 2 * M;
const STYLE = {
  h1: {size: 20, font: 'F2', color: COLOR.brand, before: 0, after: 8, lead: 25},
  h2: {size: 13, font: 'F2', color: COLOR.deep, before: 18, after: 9, lead: 17, bar: true},
  h3: {size: 10.5, font: 'F2', color: COLOR.text, before: 14, after: 4, lead: 14},
  p: {size: 9.5, font: 'F1', color: COLOR.text, before: 0, after: 7, lead: 13.5},
  li: {size: 9, font: 'F1', color: COLOR.text, before: 0, after: 2.5, lead: 12.5},
};
const CELL = {size: 8.5, lead: 11.5, padX: 6, padY: 5, pill: 5, dot: 8};

const f = n => n.toFixed(2);
const text1 = (string, font) => [{codes: codes(string), font, space: false}];
const lineWidth = (line, size) => line.reduce((sum, word) => sum + width(word.codes, size, word.font) + (word.space ? width([32], size, word.font) : 0), 0);
const circle = (cx, cy, r) => { const k = 0.5523 * r; return `${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f`; };
// A filled rounded rectangle over box {x, y, w, h}; k places the Bezier control points for a quarter circle.
function roundRect({x, y, w, h}, r) {
  const k = 0.4477 * r, R = x + w, T = y + h;
  return [`${f(x + r)} ${f(y)} m ${f(R - r)} ${f(y)} l ${f(R - k)} ${f(y)} ${f(R)} ${f(y + k)} ${f(R)} ${f(y + r)} c`,
    `${f(R)} ${f(T - r)} l ${f(R)} ${f(T - k)} ${f(R - k)} ${f(T)} ${f(R - r)} ${f(T)} c`,
    `${f(x + r)} ${f(T)} l ${f(x + k)} ${f(T)} ${f(x)} ${f(T - k)} ${f(x)} ${f(T - r)} c`,
    `${f(x)} ${f(y + r)} l ${f(x)} ${f(y + k)} ${f(x + k)} ${f(y)} ${f(x + r)} ${f(y)} c f`].join(' ');
}
const cellText = cell => typeof cell === 'object' && cell !== null ? cell.text : cell;
const toneOf = cell => TONES[cell?.dot];

// One line of mixed-font words at (x, y): consecutive words in the same font share a text object.
function drawLine(ops, line, x, y, size, color) {
  ops.push(`${color} rg`);
  let cursor = x, run = null;
  const flush = () => { if (run) ops.push(`BT /${run.font} ${size} Tf ${f(run.x)} ${f(y)} Td ${pdfString(run.codes)} Tj ET`); run = null; };
  for (const word of line) {
    if (!run || run.font !== word.font) { flush(); run = {font: word.font, x: cursor, codes: []}; }
    run.codes.push(...word.codes);
    cursor += width(word.codes, size, word.font);
    if (word.space) { run.codes.push(32); cursor += width([32], size, word.font); }
  }
  flush();
}

// ---- Page flow: a cursor `y` on the current page's ops; pages are closed by newPage ----

const newPage = ctx => { ctx.pages.push(ctx.ops); ctx.ops = []; ctx.y = TOP; };
const room = (ctx, needed) => { if (ctx.y - needed < BOTTOM && ctx.y < TOP) newPage(ctx); };
const isLabel = block => block.type === 'li' && /:$/.test(block.text);
// Keep a heading, or a list label ending in a colon, with what follows: a table's header and first
// row, or at least two lines of text.
const keepsNext = block => block.type === 'h' || isLabel(block);
const keepFor = next => next?.type === 'table' ? tableStart(next)
  : next?.callout ? next.text.split('\n').flatMap(line => wrap(line, MAX - 24, STYLE.p.size, STYLE.p.font)).length * STYLE.p.lead + 26 : 30;
const styleOf = block => block.type === 'h' ? STYLE['h' + Math.min(block.level, 3)] : STYLE[block.type];

function marker(ctx, block, s, index) {
  const {ops, y} = ctx;
  if (s.bar) ops.push(`${COLOR.brand} rg ${M} ${f(y - 3)} 3.5 ${f(s.lead - 1)} re f`);
  if (block.type !== 'li' || index) return;
  const x = M + 14 + block.level * 14;
  if (block.level) ops.push(`${COLOR.muted} rg`, `${x - 9} ${f(y + s.size * 0.32)} 3 0.8 re f`);
  else ops.push(`${COLOR.brand} rg`, circle(x - 8, y + s.size * 0.33, 1.7));
}

function drawText(ctx, block, next) {
  const base = styleOf(block);
  const s = block.compact ? {...base, before: block.level >= 4 ? 7 : base.before, after: block.type === 'p' ? 4 : base.after} : base;
  const indent = block.type === 'li' ? 14 + block.level * 14 : s.bar ? 11 : 0;
  const lines = wrap(block.text, MAX - indent, s.size, s.font);
  room(ctx, s.before + s.lead * Math.min(lines.length, 2) + (keepsNext(block) ? keepFor(next) : 0));
  if (ctx.y < TOP) ctx.y -= s.before;
  lines.forEach((line, index) => {
    room(ctx, s.lead);
    ctx.y -= s.lead;
    marker(ctx, block, s, index);
    drawLine(ctx.ops, line, M + indent, ctx.y, s.size, block.muted ? COLOR.muted : s.color);
  });
  ctx.y -= s.after;
}

// A highlighted paragraph: mint panel with a teal edge.
function drawCallout(ctx, block) {
  const s = STYLE.p, pad = 10, lines = block.text.split("\n").flatMap(line => wrap(line, MAX - 2 * pad - 4, s.size, s.font));
  const tone = TONES[block.tone];
  const h = lines.length * s.lead + 2 * pad - 2;
  room(ctx, h + 6);
  ctx.ops.push(`${tone?.fill ?? COLOR.callout} rg ${roundRect({x: M, y: ctx.y - h, w: MAX, h}, 4)}`, `${COLOR.brand} rg ${M} ${f(ctx.y - h)} 3 ${f(h)} re f`);
  lines.forEach((line, j) => drawLine(ctx.ops, line, M + pad + 4, ctx.y - pad - (j + 1) * s.lead + 3.5, s.size, tone?.ink ?? COLOR.deep));
  ctx.y -= h + 8;
}

// ---- Stat tiles: one per status, count large and label small, tinted by status ----

function drawTile(ops, box, cells, label) {
  const tone = toneOf(cells[0]) ?? TONES.grey, pad = 10;
  ops.push(`${tone.fill} rg ${roundRect({x: box.x, y: box.top - box.h, w: box.w, h: box.h}, 6)}`);
  ops.push(`${tone.solid} rg`, circle(box.x + box.w - pad - 3, box.top - pad - 3, 3));
  drawLine(ops, text1(cellText(cells[1]), 'F2'), box.x + pad, box.top - pad - 21, 24, tone.ink);
  label.forEach((line, j) => drawLine(ops, line, box.x + pad, box.top - pad - 38 - j * 10.5, 8, tone.ink));
}

function drawTiles(ctx, rows) {
  const gap = 8, w = (MAX - gap * (rows.length - 1)) / rows.length;
  const labels = rows.map(cells => wrap(cellText(cells[0]), w - 20, 8, 'F2'));
  const h = 48 + Math.max(...labels.map(lines => lines.length)) * 10.5;
  room(ctx, h + 10);
  ctx.y -= 2;
  rows.forEach((cells, i) => drawTile(ctx.ops, {x: M + i * (w + gap), top: ctx.y, w, h}, cells, labels[i]));
  ctx.y -= h + 8;
}

// ---- Tables: teal header repeated on each page, zebra rows, wrapped cells, status pills ----

const baseline = (top, j) => top - CELL.padY - (j + 1) * CELL.lead + 2.8;
const pillExtra = cell => toneOf(cell) ? CELL.dot + 2 * CELL.pill : 0;

// ponytail: a cell taller than a page is cut to what fits under the repeated header, not split
// across pages; split rows if the PDF itself must carry such text in full.
const TRUNCATED = '… (full text in the AI zip)';
function fitPage(cellLines, maxLines, cellWidth) {
  if (cellLines.length <= maxLines) return cellLines;
  const tail = wrap(TRUNCATED, cellWidth, CELL.size, 'F1');
  return [...cellLines.slice(0, maxLines - tail.length), ...tail];
}

function tableLayout({head, widths}) {
  const cols = widths.map(share => share * MAX);
  const headLines = head.map((cell, i) => wrap(cell, cols[i] - 2 * CELL.padX, CELL.size, 'F2'));
  const height = cellLines => Math.max(...cellLines.map(l => l.length)) * CELL.lead + 2 * CELL.padY;
  const headHeight = height(headLines);
  const maxLines = Math.floor((TOP - BOTTOM - headHeight - 2 * CELL.padY) / CELL.lead);
  const lines = cells => cells.map((cell, i) => {
    const cellWidth = cols[i] - 2 * CELL.padX - pillExtra(cell);
    return fitPage(wrap(cellText(cell), cellWidth, CELL.size, 'F1'), maxLines, cellWidth);
  });
  return {cols, headLines, lines, height, headHeight};
}

const tableStart = block => { const t = tableLayout(block); return 4 + t.headHeight + t.height(t.lines(block.rows[0] ?? block.head)); };

function drawTableHead(ctx, t) {
  ctx.ops.push(`${COLOR.brand} rg ${M} ${f(ctx.y - t.headHeight)} ${MAX} ${f(t.headHeight)} re f`);
  let x = M;
  t.headLines.forEach((lines, i) => {
    lines.forEach((line, j) => drawLine(ctx.ops, line, x + CELL.padX, baseline(ctx.y, j), CELL.size, COLOR.white));
    x += t.cols[i];
  });
  ctx.y -= t.headHeight;
}

// The status label in a rounded, tinted chip with its dot; the text stays real and selectable.
function drawPill(ops, {x, top}, lines, tone) {
  const w = Math.max(...lines.map(line => lineWidth(line, CELL.size))) + CELL.dot + 2 * CELL.pill;
  const h = lines.length * CELL.lead + 3.5, y = top - CELL.padY - lines.length * CELL.lead - 0.5;
  ops.push(`${tone.fill} rg ${roundRect({x, y, w, h}, Math.min(h / 2, 7))}`, `${tone.solid} rg`, circle(x + CELL.pill + 2.5, baseline(top, 0) + 3, 2.5));
  lines.forEach((line, j) => drawLine(ops, line, x + CELL.pill + CELL.dot, baseline(top, j), CELL.size, tone.ink));
}

// `at` is the cell's {x, top}.
function drawCell(ops, {x, top}, cell, lines) {
  const tone = toneOf(cell);
  if (tone) return drawPill(ops, {x: x + CELL.padX - 2, top}, lines, tone);
  lines.forEach((line, j) => drawLine(ops, line, x + CELL.padX, baseline(top, j), CELL.size, COLOR.text));
}

function drawRow(ctx, t, cells, r) {
  const lines = t.lines(cells), h = t.height(lines);
  if (ctx.y - h < BOTTOM) { newPage(ctx); drawTableHead(ctx, t); }
  if (r % 2) ctx.ops.push(`${COLOR.zebra} rg ${M} ${f(ctx.y - h)} ${MAX} ${f(h)} re f`);
  let x = M;
  lines.forEach((cellLines, i) => { drawCell(ctx.ops, {x, top: ctx.y}, cells[i], cellLines); x += t.cols[i]; });
  ctx.ops.push(`${COLOR.rule} RG 0.4 w ${M} ${f(ctx.y - h)} m ${W - M} ${f(ctx.y - h)} l S`);
  ctx.y -= h;
}

function drawTable(ctx, block) {
  if (block.glance) drawTiles(ctx, block.rows);
  const t = tableLayout(block);
  ctx.y -= 4;
  if (ctx.y - t.headHeight - t.height(t.lines(block.rows[0] ?? block.head)) < BOTTOM) newPage(ctx);
  drawTableHead(ctx, t);
  block.rows.forEach((cells, r) => drawRow(ctx, t, cells, r));
  ctx.y -= 12;
}

// ---- Cover band: the leading title, its muted subtitle and the basis line move into a deep-teal band ----

// The basis is the block after the subtitle marked `basis`, so the Markdown carries the same line.
function drawCover(ctx, blocks, cover) {
  const [head, sub, next] = blocks;
  const subtitle = sub?.muted ? sub.text : '';
  const basisText = next?.basis ? next.text : '';
  const title = wrap(head.text, MAX, 24, 'F2'), subLines = subtitle ? wrap(subtitle, MAX, 10.5, 'F1') : [];
  const basis = basisText ? wrap(basisText, MAX, 8.5, 'F1') : [];
  const h = 70 + title.length * 29 + subLines.length * 14.5 + basis.length * 12 + 22;
  ctx.ops.push(`${COLOR.deep} rg 0 ${f(H - h)} ${W} ${f(h)} re f`, `${COLOR.mint} rg 0 ${f(H - h)} ${W} 3 re f`);
  let y = H - 44;
  drawLine(ctx.ops, text1(cover.eyebrow, 'F2'), M, y, 8.5, COLOR.mint);
  y -= 12;
  for (const line of title) drawLine(ctx.ops, line, M, y -= 29, 24, COLOR.white);
  y -= 6;
  for (const line of subLines) drawLine(ctx.ops, line, M, y -= 14.5, 10.5, COLOR.hero);
  y -= 4;
  for (const line of basis) drawLine(ctx.ops, line, M, y -= 12, 8.5, COLOR.mint);
  ctx.y = H - h - 4;
  return blocks.slice(1 + Boolean(subtitle) + Boolean(basisText));
}

// Footer, drawn after the page's content so text extracts top to bottom.
function footerOps(index, count, footer) {
  const ops = [`${COLOR.rule} RG 0.5 w ${M} 46 m ${W - M} 46 l S`];
  drawLine(ops, text1(footer, 'F1'), M, 34, 7.5, COLOR.muted);
  const number = codes(`Page ${index + 1} of ${count}`);
  drawLine(ops, [{codes: number, font: 'F1', space: false}], W - M - width(number, 7.5, 'F1'), 34, 7.5, COLOR.muted);
  return ops;
}

// Running header strip on pages 2+, drawn before the page's content.
function headerOps(index, title) {
  if (!index) return [];
  const ops = [`${COLOR.deep} rg 0 ${H - 28} ${W} 28 re f`, `${COLOR.mint} rg 0 ${H - 28} ${W} 1.5 re f`];
  const brand = codes('KAMIWAZA ');
  drawLine(ops, [{codes: brand, font: 'F2', space: false}], M, H - 17.5, 7.5, COLOR.mint);
  drawLine(ops, text1(title, 'F1'), M + width(brand, 7.5, 'F2') + 4, H - 17.5, 7.5, COLOR.hero);
  return ops;
}

// `cover` ({eyebrow}) puts the leading title, subtitle and basis blocks in a band on page 1; without it the
// title is an ordinary heading.
export function toPdf(blocks, {title, footer, cover}) {
  const ctx = {pages: [], ops: [], y: TOP};
  const flow = cover ? drawCover(ctx, blocks, cover) : blocks;
  flow.forEach((block, i) => {
    if (block.pageBreakBefore && ctx.y < TOP) newPage(ctx);
    if (block.type === 'table') drawTable(ctx, block);
    else if (block.callout) drawCallout(ctx, block);
    else drawText(ctx, block, flow[i + 1]);
  });
  ctx.pages.push(ctx.ops);
  return writePdf(ctx.pages.map((ops, index) => [...headerOps(index, title), ...ops, ...footerOps(index, ctx.pages.length, footer)]), title);
}

function writePdf(pages, title) {
  const objects = [];
  const add = body => { objects.push(body); return objects.length; };
  const catalog = add(null), pagesId = add(null);
  const fontIds = {
    F1: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    F2: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    F3: add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'),
  };
  const fonts = Object.entries(fontIds).map(([name, id]) => `/${name} ${id} 0 R`).join(' ');
  const kids = pages.map(ops => {
    const data = deflateSync(Buffer.from(ops.join('\n'), 'latin1'));
    const stream = add({dict: `<< /Length ${data.length} /Filter /FlateDecode >>`, data});
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << ${fonts} >> >> /Contents ${stream} 0 R >>`);
  });
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(id => id + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${pdfString(codes(title))} /Producer (capabilities.kamiwaza.dev) >>`);

  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let offset = chunks[0].length;
  const offsets = objects.map((body, index) => {
    const at = offset;
    const parts = typeof body === 'string' ? [Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, 'latin1')]
      : [Buffer.from(`${index + 1} 0 obj\n${body.dict}\nstream\n`, 'latin1'), body.data, Buffer.from('\nendstream\nendobj\n', 'latin1')];
    for (const part of parts) { chunks.push(part); offset += part.length; }
    return at;
  });
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.map(at => String(at).padStart(10, '0') + ' 00000 n \n').join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  chunks.push(Buffer.from(xref, 'latin1'));
  return Buffer.concat(chunks);
}

// ---- ZIP: deflate, fixed 1980-01-01 timestamps ----

const CRC_TABLE = Array.from({length: 256}, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = bytes => { let c = 0xffffffff; for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function toZip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const {name, data} of files) {
    const raw = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
    const packed = deflateRawSync(raw, {level: 9});
    const nameBytes = Buffer.from(name, 'utf8');
    const crc = crc32(raw);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x0800, 6); header.writeUInt16LE(8, 8);
    header.writeUInt16LE(0, 10); header.writeUInt16LE(33, 12); header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(packed.length, 18); header.writeUInt32LE(raw.length, 22); header.writeUInt16LE(nameBytes.length, 26); header.writeUInt16LE(0, 28);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0, 12); entry.writeUInt16LE(33, 14); entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(raw.length, 24);
    entry.writeUInt16LE(nameBytes.length, 28); entry.writeUInt32LE(offset, 42);
    local.push(header, nameBytes, packed); central.push(entry, nameBytes);
    offset += header.length + nameBytes.length + packed.length;
  }
  const size = central.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, ...central, end]);
}
