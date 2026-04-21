export type CalendarPlanOperationType = 'set' | 'append';
export type AssistantDraftStatus = 'pending' | 'confirmed' | 'dismissed';

export interface CalendarPlanOperation {
  type: CalendarPlanOperationType;
  date: string;
  tasks: string[];
  note?: string;
}

export interface CalendarPlanRequestBody {
  currentMonth?: number;
  currentYear?: number;
  input?: string;
  today?: string;
}

export interface AssistantDraftRecord {
  draftId: string;
  input: string;
  summary: string;
  operations: CalendarPlanOperation[];
  status: AssistantDraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarMonthEntry {
  date: string;
  tasks: string[];
}

export type TaskStatus = 'idle' | 'active' | 'completed' | 'interrupted';

export interface TaskRecord {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  status: TaskStatus;
  actualElapsed: number;
  coffeeType?: string;
  isServed: boolean;
  focusStartedAt?: string | null;
  sortOrder: number;
}

export interface TodayTasksResponse {
  date: string;
  tasks: TaskRecord[];
}
