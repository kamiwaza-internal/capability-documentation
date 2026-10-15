import {toZip} from './evidence-files.mjs';

const xml = value => String(value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
  .replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'}[char]));
const plain = value => String(typeof value === 'object' && value !== null ? value.text : value).replace(/\*\*|`/g, '');
const paragraph = (value, style = 'Normal', extra = '') => `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr><w:r><w:t xml:space="preserve">${xml(plain(value))}</w:t></w:r></w:p>`;

// The existing block model and ZIP writer are sufficient for editable text and tables. No macros,
// external relationships or embedded programs. Same input produces identical OOXML bytes.
export function toDocx(blocks) {
  const body = blocks.map(block => {
    if (block.type === 'table') {
      const widths = (block.widths ?? block.head.map(() => 1 / block.head.length)).map(width => Math.round(width * 9360));
      const rows = [block.head, ...block.rows].map((row, n) => `<w:tr>${n === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${row.map((cell, col) => `<w:tc><w:tcPr><w:tcW w:w="${widths[col]}" w:type="dxa"/>${n === 0 ? '<w:shd w:fill="E8F4EF"/>' : ''}</w:tcPr>${paragraph(cell)}</w:tc>`).join('')}</w:tr>`).join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="9360" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(edge => `<w:${edge} w:val="single" w:sz="4" w:color="D9D9D9"/>`).join('')}</w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows}</w:tbl>`;
    }
    if (block.type === 'h') return paragraph(block.text, block.level === 1 ? 'Title' : `Heading${Math.min(block.level - 1, 3)}`);
    if (block.type === 'li') return paragraph('• ' + block.text, 'Normal', `<w:ind w:left="${(block.level + 1) * 240}" w:hanging="180"/>`);
    return paragraph(block.text);
  }).join('');
  const style = (id, size, bold = false) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${id}"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="100"/>${id === 'Normal' ? '' : '<w:keepNext/>'}</w:pPr><w:rPr><w:color w:val="000000"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr></w:style>`;
  return toZip([
    {name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'},
    {name: '_rels/.rels', data: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'},
    {name: 'word/_rels/document.xml.rels', data: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'},
    {name: 'word/styles.xml', data: `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="21"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="100"/></w:pPr></w:style>${style('Title', 34, true)}${style('Heading1', 28, true)}${style('Heading2', 24, true)}${style('Heading3', 22, true)}</w:styles>`},
    {name: 'word/document.xml', data: `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1080" w:right="1440" w:bottom="1080" w:left="1440"/></w:sectPr></w:body></w:document>`},
  ]);
}
