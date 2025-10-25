import type { Question, History } from './types';

export interface SelectionOptions {
  weights?: { wrong: number; unseen: number; correct: number }; // 默认错题>未做>做对
  seed?: number; // 设置则使用带种子随机，便于测试复现
}

function makeRng(seed?: number): () => number {
  if (typeof seed !== 'number') return Math.random;
  let s = seed >>> 0;
  return function rnd() {
    // Mulberry32
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuestionsByConfig(
  questions: Question[],
  history: History,
  total: number,
  r: { single: number; multi: number; boolean: number; text: number },
  opts: SelectionOptions = {}
): string[] {
  const types: Array<'single' | 'multi' | 'boolean' | 'text'> = ['single', 'multi', 'boolean', 'text'];
  const byType: Record<string, Question[]> = { single: [], multi: [], boolean: [], text: [] };
  for (const q of questions) byType[q.type].push(q);
  const counts: Record<string, number> = {} as any;
  const sum = r.single + r.multi + r.boolean + r.text;
  const totalUse = Math.min(total, questions.length);
  if (sum <= 0) {
    const per = Math.floor(totalUse / types.length);
    counts.single = per; counts.multi = per; counts.boolean = per; counts.text = totalUse - per * 3;
  } else {
    const raw = {
      single: (r.single / sum) * totalUse,
      multi: (r.multi / sum) * totalUse,
      boolean: (r.boolean / sum) * totalUse,
      text: (r.text / sum) * totalUse,
    };
    counts.single = Math.floor(raw.single);
    counts.multi = Math.floor(raw.multi);
    counts.boolean = Math.floor(raw.boolean);
    counts.text = Math.floor(raw.text);
    let remain = totalUse - (counts.single + counts.multi + counts.boolean + counts.text);
    const order = Object.entries(raw).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    for (let i = 0; i < order.length && remain > 0; i++) { counts[order[i]]++; remain--; }
  }

  const w = { wrong: 3, unseen: 2, correct: 0, ...(opts.weights || {}) };
  const rng = makeRng(opts.seed);

  const classify = (q: Question): 'wrong' | 'unseen' | 'correct' => {
    const h = history[q.id];
    if (!h || !h.answered) return 'unseen';
    return h.everWrong ? 'wrong' : 'correct';
  };

  const bucketize = (arr: Question[]) => {
    const wrong: Question[] = []; const unseen: Question[] = []; const correct: Question[] = [];
    for (const q of arr) {
      const cat = classify(q);
      if (cat === 'wrong') wrong.push(q); else if (cat === 'unseen') unseen.push(q); else correct.push(q);
    }
    // 同类内随机（可种子）
    const wrongS = shuffle(wrong, rng);
    const unseenS = shuffle(unseen, rng);
    const correctS = shuffle(correct, rng);
    // 类之间按权重排序（高权重在前）；权重相同保留默认顺序 wrong > unseen > correct
    const baseCats: Array<'wrong' | 'unseen' | 'correct'> = ['wrong','unseen','correct'];
    const orderCats: Array<'wrong' | 'unseen' | 'correct'> = baseCats.slice().sort(
      (a: 'wrong' | 'unseen' | 'correct', b: 'wrong' | 'unseen' | 'correct') => {
        const diff = w[b] - w[a];
        if (diff !== 0) return diff;
        const defOrder: Record<'wrong' | 'unseen' | 'correct', number> = { wrong: 2, unseen: 1, correct: 0 };
        return defOrder[b] - defOrder[a];
      }
    );
    const mapArr: Record<'wrong' | 'unseen' | 'correct', Question[]> = { wrong: wrongS, unseen: unseenS, correct: correctS };
    const seq: Question[] = [];
    for (const k of orderCats) seq.push(...mapArr[k]);
    return { seq };
  };

  const pick: Question[] = [];
  for (const t of types) {
    const take = counts[t] || 0;
    const { seq } = bucketize(byType[t]);
    pick.push(...seq.slice(0, take));
  }
  // 不足则全局补足（依然按权重顺序，同类内随机）
  const need = totalUse - pick.length;
  if (need > 0) {
    const selectedSet = new Set(pick.map(q => q.id));
    const rest = questions.filter(q => !selectedSet.has(q.id));
    const { seq } = bucketize(rest);
    pick.push(...seq.slice(0, need));
  }
  return pick.map(q => q.id);
}