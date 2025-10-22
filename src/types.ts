export type QuestionType = 'single' | 'multi' | 'boolean' | 'text';

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options?: string[]; // 对于非选择题可以为空
  answer: string | string[] | boolean; // 单选/多选/判断/填空
  explanation?: string;
  tags?: string[];
  difficulty?: number; // 1-5
  source?: string; // 工作表/文件名等
  score?: number; // 分值，来自题库分数列
}

export interface UserAnswer {
  questionId: string;
  selected: string[] | string | boolean;
  isCorrect: boolean;
  timeSpent?: number; // 秒
  attempts?: number;
  lastUpdated: number;
}

export interface BankMeta {
  bankId: string; // 文件哈希或文件名+sheet
  sheetName: string;
  mapping?: Record<string, string>;
  total: number;
}

// 轻量历史：仅记录是否做过、是否曾答错
export interface HistoryEntry {
  answered: boolean;
  everWrong: boolean;
  lastUpdated?: number;
}
export type History = Record<string, HistoryEntry>;