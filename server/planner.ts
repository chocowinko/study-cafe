/**
 * planner.ts
 * 负责调用 OpenClaw AI，将用户的自然语言输入转化为日历排班操作。
 */

import type { CalendarPlanOperation, CalendarPlanRequestBody } from './types';

// ── 从环境变量读取 OpenClaw 配置 ──────────────────────────────────────────────
const OPEN_CLAW_URL =
  process.env.OPEN_CLAW_URL ?? 'http://112.74.48.242:14396/v1/chat/completions';
const OPEN_CLAW_API_KEY =
  process.env.OPEN_CLAW_API_KEY ?? 'a6a4eb9b1deec140337a3aad9659fb5c';

// ── 返回值类型 ─────────────────────────────────────────────────────────────────
export interface CalendarPlanDraft {
  summary: string;
  operations: CalendarPlanOperation[];
}

// ── 发给 AI 的系统提示词 ───────────────────────────────────────────────────────
function buildSystemPrompt(today: string, year: number, month: number): string {
  return `你是一个学习规划专家。
今天的日期是 ${today}，当前查看的日历是 ${year} 年 ${month} 月。

任务：
    1. 拆解步骤。
    2. 分配日期（从今天开始，不要分到过去）。
    3. 必须严格输出 JSON 格式，禁止输出任何解释文字。

## 输出格式（只输出 JSON，不要有任何额外文字）

{
  "summary": "一句话概括这次排班的内容",
  "operations": [
    {
      "type": "set" | "append",
      "date": "YYYY-MM-DD",
      "tasks": ["任务1", "任务2"],
      "note": "可选备注"
    }
  ]
}

## 字段说明
- type: "set" 表示覆盖当天全部任务；"append" 表示在原有基础上追加任务。
  默认使用 "append"，除非用户明确说"替换"、"只安排"、"覆盖"等词语。
- date: 严格使用 YYYY-MM-DD 格式，根据上下文推算具体日期。
- tasks: 将用户描述拆分为独立的任务条目，每条任务简洁明了（10 字以内最佳）。
- note: 可选，用于补充说明，如"建议上午完成"等。

## 注意事项
- 如果用户说"明天"、"后天"、"下周一"等相对日期，请基于今天（${today}）计算。
- 如果日期不在当前月份（${year}-${month}），仍然正常输出。
- 如果用户输入模糊或无法解析，返回 operations 为空数组，summary 中说明原因。
- 任务名称要简洁，适合展示在日历卡片上。
- 只输出 JSON，不要有 \`\`\`json 等 markdown 标记。`;
}

// ── 主函数：调用 OpenClaw 并解析结果 ─────────────────────────────────────────
export async function buildOperationsFromInput(
  body: CalendarPlanRequestBody,
): Promise<CalendarPlanDraft> {
  const input = body.input?.trim() ?? '';
  const today = body.today ?? new Date().toISOString().slice(0, 10);
  const year = body.currentYear ?? new Date().getFullYear();
  const month = body.currentMonth ?? new Date().getMonth() + 1;

  // 如果没有输入，直接返回空结果
  if (!input) {
    return { summary: '未收到任何输入', operations: [] };
  }

  const systemPrompt = buildSystemPrompt(today, year, month);

  // ── 调用 OpenClaw API ───────────────────────────────────────────────────────
  let rawText = '';
  try {
    const response = await fetch(OPEN_CLAW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPEN_CLAW_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openclaw', // OpenClaw 镜像的模型名称，如有不同请修改
        max_tokens: 1000,
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[planner] OpenClaw API error:', response.status, errText);
      throw new Error(`AI 服务返回错误（状态码 ${response.status}）`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (data.error) {
      throw new Error(data.error.message ?? 'AI 服务返回了错误');
    }

    rawText = data.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (err) {
    console.error('[planner] 调用 OpenClaw 失败:', err);
    // 返回一个友好的降级结果，而不是让整个请求崩溃
    return {
      summary: `AI 服务暂时不可用：${err instanceof Error ? err.message : String(err)}`,
      operations: [],
    };
  }

  // ── 解析 AI 返回的 JSON ────────────────────────────────────────────────────
  try {
    // 去掉可能出现的 markdown 代码块标记
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      summary?: string;
      operations?: CalendarPlanOperation[];
    };

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : '已生成排班草案';

    const operations = Array.isArray(parsed.operations)
      ? parsed.operations.filter(
          (op) =>
            op &&
            typeof op.date === 'string' &&
            Array.isArray(op.tasks) &&
            (op.type === 'set' || op.type === 'append'),
        )
      : [];

    return { summary, operations };
  } catch (parseErr) {
    console.error('[planner] 解析 AI 返回内容失败，原始内容:', rawText);
    return {
      summary: 'AI 返回内容解析失败，请重试',
      operations: [],
    };
  }
}
