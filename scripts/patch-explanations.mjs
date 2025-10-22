import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = process.argv[2] || '/Users/unamed/Documents/trae_projects/quiz/1757587994356.xlsx';
if (!fs.existsSync(filePath)) {
  console.error('文件不存在:', filePath);
  process.exit(1);
}

const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer' });
const sheetNames = wb.SheetNames;
if (sheetNames.length === 0) {
  console.error('该工作簿没有工作表');
  process.exit(1);
}

// 统一说明文本，可根据题干拼接
const defaultText = '这是统一示例解析，用于预览验证。';
const expKeys = [
  '错题答案解释文本（不可空，没有请写：无）',
  '错题答案解释文本',
  '解析',
  '答案解析',
  '错误解析',
  '错题解析',
];

let updatedCount = 0;

for (const name of sheetNames) {
  const ws = wb.Sheets[name];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (aoa.length === 0) continue;
  const headers = aoa[0].map(h => String(h).trim());

  // 找到解析列，若不存在则新增一列到最后
  let expIdx = -1;
  for (let i = 0; i < headers.length; i++) {
    if (expKeys.includes(headers[i])) { expIdx = i; break; }
  }
  if (expIdx === -1) {
    headers.push(expKeys[0]);
    expIdx = headers.length - 1;
    aoa[0] = headers;
  }

  // 找到题干列用于拼接说明（可选）
  const stemIdx = headers.indexOf('题干内容');

  // 更新每一行的解释列
  for (let r = 1; r < aoa.length; r++) {
    const row = Array.isArray(aoa[r]) ? aoa[r] : [];
    // 扩展行长度以防越界
    while (row.length < headers.length) row.push('');
    const v = row[expIdx];
    const isEmpty = v == null || String(v).trim() === '' || /^(无|none|n\/a)$/i.test(String(v).trim());
    if (isEmpty) {
      const stem = stemIdx >= 0 ? String(row[stemIdx] || '').trim() : '';
      row[expIdx] = stem ? `${defaultText}（题干：${stem}）` : defaultText;
      updatedCount++;
    }
  }

  // 回写工作表
  const newWs = XLSX.utils.aoa_to_sheet(aoa);
  wb.Sheets[name] = newWs;
}

const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
fs.writeFileSync(filePath, out);
console.log(`已更新 ${updatedCount} 行解释文本 -> ${filePath}`);