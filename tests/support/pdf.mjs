// Read this app's uncompressed text streams using the PDF's own embedded ToUnicode map.
export function pdfText(pdf){
  const map=Object.fromEntries([...pdf.matchAll(/<([0-9a-f]{2})>\s+<([0-9a-f]{4})>/gi)].map(([,code,unicode])=>[code.toLowerCase(),String.fromCharCode(parseInt(unicode,16))]));
  return [...pdf.matchAll(/<([0-9a-f]+)> Tj/gi)].map(([,hex])=>(hex.match(/../g)||[]).map(code=>map[code.toLowerCase()]||'?').join('')).join('\n');
}
