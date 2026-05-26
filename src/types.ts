export interface Task {
  id: string;
  date?: string;
  title: string;
  subtitle: string;
  coffeeType?: string;
  actualElapsed?: number;
  focusStartedAt?: string | null;
  sortOrder?: number;
  status: 'idle' | 'active' | 'completed' | 'interrupted';
  isServed?: boolean;
}

export interface LongTermTask {
  date: string; // YYYY-MM-DD
  tasks: string[];
}

export type CalendarPlanOperationType = 'set' | 'append';
export type AssistantDraftStatus = 'pending' | 'confirmed' | 'dismissed';

export interface CalendarPlanOperation {
  type: CalendarPlanOperationType;
  date: string; // YYYY-MM-DD
  tasks: string[];
  note?: string;
}

export interface CalendarPlanDraft {
  draftId: string;
  input: string;
  summary: string;
  operations: CalendarPlanOperation[];
  status: AssistantDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarMonthResponse {
  year: number;
  month: number;
  entries: LongTermTask[];
}

export interface TodayTasksResponse {
  date: string;
  tasks: Task[];
}

export interface AppState {
  tasks: Task[];
  longTermTasks: LongTermTask[];
  activeTaskId: string | null;
  beans: number;
  maxBeans: number;
  streak: number;
  points: number;
  isTimerRunning: boolean;
  timeElapsed: number; // in seconds
}
