import {deflateRawSync, deflateSync} from 'node:zlib';

// Dependency-free writers for the evidence downloads. Output is deterministic: no timestamps,
// so the same records always produce the same bytes and the same SHA-256.

// ---- PDF: text-only, the 14 standard fonts, WinAnsi encoding ----

// Helvetica advance widths (1/1000 em) for ASCII 32..126, from the standard AFM.
const HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
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
const width = (list, size, bold) => list.reduce((sum, code) => sum + (HELVETICA[code - 32] ?? 556), 0) * size / 1000 * (bold ? 1.08 : 1);
const pdfString = list => '(' + list.map(code => code === 40 || code === 41 || code === 92 ? '\\' + String.fromCharCode(code)
  : code < 127 ? String.fromCharCode(code) : '\\' + code.toString(8).padStart(3, '0')).join('') + ')';

// Greedy wrap; words wider than the line (hashes, ids) break by character.
function wrap(text, maxWidth, size, bold) {
  const out = [];
  let line = [];
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    let piece = codes(word);
    const trial = line.length ? [...line, 32, ...piece] : piece;
    if (width(trial, size, bold) <= maxWidth) { line = trial; continue; }
    if (line.length) out.push(line);
    line = [];
    while (width(piece, size, bold) > maxWidth) {
      let cut = piece.length - 1;
      while (cut > 1 && width(piece.slice(0, cut), size, bold) > maxWidth) cut--;
      out.push(piece.slice(0, cut)); piece = piece.slice(cut);
    }
    line = piece;
  }
  if (line.length) out.push(line);
  return out;
}

const strip = text => String(text).replace(/`([^`]*)`/g, '$1').replace(/\*\*([^*]*)\*\*/g, '$1');

export function toPdf(blocks, {title, footer}) {
  const W = 612, H = 792, M = 54, bottom = 62, maxWidth = W - 2 * M;
  const style = {
    h1: {size: 18, bold: true, before: 0, after: 10, lead: 22},
    h2: {size: 13, bold: true, before: 14, after: 6, lead: 17},
    h3: {size: 10.5, bold: true, before: 9, after: 3, lead: 14},
    p: {size: 9.5, bold: false, before: 0, after: 7, lead: 13},
    li: {size: 9, bold: false, before: 0, after: 2, lead: 12},
  };
  const pages = [];
  let ops = [], y = H - M;
  const newPage = () => { if (ops.length) pages.push(ops); ops = []; y = H - M; };
  for (const block of blocks) {
    const s = block.type === 'h' ? style['h' + Math.min(block.level, 3)] : style[block.type];
    const indent = block.type === 'li' ? 12 + block.level * 14 : 0;
    const wrapped = wrap(strip(block.text), maxWidth - indent, s.size, s.bold);
    const needed = s.before + s.lead * Math.min(wrapped.length, block.type === 'h' ? wrapped.length + 2 : 2);
    if (y - needed < bottom) newPage();
    else if (y < H - M) y -= s.before;
    wrapped.forEach((line, index) => {
      if (y - s.lead < bottom) newPage();
      y -= s.lead;
      if (block.type === 'li' && index === 0) ops.push(`BT /F1 ${s.size} Tf ${M + indent - 9} ${y.toFixed(2)} Td ${pdfString([block.level ? 0x96 : 0x95])} Tj ET`);
      ops.push(`BT /${s.bold ? 'F2' : 'F1'} ${s.size} Tf ${M + indent} ${y.toFixed(2)} Td ${pdfString(line)} Tj ET`);
    });
    y -= s.after;
  }
  newPage();

  const objects = [];
  const add = body => { objects.push(body); return objects.length; };
  const catalog = add(null), pagesId = add(null);
  const regular = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const bold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = pages.map((pageOps, index) => {
    const foot = codes(`${footer} · page ${index + 1} of ${pages.length}`);
    const content = [...pageOps, `0.4 g BT /F1 8 Tf ${M} 36 Td ${pdfString(foot)} Tj ET`].join('\n');
    const data = deflateSync(Buffer.from(content, 'latin1'));
    const stream = add({dict: `<< /Length ${data.length} /Filter /FlateDecode >>`, data});
    return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${regular} 0 R /F2 ${bold} 0 R >> >> /Contents ${stream} 0 R >>`);
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
