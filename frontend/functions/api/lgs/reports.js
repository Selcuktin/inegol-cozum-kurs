import { generateTextPdf } from '../utils.js';
import reportLogo from '../assets/reportLogo.js';

const number=n=>Number(n??0).toLocaleString('tr-TR',{maximumFractionDigits:3});
export function reportPdf(exam, results, analysis, mode='karne') {
  const title=['İNEGÖL ÇÖZÜM KURS — DENEME ANALİZİ',`${exam.name} | ${exam.date}`,''];
  const scoreNote='Hesaplanan deneme puanlarıdır; resmi LGS sonucu değildir.';
  const lines=[...title];
  if(mode==='pdf') {
    lines.push(scoreNote,'Sıra | Öğrenci | Şube | Net | SS’li puan | SS’siz puan','');
    for(const r of results)lines.push(`${r.rank} | ${r.name} | ${r.branch} | ${number(r.total_net)} | ${number(r.score_sd)} | ${number(r.score_raw)}`);
  } else if(mode==='sube-karneleri') {
    for(const b of analysis.branches){
      const rs=results.filter(r=>r.branch===b.branch);if(!rs.length)continue;
      lines.push(`ŞUBE: ${b.branch} | ${b.count} öğrenci`,`Ortalama: SS’li ${number(b.avg_sd)} / SS’siz ${number(b.avg_raw)} / Net ${number(b.avg_net)}`,'Ders | Şube ortalama net | Kurum ortalama net');
      for(const s of exam.exam_type.subjects)lines.push(`${s.name} | ${number(b.nets[s.key])} | ${number(analysis.subjects.find(x=>x.key===s.key)?.avg_net)}`);
      lines.push('', 'Öğrenci | Genel sıra | Şube sırası | Net | Puan');
      for(const r of rs)lines.push(`${r.name} | ${r.rank} | ${r.branch_rank} | ${number(r.total_net)} | ${number(r.score_sd)}`);
      lines.push('');
    }
  } else {
    results.forEach((r,i)=>{
      if(i)lines.push('\f',...title);
      lines.push(`ÖĞRENCİ KARNESİ — ${r.name}`,`No: ${r.student_no||'—'} | Şube: ${r.branch} | Kitapçık: ${r.booklet}`,`Genel sıra: ${r.rank} / ${analysis.count} | Şube sırası: ${r.branch_rank}`,`SS’li puan: ${number(r.score_sd)} | SS’siz puan: ${number(r.score_raw)} | Net: ${number(r.total_net)}`,'',scoreNote,'','Ders | Doğru | Yanlış | Boş | Net | Kurum ortalama net');
      for(const s of exam.exam_type.subjects){const x=r.subjects[s.key];lines.push(`${s.name} | ${x.d} | ${x.y} | ${x.b} | ${number(x.net)} | ${number(analysis.subjects.find(a=>a.key===s.key)?.avg_net)}`);}
      lines.push('','CEVAP KAĞIDI (C: cevap / A: anahtar; X veya *: iptal, boş: değerlendirme dışı)');
      for(const s of exam.exam_type.subjects){const x=r.subjects[s.key];lines.push(s.name,`C: ${x.answers.replace(/ /g,'–')}`,`A: ${x.key.replace(/ /g,'–')}`);}
    });
  }
  const charts=mode==='karneler'||mode==='karne'||!mode?results.map(r=>exam.exam_type.subjects.map(s=>({name:s.name,percent:100*r.subjects[s.key].net/([...r.subjects[s.key].key].filter(k=>k!==' ').length||1),average:analysis.subjects.find(x=>x.key===s.key)?.success_pct||0}))):[];
  return generateTextPdf(lines,{brand:reportLogo,charts});
}

// Minimal uncompressed OOXML workbook: native byte arrays, no server dependency.
const xml=v=>String(v??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function zip(files){
  const encoder=new TextEncoder();
  const chunks=[],central=[];let offset=0;
  const header=(length,values)=>{const bytes=new Uint8Array(length),v=new DataView(bytes.buffer);for(const [pos,size,value] of values)v[size===2?'setUint16':'setUint32'](pos,value,true);return bytes;};
  for(const [name,text] of Object.entries(files)){
    const filename=encoder.encode(name),data=encoder.encode(text);let crc=0xffffffff;
    for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
    const h=header(30,[[0,4,0x04034b50],[4,2,20],[14,4,crc],[18,4,data.length],[22,4,data.length],[26,2,filename.length]]);
    const c=header(46,[[0,4,0x02014b50],[4,2,20],[6,2,20],[16,4,crc],[20,4,data.length],[24,4,data.length],[28,2,filename.length],[42,4,offset]]);
    chunks.push(h,filename,data);central.push(c,filename);offset+=h.length+filename.length+data.length;
  }
  const centralSize=central.reduce((n,c)=>n+c.length,0),end=header(22,[[0,4,0x06054b50],[8,2,Object.keys(files).length],[10,2,Object.keys(files).length],[12,4,centralSize],[16,4,offset]]),all=[...chunks,...central,end],out=new Uint8Array(offset+centralSize+end.length);let p=0;for(const c of all){out.set(c,p);p+=c.length;}return out;
}
export function reportExcel(exam,results){
  const subjects=exam.exam_type.subjects,rows=[['Sınav',exam.name],['Tarih',exam.date],['Sıra','Öğrenci No','Ad Soyad','Sınıf / Şube','Kitapçık','Net','SS’li Puan','SS’siz Puan',...subjects.flatMap(s=>[`${s.name} Doğru`,`${s.name} Yanlış`,`${s.name} Boş`,`${s.name} Net`])],...results.map(r=>[r.rank,r.student_no,r.name,r.branch,r.booklet,r.total_net,r.score_sd,r.score_raw,...subjects.flatMap(s=>{const x=r.subjects[s.key];return [x.d,x.y,x.b,x.net];})])];
  const sheet=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r,i)=>`<row r="${i+1}">${r.map(v=>typeof v==='number'?`<c><v>${v}</v></c>`:`<c t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;
  return zip({'[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>', '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>', 'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sonuçlar" sheetId="1" r:id="rId1"/></sheets></workbook>', 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>', 'xl/worksheets/sheet1.xml':sheet});
}
