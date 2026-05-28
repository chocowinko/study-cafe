import 'dotenv/config'; // 加载 .env 文件中的环境变量
import express from 'express';
import { spawn, exec, ChildProcess } from 'child_process';
import {buildOperationsFromInput} from './planner';
import {
  confirmAssistantDraft,
  createTask,
  createAssistantDraft,
  deleteTask,
  dismissAssistantDraft,
  getCalendarMonth,
  getDatabaseFilePath,
  getTodayTasks,
  focusFinishTask,
  focusStartTask,
  listAssistantDrafts,
  updateTask,
  updateCalendarDayTasks,
} from './store';
import type {AssistantDraftStatus, CalendarPlanRequestBody, TaskStatus} from './types';

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    message: 'backend is running',
    database: getDatabaseFilePath(),
  });
});

app.post('/api/assistant/calendar-plan', async (req, res) => {
  const requestBody = req.body as CalendarPlanRequestBody;
  try {
    const draft = await buildOperationsFromInput(requestBody);
    const savedDraft = createAssistantDraft({
      input: requestBody.input ?? '',
      summary: draft.summary,
      operations: draft.operations,
    });
    res.json(savedDraft);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI 服务调用失败';
    res.status(500).json({ok: false, message});
  }
});

app.get('/api/assistant/drafts', (req, res) => {
  const status = req.query.status;
  const validStatuses: AssistantDraftStatus[] = ['pending', 'confirmed', 'dismissed'];
  const normalizedStatus = typeof status === 'string' && validStatuses.includes(status as AssistantDraftStatus)
    ? status as AssistantDraftStatus
    : undefined;

  res.json({
    drafts: listAssistantDrafts(normalizedStatus),
  });
});

app.post('/api/assistant/confirm-draft', (req, res) => {
  const draftId = typeof req.body?.draftId === 'string' ? req.body.draftId : '';
  if (!draftId) {
    res.status(400).json({ok: false, message: 'draftId is required'});
    return;
  }

  try {
    const result = confirmAssistantDraft(draftId);
    if (!result) {
      res.status(404).json({ok: false, message: 'Draft not found'});
      return;
    }

    res.json({
      ok: true,
      draftId,
      status: result.draft.status,
      updatedDates: result.updatedDates,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm draft';
    res.status(409).json({ok: false, message});
  }
});

app.post('/api/assistant/dismiss-draft', (req, res) => {
  const draftId = typeof req.body?.draftId === 'string' ? req.body.draftId : '';
  if (!draftId) {
    res.status(400).json({ok: false, message: 'draftId is required'});
    return;
  }

  try {
    const result = dismissAssistantDraft(draftId);
    if (!result) {
      res.status(404).json({ok: false, message: 'Draft not found'});
      return;
    }

    res.json({
      ok: true,
      draftId,
      status: result.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dismiss draft';
    res.status(409).json({ok: false, message});
  }
});

app.get('/api/calendar/month', (req, res) => {
  const year = Number(req.query.year);
  const month = Number(req.query.month);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    res.status(400).json({ok: false, message: 'Valid year and month are required'});
    return;
  }

  res.json({
    year,
    month,
    entries: getCalendarMonth(year, month),
  });
});

app.put('/api/calendar/day', (req, res) => {
  const date = typeof req.body?.date === 'string' ? req.body.date : '';
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks.filter((t: any) => typeof t === 'string') : [];

  if (!date) {
    res.status(400).json({ok: false, message: 'date is required'});
    return;
  }

  try {
    const result = updateCalendarDayTasks(date, tasks);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update calendar day tasks';
    res.status(500).json({ok: false, message});
  }
});

app.get('/api/tasks/today', (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  res.json(getTodayTasks(date));
});

app.post('/api/tasks', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const subtitle = typeof req.body?.subtitle === 'string' ? req.body.subtitle : '';
  const date = typeof req.body?.date === 'string' ? req.body.date : undefined;

  if (!title) {
    res.status(400).json({ok: false, message: 'title is required'});
    return;
  }

  const task = createTask({date, title, subtitle});
  res.status(201).json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const taskId = req.params.id;
  const updates: Partial<{
    title: string;
    subtitle: string;
    status: TaskStatus;
    actualElapsed: number;
    coffeeType: string | null;
    isServed: boolean;
    sortOrder: number;
  }> = {};

  if (typeof req.body?.title === 'string') {
    updates.title = req.body.title;
  }

  if (typeof req.body?.subtitle === 'string') {
    updates.subtitle = req.body.subtitle;
  }

  if (typeof req.body?.status === 'string') {
    updates.status = req.body.status;
  }

  if (typeof req.body?.actualElapsed === 'number') {
    updates.actualElapsed = req.body.actualElapsed;
  }

  if (req.body?.coffeeType === null || typeof req.body?.coffeeType === 'string') {
    updates.coffeeType = req.body.coffeeType;
  }

  if (typeof req.body?.isServed === 'boolean') {
    updates.isServed = req.body.isServed;
  }

  if (typeof req.body?.sortOrder === 'number') {
    updates.sortOrder = req.body.sortOrder;
  }

  const task = updateTask(taskId, updates);
  if (!task) {
    res.status(404).json({ok: false, message: 'Task not found'});
    return;
  }

  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  const task = deleteTask(req.params.id);
  if (!task) {
    res.status(404).json({ok: false, message: 'Task not found'});
    return;
  }

  res.json({
    ok: true,
    id: task.id,
    date: task.date,
  });
});

app.post('/api/tasks/:id/focus-start', (req, res) => {
  const task = focusStartTask(req.params.id);
  if (!task) {
    res.status(404).json({ok: false, message: 'Task not found'});
    return;
  }

  res.json(task);
});

app.post('/api/tasks/:id/focus-finish', (req, res) => {
  const task = focusFinishTask(req.params.id, {
    actualElapsed: typeof req.body?.actualElapsed === 'number' ? req.body.actualElapsed : undefined,
    status: typeof req.body?.status === 'string' ? req.body.status : undefined,
    coffeeType: req.body?.coffeeType === null || typeof req.body?.coffeeType === 'string' ? req.body.coffeeType : undefined,
    isServed: typeof req.body?.isServed === 'boolean' ? req.body.isServed : undefined,
  });

  if (!task) {
    res.status(404).json({ok: false, message: 'Task not found'});
    return;
  }

  res.json(task);
});

let petProcess: ChildProcess | null = null;

const electronPath = process.platform === 'win32'
  ? './node_modules/electron/dist/electron.exe'
  : './node_modules/.bin/electron';

/** Kill any running pet Electron process (including orphans from backend restarts) */
function killPetProcess(): Promise<void> {
  return new Promise((resolve) => {
    if (petProcess && !petProcess.killed) {
      petProcess.once('exit', () => {
        petProcess = null;
        resolve();
      });
      petProcess.kill();
    } else {
      petProcess = null;
      // Also try to kill orphaned electron pet processes (e.g. after backend hot-reload)
      exec('pkill -f "electron pet/electron-main.cjs"', () => resolve());
    }
  });
}

app.post('/api/pet/summon', async (_req, res) => {
  // Always kill existing process first to prevent duplicates
  await killPetProcess();
  petProcess = spawn(electronPath, ['pet/electron-main.cjs'], { stdio: 'ignore' });
  petProcess.on('exit', () => { petProcess = null; });
  res.json({ ok: true });
});

app.post('/api/pet/dismiss', async (_req, res) => {
  await killPetProcess();
  res.json({ ok: true });
});

app.get('/api/pet/status', (_req, res) => {
  res.json({ running: !!(petProcess && !petProcess.killed) });
});

app.listen(port, '0.0.0.0', async () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
  try {
    await killPetProcess();
  } catch (error) {
    console.error('Failed to clean up orphaned pet processes on startup:', error);
  }
});

