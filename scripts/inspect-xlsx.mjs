import * as XLSX from 'xlsx';
import fs from 'fs';

const filePath = '/Users/unamed/Documents/trae_projects/quiz/题库1_converted.xlsx';
if (!fs.existsSync(filePath)) {
  console.error('文件不存在:', filePath);
  process.exit(1);
}

const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('工作表:', wb.SheetNames);
for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`\nSheet: ${name}, 行数: ${rows.length}`);
  const first = rows[0] || {};
  console.log('首行字段:', Object.keys(first));
  console.log('示例前3行:', rows.slice(0, 3));
}