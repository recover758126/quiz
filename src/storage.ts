import { UserAnswer, BankMeta } from './types';
import type { Question } from './types';
import type { History } from './types';

function ns(bankId: string, key: string) {
  return `quiz:${bankId}:${key}`;
}

const BANK_LIST_KEY = 'quiz:banks:list';

export function saveAnswers(bankId: string, answers: Record<string, UserAnswer>) {
  // 答题数据不再持久化
}

export function loadAnswers(bankId: string): Record<string, UserAnswer> {
  // 答题数据不再持久化，始终返回空
  return {};
}

// 轻量历史：仅记录是否做过与是否曾答错
export function saveHistory(bankId: string, history: History) {
  localStorage.setItem(ns(bankId, 'history'), JSON.stringify(history));
}
export function loadHistory(bankId: string): History {
  const s = localStorage.getItem(ns(bankId, 'history'));
  return s ? JSON.parse(s) : {};
}

export function saveMeta(meta: BankMeta) {
  localStorage.setItem(ns(meta.bankId, 'meta'), JSON.stringify(meta));
  // upsert to bank list
  const list = listBankMetas();
  const idx = list.findIndex(m => m.bankId === meta.bankId);
  if (idx >= 0) list[idx] = meta; else list.push(meta);
  localStorage.setItem(BANK_LIST_KEY, JSON.stringify(list));
}

export function loadMeta(bankId: string): BankMeta | null {
  const s = localStorage.getItem(ns(bankId, 'meta'));
  return s ? JSON.parse(s) : null;
}

export function listBankMetas(): BankMeta[] {
  const s = localStorage.getItem(BANK_LIST_KEY);
  return s ? JSON.parse(s) : [];
}

export function saveQuestions(bankId: string, questions: Question[]) {
  localStorage.setItem(ns(bankId, 'questions'), JSON.stringify(questions));
}

export function loadQuestions(bankId: string): Question[] {
  const s = localStorage.getItem(ns(bankId, 'questions'));
  return s ? JSON.parse(s) : [];
}

export function removeBank(bankId: string) {
  localStorage.removeItem(ns(bankId, 'answers'));
  localStorage.removeItem(ns(bankId, 'history'));
  localStorage.removeItem(ns(bankId, 'meta'));
  localStorage.removeItem(ns(bankId, 'questions'));
  const list = listBankMetas().filter(m => m.bankId !== bankId);
  localStorage.setItem(BANK_LIST_KEY, JSON.stringify(list));
}

export function clearBank(bankId: string) {
  localStorage.removeItem(ns(bankId, 'answers'));
  localStorage.removeItem(ns(bankId, 'history'));
}

export function renameBank(oldId: string, newId: string) {
  if (oldId === newId) return;
  const list = listBankMetas();
  if (list.some(m => m.bankId === newId)) {
    throw new Error('新名称已存在，请更换后重试');
  }
  const oldMeta = loadMeta(oldId);
  if (!oldMeta) {
    throw new Error('原题库不存在');
  }
  const qs = loadQuestions(oldId);
  const history = loadHistory(oldId);
  const newMeta: BankMeta = { ...oldMeta, bankId: newId };
  localStorage.setItem(ns(newId, 'meta'), JSON.stringify(newMeta));
  localStorage.setItem(ns(newId, 'questions'), JSON.stringify(qs));
  localStorage.setItem(ns(newId, 'history'), JSON.stringify(history));
  const newList = list.filter(m => m.bankId !== oldId);
  newList.push(newMeta);
  localStorage.setItem(BANK_LIST_KEY, JSON.stringify(newList));
  localStorage.removeItem(ns(oldId, 'meta'));
  localStorage.removeItem(ns(oldId, 'questions'));
  localStorage.removeItem(ns(oldId, 'history'));
}