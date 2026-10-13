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

const COLOR = {
  text: '0.11 0.12 0.13', muted: '0.40 0.42 0.45', brand: '0.094 0.392 0.365', rule: '0.82 0.84 0.86',
  head: '0.90 0.95 0.94', zebra: '0.97 0.98 0.98',
  green: '0.13 0.55 0.33', amber: '0.85 0.55 0.10', red: '0.78 0.20 0.20', grey: '0.62 0.64 0.67',
};

// One line of mixed-font words at (x, y): consecutive words in the same font share a text object.
function drawLine(ops, line, x, y, size, color) {
  ops.push(`${color} rg`);
  let cursor = x, run = null;
  const flush = () => { if (run) ops.push(`BT /${run.font} ${size} Tf ${run.x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(run.codes)} Tj ET`); run = null; };
  for (const word of line) {
    if (!run || run.font !== word.font) { flush(); run = {font: word.font, x: cursor, codes: []}; }
    run.codes.push(...word.codes);
    cursor += width(word.codes, size, word.font);
    if (word.space) { run.codes.push(32); cursor += width([32], size, word.font); }
  }
  flush();
}
const circle = (cx, cy, r) => { const k = 0.5523 * r; return `${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f`; };
const cellText = cell => typeof cell === 'object' && cell !== null ? cell.text : cell;

export function toPdf(blocks, {title, footer}) {
  const W = 612, H = 792, M = 54, top = H - 58, bottom = 64, maxWidth = W - 2 * M;
  const style = {
    h1: {size: 20, font: 'F2', color: COLOR.brand, before: 0, after: 8, lead: 25},
    h2: {size: 13, font: 'F2', color: COLOR.brand, before: 16, after: 8, lead: 17, rule: true},
    h3: {size: 10.5, font: 'F2', color: COLOR.text, before: 14, after: 4, lead: 14},
    p: {size: 9.5, font: 'F1', color: COLOR.text, before: 0, after: 7, lead: 13.5},
    li: {size: 9, font: 'F1', color: COLOR.text, before: 0, after: 2.5, lead: 12.5},
  };
  const pages = [];
  let ops = [], y = top;
  const newPage = () => { pages.push(ops); ops = []; y = top; };
  const room = needed => { if (y - needed < bottom && y < top) newPage(); };

  for (const block of blocks) {
    if (block.type === 'table') { y = drawTable(block); continue; }
    const s = block.type === 'h' ? style['h' + Math.min(block.level, 3)] : style[block.type];
    const indent = block.type === 'li' ? 14 + block.level * 14 : 0;
    const lines = wrap(block.text, maxWidth - indent, s.size, s.font);
    // Keep a heading, or a list label ending in a colon, with at least two lines of what follows.
    const keep = block.type === 'h' || (block.type === 'li' && /:$/.test(block.text)) ? 30 : 0;
    room(s.before + s.lead * Math.min(lines.length, 2) + keep);
    if (y < top) y -= s.before;
    lines.forEach((line, index) => {
      room(s.lead);
      y -= s.lead;
      if (block.type === 'li' && index === 0) {
        if (block.level) ops.push(`${COLOR.muted} rg`, `${M + indent - 9} ${(y + s.size * 0.32).toFixed(2)} 3 0.8 re f`);
        else ops.push(`${COLOR.brand} rg`, circle(M + indent - 8, y + s.size * 0.33, 1.7));
      }
      drawLine(ops, line, M + indent, y, s.size, block.muted ? COLOR.muted : s.color);
    });
    if (s.rule) ops.push(`${COLOR.rule} RG 0.6 w ${M} ${(y - 4).toFixed(2)} m ${W - M} ${(y - 4).toFixed(2)} l S`);
    y -= s.after;
  }
  pages.push(ops);

  // Tables: shaded header repeated on each page, zebra rows, wrapped cells, optional status dot.
  function drawTable({head, rows, widths}) {
    const size = 8.5, lead = 11, padX = 5, padY = 4, dotSpace = 9;
    const cols = widths.map(f => f * maxWidth);
    const layout = cells => cells.map((cell, i) => wrap(cellText(cell), cols[i] - 2 * padX - (cell?.dot ? dotSpace : 0), size, 'F1'));
    const heights = lines => Math.max(...lines.map(l => l.length)) * lead + 2 * padY;
    const headLines = head.map((cell, i) => wrap(cell, cols[i] - 2 * padX, size, 'F2'));
    const headHeight = heights(headLines);
    const drawHead = () => {
      ops.push(`${COLOR.head} rg ${M} ${(y - headHeight).toFixed(2)} ${maxWidth} ${headHeight.toFixed(2)} re f`);
      let x = M;
      headLines.forEach((lines, i) => {
        lines.forEach((line, j) => drawLine(ops, line, x + padX, y - padY - (j + 1) * lead + 2.5, size, COLOR.brand));
        x += cols[i];
      });
      y -= headHeight;
    };
    y -= 4;
    if (y - headHeight - heights(layout(rows[0] ?? head)) < bottom) newPage();
    drawHead();
    rows.forEach((cells, r) => {
      const lines = layout(cells), h = heights(lines);
      if (y - h < bottom) { newPage(); drawHead(); }
      if (r % 2) ops.push(`${COLOR.zebra} rg ${M} ${(y - h).toFixed(2)} ${maxWidth} ${h.toFixed(2)} re f`);
      let x = M;
      lines.forEach((cellLines, i) => {
        const dot = cells[i]?.dot;
        if (dot) ops.push(`${COLOR[dot]} rg`, circle(x + padX + 3, y - padY - lead + 5.5, 3));
        cellLines.forEach((line, j) => drawLine(ops, line, x + padX + (dot ? dotSpace : 0), y - padY - (j + 1) * lead + 2.5, size, COLOR.text));
        x += cols[i];
      });
      ops.push(`${COLOR.rule} RG 0.5 w ${M} ${(y - h).toFixed(2)} m ${W - M} ${(y - h).toFixed(2)} l S`);
      y -= h;
    });
    return y - 10;
  }

  const objects = [];
  const add = body => { objects.push(body); return objects.length; };
  const catalog = add(null), pagesId = add(null);
  const fontIds = {
    F1: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),
    F2: add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'),
    F3: add('<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'),
  };
  const fonts = Object.entries(fontIds).map(([name, id]) => `/${name} ${id} 0 R`).join(' ');
  const kids = pages.map((pageOps, index) => {
    const frame = [`${COLOR.rule} RG 0.6 w ${M} 46 m ${W - M} 46 l S`];
    drawLine(frame, [{codes: codes(footer), font: 'F1', space: false}], M, 34, 7.5, COLOR.muted);
    const number = codes(`Page ${index + 1} of ${pages.length}`);
    drawLine(frame, [{codes: number, font: 'F1', space: false}], W - M - width(number, 7.5, 'F1'), 34, 7.5, COLOR.muted);
    if (index) drawLine(frame, [{codes: codes(title), font: 'F1', space: false}], M, H - 36, 7.5, COLOR.muted);
    const data = deflateSync(Buffer.from([...frame, ...pageOps].join('\n'), 'latin1'));
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
