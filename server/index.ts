import 'dotenv/config'; // 加载 .env 文件中的环境变量
import express from 'express';
import { spawn, ChildProcess } from 'child_process';
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
  setLongTermTasks,
  updateTask,
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

// 覆写某一天的「店长排班」长期任务列表
app.put('/api/calendar/day', (req, res) => {
  const date = typeof req.body?.date === 'string' ? req.body.date : '';
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks : null;

  // 验证 date 格式 YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ ok: false, message: 'date must be YYYY-MM-DD' });
    return;
  }
  if (!tasks || !tasks.every((t: unknown) => typeof t === 'string')) {
    res.status(400).json({ ok: false, message: 'tasks must be an array of strings' });
    return;
  }

  const result = setLongTermTasks(date, tasks);
  res.json({ ok: true, ...result });
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

// ⚠️ 云服务器没有桌面环境，spawn Electron 没意义。
// 桌宠启动/关闭由前端 vite 插件 local-pet 在本机处理。
// 下面保留 stub 仅为防止老客户端调用报 404，返回带警告的 ok。
app.post('/api/pet/summon', (_req, res) => {
  res.json({
    ok: true,
    source: 'cloud-stub',
    note: 'Pet runs locally via vite plugin; cloud backend cannot spawn desktop apps.',
  });
});

app.post('/api/pet/dismiss', (_req, res) => {
  res.json({ ok: true, source: 'cloud-stub' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on http://0.0.0.0:${port}`);
});
