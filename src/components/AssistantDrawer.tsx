import {AnimatePresence, motion} from 'motion/react';
import {CalendarIcon, Send} from 'lucide-react';
import {cn} from '../lib/utils';
import type {CalendarPlanDraft, CalendarPlanOperation} from '../types';

interface AssistantDrawerProps {
  draft: CalendarPlanDraft | null;
  error: string | null;
  input: string;
  isLoading: boolean;
  isOpen: boolean;
  onApply: () => void;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

const actionLabelMap: Record<CalendarPlanOperation['type'], string> = {
  set: '覆盖当天',
  append: '追加任务',
};

const formatDateLabel = (date: string) => {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日`;
};

export function AssistantDrawer({
  draft,
  error,
  input,
  isLoading,
  isOpen,
  onApply,
  onClose,
  onInputChange,
  onSubmit,
}: AssistantDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40"
          />
          <motion.aside
            initial={{x: '100%'}}
            animate={{x: 0}}
            exit={{x: '100%'}}
            transition={{type: 'spring', damping: 24, stiffness: 220}}
            className="assistant-drawer z-50"
          >
            <div className="assistant-drawer-panel">
              <div className="flex items-center justify-between border-b-2 border-pixel-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#fff8e8] border-2 border-pixel-border flex items-center justify-center shadow-[2px_2px_0px_0px_#8B6550]">
                    <CalendarIcon size={16} className="text-pixel-accent" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-pixel-text">AI 排班助手</span>
                    <span className="text-[10px] font-bold text-pixel-muted">先生成草案，再确认写入日历</span>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 border-2 border-pixel-border rounded-lg flex items-center justify-center bg-[#fff8e8] text-pixel-text hover:bg-[#f0e0ce] transition-colors"
                >
                  <span className="text-lg leading-none font-bold">×</span>
                </button>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-pixel-muted">
                  自然语言输入
                </label>
                <textarea
                  value={input}
                  onChange={(event) => onInputChange(event.target.value)}
                  placeholder="例如：把 24 号安排高数复习和英语听力，26 号补上编程作业"
                  className="assistant-drawer-textarea custom-scrollbar"
                  rows={4}
                />
                <button
                  onClick={onSubmit}
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all',
                    isLoading || !input.trim()
                      ? 'opacity-50 cursor-not-allowed bg-[#ddd8ce] text-[#8d8478] border-2 border-[#b8aea0]'
                      : 'pixel-button-red'
                  )}
                >
                  <Send size={14} />
                  {isLoading ? '正在生成草案...' : '生成排班草案'}
                </button>
                {error && (
                  <div className="assistant-drawer-error">{error}</div>
                )}
              </div>

              <div className="assistant-drawer-content custom-scrollbar">
                {!draft && !isLoading && !error && (
                  <div className="assistant-drawer-empty">
                    输入一句话后，助手会返回可确认的排班操作卡片。
                  </div>
                )}

                {draft && (
                  <div className="flex flex-col gap-3">
                    <div className="assistant-draft-summary">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-pixel-muted mb-1">
                        Draft Summary
                      </div>
                      <div className="text-sm font-bold text-pixel-text leading-relaxed">
                        {draft.summary}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {draft.operations.map((operation, index) => (
                        <div key={`${operation.date}-${index}`} className="assistant-operation-card">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-bold text-pixel-text">
                                {formatDateLabel(operation.date)}
                              </div>
                              <div className="text-[10px] font-bold text-pixel-muted mt-1">
                                {actionLabelMap[operation.type]}
                              </div>
                            </div>
                            <span className="pixel-tag">
                              {operation.tasks.length} 项
                            </span>
                          </div>

                          <div className="mt-3 flex flex-col gap-2">
                            {operation.tasks.map((task, taskIndex) => (
                              <div key={`${task}-${taskIndex}`} className="assistant-operation-task">
                                {task}
                              </div>
                            ))}
                          </div>

                          {operation.note && (
                            <div className="mt-3 text-[10px] font-bold text-pixel-muted">
                              {operation.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t-2 border-pixel-border pt-3 mt-3">
                <button
                  onClick={onApply}
                  disabled={!draft || draft.operations.length === 0}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg text-sm font-bold transition-all',
                    draft && draft.operations.length > 0
                      ? 'pixel-button-add'
                      : 'opacity-50 cursor-not-allowed bg-[#ddd8ce] text-[#8d8478] border-2 border-[#b8aea0]'
                  )}
                >
                  应用到日历
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
