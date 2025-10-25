import { describe, it, expect } from 'vitest';
import type { Question, History } from './types';
import { pickQuestionsByConfig } from './selection';

function makeQ(id: string, type: Question['type'] = 'single'): Question {
  return { id, type, stem: id, answer: 'A' };
}

describe('pickQuestionsByConfig prioritization', () => {
  it('prioritizes wrong > unseen > correct within type', () => {
    const questions: Question[] = [
      // wrong 3
      makeQ('w1'), makeQ('w2'), makeQ('w3'),
      // unseen 3
      makeQ('u1'), makeQ('u2'), makeQ('u3'),
      // correct 3
      makeQ('c1'), makeQ('c2'), makeQ('c3'),
    ];
    const history: History = {
      w1: { answered: true, everWrong: true },
      w2: { answered: true, everWrong: true },
      w3: { answered: true, everWrong: true },
      // unseen: no history entries
      c1: { answered: true, everWrong: false },
      c2: { answered: true, everWrong: false },
      c3: { answered: true, everWrong: false },
    };
    const total = 6;
    const ratio = { single: 100, multi: 0, boolean: 0, text: 0 };
    const selected = pickQuestionsByConfig(questions, history, total, ratio);
    const set = new Set(selected);
    // expect all wrong selected
    expect(set.has('w1') && set.has('w2') && set.has('w3')).toBe(true);
    // expect fill with unseen next, no correct included since wrong+unseen == 6
    expect([set.has('u1'), set.has('u2'), set.has('u3')].filter(Boolean).length).toBe(3);
    expect(set.has('c1') || set.has('c2') || set.has('c3')).toBe(false);
  });

  it('fills with correct only when wrong+unseen are insufficient', () => {
    const questions: Question[] = [
      makeQ('w1'), makeQ('w2'), // wrong 2
      makeQ('u1'), makeQ('u2'), makeQ('u3'), // unseen 3
      makeQ('c1'), makeQ('c2'), makeQ('c3'), makeQ('c4'), // correct 4
    ];
    const history: History = {
      w1: { answered: true, everWrong: true },
      w2: { answered: true, everWrong: true },
      c1: { answered: true, everWrong: false },
      c2: { answered: true, everWrong: false },
      c3: { answered: true, everWrong: false },
      c4: { answered: true, everWrong: false },
    };
    const total = 7;
    const ratio = { single: 100, multi: 0, boolean: 0, text: 0 };
    const selected = pickQuestionsByConfig(questions, history, total, ratio);
    const set = new Set(selected);
    // all wrong included
    expect(set.has('w1') && set.has('w2')).toBe(true);
    // then unseen as much as possible
    expect([set.has('u1'), set.has('u2'), set.has('u3')].filter(Boolean).length).toBe(3);
    // remaining slots are correct
    const correctCount = [set.has('c1'), set.has('c2'), set.has('c3'), set.has('c4')].filter(Boolean).length;
    expect(correctCount).toBe(2);
  });

  it('respects type ratio and still applies priority in each type', () => {
    const qs: Question[] = [
      // single type
      makeQ('sw1','single'), makeQ('su1','single'), makeQ('sc1','single'),
      // multi type
      makeQ('mw1','multi'), makeQ('mu1','multi'), makeQ('mc1','multi'),
    ];
    const history: History = {
      sw1: { answered: true, everWrong: true },
      sc1: { answered: true, everWrong: false },
      mw1: { answered: true, everWrong: true },
      mc1: { answered: true, everWrong: false },
    };
    const total = 4;
    const ratio = { single: 50, multi: 50, boolean: 0, text: 0 };
    const selected = pickQuestionsByConfig(qs, history, total, ratio);
    const set = new Set(selected);
    // each type should prioritize wrong over unseen over correct
    expect(set.has('sw1')).toBe(true); // single wrong
    // single unseen preferred over correct when filling single allocation
    const singleChosen = ['sw1','su1','sc1'].filter(id => set.has(id));
    expect(singleChosen.includes('su1') || singleChosen.includes('sc1')).toBe(true);
    expect(singleChosen.includes('sc1') && !singleChosen.includes('su1')).toBe(false); // if only one extra, unseen should beat correct

    expect(set.has('mw1')).toBe(true); // multi wrong
    const multiChosen = ['mw1','mu1','mc1'].filter(id => set.has(id));
    expect(multiChosen.includes('mu1') || multiChosen.includes('mc1')).toBe(true);
    expect(multiChosen.includes('mc1') && !multiChosen.includes('mu1')).toBe(false);
  });
});

describe('pickQuestionsByConfig options', () => {
  it('seeded randomness produces deterministic order for same seed', () => {
    const qs: Question[] = [makeQ('u1'), makeQ('u2'), makeQ('u3'), makeQ('u4'), makeQ('u5')];
    const history = {} as History;
    const total = 5;
    const ratio = { single: 100, multi: 0, boolean: 0, text: 0 };
    const s1 = pickQuestionsByConfig(qs, history, total, ratio, { seed: 42 });
    const s2 = pickQuestionsByConfig(qs, history, total, ratio, { seed: 42 });
    expect(s1).toEqual(s2);
    const s3 = pickQuestionsByConfig(qs, history, total, ratio, { seed: 7 });
    expect(s3).not.toEqual(s1);
  });

  it('honors weights to prioritize unseen over wrong when configured', () => {
    const qs: Question[] = [makeQ('u1'), makeQ('u2'), makeQ('u3'), makeQ('w1'), makeQ('w2'), makeQ('w3')];
    const history: History = {
      w1: { answered: true, everWrong: true },
      w2: { answered: true, everWrong: true },
      w3: { answered: true, everWrong: true },
    };
    const total = 3;
    const ratio = { single: 100, multi: 0, boolean: 0, text: 0 };
    const selected = pickQuestionsByConfig(qs, history, total, ratio, { weights: { wrong: 3, unseen: 5, correct: 0 }, seed: 123 });
    expect(selected.sort()).toEqual(['u1','u2','u3'].sort());
  });
});