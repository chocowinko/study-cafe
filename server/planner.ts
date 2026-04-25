// study-cafe-main/server/planner.ts
import type { CalendarPlanOperation, CalendarPlanRequestBody } from './types';

const OPEN_CLAW_URL = "http://112.74.48.242:14396/v1/chat/completions"; 
const OPEN_CLAW_API_KEY = "a6a4eb9b1deec140337a3aad9659fb5c"; 

// 重点修改这里：根据报错要求，必须改为 "openclaw"
const MODEL_NAME = "openclaw"; 

export async function buildOperationsFromInput(request: CalendarPlanRequestBody) {
  const { input, today } = request;

  const prompt = `
    你是一个学习规划专家。今天日期是 ${today}。
    用户输入： "${input}"
    
    任务：
    1. 拆解步骤。
    2. 分配日期（从今天开始，不要分到过去）。
    3. 必须严格输出 JSON 格式，禁止输出任何解释文字。
    
    JSON 结构示例：
    {
      "summary": "总结文字",
      "operations": [
        { "type": "append", "date": "YYYY-MM-DD", "tasks": ["步骤1", "步骤2"] }
      ]
    }
  `;

  try {
    const response = await fetch(OPEN_CLAW_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPEN_CLAW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_NAME, // 这里现在会发送 "openclaw"
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 这里能帮你抓到更详细的报错
      throw new Error(`服务器返回错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;

    // 依然保留这个强力过滤，防止 AI 话多
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("AI 返回内容中找不到 JSON 数据");
    }
    
    const result = JSON.parse(jsonMatch[0]);

    return {
      summary: result.summary || "学习计划已生成",
      operations: (result.operations || []) as CalendarPlanOperation[]
    };
  } catch (error) {
    console.error("AI 规划出错:", error);
    return {
      summary: "AI 规划出错，请查看控制台日志",
      operations: []
    };
  }
}