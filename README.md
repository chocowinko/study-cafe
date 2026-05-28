<div align="center">
  # ☕ Study Café (学习咖啡馆) 🐈
  
  **一款融合像素 RPG 游戏美学、动态咖啡酿造机制与 AI 智能排班的沉浸式专注与生产力提升工具。**

  [![React](https://img.shields.io/badge/React-19.0-blue?logo=react&logoColor=white)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
  [![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Electron](https://img.shields.io/badge/Electron-35.7-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
  [![SQLite](https://img.shields.io/badge/SQLite-Built--in-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
  [![Gemini](https://img.shields.io/badge/Google--Gemini-Powered-8E75C2?logo=google-gemini&logoColor=white)](https://ai.google.dev/)
</div>

---

## 🚀 快速开始 (Getting Started)

### 前置条件
确保你本地安装了 **Node.js (建议使用 v22.11.0 或更高版本)** 以支持内置的 SQLite。

### 1. 克隆并安装依赖
```bash
# 进入项目目录
cd study-cafe-main

# 安装所有运行依赖
npm install
```

### 2. 配置环境变量
在项目根目录下，将 `.env.example` 复制一份并重命名为 `.env.local` 或者是直接在 `.env` 中修改：
```ini
# 配置你的 Google Gemini API Key
GEMINI_API_KEY="YOUR_ACTUAL_GEMINI_API_KEY"

# 应用运行的默认根路径 (可选)
APP_URL="http://localhost:3000"
```

### 3. 本地启动运行
Study Café 已经配置好了并发进程管理，一键命令即可同时启动前端、后端和文件监听服务：
```bash
npm run dev
```
* **前端开发服务器 (Vite)：** 运行在 [http://localhost:3000](http://localhost:3000)
* **后端 API 服务器 (Express)：** 运行在 [http://localhost:3001](http://localhost:3001)

---

## 🌟 核心特色 (Core Features)

### 1. ☕ 今日咖啡订单 (Interactive Today's Menu)
* **任务清单式管理：** 学习任务化身为等待制作的“咖啡订单”，每个专注时段都是一次咖啡萃取的过程。
* **手势拖拽重排 (Drag & Drop)：** 采用 Framer Motion (`motion/react`) 实现了丝滑的任务卡片拖拽物理效果，随时随地优雅地调整今日营运计划与任务优先级。

### 2. 🐈 猫咪咖啡师与动态萃取 (Dynamic Coffee Brewing & Cat Barista)
* **专注升级机制：** 酿造何种咖啡完全取决于你的**实际专注时长**！
  * ⏱️ `< 30 分钟` → **美式咖啡** ☕ (解锁：**灰猫店员** 🐱)
  * ⏱️ `30 - 60 分钟` → **拿铁** 🥛 (解锁：**三花猫店员** 🐱)
  * ⏱️ `60 - 90 分钟` → **卡布奇诺** 🍫 (解锁：**燕尾服猫店员** 🐱)
  * ⏱️ `90 - 120 分钟` → **抹茶拿铁** 🍵 (解锁：**虎斑猫店员** 🐱)
  * ⏱️ `120+ 分钟` → **雪顶咖啡** 🍨 (解锁：**寿司猫店员** 🐱)
* **沉浸式陪伴：** 专注过程中，当前咖啡卡片会动态根据你的专注状态变化（制作中、已暂停、Zzz.. 沉睡动画），并在专注完成后完美“出餐”。

### 3. 🌱 咖啡豆进度与 RPG 成长积分 (RPG Game HUD & Bean Progress)
* **咖啡豆量化：** 每专注 30 分钟即可点亮一颗精美的像素咖啡豆。
* **金币与星级结算：** 成功出餐后可赚取海量星星积分（`咖啡豆数 × 20⭐`），HUD 界面配备了精细的数字跳动动画与流星收集特效！
* **连续专注状态 (Streak)：** 记录你的连续登录与专注天数，火球特效随坚持天数递增！

### 4. 🧠 AI 店长排班规划 (AI Smart Calendar Planner)
* **Gemini 引擎强力驱动：** 告别死板的备忘录，向 AI 描述你的目标（如：“下周五前要看完3篇论文，月底要提交编程大作业”）。
* **快速与深度规划双模式：**
  * **快速规划 (Quick)：** 高效提取关键里程碑，一键分配到当前日历中。
  * **深度规划 (Deep)：** 深度拆解任务，智能评估学习负荷，为你科学排班。
* **日历系统完美整合：** 确认排班草案后一键“应用到日历”，无缝同步至数据库。

### 5. 🐾 桌面宠物陪伴 (Desktop Electron Pet)
* **真实化陪伴：** 一键召唤可爱的桌面 Electron 猫咪宠物，脱离浏览器窗口置顶于系统桌面，时刻陪伴、监视你专注，提供最解压的治愈陪伴。

---

## 🛠️ 技术栈 (Technology Stack)

### 前端 (Frontend)
* **核心框架：** React 19.0 (Hooks + StrictMode)
* **构建工具：** Vite 6.2 (超高速热更新与编译)
* **样式方案：** TailwindCSS v4.0 + 自定义 Vanilla CSS 像素风格 UI
* **动画系统：** Motion v12 (`motion/react`)
* **图标库：** Lucide React

### 后端与数据库 (Backend & Database)
* **运行时：** Node.js v22.11+
* **服务端框架：** Express
* **数据编译器：** `tsx` (TypeScript Execute)
* **数据库：** Node.js v22 原生内置极速 SQLite (`node:sqlite` 的 `DatabaseSync`)
* **AI 客户端：** `@google/genai` (SDK v1.29.0)

### 桌面端宠物 (Desktop Pet)
* **运行框架：** Electron v35.7

---

## 📂 项目结构 (Project Architecture)

```text
├── data/                       # 本地 SQLite 数据库文件存放路径 (自动生成)
├── pet/                        # 桌面 Electron 陪伴宠物相关代码
│   ├── electron-main.cjs       # Electron 入口与主进程 logic
│   ├── pet.html / .css / .js   # 桌面宠物的视图、样式与动态脚本
├── public/                     # 像素咖啡、猫咪和界面静态资源 (如 PNG)
├── server/                     # 后端服务端代码
│   ├── index.ts                # Express API 路由及服务入口
│   ├── store.ts                # 基于 native sqlite 的数据存储与事务封装
│   ├── planner.ts              # 封装 Gemini SDK 的任务智能规划逻辑
│   └── types.ts                # 后端类型定义
├── src/                        # 前端 React 源代码
│   ├── App.tsx                 # 单页核心 RPG 界面与全部交互逻辑
│   ├── index.css               # 像素 UI、玻璃拟态和卡片特效等核心样式表
│   ├── types.ts                # 前端状态与数据类型定义
│   └── lib/                    # 辅助实用工具
└── vite.config.ts              # Vite 构建与 API 反向代理配置
```

---

## 💾 数据库结构概览 (Database Schema)

项目使用原生的 SQLite3 数据库，包含三个主表，已在 `server/store.ts` 中实现多表关联（Foreign Keys ON）与级联删除：

* **`assistant_drafts` (AI排班草案表)：** 缓存生成的排班计划、输入提示词与当前确认状态。
* **`calendar_entries` (日历排班项表)：** 记录具体排班日期、关联的草案 ID 以及创建时间。
* **`tasks` (专注任务表)：** 存储今日专注任务，包含状态（`idle` | `active` | `completed`）、专注开始时间、实际专注累计时间（`actual_elapsed`）、咖啡种类、出餐状态（`is_served`）与排序值。

---

## 🤝 参与开发与反馈

1. 本项目采用 **AI Studio App** 标准架构进行管理，支持免云端配置的极速本地调试。
2. 欢迎在本地根据自己的喜好添加更多奇特口味的咖啡与猫咪品种！只需要在 `App.tsx` 的 `coffeeImages` 和 `catImages` 映射表里注册新资源即可。
3. **快乐专注，享受你的每一杯像素咖啡！☕✨**
