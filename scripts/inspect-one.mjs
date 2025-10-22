import * as XLSX from 'xlsx';
import fs from 'fs';

const target = process.argv[2] || '/Users/unamed/Documents/trae_projects/quiz/题库1_converted.xlsx';
if (!fs.existsSync(target)) {
  console.error('文件不存在:', target);
  process.exit(1);
}

const buf = fs.readFileSync(target);
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('工作表:', wb.SheetNames);

const expKeys = [
  '错题答案解释文本（不可空，没有请写：无）',
  '错题答案解释文本',
  '解析',
  '答案解析',
  '错误解析',
  '错题解析',
];

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`\nSheet: ${name}, 行数: ${rows.length}`);
  const first = rows[0] || {};
  const headers = Object.keys(first);
  console.log('首行字段:', headers);

  // 打印与解析相关的列是否存在
  const presentExpKeys = expKeys.filter(k => headers.includes(k));
  console.log('检测到的解析列:', presentExpKeys.length ? presentExpKeys : '(无)');

  // 打印前5行的解析列值
  const preview = rows.slice(0, 5).map((r, idx) => {
    const entry = { 行号: idx + 1 };
    for (const k of expKeys) {
      if (Object.prototype.hasOwnProperty.call(r, k)) {
        entry[k] = r[k];
      }
    }
    return entry;
  });
  console.log('解析列值示例(前5行):', preview);
}