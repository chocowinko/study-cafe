/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Play,
  Pause,
  Square,
  Flame,
  Star,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Check,
  Pencil,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from './lib/utils';
import { Task, AppState, LongTermTask, CalendarPlanDraft, CalendarMonthResponse, TodayTasksResponse } from './types';

// Animated Number Component for points
const AnimatedNumber = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let startValue = displayValue;
    const endValue = value;
    if (startValue === endValue) return;

    const duration = 300;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.round(startValue + (endValue - startValue) * progress);
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <>{displayValue}</>;
};

// Flying Star Component
const FlyingStar = ({ startX, startY, endX, endY, onComplete }: any) => {
  return (
    <motion.div
      initial={{ left: startX, top: startY, opacity: 0, scale: 1, rotate: 0 }}
      animate={{
        left: endX,
        top: endY,
        opacity: [0, 1, 1, 0],
        scale: [1, 1, 1, 0.8],
        rotate: 360
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed z-[9999] pointer-events-none text-pixel-accent"
      style={{ marginLeft: -10, marginTop: -10 }}
    >
      <Star size={24} fill="currentColor" strokeWidth={1} style={{ filter: 'drop-shadow(2px 2px 0px rgba(0,0,0,0.1))' }} />
    </motion.div>
  );
};

// Coffee type based on actual elapsed minutes
const getCoffeeType = (seconds: number): string => {
  const minutes = seconds / 60;
  if (minutes < 30) return '美式咖啡';
  if (minutes < 60) return '拿铁';
  if (minutes < 90) return '卡布奇诺';
  if (minutes < 120) return '抹茶拿铁';
  return '雪顶咖啡';
};

// Custom Pixel Icons
const PixelTrash = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 2h8v2H4V2zM2 4h12v2H2V4zm2 2h8v8H4V6zm2 2v4h2V8H6zm2 0v4h2V8H8z" />
  </svg>
);

const PixelPencil = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 11v3h3l8-8-3-3-8 8zm10-7l1 1-1 1-1-1 1-1z" />
  </svg>
);

const PixelDragIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M7 2h2v2H7V2zm0 4h2v2H7V6zm0 4h2v2H7v-2zm0 4h2v2H7v-2zM4 2h2v2H4V2zm0 4h2v2H4V6zm0 4h2v2H4v-2zm0 4h2v2H4v-2zm6-12h2v2h-2V2zm0 4h2v2h-2V6zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
  </svg>
);

// Custom Pixel Coffee Bean Icon
const PixelBean = ({ className, active, hoverText }: any) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        animate={active ? { scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.3 }}
        className={cn(
          "w-10 h-7 rounded-[50%] flex items-center justify-center border-2 border-pixel-border transition-all relative overflow-hidden shrink-0",
          active ? "bg-[#5c3c2c]" : "bg-[#e8e4d8]",
          className
        )}
      >
        {/* Highlight */}
        <div className={cn(
          "absolute top-1 left-2 w-1.5 h-1.5 rounded-full",
          active ? "bg-[#8a5a44]" : "bg-white/60"
        )} />
        {/* Texture Line (Curved) */}
        <div className={cn(
          "w-[2px] h-4 rounded-full absolute left-1/2 -translate-x-1/2 rotate-[5deg]",
          active ? "bg-[#3d251a]" : "bg-[#c4bca8]"
        )} />
      </motion.div>

      <AnimatePresence>
        {isHovered && hoverText && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-pixel-text text-white text-[9px] font-bold rounded shadow-lg whitespace-nowrap z-50 pointer-events-none"
          >
            {hoverText}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-pixel-text" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Blocky Progress Bar Component
const PixelProgressBar = ({ progress }: { progress: number }) => {
  const blocks = 20;
  const filledBlocks = Math.floor((progress / 100) * blocks);
  return (
    <div className="pixel-block-progress w-full">
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className={cn("pixel-block", i < filledBlocks && "filled")} />
      ))}
    </div>
  );
};

// Calendar Helpers
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
type BackendStatus = 'checking' | 'connected' | 'disconnected';

const getLocalDateString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getTaskElapsed = (task: Task) => {
  const baseElapsed = task.actualElapsed ?? 0;
  if (!task.focusStartedAt) {
    return baseElapsed;
  }

  const startedAt = new Date(task.focusStartedAt).getTime();
  if (Number.isNaN(startedAt)) {
    return baseElapsed;
  }

  return baseElapsed + Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
};

const replaceMonthEntries = (
  currentTasks: LongTermTask[],
  year: number,
  month: number,
  nextEntries: LongTermTask[],
) => {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const preserved = currentTasks.filter((entry) => !entry.date.startsWith(monthPrefix));

  return [...preserved, ...nextEntries].sort((a, b) => a.date.localeCompare(b.date));
};

export default function App() {
  const todayDate = useMemo(() => getLocalDateString(), []);
  const [todayYear, todayMonth] = todayDate.split('-').map(Number);

  const [state, setState] = useState<AppState>({
    tasks: [],
    longTermTasks: [
      { date: '2026-04-10', tasks: ['复习期末考试大纲'] },
      { date: '2026-04-15', tasks: ['启动编程大作业', '精读 3 篇论文'] },
      { date: '2026-04-20', tasks: ['准备英语口语考试'] },
    ],
    activeTaskId: null,
    beans: 3,
    maxBeans: 6,
    streak: 3,
    points: 150,
    isTimerRunning: false,
    timeElapsed: 0,
  });

  const [currentDate, setCurrentDate] = useState(new Date(todayYear, todayMonth - 1, 1));
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingTasks, setEditingTasks] = useState<string[]>([]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const days = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);

    const prevMonthDays = daysInMonth(year, month - 1);
    const result = [];

    // Previous month filling (Sunday start)
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      result.push({
        day: d,
        currentMonth: false,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      });
    }

    // Current month
    for (let i = 1; i <= days; i++) {
      result.push({
        day: i,
        currentMonth: true,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    // Next month filling
    const totalDaysSoFar = result.length;
    const totalRowsNeeded = Math.ceil(totalDaysSoFar / 7);
    const remaining = (totalRowsNeeded * 7) - totalDaysSoFar;

    for (let i = 1; i <= remaining; i++) {
      result.push({
        day: i,
        currentMonth: false,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      });
    }

    return result;
  }, [currentDate]);

  const [activeView, setActiveView] = useState<'daily' | 'longterm'>('daily');

  const pointsCounterRef = useRef<HTMLDivElement>(null);
  const serveButtonRef = useRef<HTMLButtonElement>(null);
  const [flyingStars, setFlyingStars] = useState<{ id: number; startX: number; startY: number; endX: number; endY: number }[]>([]);
  const [isPointsHighlighted, setIsPointsHighlighted] = useState(false);

  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const startEditing = (dateStr: string) => {
    setEditingDay(dateStr);
    const existing = state.longTermTasks.find(t => t.date === dateStr);
    setEditingTasks(existing && existing.tasks.length > 0 ? existing.tasks : ['']);
  };

  const saveLongTermTask = async () => {
    if (!editingDay) return;

    const lines = editingTasks.filter(l => l.trim().length > 0);

    try {
      const response = await fetch('/api/calendar/day', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: editingDay,
          tasks: lines,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update calendar tasks');
      }

      // If the edited day is today, refresh the daily tasks
      if (editingDay === todayDate) {
        await loadTodayTasks(state.activeTaskId);
      }

      // Refresh the month view to show the new tasks
      const [year, month] = editingDay.split('-').map(Number);
      if (year && month) {
        await loadCalendarMonth(year, month);
      }
    } catch (error) {
      console.error('Failed to save calendar tasks', error);
      // Optional: show error to user
    }

    setEditingDay(null);
  };


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskDeleting, setTaskDeleting] = useState<Task | null>(null);
  const [earlyEndModalStep, setEarlyEndModalStep] = useState<null | 'confirm' | 'status'>(null);

  const [modalForm, setModalForm] = useState({
    title: '',
    subtitle: '',
  });
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantDraft, setAssistantDraft] = useState<CalendarPlanDraft | null>(null);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');
  const [formError, setFormError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);

  const loadCalendarMonth = async (year: number, month: number) => {
    const response = await fetch(`/api/calendar/month?year=${year}&month=${month}`);
    if (!response.ok) {
      throw new Error('Failed to load calendar month');
    }

    const data: CalendarMonthResponse = await response.json();
    setState((prev) => ({
      ...prev,
      longTermTasks: replaceMonthEntries(prev.longTermTasks, data.year, data.month, data.entries),
    }));
  };

  const loadTodayTasks = async (preferredActiveTaskId?: string | null) => {
    const response = await fetch(`/api/tasks/today?date=${todayDate}`);
    if (!response.ok) {
      throw new Error('Failed to load today tasks');
    }

    const data: TodayTasksResponse = await response.json();
    setState((prev) => {
      const nextTasks = data.tasks;
      const nextActiveTask = nextTasks.find((task) => task.id === preferredActiveTaskId)
        || nextTasks.find((task) => Boolean(task.focusStartedAt))
        || nextTasks[0]
        || null;

      return {
        ...prev,
        tasks: nextTasks,
        activeTaskId: nextActiveTask?.id ?? null,
        isTimerRunning: Boolean(nextActiveTask?.focusStartedAt),
        timeElapsed: nextActiveTask ? getTaskElapsed(nextActiveTask) : 0,
      };
    });

    return data;
  };

  const syncTodayMonth = async () => {
    await loadCalendarMonth(todayYear, todayMonth);
  };

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isModalOpen]);

  const validateAndSaveTask = async () => {
    if (!modalForm.title.trim()) {
      setFormError('请输入任务内容');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    try {
      if (modalMode === 'add') {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            date: todayDate,
            title: modalForm.title,
            subtitle: modalForm.subtitle,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create task');
        }

        const newTask: Task = await response.json();
        await loadTodayTasks(newTask.id);
      } else if (editingTaskId) {
        const response = await fetch(`/api/tasks/${editingTaskId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: modalForm.title,
            subtitle: modalForm.subtitle,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update task');
        }

        await loadTodayTasks(editingTaskId);
      }

      await syncTodayMonth();
    } catch (error) {
      setFormError('保存任务失败，请稍后再试。');
      return;
    }

    setIsModalOpen(false);
    setModalForm({ title: '', subtitle: '' });
    setFormError(null);
    setEditingTaskId(null);
  };

  const openEditModal = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setModalMode('edit');
    setEditingTaskId(task.id);
    setModalForm({
      title: task.title,
      subtitle: task.subtitle,
    });
    setIsModalOpen(true);
  };

  const openDeleteConfirm = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskDeleting(task);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskDeleting) {
      try {
        const response = await fetch(`/api/tasks/${taskDeleting.id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete task');
        }

        await loadTodayTasks(state.activeTaskId === taskDeleting.id ? null : state.activeTaskId);
        await syncTodayMonth();
      } catch (error) {
        console.error('Failed to delete task', error);
      }
    }

    setIsDeleteConfirmOpen(false);
    setTaskDeleting(null);
  };

  const handleReorder = (newTasks: Task[]) => {
    setState(prev => ({ ...prev, tasks: newTasks }));

    const persistReorder = async () => {
      try {
        await Promise.all(newTasks.map((task, index) => (
          fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sortOrder: index,
            }),
          })
        )));

        await loadTodayTasks(state.activeTaskId);
        await syncTodayMonth();
      } catch (error) {
        console.error('Failed to reorder tasks', error);
      }
    };

    void persistReorder();
  };

  useEffect(() => {
    const controller = new AbortController();

    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health', { signal: controller.signal });
        if (!response.ok) {
          throw new Error('Health check failed');
        }

        const data: { ok?: boolean } = await response.json();
        setBackendStatus(data.ok ? 'connected' : 'disconnected');
      } catch (error) {
        if (!controller.signal.aborted) {
          setBackendStatus('disconnected');
        }
      }
    };

    checkBackend();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchTodayTasks = async () => {
      try {
        if (cancelled) {
          return;
        }

        await loadTodayTasks(state.activeTaskId);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load today tasks', error);
        }
      }
    };

    fetchTodayTasks();

    return () => {
      cancelled = true;
    };
  }, [activeView]);

  useEffect(() => {
    let cancelled = false;

    const fetchMonth = async () => {
      try {
        const response = await fetch(`/api/calendar/month?year=${currentDate.getFullYear()}&month=${currentDate.getMonth() + 1}`);
        if (!response.ok) {
          throw new Error('Failed to load month');
        }

        const data: CalendarMonthResponse = await response.json();
        if (cancelled) {
          return;
        }

        setState((prev) => ({
          ...prev,
          longTermTasks: replaceMonthEntries(prev.longTermTasks, data.year, data.month, data.entries),
        }));
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load calendar month', error);
        }
      }
    };

    fetchMonth();

    return () => {
      cancelled = true;
    };
  }, [currentDate]);

  useEffect(() => {
    if (activeView === 'daily' || assistantDraft) {
      return;
    }

    let cancelled = false;

    const fetchPendingDrafts = async () => {
      try {
        const response = await fetch('/api/assistant/drafts?status=pending');
        if (!response.ok) {
          throw new Error('Failed to load assistant drafts');
        }

        const data: { drafts: CalendarPlanDraft[] } = await response.json();
        if (!cancelled && data.drafts.length > 0) {
          setAssistantDraft(data.drafts[0]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load assistant drafts', error);
        }
      }
    };

    fetchPendingDrafts();

    return () => {
      cancelled = true;
    };
  }, [activeView, assistantDraft]);

  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isModalOpen]);

  const [isServing, setIsServing] = useState(false);
  const [isTooltipHovered, setIsTooltipHovered] = useState(false);

  const activeTask = useMemo(() => {
    if (state.tasks.length === 0) return null;
    return state.tasks.find(t => t.id === state.activeTaskId) || state.tasks[0];
  }, [state.tasks, state.activeTaskId]);

  // Task is complete if it has been explicitly marked completed (via 提前结束 → 已完成)
  const isTaskComplete = activeTask
    ? (activeTask.status === 'completed' || (state.isTimerRunning === false && state.timeElapsed > 0))
    : false;

  // Beans are purely based on actual elapsed time: 1 bean per 30 minutes
  const MINUTES_PER_BEAN = 30;
  const finalLitBeans = Math.floor(state.timeElapsed / (MINUTES_PER_BEAN * 60));
  // For the bean progress display, use finalLitBeans as total too (no fixed target)
  const currentTaskBeans = activeTask?.status === 'completed'
    ? Math.max(finalLitBeans, Math.floor((activeTask.actualElapsed || 0) / (MINUTES_PER_BEAN * 60)))
    : Math.max(finalLitBeans, 1); // at least 1 bean slot to show something

  // Dynamic coffee type based on actual elapsed time
  const activeCoffeeType = activeTask?.status === 'completed'
    ? (activeTask.coffeeType || getCoffeeType(activeTask.actualElapsed || 0))
    : getCoffeeType(state.timeElapsed);

  const coffeeImages: Record<string, string> = {
    '美式咖啡': '/americano.png',
    '拿铁': '/latte.png',
    '卡布奇诺': '/cappuccino.png',
    '抹茶拿铁': '/matcha_latte.png',
    '雪顶咖啡': '/float_coffee.png',
  };

  const handleServe = () => {
    if (!isTaskComplete || activeTask?.isServed) return;
    setIsServing(true);

    const persistServe = async () => {
      try {
        const response = await fetch(`/api/tasks/${activeTask.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isServed: true,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to serve task');
        }

        if (serveButtonRef.current && pointsCounterRef.current) {
          const btnRect = serveButtonRef.current.getBoundingClientRect();
          const counterRect = pointsCounterRef.current.getBoundingClientRect();

          const newStar = {
            id: Date.now(),
            startX: btnRect.left + btnRect.width / 2,
            startY: btnRect.top + btnRect.height / 2,
            endX: counterRect.left + counterRect.width / 2,
            endY: counterRect.top + counterRect.height / 2,
          };

          setFlyingStars(prev => [...prev, newStar]);
        }

        const earnedPoints = currentTaskBeans * 20;
        setTimeout(() => {
          setState(prev => ({ ...prev, points: prev.points + earnedPoints }));
          setIsPointsHighlighted(true);
          setTimeout(() => setIsPointsHighlighted(false), 300);
        }, 550);

        await loadTodayTasks(activeTask.id);
        await syncTodayMonth();
      } catch (error) {
        console.error('Failed to serve task', error);
      } finally {
        setTimeout(() => setIsServing(false), 3000);
      }
    };

    void persistServe();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isTimerRunning) {
      interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const backendStatusText = backendStatus === 'connected'
    ? '后端已连接'
    : backendStatus === 'disconnected'
      ? '后端未连接'
      : '检查中...';

  const toggleTimer = () => {
    if (!activeTask) {
      return;
    }

    const persistTimer = async () => {
      try {
        if (state.isTimerRunning) {
          const response = await fetch(`/api/tasks/${activeTask.id}/focus-finish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actualElapsed: state.timeElapsed,
              status: 'idle',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to pause task');
          }
        } else {
          const response = await fetch(`/api/tasks/${activeTask.id}/focus-start`, {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error('Failed to start focus');
          }
        }

        await loadTodayTasks(activeTask.id);
      } catch (error) {
        console.error('Failed to toggle timer', error);
      }
    };

    void persistTimer();
  };

  const handleGenerateCalendarPlan = async () => {
    if (!assistantInput.trim()) {
      return;
    }

    setIsAssistantLoading(true);
    setAssistantError(null);

    try {
      const response = await fetch('/api/assistant/calendar-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: assistantInput,
          currentYear: currentDate.getFullYear(),
          currentMonth: currentDate.getMonth() + 1,
          today: todayDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Assistant request failed');
      }

      const data: CalendarPlanDraft = await response.json();
      setAssistantDraft(data);
    } catch (error) {
      setAssistantError('排班草案生成失败，请稍后再试。');
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const handleApplyCalendarPlan = () => {
    if (!assistantDraft?.draftId || assistantDraft.operations.length === 0) {
      return;
    }

    const applyDraft = async () => {
      try {
        const response = await fetch('/api/assistant/confirm-draft', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            draftId: assistantDraft.draftId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to confirm draft');
        }

        const result: { updatedDates: string[] } = await response.json();
        const [year, month] = assistantDraft.operations[0].date.split('-').map(Number);
        if (year && month) {
          await loadCalendarMonth(year, month);
          setCurrentDate(new Date(year, month - 1, 1));
        }

        if (result.updatedDates.includes(todayDate)) {
          await loadTodayTasks(state.activeTaskId);
        }

        setEditingDay(null);
        setAssistantDraft(null);
        setAssistantInput('');
        setAssistantError(null);
      } catch (error) {
        setAssistantError('草案确认失败，请稍后再试。');
      }
    };

    void applyDraft();
  };

  const handleTaskSelect = (id: string) => {
    const selectTask = async () => {
      if (state.activeTaskId === id) {
        return;
      }

      try {
        if (state.isTimerRunning && activeTask) {
          const response = await fetch(`/api/tasks/${activeTask.id}/focus-finish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actualElapsed: state.timeElapsed,
              status: 'idle',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to switch task');
          }

          await loadTodayTasks(id);
          return;
        }

        const selectedTask = state.tasks.find(task => task.id === id);
        setState(prev => ({
          ...prev,
          activeTaskId: id,
          isTimerRunning: Boolean(selectedTask?.focusStartedAt),
          timeElapsed: selectedTask ? getTaskElapsed(selectedTask) : 0,
        }));
      } catch (error) {
        console.error('Failed to select task', error);
      }
    };

    void selectTask();
  };

  const handleConfirmEarlyEnd = () => {
    setEarlyEndModalStep('status');
  };

  const handleFinishStatus = (isFinished: boolean) => {
    const finishTask = async () => {
      if (!activeTask) {
        setEarlyEndModalStep(null);
        return;
      }

      try {
        if (isFinished) {
          const elapsed = state.timeElapsed;
          const lockedCoffeeType = getCoffeeType(elapsed);
          const response = await fetch(`/api/tasks/${activeTask.id}/focus-finish`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actualElapsed: elapsed,
              status: 'completed',
              coffeeType: lockedCoffeeType,
              isServed: false,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to finish task');
          }

          await loadTodayTasks(activeTask.id);
          await syncTodayMonth();
        } else {
          const response = await fetch(`/api/tasks/${activeTask.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete interrupted task');
          }

          await loadTodayTasks();
          await syncTodayMonth();
        }
      } catch (error) {
        console.error('Failed to finish task', error);
      } finally {
        setEarlyEndModalStep(null);
      }
    };

    void finishTask();
  };

  return (
    <div className="h-screen p-2 md:p-4 flex flex-col gap-4 max-w-6xl mx-auto font-sans overflow-y-auto custom-scrollbar">
      {/* Top Header — Game HUD Style */}
      <header className="flex flex-col md:flex-row items-center justify-between px-4 py-3 pixel-dialog border-b-0 rounded-xl gap-4"
        style={{ border: '3px solid #5c3d2e', boxShadow: '5px 5px 0px 0px #8B6550' }}>
        <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 border-3 border-pixel-border rounded-lg flex items-center justify-center bg-white overflow-hidden shrink-0 relative"
              style={{ border: '3px solid #5c3d2e', boxShadow: '3px 3px 0px 0px #8B6550' }}>
              <img
                src="/logo.png"
                alt="Study Café Logo"
                className="w-full h-full object-contain relative z-10"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xl z-0">☕</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xl font-bold tracking-widest uppercase text-pixel-text" style={{ fontFamily: 'var(--font-pixel-num)', fontSize: '0.9rem' }}>STUDY CAFÉ</span>
              <div className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-bold text-pixel-muted">
                <span>后端连接状态</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 border border-pixel-border/30",
                    backendStatus === 'connected'
                      ? "bg-pixel-green/15 text-pixel-green"
                      : backendStatus === 'disconnected'
                        ? "bg-pixel-red/15 text-pixel-red"
                        : "bg-white/90 text-pixel-muted"
                  )}
                >
                  {backendStatusText}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveView('daily')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border-2 border-pixel-border rounded-lg text-pixel-text font-bold text-sm transition-all",
                activeView === 'daily' ? "nav-tab-active" : "bg-[#fdf8f0] hover:bg-[#ede0ce] shadow-[2px_2px_0px_0px_#8B6550]"
              )}
            >
              <ClipboardList size={15} />
              今日营业
            </button>
            <button
              onClick={() => setActiveView('longterm')}
              className={cn(
                "flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border-2 border-pixel-border rounded-lg text-pixel-text font-bold text-sm transition-all",
                activeView === 'longterm' ? "nav-tab-active" : "bg-[#fdf8f0] hover:bg-[#ede0ce] shadow-[2px_2px_0px_0px_#8B6550]"
              )}
            >
              <LayoutGrid size={15} />
              店长排班
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-pixel-border/10">
          <div className="flex items-center gap-4">
            {/* Streak Counter */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-base"
              style={{ background: '#fff3e0', border: '2px solid #5c3d2e', boxShadow: '2px 2px 0px 0px #8B6550', color: '#c0614a' }}>
              <Flame size={18} fill="currentColor" />
              <span>连续 <span className="font-pixel-num text-[0.65rem]">{state.streak}</span> 天</span>
            </div>
            {/* Points Counter */}
            <div
              ref={pointsCounterRef}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-base transition-all duration-200",
                isPointsHighlighted && "scale-125"
              )}
              style={{ background: '#fffde0', border: '2px solid #5c3d2e', boxShadow: '2px 2px 0px 0px #8B6550', color: '#b08020' }}
            >
              <motion.div
                animate={isPointsHighlighted ? { opacity: [0.5, 1, 0.5, 1], scale: [1, 1.1, 1, 1.1] } : {}}
                className="flex items-center gap-1"
              >
                <Star size={18} fill="currentColor" />
                <span className="font-pixel-num text-[0.65rem]"><AnimatedNumber value={state.points} /></span>
              </motion.div>
            </div>
          </div>
          <div className="flex items-center gap-2 pl-4 border-l-2 border-pixel-border">
            <div className="w-9 h-9 rounded-lg bg-white overflow-hidden shrink-0"
              style={{ border: '3px solid #5c3d2e', boxShadow: '2px 2px 0px 0px #8B6550' }}>
              <img src="/avatar.png" alt="User Avatar" className="w-full h-full object-cover" />
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {activeView === 'daily' ? (
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4">
          {/* Left: Today's Menu (Notebook Style) */}
          <div className="lg:col-span-5 pixel-dialog flex flex-col gap-4 p-5 md:p-6 rounded-xl h-full overflow-hidden">
            <div className="flex justify-between items-start shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-pixel-accent" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pixel-muted">Today's Orders</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold leading-tight">今日咖啡订单</h2>
              </div>
              <div className="w-10 h-12 bg-[#e8e4d8] border-2 border-pixel-border rounded flex flex-col items-center justify-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)] shrink-0">
                <div className="w-6 h-0.5 bg-pixel-border/20 rounded" />
                <div className="w-6 h-0.5 bg-pixel-border/20 rounded" />
                <div className="w-6 h-0.5 bg-pixel-border/20 rounded" />
                <div className="w-6 h-0.5 bg-pixel-border/20 rounded" />
              </div>
            </div>

            {state.tasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-6 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pixel-accent/5 rounded-full blur-3xl -z-10" />

                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-white/90 border-2 border-pixel-border rounded-2xl flex items-center justify-center text-4xl shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] relative">
                    <span className="opacity-40 grayscale">☕</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] md:text-[11px] font-bold text-pixel-text max-w-[200px] leading-relaxed">
                      今天还没有学习任务，点击"+"添加任务，开始你的学习咖啡之旅
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setModalMode('add');
                    setEditingTaskId(null);
                    setModalForm({ title: '', subtitle: '', duration: 30, coffeeType: '美式咖啡' });
                    setIsModalOpen(true);
                  }}
                  className="w-full py-4 md:py-6 border-2 border-dashed border-pixel-border rounded-2xl text-pixel-muted hover:text-pixel-accent hover:border-pixel-accent transition-all flex flex-col items-center justify-center gap-2 text-[11px] font-bold bg-white/40 group overflow-hidden relative shrink-0"
                >
                  <div className="absolute inset-0 bg-pixel-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Plus size={20} className="group-hover:scale-110 transition-transform" />
                  <span>+ 添加第一个任务</span>
                </button>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={state.tasks}
                onReorder={handleReorder}
                className="flex-1 overflow-y-auto pr-2 flex flex-col gap-1.5 custom-scrollbar"
              >
                {state.tasks.map((task, taskIdx) => {
                  const accentColors = ['#6aaa6a', '#e8a87c', '#c0614a', '#7ab8d0', '#b09ae0'];
                  const accentColor = accentColors[taskIdx % accentColors.length];
                  const isActive = state.activeTaskId === task.id;
                  return (
                    <Reorder.Item
                      value={task}
                      key={task.id}
                      className={cn(
                        "w-full text-left p-2 md:p-2.5 rounded-xl border-2 transition-all shrink-0 task-card-border group relative flex flex-col gap-1 overflow-hidden",
                        isActive
                          ? "bg-[#f0f9f0]/90 border-pixel-green"
                          : "bg-white/90 border-[#b09878] hover:bg-[#fdf6ec]/90",
                        task.status === 'completed' && "opacity-75"
                      )}
                      style={isActive ? { boxShadow: `4px 4px 0px 0px ${accentColor}` } : { boxShadow: '3px 3px 0px 0px #b09070' }}
                      onClick={() => handleTaskSelect(task.id)}
                    >
                      {/* Left accent stripe */}
                      <div className="task-card-accent-left" style={{ background: accentColor }} />

                      <div className="task-item-actions">
                        <button
                          onClick={(e) => openEditModal(task, e)}
                          className="pixel-icon-btn text-pixel-muted hover:text-pixel-accent"
                        >
                          <PixelPencil />
                        </button>
                        <button
                          onClick={(e) => openDeleteConfirm(task, e)}
                          className="pixel-icon-btn text-pixel-muted hover:text-pixel-red"
                        >
                          <PixelTrash />
                        </button>
                      </div>

                      <div className="pixel-drag-indicator text-[#8B6550] group-active:opacity-100 transition-opacity">
                        <PixelDragIcon />
                      </div>

                      <div className="flex gap-2 relative pl-3">
                        <div
                          className="w-9 h-9 border-2 border-pixel-border rounded-lg flex items-center justify-center shrink-0 bg-white/90 overflow-hidden"
                          style={{ boxShadow: '2px 2px 0 #8B6550' }}
                        >
                          <img
                            src={coffeeImages[task.coffeeType] || coffeeImages['美式咖啡']}
                            alt={task.coffeeType}
                            className="w-7 h-7 object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-16">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-xs md:text-sm truncate">{task.title}</h4>
                            {task.status === 'completed' ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <div className="bg-pixel-green text-white px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                  <Check size={8} strokeWidth={4} />
                                </div>
                                <span className="text-[8px] font-bold text-pixel-muted">
                                  {task.coffeeType || getCoffeeType(task.actualElapsed || 0)}
                                </span>
                              </div>
                            ) : state.activeTaskId === task.id ? (
                              <span className="text-[8px] font-bold text-[#c0614a] bg-[#fff3e0] px-1.5 py-0.5 rounded shrink-0">
                                {state.timeElapsed > 0 || state.isTimerRunning ? (state.isTimerRunning ? '制作中' : '已暂停') : '待开始'}
                              </span>
                            ) : (
                              <span className="text-[8px] font-bold text-pixel-muted/50 shrink-0">待开始</span>
                            )}
                          </div>
                          {task.status === 'completed' && task.actualElapsed ? (
                            <div className="text-[8px] text-pixel-muted font-bold flex items-center gap-1">
                              <Clock size={8} /> 实际专注 {Math.floor(task.actualElapsed / 60)} 分钟
                            </div>
                          ) : (
                            task.subtitle && <div className="text-[8px] text-pixel-muted truncate">{task.subtitle}</div>
                          )}
                        </div>
                      </div>
                    </Reorder.Item>
                  );
                })}

                <button
                  onClick={() => {
                    setModalMode('add');
                    setEditingTaskId(null);
                    setModalForm({ title: '', subtitle: '', duration: 30, coffeeType: '美式咖啡' });
                    setIsModalOpen(true);
                  }}
                  className="w-full py-2 border-2 border-dashed border-pixel-border rounded-xl text-pixel-muted hover:text-pixel-accent hover:border-pixel-accent transition-all flex items-center justify-center gap-2 text-[10px] font-bold shrink-0"
                >
                  <Plus size={12} /> 添加任务
                </button>
              </Reorder.Group>
            )}
          </div>

          {/* Right: Current Coffee */}
          <div className="lg:col-span-7 flex flex-col gap-2 relative h-full overflow-hidden rounded-xl p-5 md:p-6 pixel-dialog">
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Left: Coffee Visual */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="shrink-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-pixel-accent" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pixel-muted">Current Coffee</span>
                  </div>
                  <div className="flex items-center gap-3 mb-0.5">
                    <h2 className="text-xl md:text-2xl font-bold">当前咖啡</h2>
                    <div className={cn(
                      "px-2 py-0.5 border-2 border-pixel-border text-[8px] font-bold rounded uppercase",
                      !activeTask ? "bg-pixel-muted/10 text-pixel-muted" :
                        activeTask.status === 'completed' ? "bg-pixel-green text-white" :
                          state.timeElapsed > 0 ? "bg-[#fff3e0] text-[#c0614a]" : "bg-[#e8e4d8]"
                    )}>
                      {!activeTask ? '未开始' : activeTask.status === 'completed' ? '已完成' : state.timeElapsed > 0 ? '制作中' : '待开始'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 h-7">
                    {activeTask ? (
                      <>
                        <h3 className="text-sm md:text-base font-bold text-pixel-accent animate-in fade-in">{activeCoffeeType}</h3>
                        {state.timeElapsed > 0 && activeTask.status !== 'completed' && (
                          <span className="text-[9px] text-pixel-muted font-bold">({Math.floor(state.timeElapsed / 60)}分钟)</span>
                        )}
                      </>
                    ) : (
                      <h3 className="text-sm md:text-base font-bold text-pixel-muted/30">暂无正在制作的咖啡</h3>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center relative py-2">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-pixel-accent/5 rounded-full blur-2xl" />
                  </div>

                  {/* Small hint above coffee */}
                  <p className="text-[9px] font-bold text-pixel-muted/70 tracking-wide mb-1 relative z-10">
                    {activeTask
                      ? (state.isTimerRunning ? '☕ 专注越久，咖啡越香~' : (state.timeElapsed > 0 ? '▶ 按下按钮继续专注' : '▶ 按下按钮开始专注'))
                      : '← 选择左侧任务开始吧'}
                  </p>
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <AnimatePresence mode="wait">
                      {!activeTask ? (
                        <motion.div
                          key="empty-coffee"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="flex flex-col items-center gap-4"
                        >
                          <div className="relative">
                            <div className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center text-6xl opacity-20 grayscale filter blur-[1px]">
                              ☕
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-pixel-accent text-white text-sm px-4 py-1.5 rounded border-[3px] border-[#8a5a44] font-bold -rotate-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] tracking-widest flex items-center justify-center min-w-[80px]">
                                暂无
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : isServing ? (
                        <motion.div
                          key="serving"
                          initial={{ scale: 0.8, y: 20, opacity: 0 }}
                          animate={{ scale: 1, y: 0, opacity: 1 }}
                          exit={{ x: 300, opacity: 0 }}
                          className="flex flex-col items-center"
                        >
                          <img
                            src={coffeeImages[activeTask?.coffeeType || ''] || coffeeImages['美式咖啡']}
                            alt="Serving"
                            className="w-32 h-32 md:w-40 md:h-40 object-contain pixel-border-sm rounded-xl bg-white/40"
                            referrerPolicy="no-referrer"
                          />
                          <div className="mt-2 px-3 py-1 bg-pixel-green text-white text-[10px] font-bold rounded-full animate-bounce">
                            出餐中...
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key={activeCoffeeType}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center relative"
                        >
                          {/* Warm glow under coffee */}
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-28 h-8 rounded-full blur-xl" style={{ background: 'rgba(180,120,60,0.25)' }} />
                          <div className="flex items-end justify-center relative">
                            <img
                              src={coffeeImages[activeCoffeeType] || coffeeImages['美式咖啡']}
                              alt={activeCoffeeType}
                              className="w-32 h-32 md:w-36 md:h-36 object-contain coffee-glow relative z-10"
                              style={{ imageRendering: 'pixelated' }}
                              referrerPolicy="no-referrer"
                            />
                            <div className="relative -ml-6 mb-2 z-0 opacity-90 transition-transform hover:scale-105 cursor-pointer">
                              <img src="/cat_barista.png" className="w-[72px] h-[72px] sm:w-[108px] sm:h-[108px] object-contain" style={{ mixBlendMode: 'multiply', imageRendering: 'pixelated' }} alt="Cat Barista" />
                              {!state.isTimerRunning && state.timeElapsed > 0 && activeTask?.status !== 'completed' && (
                                <div className="absolute top-0 right-0 md:-right-4 text-[10px] font-bold text-[#8c6a4a] bg-white border-2 border-[#5c3d2e] px-2 py-0.5 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.2)] animate-bounce font-sans">
                                  Zzz..
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div
                      className="relative"
                      onMouseEnter={() => setIsTooltipHovered(true)}
                      onMouseLeave={() => setIsTooltipHovered(false)}
                    >
                      <button
                        ref={serveButtonRef}
                        onClick={handleServe}
                        disabled={!isTaskComplete || activeTask?.isServed || !activeTask}
                        className={cn(
                          "pixel-button-serve",
                          (!isTaskComplete || activeTask?.isServed || !activeTask) && "opacity-50 cursor-not-allowed grayscale"
                        )}
                      >
                        {activeTask?.isServed ? '已出餐' : '出餐'}
                      </button>

                      <AnimatePresence>
                        {isTooltipHovered && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute left-1/2 -translate-x-1/2 top-full mt-3 z-50 pixel-bubble p-2 px-3 text-[9px] font-bold text-pixel-text leading-tight flex gap-3 items-center justify-center w-[210px]"
                          >
                            <div className="w-4 h-4 bg-[#8B4513] relative shrink-0" style={{ boxShadow: '2px 2px 0 #3d251a' }}>
                              <div className="absolute top-1 left-1 w-2 h-1 bg-[#D2B48C]" />
                              <div className="absolute top-0 right-0 w-1 h-1 bg-[#8B4513]" />
                            </div>
                            <span className="text-left">
                              {!activeTask
                                ? "快去添加第一个任务吧，店长已经准备就绪啦！"
                                : "只有获得足够咖啡豆，才能出餐哦~为了喝到美味，客人愿意耐心等待"}
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Info & Controls — RPG HUD Style */}
              <div className="flex flex-col gap-3 shrink-0 items-end justify-center">
                {/* Single Dark RPG Timer Box — 已专注 only */}
                <div className="flex flex-col gap-2">
                  <div className={cn("pixel-timer-box", state.isTimerRunning && "timer-running")}>
                    <div className="pixel-timer-label">
                      <Clock size={10} /> 已专注
                    </div>
                    <span className={cn(
                      "pixel-timer-value",
                      !activeTask && "opacity-30"
                    )}>{activeTask ? formatTime(state.timeElapsed) : '--:--'}</span>
                  </div>
                  {/* Coffee type progress hint */}
                  {activeTask && activeTask.status !== 'completed' && (
                    <div className="text-[8px] text-pixel-muted font-bold text-right leading-tight">
                      <div>{activeCoffeeType}</div>
                      <div className="text-pixel-muted/60">
                        {state.timeElapsed < 30 * 60 ? `再 ${30 - Math.floor(state.timeElapsed / 60)} 分→拿铁` :
                          state.timeElapsed < 60 * 60 ? `再 ${60 - Math.floor(state.timeElapsed / 60)} 分→卡布奇诺` :
                            state.timeElapsed < 90 * 60 ? `再 ${90 - Math.floor(state.timeElapsed / 60)} 分→抹茶拿铁` :
                              state.timeElapsed < 120 * 60 ? `再 ${120 - Math.floor(state.timeElapsed / 60)} 分→雪顶咖啡` : '🏆 最高等级!'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons — chunky game style */}
                <div className="flex flex-col gap-2.5 w-full">
                  <button
                    onClick={toggleTimer}
                    disabled={activeTask?.status === 'completed'}
                    className={cn(
                      "w-full px-6 py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 text-sm transition-all tracking-wide",
                      activeTask?.status === 'completed'
                        ? "text-white"
                        : "pixel-button-red"
                    )}
                    style={activeTask?.status === 'completed' ? {
                      background: '#6aaa6a',
                      border: '3px solid #5c3d2e',
                      boxShadow: '0px 5px 0px 0px #3d7a3d',
                      color: 'white'
                    } : {}}
                  >
                    {activeTask?.status === 'completed' ? <Check size={16} /> : (state.isTimerRunning ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />)}
                    {activeTask?.status === 'completed' ? '已完成' : (state.isTimerRunning ? '暂停' : (state.timeElapsed > 0 ? '▶ 继续专注' : '▶ 开始专注'))}
                  </button>
                  {/* 结束任务 — available any time after timer has started */}
                  <button
                    onClick={() => setEarlyEndModalStep('confirm')}
                    disabled={!activeTask || activeTask?.status === 'completed' || state.timeElapsed === 0}
                    className={cn(
                      "pixel-button-white w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-bold tracking-wide",
                      (!activeTask || activeTask?.status === 'completed' || state.timeElapsed === 0) && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <Square size={14} fill="currentColor" />
                    <span>■ 结束任务</span>
                  </button>

                  {/* 🚀 测试专用：加速按钮 */}
                  {activeTask && activeTask.status !== 'completed' && (
                    <div className="flex gap-2 mt-1 border-t-2 border-dashed border-pixel-muted/20 pt-3">
                      <button
                        onClick={() => setState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 5 * 60 }))}
                        title="加速5分钟"
                        className="flex-1 py-1.5 bg-[#e8e4d8] border-2 border-pixel-border rounded shadow-[0_2px_0_0_#A08A7C] text-[10px] font-bold text-pixel-muted hover:bg-[#d8c4b8] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        ⏩ +5 分钟
                      </button>
                      <button
                        onClick={() => setState(prev => ({ ...prev, timeElapsed: prev.timeElapsed + 1788 }))}
                        title="加速29.8分钟"
                        className="flex-1 py-1.5 bg-[#e8e4d8] border-2 border-pixel-border rounded shadow-[0_2px_0_0_#A08A7C] text-[10px] font-bold text-pixel-muted hover:bg-[#d8c4b8] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        ⏩ +29.8 分钟
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-4">
          {/* Left: Chat / Dialogue Panel */}
          <div className="lg:col-span-4 pixel-card !border-[#AE986F] bg-white/90 rounded-xl flex flex-col h-full overflow-hidden p-0">
            {/* Header */}
            <div className="p-4 border-b-2 border-[#AE986F] bg-[#FAF0E6]/90 shrink-0">
              <h3 className="font-bold text-lg flex items-center gap-2 text-[#5D4037]">
                <Sparkles size={18} className="text-[#D2B48C]" />
                AI 智能规划
              </h3>
              <p className="text-[10px] text-pixel-muted font-bold mt-1">输入任务与截止日期，智能分配每日工作</p>
            </div>

            {/* Output Panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 p-4 bg-[#fdfaf7]/90">
              {!assistantDraft && !isAssistantLoading && !assistantError && (
                <div className="text-sm font-bold text-pixel-muted flex-1 flex flex-col items-center justify-center text-center px-4 leading-relaxed">
                  <p>告诉我你的任务和截止日期，</p>
                  <p className="text-[11px] mt-1 opacity-70">例如：“下周五前要看完3篇论文，月底要提交编程大作业”</p>
                </div>
              )}
              {isAssistantLoading && (
                <div className="text-sm font-bold text-pixel-accent animate-pulse flex-1 flex items-center justify-center">
                  正在思考中...
                </div>
              )}
              {assistantError && (
                <div className="text-xs font-bold text-pixel-red p-3 border-2 border-red-200 bg-red-50 rounded-lg">
                  {assistantError}
                </div>
              )}
              {assistantDraft && (
                <>
                  <div className="text-sm font-bold text-pixel-text bg-[#FAF0E6] p-3 border-2 border-[#D2B48C] rounded-lg shadow-[2px_2px_0px_#8B4513]">
                    {assistantDraft.summary}
                  </div>
                  {assistantDraft.operations.map((op, idx) => (
                    <div key={idx} className="bg-white p-3 border-2 border-[#D2B48C] rounded-lg shadow-[2px_2px_0px_#8B4513]">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-pixel-text">
                          {new Date(op.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}
                        </span>
                        <span className="text-[10px] font-bold text-[#8B4513] bg-[#FAF0E6] px-2 py-0.5 rounded border border-[#D2B48C]">
                          {op.type === 'set' ? '覆盖当天' : '追加任务'}
                        </span>
                      </div>
                      <ul className="text-xs font-bold text-pixel-muted flex flex-col gap-1.5">
                        {op.tasks.map((task, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-1">
                            <span className="text-[#8B4513]">•</span>
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                      {op.note && <div className="mt-2 text-[10px] text-pixel-muted border-t border-dashed border-[#D2B48C] pt-1">{op.note}</div>}
                    </div>
                  ))}
                  <button
                    onClick={handleApplyCalendarPlan}
                    className="pixel-button-add w-full py-3 mt-2 text-sm"
                  >
                    应用到日历
                  </button>
                </>
              )}
            </div>

            {/* Input Panel */}
            <div className="shrink-0 bg-white/90 p-4 border-t-2 border-[#AE986F] flex flex-col gap-3">
              <textarea
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                placeholder="例如：我有三篇论文要在下周五前看完，还有一篇大作业月底截止..."
                className="pixel-input-modal custom-scrollbar min-h-[80px] resize-none text-sm"
              />
              <button
                onClick={handleGenerateCalendarPlan}
                disabled={isAssistantLoading || !assistantInput.trim()}
                className={cn(
                  "w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all",
                  isAssistantLoading || !assistantInput.trim()
                    ? "opacity-50 cursor-not-allowed bg-[#ddd8ce] text-[#8d8478] border-2 border-[#b8aea0]"
                    : "pixel-button-red"
                )}
              >
                <Send size={16} />
                {isAssistantLoading ? '发送中...' : '发送请求'}
              </button>
            </div>
          </div>

          {/* Right: Calendar Area */}
          <div className="lg:col-span-8 flex flex-col h-full overflow-hidden">
            {/* Calendar Grid Container */}
            <div className="flex-1 pixel-card !border-[#AE986F] overflow-hidden flex flex-col gap-4 p-4 bg-white/90">
              {/* Calendar Header Area */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <h2 className="text-xl font-bold text-pixel-text">店长排班</h2>
                </div>

                <div className="flex items-center gap-3 flex-wrap justify-end">
                  <span className="text-lg font-bold text-pixel-text">
                    {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                  </span>
                  <div className="flex gap-1">
                    <button onClick={handleGoToToday} className="pixel-month-nav-btn px-3 py-1.5 text-[10px] font-bold mr-1 bg-[#f5f0e8] hover:bg-[#e8dec0] border-2 border-[#c8b49a] rounded">
                      今天
                    </button>
                    <button onClick={handlePrevMonth} className="pixel-month-nav-btn px-2 py-1.5 bg-[#f5f0e8] hover:bg-[#e8dec0] border-2 border-[#c8b49a] rounded">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={handleNextMonth} className="pixel-month-nav-btn px-2 py-1.5 bg-[#f5f0e8] hover:bg-[#e8dec0] border-2 border-[#c8b49a] rounded">
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="calendar-grid shrink-0">
                {['日', '一', '二', '三', '四', '五', '六'].map(d => (
                  <div key={d} className="calendar-day-header">{d}</div>
                ))}
              </div>

              <div className="calendar-grid flex-1 overflow-y-auto custom-scrollbar pr-1 content-start">
                {calendarDays.map((dayObj, idx) => {
                  const taskObj = state.longTermTasks.find(t => t.date === dayObj.dateStr);
                  const isEditing = editingDay === dayObj.dateStr;

                  const localToday = new Date();
                  const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
                  const isToday = todayStr === dayObj.dateStr;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "calendar-cell",
                        dayObj.currentMonth ? "hoverable" : "other-month",
                        isToday && "today",
                        isEditing && "editing"
                      )}
                    >
                      {!isEditing && dayObj.currentMonth && (
                        <div
                          className="calendar-edit-icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(dayObj.dateStr);
                          }}
                        >
                          <Pencil size={12} />
                        </div>
                      )}

                      <div className={cn("calendar-date-num", (idx % 7 === 0 || idx % 7 === 6) && "weekend")}>
                        {dayObj.day}
                        {isToday && (
                          <span className="ml-1 text-[7px] bg-pixel-green text-white px-1 py-0.5 rounded leading-none align-middle uppercase tracking-tighter">今</span>
                        )}
                      </div>

                      {isEditing && (
                        <div
                          className={cn("calendar-popover", (idx % 7 < 4) ? "popover-right" : "popover-left")}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="font-bold text-[13px] text-[#5D4037] mb-2">{dayObj.month}月{dayObj.day}日排班</div>
                          <div className="flex flex-col gap-2 mb-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                            {editingTasks.map((t, idxTask) => (
                              <div key={idxTask} className="flex items-center gap-1">
                                <input
                                  autoFocus={idxTask === editingTasks.length - 1}
                                  className="w-full bg-[#fafaf8] border-2 border-[#C8A882] rounded text-xs px-2 py-1.5 text-[#5D4037] outline-none focus:border-[var(--color-pixel-green)] focus:bg-white"
                                  value={t}
                                  onChange={(e) => {
                                    const newTasks = [...editingTasks];
                                    newTasks[idxTask] = e.target.value;
                                    setEditingTasks(newTasks);
                                  }}
                                  placeholder={`任务 ${idxTask + 1}...`}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      if (t.trim()) {
                                        setEditingTasks([...editingTasks, '']);
                                      }
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingDay(null);
                                    }
                                  }}
                                />
                                <button
                                  onMouseDown={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const next = editingTasks.filter((_, i) => i !== idxTask);
                                    setEditingTasks(next.length > 0 ? next : ['']);
                                  }}
                                  className="p-1 text-pixel-muted hover:text-pixel-red transition-colors shrink-0"
                                  title="删除任务"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setEditingTasks([...editingTasks, '']);
                            }}
                            className="text-[10px] text-[#8B5A2B] font-bold self-start mb-2 hover:underline"
                          >
                            + 添加新任务
                          </button>
                          <div className="calendar-popover-actions">
                            <button onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setEditingDay(null); }} className="pixel-btn-tiny cancel px-3 py-1.5">取消</button>
                            <button onMouseDown={async (e) => { e.stopPropagation(); e.preventDefault(); await saveLongTermTask(); }} className="pixel-btn-tiny save px-3 py-1.5">保存</button>
                          </div>
                        </div>
                      )}

                      <div className="flex-1 flex flex-col" onClick={() => dayObj.currentMonth && startEditing(dayObj.dateStr)}>
                        {taskObj && taskObj.tasks.length > 0 ? (
                          <div className="calendar-task-preview">
                            {taskObj.tasks.map((t, i) => (
                              <div key={i} className="max-w-full px-1.5 py-1 bg-[#fdf5e6] border-l-[3px] border-[#8B5A2B] rounded-r-md shadow-[1px_1px_0px_#D2B48C] text-[10px] font-bold text-[#5D4037] truncate shrink-0" title={t}>
                                {t}
                              </div>
                            ))}
                          </div>
                        ) : (
                          dayObj.currentMonth && <div className="calendar-no-task">无任务</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Progress & Chat Trigger */}
      <div className="flex flex-col gap-3 mb-4 shrink-0 transition-all">
        {activeView === 'daily' && (
          <div className="flex flex-col md:flex-row items-center justify-between py-8 px-10 gap-6 rounded-xl pixel-dialog"
            style={{ minHeight: '200px' }}>
            {/* Left label */}
            <div className="flex flex-col gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-xl text-pixel-text">☕ 咖啡豆进度</h4>
                <div className="w-5 h-5 rounded-full border-2 border-pixel-border flex items-center justify-center text-[10px] font-bold">?</div>
              </div>
              <p className="text-xs text-pixel-muted font-bold">每 30 分钟专注 = 1 颗咖啡豆</p>
              <p className="text-[10px] text-pixel-accent font-bold mt-1">
                每颗豆 +20⭐
              </p>
            </div>

            {/* Center: Beans — enlarged */}
            <div className="flex-1 flex items-center justify-center px-4 relative py-4 min-w-0">
              <div className={cn(
                "flex items-center justify-center gap-x-8 gap-y-6 relative z-10",
                currentTaskBeans > 8 ? "flex-wrap max-w-[600px]" : "flex-nowrap"
              )}>
                {Array.from({ length: currentTaskBeans }).map((_, i) => (
                  <div key={i} className="scale-[2] transition-transform">
                    <PixelBean
                      active={i < finalLitBeans}
                      hoverText={`已积累 ${Math.min(state.timeElapsed / 60, activeTask?.duration || 0).toFixed(1)} 分钟 (${finalLitBeans} 颗)`}
                    />
                  </div>
                ))}
                <div className="flex gap-1 ml-3">
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-pixel-accent"
                  >
                    <Star size={16} fill="currentColor" />
                  </motion.div>
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1], scale: [1.1, 0.8, 1.1] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                    className="text-pixel-accent"
                  >
                    <Star size={11} fill="currentColor" />
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Right: count */}
            <div className="text-right flex flex-col items-end gap-1 shrink-0">
              <div className="font-bold text-2xl font-pixel-num text-pixel-text">{finalLitBeans}</div>
              <div className="text-[10px] text-pixel-muted font-bold">颗已点亮</div>
            </div>
          </div>
        )}
      </div>


      {/* Add Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="pixel-modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={cn("pixel-modal-content", isShaking && "animate-shake")}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-5">
                <div>
                  <h3 className="text-[#5D4037] text-base font-bold">
                    {modalMode === 'add' ? '☕ 新增咖啡订单' : '编辑任务'}
                  </h3>
                  <p className="text-[9px] text-pixel-muted mt-1">咖啡品种将根据实际专注时长自动解锁</p>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-pixel-muted uppercase tracking-wider">任务内容</label>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="如：高等数学 · 章节练习"
                      className="pixel-input-modal"
                      value={modalForm.title}
                      onChange={(e) => setModalForm(prev => ({ ...prev, title: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && validateAndSaveTask()}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-pixel-muted uppercase tracking-wider">备注（可选）</label>
                    <input
                      type="text"
                      placeholder="如：完成10道基础题"
                      className="pixel-input-modal dashed"
                      value={modalForm.subtitle}
                      onChange={(e) => setModalForm(prev => ({ ...prev, subtitle: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && validateAndSaveTask()}
                    />
                  </div>

                  {/* Coffee preview */}
                  <div className="bg-[#f5f0e8] rounded-lg p-3 border border-[#d4c4a8] text-[10px] font-bold text-pixel-muted">
                    <div className="font-bold text-pixel-text mb-1">☕ 咖啡解锁预览</div>
                    <div className="flex flex-wrap gap-2">
                      {[['< 30分', '美式咖啡'], ['30–60分', '拿铁'], ['60–90分', '卡布奇诺'], ['90–120分', '抹茶拿铁'], ['120分+', '雪顶咖啡']].map(([time, name]) => (
                        <span key={time} className="px-2 py-0.5 bg-white border border-[#c8b49a] rounded">{time} → {name}</span>
                      ))}
                    </div>

                  </div>
                </div>

                {formError && (
                  <p className="text-pixel-red text-[10px] font-bold">{formError}</p>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="pixel-button-cancel text-xs"
                  >
                    取消
                  </button>
                  <button
                    onClick={validateAndSaveTask}
                    className="pixel-button-add text-xs"
                  >
                    {modalMode === 'add' ? '出单！' : '保存修改'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="pixel-modal-overlay" onClick={() => setIsDeleteConfirmOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="pixel-modal-content pixel-modal-delete"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2 text-center py-2">
                  <h3 className="text-[#8B4513] text-lg font-bold">确定删除任务吗？</h3>
                  <p className="text-[10px] text-pixel-muted font-bold leading-relaxed">
                    确定删除 <span className="text-pixel-accent">「{taskDeleting?.title}」</span> 任务吗？<br />
                    删除后进度将无法恢复，客人会流泪的哦~
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="pixel-button-cancel px-6"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="pixel-button-delete px-6"
                  >
                    删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Early End Confirmation Modals */}
      <AnimatePresence mode="wait">
        {earlyEndModalStep === 'confirm' && (
          <div key="confirm" className="pixel-modal-overlay" onClick={() => setEarlyEndModalStep(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pixel-modal-content text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[#5D4037] text-lg font-bold mb-4">结束确认</h3>
              <p className="text-pixel-text text-sm mb-6">确定要结束「{activeTask?.title}」吗？</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setEarlyEndModalStep(null)}
                  className="flex-1 py-3 border-2 border-pixel-border rounded-xl font-bold bg-[#FAF9F6] text-pixel-muted hover:bg-pixel-bg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmEarlyEnd}
                  className="flex-1 py-3 border-2 border-pixel-border rounded-xl font-bold bg-pixel-green text-white shadow-[2px_2px_0px_0px_#3d553d] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {earlyEndModalStep === 'status' && (
          <div key="status" className="pixel-modal-overlay" onClick={() => setEarlyEndModalStep(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pixel-modal-content text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[#5D4037] text-lg font-bold mb-4">任务完成状态确认</h3>
              <p className="text-pixel-text text-sm mb-6">请问是否已完成当前任务？</p>
              <div className="flex gap-4">
                <button
                  onClick={() => handleFinishStatus(false)}
                  className="flex-1 py-3 border-2 border-pixel-border rounded-xl font-bold bg-pixel-red text-white shadow-[2px_2px_0px_0px_#7d4438] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  否
                </button>
                <button
                  onClick={() => handleFinishStatus(true)}
                  className="flex-1 py-3 border-2 border-pixel-border rounded-xl font-bold bg-pixel-green text-white shadow-[2px_2px_0px_0px_#3d553d] active:shadow-none active:translate-x-[1px] active:translate-y-[1px] transition-all"
                >
                  是
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flyingStars.map(star => (
          <FlyingStar
            key={star.id}
            startX={star.startX}
            startY={star.startY}
            endX={star.endX}
            endY={star.endY}
            onComplete={() => setFlyingStars(prev => prev.filter(s => s.id !== star.id))}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
