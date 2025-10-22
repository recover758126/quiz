import { Question } from './types';
import { normalizeAnswer } from './utils';

export type TextMatchMode = 'strict' | 'ignoreCase' | 'ignoreCaseSpace' | 'synonyms';
export interface JudgeConfig {
  textMatchMode?: TextMatchMode;
  synonyms?: Record<string, string>; // 映射变体到规范词
}

function normalizeTextByMode(s: string, mode: TextMatchMode, synonyms?: Record<string, string>): string {
  let t = String(s);
  if (mode === 'ignoreCase' || mode === 'ignoreCaseSpace' || mode === 'synonyms') {
    t = t.toLowerCase();
  }
  if (mode === 'ignoreCaseSpace' || mode === 'synonyms') {
    t = t.replace(/\s+/g, ' ').trim();
  } else {
    t = t.trim();
  }
  if (mode === 'synonyms' && synonyms && Object.keys(synonyms).length > 0) {
    // 词级替换到规范词
    const tokens = t.split(' ');
    t = tokens.map(tok => synonyms[tok] || tok).join(' ');
  }
  return t;
}

export function judge(q: Question, selected: string[] | string | boolean): boolean {
  switch (q.type) {
    case 'single': {
      const s = Array.isArray(selected) ? selected[0] : String(selected);
      const ans = Array.isArray(q.answer) ? String(q.answer[0]) : String(q.answer);
      return s.toUpperCase().trim() === ans.toUpperCase().trim();
    }
    case 'multi': {
      const sel = Array.isArray(selected) ? selected.map(x => x.toUpperCase()) : normalizeAnswer(String(selected));
      const ans = Array.isArray(q.answer) ? q.answer.map(x => String(x).toUpperCase()) : normalizeAnswer(String(q.answer));
      const setSel = new Set(sel);
      const setAns = new Set(ans);
      if (setSel.size !== setAns.size) return false;
      for (const a of setAns) if (!setSel.has(a)) return false;
      return true;
    }
    case 'boolean': {
      const sVal = typeof selected === 'boolean' ? selected : /^true|对|是|√$/i.test(String(selected));
      const aVal = typeof q.answer === 'boolean' ? q.answer : /^true|对|是|√$/i.test(String(q.answer));
      return Boolean(sVal) === Boolean(aVal);
    }
    case 'text': {
      const s = String(selected).trim();
      const a = String(q.answer).trim();
      return s === a;
    }
    default:
      return false;
  }
}

export function judgeWithConfig(q: Question, selected: string[] | string | boolean, cfg?: JudgeConfig): boolean {
  const mode: TextMatchMode = cfg?.textMatchMode || 'ignoreCaseSpace';
  switch (q.type) {
    case 'text': {
      const s = normalizeTextByMode(String(selected), mode, cfg?.synonyms);
      const a = normalizeTextByMode(String(q.answer), mode, cfg?.synonyms);
      return s === a;
    }
    default:
      return judge(q, selected);
  }
}