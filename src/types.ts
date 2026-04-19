export interface Task {
  id: string;
  title: string;
  subtitle: string;
  // duration and coffeeType are now computed from actual elapsed time
  coffeeType?: string;       // set at completion/serve time based on actual elapsed
  actualElapsed?: number;    // seconds actually spent on this task
  status: 'idle' | 'active' | 'completed' | 'interrupted';
  isServed?: boolean;
}

export interface LongTermTask {
  date: string; // YYYY-MM-DD
  tasks: string[];
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
