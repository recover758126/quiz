import * as XLSX from 'xlsx';
import { Question } from './types';
import { uid, normalizeAnswer, toBoolean } from './utils';

export interface ParseResult {
  questions: Question[];
  sheetName: string;
}

// 严格按提供的题库列名解析：
// 题干内容、题目答案（不为空，无答案直接写“无”）、题目类型、A-F、错题答案解释文本（不可空，没有请写：无）
function mapType(typeStr: string, optionsCount: number, rawAns: string): 'single' | 'multi' | 'boolean' | 'text' {
  const t = (typeStr || '').trim();
  if (/多选/.test(t)) return 'multi';
  if (/单选/.test(t)) return 'single';
  if (/判断|是非/.test(t)) return 'boolean';
  if (/填空/.test(t)) return 'text';
  // 若类型缺失，依据选项和答案长度回退判断
  if (optionsCount >= 2) {
    const parts = normalizeAnswer(rawAns);
    return parts.length > 1 ? 'multi' : 'single';
  }
  // 若无选项，默认为填空
  return 'text';
}

function buildQuestionStrict(row: Record<string, any>, sheetName: string): Question | null {
  const stem = String(row['题干内容'] || '').trim();
  if (!stem) return null;

  const rawAns = String(row['题目答案（不为空，无答案直接写“无”）'] || '').trim();
  const typeStr = String(row['题目类型'] || '').trim();
  const options: string[] = [];
  for (const k of ['A','B','C','D','E','F']) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') options.push(String(v).trim());
  }

  const qType = mapType(typeStr, options.length, rawAns);

  let answer: string | string[] | boolean = '';
  if (qType === 'boolean') {
    const b = toBoolean(rawAns);
    answer = b !== null ? b : false;
  } else if (qType === 'multi') {
    answer = normalizeAnswer(rawAns);
  } else if (qType === 'single') {
    const parts = normalizeAnswer(rawAns);
    answer = parts[0] || rawAns.toUpperCase();
  } else {
    // 填空题：保留原字符串
    answer = rawAns;
  }

  // 兼容多种列名以读取解析文本
  let explanation = '';
  const expKeys = [
    '错题答案解释文本（不可空，没有请写：无）',
    '错题答案解释文本',
    '解析',
    '答案解析',
    '错误解析',
    '错题解析',
  ];
  for (const key of expKeys) {
    const val = row[key];
    if (val != null && String(val).trim() !== '') {
      explanation = String(val).trim();
      break;
    }
  }
  if (/^(无|none|n\/a)$/i.test(explanation)) explanation = '';

  const category = String(row['题目分类'] || '').trim();
  const rawScore = row['题目分数（不为空，可为0）'];
  const scoreNum = typeof rawScore === 'number' ? rawScore : Number(String(rawScore || '').trim());
  const score = Number.isFinite(scoreNum) ? scoreNum : 0;

  return {
    id: uid(),
    type: qType,
    stem,
    options: options.length ? options : undefined,
    answer,
    explanation: explanation || undefined,
    tags: category ? [category] : undefined,
    source: sheetName,
    score,
  };
}

export async function parseXlsx(file: File, sheetIndex = 0): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const names = wb.SheetNames;
  const sheetName = names[sheetIndex] || names[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

  // 基本格式校验：必须存在“题干内容”列
  const first = (rows[0] || {}) as Record<string, any>;
  if (!Object.prototype.hasOwnProperty.call(first, '题干内容')) {
    throw new Error('未找到列：题干内容（题库格式不匹配）');
  }

  const questions = rows
    .map(r => buildQuestionStrict(r as Record<string, any>, sheetName))
    .filter((q): q is Question => Boolean(q));

  return { questions, sheetName };
}