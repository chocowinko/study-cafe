import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import type {
  AssistantDraftRecord,
  AssistantDraftStatus,
  CalendarMonthEntry,
  CalendarPlanOperation,
  TaskRecord,
  TaskStatus,
  TodayTasksResponse,
} from './types';

const databaseFile = path.resolve(process.cwd(), 'data', 'study-cafe.sqlite');
mkdirSync(path.dirname(databaseFile), {recursive: true});

const db = new DatabaseSync(databaseFile);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS assistant_drafts (
    draft_id TEXT PRIMARY KEY,
    input_text TEXT NOT NULL,
    summary TEXT NOT NULL,
    operations_json TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calendar_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_date TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    source_draft_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (source_draft_id) REFERENCES assistant_drafts(draft_id)
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    calendar_entry_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'idle',
    coffee_type TEXT,
    actual_elapsed INTEGER NOT NULL DEFAULT 0,
    is_served INTEGER NOT NULL DEFAULT 0,
    focus_started_at TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (calendar_entry_id) REFERENCES calendar_entries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_assistant_drafts_status_created_at
    ON assistant_drafts (status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_calendar_entries_year_month
    ON calendar_entries (year, month);

  CREATE INDEX IF NOT EXISTS idx_tasks_calendar_entry_sort_order
    ON tasks (calendar_entry_id, sort_order);
`);

const ensureTaskColumns = () => {
  const columnRows = db.prepare(`
    PRAGMA table_info(tasks)
  `).all() as Array<{name: string}>;
  const columns = new Set(columnRows.map((row) => row.name));

  const migrations = [
    !columns.has('subtitle') && `ALTER TABLE tasks ADD COLUMN subtitle TEXT NOT NULL DEFAULT ''`,
    !columns.has('status') && `ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'idle'`,
    !columns.has('coffee_type') && `ALTER TABLE tasks ADD COLUMN coffee_type TEXT`,
    !columns.has('actual_elapsed') && `ALTER TABLE tasks ADD COLUMN actual_elapsed INTEGER NOT NULL DEFAULT 0`,
    !columns.has('is_served') && `ALTER TABLE tasks ADD COLUMN is_served INTEGER NOT NULL DEFAULT 0`,
    !columns.has('focus_started_at') && `ALTER TABLE tasks ADD COLUMN focus_started_at TEXT`,
    !columns.has('sort_order') && `ALTER TABLE tasks ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`,
  ].filter(Boolean) as string[];

  migrations.forEach((sql) => db.exec(sql));
};

ensureTaskColumns();

const nowIso = () => new Date().toISOString();

const isValidDateString = (value?: string) => {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
};

const getLocalTodayString = (dateInput?: string) => {
  if (isValidDateString(dateInput)) {
    return dateInput!;
  }

  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
};

const normalizeTasks = (tasks: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];

  tasks.forEach((task) => {
    const normalized = task.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const parseYearMonth = (date: string) => {
  const [year, month] = date.split('-').map(Number);
  return {year, month};
};

const mapDraftRow = (row: any): AssistantDraftRecord => {
  return {
    draftId: row.draft_id,
    input: row.input_text,
    summary: row.summary,
    operations: JSON.parse(row.operations_json) as CalendarPlanOperation[],
    status: row.status as AssistantDraftStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const mapTaskRow = (row: any): TaskRecord => {
  return {
    id: String(row.id),
    date: row.date,
    title: row.title,
    subtitle: row.subtitle ?? '',
    status: row.status as TaskStatus,
    actualElapsed: Number(row.actual_elapsed ?? 0),
    coffeeType: row.coffee_type ?? undefined,
    isServed: Boolean(row.is_served),
    focusStartedAt: row.focus_started_at ?? null,
    sortOrder: Number(row.sort_order ?? 0),
  };
};

const withTransaction = <T>(work: () => T) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const getCalendarEntryByDate = (date: string) => {
  return db.prepare(`
    SELECT id, entry_date, year, month, source_draft_id
    FROM calendar_entries
    WHERE entry_date = ?
  `).get(date) as {id: number; entry_date: string; year: number; month: number; source_draft_id: string | null} | undefined;
};

const upsertCalendarEntry = (date: string, sourceDraftId?: string | null) => {
  const now = nowIso();
  const {year, month} = parseYearMonth(date);
  const existing = getCalendarEntryByDate(date);

  if (existing) {
    if (sourceDraftId === undefined) {
      db.prepare(`
        UPDATE calendar_entries
        SET year = ?, month = ?, updated_at = ?
        WHERE id = ?
      `).run(year, month, now, existing.id);
    } else {
      db.prepare(`
        UPDATE calendar_entries
        SET year = ?, month = ?, source_draft_id = ?, updated_at = ?
        WHERE id = ?
      `).run(year, month, sourceDraftId, now, existing.id);
    }

    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO calendar_entries (entry_date, year, month, source_draft_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(date, year, month, sourceDraftId ?? null, now, now);

  return Number(result.lastInsertRowid);
};

const getTaskRowsByCalendarEntryId = (calendarEntryId: number) => {
  return db.prepare(`
    SELECT
      t.id,
      ce.entry_date AS date,
      t.title,
      t.subtitle,
      t.status,
      t.actual_elapsed,
      t.coffee_type,
      t.is_served,
      t.focus_started_at,
      t.sort_order
    FROM tasks t
    JOIN calendar_entries ce ON ce.id = t.calendar_entry_id
    WHERE t.calendar_entry_id = ?
    ORDER BY t.sort_order ASC, t.id ASC
  `).all(calendarEntryId) as any[];
};

const getTaskRowById = (taskId: string | number) => {
  return db.prepare(`
    SELECT
      t.id,
      ce.id AS calendar_entry_id,
      ce.entry_date AS date,
      t.title,
      t.subtitle,
      t.status,
      t.actual_elapsed,
      t.coffee_type,
      t.is_served,
      t.focus_started_at,
      t.sort_order
    FROM tasks t
    JOIN calendar_entries ce ON ce.id = t.calendar_entry_id
    WHERE t.id = ?
  `).get(taskId) as any | undefined;
};

const reindexCalendarEntryTasks = (calendarEntryId: number) => {
  const rows = db.prepare(`
    SELECT id
    FROM tasks
    WHERE calendar_entry_id = ?
    ORDER BY sort_order ASC, id ASC
  `).all(calendarEntryId) as Array<{id: number}>;

  const updateSortOrder = db.prepare(`
    UPDATE tasks
    SET sort_order = ?, updated_at = ?
    WHERE id = ?
  `);
  const now = nowIso();

  rows.forEach((row, index) => {
    updateSortOrder.run(index, now, row.id);
  });
};

const cleanupCalendarEntryIfEmpty = (calendarEntryId: number) => {
  const countRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM tasks
    WHERE calendar_entry_id = ?
  `).get(calendarEntryId) as {count: number};

  if (countRow.count === 0) {
    db.prepare(`
      DELETE FROM calendar_entries
      WHERE id = ?
    `).run(calendarEntryId);
    return;
  }

  reindexCalendarEntryTasks(calendarEntryId);
};

const syncCalendarEntryTaskTitles = (calendarEntryId: number, titles: string[]) => {
  const normalizedTitles = normalizeTasks(titles);
  const existingRows = getTaskRowsByCalendarEntryId(calendarEntryId);
  const byTitle = new Map(existingRows.map((row) => [row.title, row]));
  const keepIds = new Set<number>();
  const now = nowIso();

  const updateTask = db.prepare(`
    UPDATE tasks
    SET sort_order = ?, updated_at = ?
    WHERE id = ?
  `);

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      calendar_entry_id,
      title,
      subtitle,
      status,
      coffee_type,
      actual_elapsed,
      is_served,
      focus_started_at,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, '', 'idle', NULL, 0, 0, NULL, ?, ?, ?)
  `);

  normalizedTitles.forEach((title, index) => {
    const existing = byTitle.get(title);
    if (existing) {
      updateTask.run(index, now, existing.id);
      keepIds.add(existing.id);
      return;
    }

    const result = insertTask.run(calendarEntryId, title, index, now, now);
    keepIds.add(Number(result.lastInsertRowid));
  });

  existingRows.forEach((row) => {
    if (!keepIds.has(row.id)) {
      db.prepare(`
        DELETE FROM tasks
        WHERE id = ?
      `).run(row.id);
    }
  });
};

const getCalendarEntryTaskTitles = (date: string) => {
  const row = getCalendarEntryByDate(date);
  if (!row) {
    return [];
  }

  return getTaskRowsByCalendarEntryId(row.id).map((task) => task.title);
};

const ensureSeedCalendarEntries = () => {
  const existing = db.prepare(`
    SELECT COUNT(*) AS count
    FROM calendar_entries
  `).get() as {count: number};

  if (existing.count > 0) {
    return;
  }

  const initialEntries: CalendarMonthEntry[] = [
    {date: '2026-04-10', tasks: ['复习期末考试大纲']},
    {date: '2026-04-15', tasks: ['启动编程大作业', '精读 3 篇论文']},
    {date: '2026-04-20', tasks: ['准备英语口语考试']},
  ];

  withTransaction(() => {
    initialEntries.forEach((entry) => {
      const calendarEntryId = upsertCalendarEntry(entry.date, null);
      syncCalendarEntryTaskTitles(calendarEntryId, entry.tasks);
    });
  });
};

ensureSeedCalendarEntries();

export const createAssistantDraft = ({
  input,
  summary,
  operations,
}: {
  input: string;
  summary: string;
  operations: CalendarPlanOperation[];
}) => {
  const draftId = randomUUID();
  const now = nowIso();

  db.prepare(`
    INSERT INTO assistant_drafts (draft_id, input_text, summary, operations_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    draftId,
    input,
    summary,
    JSON.stringify(operations),
    'pending',
    now,
    now,
  );

  return getAssistantDraft(draftId);
};

export const getAssistantDraft = (draftId: string) => {
  const row = db.prepare(`
    SELECT draft_id, input_text, summary, operations_json, status, created_at, updated_at
    FROM assistant_drafts
    WHERE draft_id = ?
  `).get(draftId);

  return row ? mapDraftRow(row) : null;
};

export const listAssistantDrafts = (status?: AssistantDraftStatus) => {
  const rows = status
    ? db.prepare(`
        SELECT draft_id, input_text, summary, operations_json, status, created_at, updated_at
        FROM assistant_drafts
        WHERE status = ?
        ORDER BY created_at DESC
      `).all(status)
    : db.prepare(`
        SELECT draft_id, input_text, summary, operations_json, status, created_at, updated_at
        FROM assistant_drafts
        ORDER BY created_at DESC
      `).all();

  return (rows as any[]).map(mapDraftRow);
};

export const dismissAssistantDraft = (draftId: string) => {
  const existing = getAssistantDraft(draftId);
  if (!existing) {
    return null;
  }

  if (existing.status === 'confirmed') {
    const error = new Error('Draft already confirmed');
    error.name = 'draft_already_confirmed';
    throw error;
  }

  if (existing.status === 'dismissed') {
    return existing;
  }

  db.prepare(`
    UPDATE assistant_drafts
    SET status = 'dismissed', updated_at = ?
    WHERE draft_id = ?
  `).run(nowIso(), draftId);

  return getAssistantDraft(draftId);
};

export const confirmAssistantDraft = (draftId: string) => {
  const draft = getAssistantDraft(draftId);
  if (!draft) {
    return null;
  }

  if (draft.status === 'dismissed') {
    const error = new Error('Draft already dismissed');
    error.name = 'draft_already_dismissed';
    throw error;
  }

  if (draft.status === 'confirmed') {
    return {
      draft,
      updatedDates: draft.operations.map((operation) => operation.date),
    };
  }

  const updatedDates = withTransaction(() => {
    draft.operations.forEach((operation) => {
      const existingTitles = getCalendarEntryTaskTitles(operation.date);
      const nextTitles = operation.type === 'append'
        ? normalizeTasks([...existingTitles, ...operation.tasks])
        : normalizeTasks(operation.tasks);

      const calendarEntryId = upsertCalendarEntry(operation.date, draft.draftId);
      syncCalendarEntryTaskTitles(calendarEntryId, nextTitles);
    });

    db.prepare(`
      UPDATE assistant_drafts
      SET status = 'confirmed', updated_at = ?
      WHERE draft_id = ?
    `).run(nowIso(), draftId);

    return draft.operations.map((operation) => operation.date);
  });

  return {
    draft: getAssistantDraft(draftId)!,
    updatedDates,
  };
};

export const getCalendarMonth = (year: number, month: number) => {
  const rows = db.prepare(`
    SELECT ce.entry_date AS date, t.title AS task_title
    FROM calendar_entries ce
    LEFT JOIN tasks t ON t.calendar_entry_id = ce.id
    WHERE ce.year = ? AND ce.month = ?
    ORDER BY ce.entry_date ASC, t.sort_order ASC, t.id ASC
  `).all(year, month) as Array<{date: string; task_title: string | null}>;

  const entries = new Map<string, string[]>();
  rows.forEach((row) => {
    if (!entries.has(row.date)) {
      entries.set(row.date, []);
    }

    if (row.task_title) {
      entries.get(row.date)!.push(row.task_title);
    }
  });

  return Array.from(entries.entries()).map(([date, tasks]) => ({date, tasks}));
};

export const getTodayTasks = (dateInput?: string): TodayTasksResponse => {
  const date = getLocalTodayString(dateInput);
  const entry = getCalendarEntryByDate(date);

  if (!entry) {
    return {
      date,
      tasks: [],
    };
  }

  return {
    date,
    tasks: getTaskRowsByCalendarEntryId(entry.id).map(mapTaskRow),
  };
};

export const createTask = ({
  date,
  title,
  subtitle,
}: {
  date?: string;
  title: string;
  subtitle?: string;
}) => {
  const resolvedDate = getLocalTodayString(date);
  const calendarEntryId = upsertCalendarEntry(resolvedDate);
  const now = nowIso();
  const sortRow = db.prepare(`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
    FROM tasks
    WHERE calendar_entry_id = ?
  `).get(calendarEntryId) as {next_sort_order: number};

  const result = db.prepare(`
    INSERT INTO tasks (
      calendar_entry_id,
      title,
      subtitle,
      status,
      coffee_type,
      actual_elapsed,
      is_served,
      focus_started_at,
      sort_order,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, 'idle', NULL, 0, 0, NULL, ?, ?, ?)
  `).run(calendarEntryId, title.trim(), (subtitle ?? '').trim(), sortRow.next_sort_order, now, now);

  return getTaskById(String(result.lastInsertRowid));
};

export const getTaskById = (taskId: string) => {
  const row = getTaskRowById(taskId);
  return row ? mapTaskRow(row) : null;
};

export const updateTask = (
  taskId: string,
  updates: Partial<{
    title: string;
    subtitle: string;
    status: TaskStatus;
    actualElapsed: number;
    coffeeType: string | null;
    isServed: boolean;
    sortOrder: number;
  }>,
) => {
  const existing = getTaskRowById(taskId);
  if (!existing) {
    return null;
  }

  const assignments: string[] = [];
  const params: Array<string | number | null> = [];

  if (typeof updates.title === 'string') {
    assignments.push('title = ?');
    params.push(updates.title.trim());
  }

  if (typeof updates.subtitle === 'string') {
    assignments.push('subtitle = ?');
    params.push(updates.subtitle.trim());
  }

  if (typeof updates.status === 'string') {
    assignments.push('status = ?');
    params.push(updates.status);
  }

  if (typeof updates.actualElapsed === 'number' && Number.isFinite(updates.actualElapsed)) {
    assignments.push('actual_elapsed = ?');
    params.push(Math.max(0, Math.floor(updates.actualElapsed)));
  }

  if (updates.coffeeType !== undefined) {
    assignments.push('coffee_type = ?');
    params.push(updates.coffeeType);
  }

  if (typeof updates.isServed === 'boolean') {
    assignments.push('is_served = ?');
    params.push(updates.isServed ? 1 : 0);
  }

  if (typeof updates.sortOrder === 'number' && Number.isInteger(updates.sortOrder)) {
    assignments.push('sort_order = ?');
    params.push(updates.sortOrder);
  }

  if (assignments.length === 0) {
    return mapTaskRow(existing);
  }

  params.push(nowIso(), existing.id);
  db.prepare(`
    UPDATE tasks
    SET ${assignments.join(', ')}, updated_at = ?
    WHERE id = ?
  `).run(...params);

  if (typeof updates.sortOrder === 'number') {
    reindexCalendarEntryTasks(existing.calendar_entry_id);
  }

  return getTaskById(String(existing.id));
};

/**
 * 覆写某一天的任务列表（日历页「店长排班」使用）
 * 行为：删除该日已有的所有 tasks，重新插入传入的 titles。
 * 保留其他日期 + 备注完全不变。
 */
export const setLongTermTasks = (date: string, titles: string[]) => {
  const now = nowIso();
  const calendarEntryId = upsertCalendarEntry(date);

  withTransaction(() => {
    // 先清除该 calendar_entry 下所有 tasks
    db.prepare(`DELETE FROM tasks WHERE calendar_entry_id = ?`).run(calendarEntryId);

    // 重新插入
    titles.forEach((title, idx) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      db.prepare(`
        INSERT INTO tasks (
          calendar_entry_id, title, subtitle, status, coffee_type,
          actual_elapsed, is_served, focus_started_at, sort_order,
          created_at, updated_at
        )
        VALUES (?, ?, '', 'idle', NULL, 0, 0, NULL, ?, ?, ?)
      `).run(calendarEntryId, idx, now, now);
    });
  });

  return {
    date,
    tasks: titles.filter(t => t.trim()),
  };
};

export const deleteTask = (taskId: string) => {
  const existing = getTaskRowById(taskId);
  if (!existing) {
    return null;
  }

  withTransaction(() => {
    db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
    `).run(existing.id);

    cleanupCalendarEntryIfEmpty(existing.calendar_entry_id);
  });

  return {
    id: String(existing.id),
    date: existing.date,
  };
};

export const focusStartTask = (taskId: string) => {
  const existing = getTaskRowById(taskId);
  if (!existing) {
    return null;
  }

  withTransaction(() => {
    const now = nowIso();
    db.prepare(`
      UPDATE tasks
      SET
        focus_started_at = NULL,
        status = CASE WHEN status = 'active' THEN 'idle' ELSE status END,
        updated_at = ?
      WHERE calendar_entry_id = ? AND id != ? AND focus_started_at IS NOT NULL
    `).run(now, existing.calendar_entry_id, existing.id);

    db.prepare(`
      UPDATE tasks
      SET status = 'active', focus_started_at = ?, updated_at = ?
      WHERE id = ?
    `).run(now, now, existing.id);
  });

  return getTaskById(String(existing.id));
};

export const focusFinishTask = (
  taskId: string,
  payload: Partial<{
    actualElapsed: number;
    status: TaskStatus;
    coffeeType: string | null;
    isServed: boolean;
  }>,
) => {
  const existing = getTaskRowById(taskId);
  if (!existing) {
    return null;
  }

  const nextElapsed = typeof payload.actualElapsed === 'number' && Number.isFinite(payload.actualElapsed)
    ? Math.max(0, Math.floor(payload.actualElapsed))
    : Number(existing.actual_elapsed ?? 0);
  const nextStatus = payload.status ?? (existing.status === 'active' ? 'idle' : existing.status);

  db.prepare(`
    UPDATE tasks
    SET
      actual_elapsed = ?,
      status = ?,
      coffee_type = ?,
      is_served = ?,
      focus_started_at = NULL,
      updated_at = ?
    WHERE id = ?
  `).run(
    nextElapsed,
    nextStatus,
    payload.coffeeType !== undefined ? payload.coffeeType : existing.coffee_type ?? null,
    payload.isServed !== undefined ? (payload.isServed ? 1 : 0) : Number(existing.is_served ?? 0),
    nowIso(),
    existing.id,
  );

  return getTaskById(String(existing.id));
};

export const getDatabaseFilePath = () => databaseFile;
