export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function normalizeAnswer(raw: string): string[] {
  const s = (raw || '').trim();
  if (!s) return [];
  // 支持 "A;C"、"AC"、"A,C"、"a c" 等
  const bySep = s.split(/[;,，\s]+/).filter(Boolean);
  if (bySep.length > 1) return bySep.map(x => x.toUpperCase());
  // 紧凑形式 AC
  return s.toUpperCase().split('');
}

export function toBoolean(v: string): boolean | null {
  const s = (v || '').trim();
  if (!s) return null;
  if (/^(true|对|是|√)$/i.test(s)) return true;
  if (/^(false|错|否|×)$/i.test(s)) return false;
  return null;
}