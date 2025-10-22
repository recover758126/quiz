import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseXlsx } from './parser';

function makeFakeFileFromAOA(aoa: any[][]): { arrayBuffer: () => Promise<ArrayBuffer> } {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return {
    arrayBuffer: async () => buf,
  };
}

describe('parser explanation column compatibility', () => {
  it('reads explanation from multiple possible columns and normalizes "无"', async () => {
    const headers = [
      '题干内容',
      '题目答案（不为空，无答案直接写“无”）',
      '题目类型',
      'A',
      'B',
      '错题答案解释文本（不可空，没有请写：无）',
      '解析',
      '答案解析',
    ];

    const aoa = [
      headers,
      // Row 1: explanation provided via strict key
      ['题目1', 'A', '单选', 'A项', 'B项', '这是严格列名的解析', '', ''],
      // Row 2: explanation provided via alternate key "解析"
      ['题目2', 'A', '单选', 'A项', 'B项', '', '这是解析列的解析', ''],
      // Row 3: explanation provided via alternate key "答案解析" but marked as "无"
      ['题目3', 'A', '单选', 'A项', 'B项', '', '', '无'],
    ];

    const fakeFile = makeFakeFileFromAOA(aoa);
    const result = await parseXlsx(fakeFile as unknown as File);

    expect(result.questions.length).toBe(3);

    const [q1, q2, q3] = result.questions;
    expect(q1.explanation).toBe('这是严格列名的解析');
    expect(q2.explanation).toBe('这是解析列的解析');
    expect(q3.explanation).toBeUndefined();
  });
});