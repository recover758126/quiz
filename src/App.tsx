import React, { useEffect, useMemo, useState } from 'react';
import './styles.css';
import type { Question, UserAnswer, BankMeta, History } from './types';
import { parseXlsx } from './parser';
import { judgeWithConfig, type TextMatchMode } from './judge';
import { saveMeta, listBankMetas, loadQuestions, saveQuestions, removeBank, loadMeta, renameBank, loadHistory, saveHistory } from './storage';
import * as XLSX from 'xlsx';
import { normalizeAnswer } from './utils';
import { FiInfo } from 'react-icons/fi';
import { Routes, Route, Link, useLocation, useNavigate, useParams, Navigate } from 'react-router-dom';
import { pickQuestionsByConfig as pickQuestionsByConfigExternal } from './selection';

function Importer({ onLoaded }: { onLoaded: (bankId: string, sheetName: string, questions: Question[]) => void }) {
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const inputEl = e.currentTarget;
    const f = inputEl.files?.[0];
    if (!f) return;
    try {
      const res = await parseXlsx(f, 0);
      const bankId = `${f.name}:${res.sheetName}`;
      onLoaded(bankId, res.sheetName, res.questions);
    } catch (err) {
      alert('解析失败：' + (err as Error).message);
    } finally {
      if (inputEl) inputEl.value = '';
    }
  }

  return (
    <label className="btn file-btn">
      <input type="file" accept=".xlsx,.xls" onChange={handleFile} />
      导入题库
    </label>
  );
}

function BankManager({ onOpen }: { onOpen: (bankId: string) => void }) {
  const [banks, setBanks] = useState<BankMeta[]>(listBankMetas());
  const navigate = useNavigate();
  // 练习配置弹窗状态
  const [configBankId, setConfigBankId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [totalCountInput, setTotalCountInput] = useState<string>('20');
  const [ratio, setRatio] = useState<{ single: number; multi: number; boolean: number; text: number }>({ single: 25, multi: 25, boolean: 25, text: 25 });

  function refresh() {
    setBanks(listBankMetas());
  }

  function handleLoaded(bankId: string, sheetName: string, questions: Question[]) {
    saveQuestions(bankId, questions);
    saveMeta({ bankId, sheetName, total: questions.length });
    refresh();
  }

  function toExcelRows(questions: Question[]) {
    return questions.map(q => ({
      题干内容: q.stem,
      题目答案: Array.isArray(q.answer) ? (q.answer as string[]).join(',') : (typeof q.answer === 'boolean' ? (q.answer ? '对' : '错') : q.answer),
      题目类型: q.type,
      A: q.options?.[0] || '',
      B: q.options?.[1] || '',
      C: q.options?.[2] || '',
      D: q.options?.[3] || '',
      E: q.options?.[4] || '',
      F: q.options?.[5] || '',
      错题答案解释文本: q.explanation || '',
      题目分数: q.score || 0,
    }));
  }

  function handleExport(bankId: string) {
    const meta = banks.find(b => b.bankId === bankId) || null;
    const questions = loadQuestions(bankId);
    const rows = toExcelRows(questions);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, meta?.sheetName || '题库导出');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bankId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDelete(bankId: string) {
    if (!confirm(`确认删除题库 ${bankId} 及其作答记录？`)) return;
    removeBank(bankId);
    refresh();
  }

  function handleRename(bankId: string) {
    setRenamingId(bankId);
    setRenamingName(bankId);
    setOpenMenuId(null);
  }

  function submitRename() {
    const oldId = renamingId;
    const newId = renamingName.trim();
    if (!oldId) return;
    if (!newId || newId === oldId) {
      setRenamingId(null);
      return;
    }
    try {
      renameBank(oldId, newId);
      setRenamingId(null);
      refresh();
    } catch (err) {
      alert('改名失败：' + (err as Error).message);
    }
  }

  function cancelRename() {
    setRenamingId(null);
  }

  function toggleMenu(bankId: string) {
    setOpenMenuId((cur) => (cur === bankId ? null : bankId));
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="h2">题库管理</div>
        <Importer onLoaded={handleLoaded} />
      </div>
      <div className="list">
        {banks.length === 0 ? (
          <div className="summary">暂无题库，请先导入。</div>
        ) : (
          <>
            {banks.map((b) => {
              const isRenaming = renamingId === b.bankId;
              const isMenuOpen = openMenuId === b.bankId;
              return (
                <div key={b.bankId} className="bank-item card">
                  <div className="bank-title row" style={{ gap: 8 }}>
                    {isRenaming ? (
                      <input
                        className="input"
                        value={renamingName}
                        onChange={(e) => setRenamingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRename();
                          if (e.key === 'Escape') cancelRename();
                        }}
                        style={{ flex: 1, minWidth: 160 }}
                      />
                    ) : (
                      <strong className="truncate" style={{ flex: 1 }}>{b.bankId}</strong>
                    )}
                    <span className="row" style={{ gap: 6 }}>
                      <span className="badge">{b.sheetName}</span>
                      <span className="badge muted">{b.total}题</span>
                    </span>
                  </div>
                  <div className="bank-actions" style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    {isRenaming ? (
                      <>
                        <button className="btn primary" onClick={submitRename}>保存</button>
                        <button className="btn" onClick={cancelRename}>取消</button>
                      </>
                    ) : (
                      <>
                        <button className="btn primary" onClick={() => {
                          setConfigBankId(b.bankId);
                          setTotalCountInput(String(Math.min(20, b.total)));
                          const qs = loadQuestions(b.bankId);
                          const hasSingle = qs.some(q => q.type === 'single');
                          const hasMulti = qs.some(q => q.type === 'multi');
                          const hasBoolean = qs.some(q => q.type === 'boolean');
                          const hasText = qs.some(q => q.type === 'text');
                          const present = [hasSingle, hasMulti, hasBoolean, hasText].filter(Boolean).length;
                          const base = present > 0 ? Math.floor(100 / present) : 0;
                          let remainder = present > 0 ? 100 - base * present : 0;
                          const alloc = (has: boolean) => (has ? base + (remainder-- > 0 ? 1 : 0) : 0);
                          setRatio({
                            single: alloc(hasSingle),
                            multi: alloc(hasMulti),
                            boolean: alloc(hasBoolean),
                            text: alloc(hasText),
                          });
                        }}>练习</button>
                        <button className="btn" onClick={() => navigate(`/wrong/${encodeURIComponent(b.bankId)}`)}>错题集</button>
                        <button className="btn" onClick={() => navigate(`/stats/${encodeURIComponent(b.bankId)}`)}>数据统计</button>
                        <button className="btn" onClick={() => toggleMenu(b.bankId)}>更多</button>
                        {isMenuOpen && (
                          <div className="dropdown">
                            <button className="dropdown-item" onClick={() => handleRename(b.bankId)}>改名</button>
                            <button className="dropdown-item" onClick={() => { handleExport(b.bankId); setOpenMenuId(null); }}>导出Excel</button>
                            <button className="dropdown-item danger" onClick={() => { handleDelete(b.bankId); setOpenMenuId(null); }}>删除</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* 配置弹窗 */}
      {configBankId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 480, maxWidth: '90%', background: '#fff' }}>
            <div className="h3" style={{ marginBottom: 12 }}>练习配置</div>
            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span>题目数量</span>

              <input type="number" className="input" min={1} max={200} inputMode="numeric" value={totalCountInput} onChange={e => setTotalCountInput(e.target.value)} onBlur={e => {
                const v = e.target.value.trim();
                if (v === '') { setTotalCountInput(''); return; }
                let n = Math.round(Number(v));
                if (isNaN(n)) n = 1;
                n = Math.min(200, Math.max(1, n));
                setTotalCountInput(String(n));
              }} />
            </div>
            <div style={{ marginBottom: 8 }}>题型占比（总和 100%）</div>
            <div className="col" style={{ gap: 8 }}>
              {loadQuestions(configBankId).some(q => q.type === 'single') && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 80 }}>单选</span>
                  <input type="number" className="input" min={0} max={100} value={ratio.single} onChange={e => setRatio({ ...ratio, single: clampPercent(e.target.value) })} />
                  <span>%</span>
                </div>
              )}
              {loadQuestions(configBankId).some(q => q.type === 'multi') && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 80 }}>多选</span>
                  <input type="number" className="input" min={0} max={100} value={ratio.multi} onChange={e => setRatio({ ...ratio, multi: clampPercent(e.target.value) })} />
                  <span>%</span>
                </div>
              )}
              {loadQuestions(configBankId).some(q => q.type === 'boolean') && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 80 }}>判断</span>
                  <input type="number" className="input" min={0} max={100} value={ratio.boolean} onChange={e => setRatio({ ...ratio, boolean: clampPercent(e.target.value) })} />
                  <span>%</span>
                </div>
              )}
              {loadQuestions(configBankId).some(q => q.type === 'text') && (
                <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                  <span style={{ width: 80 }}>填空</span>
                  <input type="number" className="input" min={0} max={100} value={ratio.text} onChange={e => setRatio({ ...ratio, text: clampPercent(e.target.value) })} />
                  <span>%</span>
                </div>
              )}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 16 }}>
              <button className="btn" onClick={() => setConfigBankId(null)}>取消</button>
              <button className="btn primary" onClick={() => {
                const questions = loadQuestions(configBankId);
                const history = loadHistory(configBankId);
                const raw = totalCountInput.trim();
                let count = Math.round(Number(raw));
                if (!raw || isNaN(count)) count = 1;
                count = Math.min(200, Math.max(1, count));
                const selectedIds = pickQuestionsByConfig(questions, history, count, ratio);
                setConfigBankId(null);
                navigate(`/practice/${encodeURIComponent(configBankId)}`, { state: { selectedIds } });
              }}>开始练习</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function clampPercent(v: string): number {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }
  function pickQuestionsByConfig(questions: Question[], history: History, total: number, r: { single: number; multi: number; boolean: number; text: number }): string[] {
    return pickQuestionsByConfigExternal(questions, history, total, r);
  }
}

type MultiSubmitMode = 'manual' | 'autoOnCount';
interface JudgeSettings {
  textMatchMode: TextMatchMode;
  multiSubmitMode: MultiSubmitMode;
  synonyms: Record<string, string>;
}

function QuestionCard({ q, onAnswer, record }: { q: Question; onAnswer: (sel: string[] | string | boolean) => void; record?: UserAnswer }) {
  const [selected, setSelected] = useState<string[] | string | boolean>('');
  const answered = Boolean(record);
  const isCorrect = record?.isCorrect ?? false;

  // 切题时重置本题的临时选择状态，避免携带上题的选择
  useEffect(() => {
    setSelected('');
  }, [q.id]);

  const correctSet = useMemo(() => {
    if (!q.options) return new Set<string>();
    if (Array.isArray(q.answer)) return new Set(q.answer.map(x => String(x).toUpperCase()));
    return new Set(normalizeAnswer(String(q.answer)));
  }, [q]);

  // 删除自动提交函数：多选固定为手动提交
  // function maybeSubmitMulti(arr: string[]) {
  //   if (settings.multiSubmitMode === 'autoOnCount') {
  //     const needed = correctSet.size || arr.length;
  //     if (arr.length === needed) onAnswer(arr);
  //   }
  // }

  function toggleOption(opt: string) {
    if (answered) return; // 已提交后禁止修改
    if (q.type === 'multi') {
      const arr = Array.isArray(selected) ? selected.slice() : [];
      const i = arr.indexOf(opt);
      if (i >= 0) {
        arr.splice(i, 1);
      } else {
        // 允许选择任意数量的选项（不再限制为正确项数量）
        arr.push(opt);
      }
      setSelected(arr);
      // 多选固定为手动提交，不在此处自动提交
    } else {
      setSelected(opt);
      onAnswer(opt);
    }
  }

  // 文本题：保持原有停顿/回车提交
  React.useEffect(() => {
    if (answered) return; // 已提交后禁止再次提交文本
    if (!q.options && typeof selected === 'string') {
      const val = (selected || '').trim();
      if (!val) return;
      const timer = setTimeout(() => { onAnswer(val); }, 500);
      return () => clearTimeout(timer);
    }
  }, [selected, q.options, onAnswer, answered]);

  return (
    <div className="card">
      <div className="h2">{`【${({ single: '单选', multi: '多选', boolean: '判断', text: '填空' } as Record<string, string>)[q.type] || q.type}】 ${q.stem}`}</div>
      {typeof q.score === 'number' && <div className="explain">分值：{q.score}</div>}
      {q.options && (
        <div>
          {q.options.map((opt, idx) => {
            const label = String.fromCharCode(65 + idx);
            const isSelected = Array.isArray(selected) ? selected.includes(label) : selected === label;
            const upperLabel = label.toUpperCase();
            const isCorrectLabel = correctSet.has(upperLabel);
            const isWrongSelected = answered && isSelected && !isCorrectLabel;
            const shouldRevealCorrect = answered && !isCorrect;
            const showSelectedCorrect = answered && isSelected && isCorrectLabel;
            const isMulti = q.type === 'multi';
            const isSingle = q.type === 'single' || q.type === 'boolean';
            const isMissed = isMulti && answered && shouldRevealCorrect && isCorrectLabel && !isSelected;
            const showCorrectUnselectedSingle = isSingle && answered && shouldRevealCorrect && isCorrectLabel && !isSelected;
            const classes = ['opt'];
            if (!answered && isSelected) classes.push('active');
            if (isWrongSelected) classes.push('wrong');
            if (showSelectedCorrect || showCorrectUnselectedSingle) classes.push('correct');
            if (isMissed) classes.push('missed');
            if (answered) classes.push('disabled');
            return (
              <div key={idx} className={classes.join(' ')} onClick={() => toggleOption(label)}>
                <div style={{ fontWeight: 600 }}>{label}.</div>
                <div>{opt}</div>
                {answered && (
                  isWrongSelected ? (
                    <span className="status-icon wrong">✗</span>
                  ) : (showSelectedCorrect || showCorrectUnselectedSingle) ? (
                    <span className="status-icon correct">✓</span>
                  ) : isMissed ? (
                    <span className="status-icon missed">漏选</span>
                  ) : null
                )}
              </div>
            );
          })}
          {/* 建议选择提示已移除 */}
        </div>
      )}
      {!q.options && (
        <input
          className="btn"
          placeholder="输入答案"
          value={typeof selected === 'string' ? selected : ''}
          disabled={answered}
          onChange={e => setSelected(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !answered) onAnswer(typeof selected === 'string' ? selected.trim() : ''); }}
        />
      )}
      {/* 解析移动到选项下方，增加信息图标 */}
      {answered && !isCorrect && q.explanation && (
        <div className="explain"><FiInfo style={{ marginRight: 4 }} />解析：{q.explanation}</div>
      )}
      {/* 多选的手动提交按钮：固定策略，始终显示 */}
      {q.type === 'multi' && (
        <button className="btn primary" disabled={answered || (Array.isArray(selected) ? selected.length === 0 : true)} onClick={() => onAnswer(Array.isArray(selected) ? selected : [])}>提交</button>
       )}
      {null}
    </div>
  );
}

function PracticeView({ bankId, selectedIds }: { bankId: string; selectedIds?: string[] }) {
  const [idx, setIdx] = useState(0);
  const questions = useMemo(() => {
    const all = loadQuestions(bankId);
    if (selectedIds && selectedIds.length > 0) {
      const map = new Map(all.map(q => [q.id, q]));
      return selectedIds.map(id => map.get(id)).filter(Boolean) as Question[];
    }
    return all;
  }, [bankId, selectedIds]);
  const [answers, setAnswers] = useState<Record<string, UserAnswer>>({});
  // 答错且无解析时的倒计时（秒）
  const [countdown, setCountdown] = useState<number>(0);
  // 自动跳转开关：仅在无解析且答错时启用
  const [autoAdvanceActive, setAutoAdvanceActive] = useState<boolean>(false);
 // 错题解析弹窗
 const [showExplanation, setShowExplanation] = useState<boolean>(false);
 const [explanationText, setExplanationText] = useState<string>('');
  // 清理倒计时计时器
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((s) => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [countdown]);
  // 当倒计时归零且自动跳转开启时，跳到下一题
  useEffect(() => {
    if (!autoAdvanceActive) return;
    if (countdown <= 0) {
      setAutoAdvanceActive(false);
      setIdx(i => Math.min(i + 1, questions.length - 1));
    }
  }, [countdown, autoAdvanceActive, questions.length]);

  // 题库为空保护
  if (!questions || questions.length === 0) {
    return <div className="summary">题目为空，请回到题库管理导入或选择题库。</div>;
  }
  const current = questions[idx];
  const stats = useMemo(() => {
    const vals = Object.values(answers);
    const correctSetIds = new Set(vals.filter(v => v.isCorrect).map(v => v.questionId));
    const correct = vals.filter(v => v.isCorrect).length;
    const totalScore = questions.reduce((sum, q) => sum + (q.score || 0), 0);
    const correctScore = questions.reduce((sum, q) => sum + (correctSetIds.has(q.id) ? (q.score || 0) : 0), 0);
    return { total: questions.length, answered: vals.length, correct, totalScore, correctScore };
  }, [answers, questions]);

  function submitAnswer(sel: string[] | string | boolean) {
    if (!current) return;
    // 固定采用 judgeWithConfig 的默认模式（ignoreCaseSpace），不再传入 textMatchMode
    const ok = judgeWithConfig(current, sel);
    const entry: UserAnswer = {
      questionId: current.id,
      selected: sel,
      isCorrect: ok,
      lastUpdated: Date.now(),
    };
    const next = { ...answers, [current.id]: entry };
    setAnswers(next);
    // 更新轻量历史记录：只标记是否做过、是否曾答错
    const h = loadHistory(bankId);
    const prev = h[current.id] || { answered: false, everWrong: false };
    const updated = { ...h, [current.id]: { answered: true, everWrong: prev.everWrong || !ok, lastUpdated: Date.now() } };
    saveHistory(bankId, updated);
    // 清理任何正在进行的倒计时
    setCountdown(0);
    setAutoAdvanceActive(false);
    // 答对后自动跳到下一题，留出短暂时间显示反馈
    if (ok) {
      setTimeout(() => {
        setIdx(i => Math.min(i + 1, questions.length - 1));
      }, 600);
    } else {
      // 答错：有解析则弹窗展示；无解析则启动3秒倒计时自动跳转
      const hasExplanation = Boolean(current.explanation && String(current.explanation).trim());
      if (hasExplanation) {
        setExplanationText(String(current.explanation).trim());
        setShowExplanation(true);
      } else {
        setCountdown(3);
        setAutoAdvanceActive(true);
      }
    }
  }

 // 切换题目时重置倒计时
  function nextQuestion() { setIdx(i => Math.min(i + 1, questions.length - 1)); setCountdown(0); setAutoAdvanceActive(false); }
  function prevQuestion() { setIdx(i => Math.max(i - 1, 0)); setCountdown(0); setAutoAdvanceActive(false); }

  return (
    <div>
      <div className="summary">
        正确：{stats.correct}/{stats.total}，得分：{stats.correctScore}/{stats.totalScore}
      </div>
      {/* 判题/提交策略配置已移除 */}

      {current && <QuestionCard key={current.id} q={current} onAnswer={submitAnswer} record={answers[current.id]} />}
      <div className="toolbar nav-actions">
        <button className="btn large" onClick={prevQuestion} disabled={idx <= 0}>上一题</button>
        <button className="btn large" onClick={nextQuestion} disabled={idx >= questions.length - 1}>
          {countdown > 0 ? `下一题 (${countdown})` : '下一题'}
        </button>
      </div>

      {showExplanation && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: 520, maxWidth: '90%', background: '#fff' }}>
            <div className="h3" style={{ marginBottom: 8 }}>错题解析</div>
            <div className="explain" style={{ whiteSpace: 'pre-wrap' }}>{explanationText}</div>
            <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => setShowExplanation(false)}>关闭</button>
              <button className="btn primary" onClick={() => { setShowExplanation(false); setIdx(i => Math.min(i + 1, questions.length - 1)); }}>下一题</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BanksPage() {
  const navigate = useNavigate();
  return <BankManager onOpen={(id) => navigate(`/practice/${encodeURIComponent(id)}`)} />;
}
function PracticePage() {
  const { bankId } = useParams();
  const location = useLocation();
  const selectedIds = (location.state as any)?.selectedIds as string[] | undefined;
  const meta = bankId ? loadMeta(bankId) : null;
  return (
    <div>
      {bankId ? (
        <PracticeView bankId={bankId} selectedIds={selectedIds} />
      ) : (
        <div className="summary">未选择题库，请在题库页进行选择。</div>
      )}
    </div>
  );
}
function WrongPage() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const questions = bankId ? loadQuestions(bankId) : [];
  const history = bankId ? loadHistory(bankId) : {};
  const wrongQs = questions.filter(q => history[q.id]?.everWrong);
  const wrongIds = wrongQs.map(q => q.id);
  return (
    <div>
      <div className="h2">错题集</div>
      {!bankId && <div className="summary">未选择题库</div>}
      {bankId && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>题库：<span className="badge">{bankId}</span></div>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge muted">错题：{wrongIds.length} / {questions.length}</span>
              <button className="btn primary" disabled={wrongIds.length === 0} onClick={() => navigate(`/practice/${encodeURIComponent(bankId)}`, { state: { selectedIds: wrongIds } })}>仅练错题</button>
            </div>
          </div>
          {wrongIds.length === 0 ? (
            <div className="summary">暂无错题，继续加油！</div>
          ) : (
            <div className="list">
              {wrongQs.map((q) => (
                <div key={q.id} className="card" style={{ padding: 8 }}>
                  <div className="h3" style={{ marginBottom: 4 }}>{`【${({ single: '单选', multi: '多选', boolean: '判断', text: '填空' } as Record<string, string>)[q.type] || q.type}】 ${q.stem}`}</div>
                  {typeof q.score === 'number' && <div className="explain">分值：{q.score}</div>}
                  {q.explanation && <div className="explain">解析：{q.explanation}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function StatsPage() {
  const { bankId } = useParams();
  const navigate = useNavigate();
  const questions = bankId ? loadQuestions(bankId) : [];
  const history = bankId ? loadHistory(bankId) : {};
  const types: Array<'single' | 'multi' | 'boolean' | 'text'> = ['single', 'multi', 'boolean', 'text'];
  const byType: Record<string, Question[]> = { single: [], multi: [], boolean: [], text: [] };
  for (const q of questions) byType[q.type].push(q);
  const total = questions.length;
  const answered = questions.filter(q => history[q.id]?.answered).length;
  const everWrong = questions.filter(q => history[q.id]?.everWrong).length;
  const mastered = questions.filter(q => history[q.id]?.answered && !history[q.id]?.everWrong).length;
  const unseenIds = questions.filter(q => !history[q.id]?.answered).map(q => q.id);
  const wrongIds = questions.filter(q => history[q.id]?.everWrong).map(q => q.id);
  const fmtPct = (num: number, den: number) => den === 0 ? '0%' : `${Math.round((num / den) * 100)}%`;
  return (
    <div>
      <div className="h2">数据统计</div>
      {!bankId && <div className="summary">未选择题库</div>}
      {bankId && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div>题库：<span className="badge">{bankId}</span></div>
            <div className="row" style={{ gap: 8 }}>
              <span className="badge muted">总题：{total}</span>
              <span className="badge muted">已做：{answered}</span>
              <span className="badge muted">曾错：{everWrong}</span>
              <span className="badge muted">已掌握：{mastered}</span>
              <span className="badge">错题率：{fmtPct(everWrong, Math.max(answered, 1))}</span>
            </div>
          </div>
          <div className="list">
            {types.map(t => {
              const arr = byType[t];
              const tTotal = arr.length;
              const tAnswered = arr.filter(q => history[q.id]?.answered).length;
              const tWrong = arr.filter(q => history[q.id]?.everWrong).length;
              const label = ({ single: '单选', multi: '多选', boolean: '判断', text: '填空' } as Record<string, string>)[t];
              return (
                <div key={t} className="card" style={{ padding: 8 }}>
                  <div className="h3" style={{ marginBottom: 4 }}>{label}</div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge muted">总题：{tTotal}</span>
                    <span className="badge muted">已做：{tAnswered}</span>
                    <span className="badge muted">曾错：{tWrong}</span>
                    <span className="badge">错题率：{fmtPct(tWrong, Math.max(tAnswered, 1))}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn" disabled={unseenIds.length === 0} onClick={() => navigate(`/practice/${encodeURIComponent(bankId)}`, { state: { selectedIds: unseenIds } })}>仅练未做</button>
            <button className="btn primary" disabled={wrongIds.length === 0} onClick={() => navigate(`/practice/${encodeURIComponent(bankId)}`, { state: { selectedIds: wrongIds } })}>仅练错题</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const inSubPage = location.pathname.startsWith('/practice') || location.pathname.startsWith('/wrong') || location.pathname.startsWith('/stats');
  return (
    <div className="container">
      <div className="nav row" style={{ justifyContent: 'space-between' }}>
        {inSubPage && (
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => navigate('/banks')}>返回题库</button>
        )}
      </div>

      <Routes>
        <Route path="/banks" element={<BanksPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/practice/:bankId" element={<PracticePage />} />
        <Route path="/wrong/:bankId" element={<WrongPage />} />
        <Route path="/stats/:bankId" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/banks" replace />} />
      </Routes>


    </div>
  );
}