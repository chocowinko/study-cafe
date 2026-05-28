/**
 * Study Café 桌面伴宠 — 极简逻辑
 * 从后端 API 同步专注计时状态，不含自己的控制按钮
 */

// =====================
// CONFIG
// =====================

const API_BASE = 'http://127.0.0.1:3001';
const POLL_INTERVAL = 2000; // 2 秒轮询一次（更快响应切换）

const COFFEE_TIERS = [
  { name: '美式咖啡', image: '../public/americano.png', minMinutes: 0 },
  { name: '拿铁',     image: '../public/latte.png',     minMinutes: 30 },
  { name: '卡布奇诺', image: '../public/cappuccino.png', minMinutes: 60 },
  { name: '抹茶拿铁', image: '../public/matcha_latte.png', minMinutes: 90 },
  { name: '雪顶咖啡', image: '../public/float_coffee.png', minMinutes: 120 },
];

const CAT_IMAGES = {
  '美式咖啡': '../public/cat_gray.png',
  '拿铁':     '../public/cat_calico_cake.png',
  '卡布奇诺': '../public/cat_tuxedo.png',
  '抹茶拿铁': '../public/cat_whisk.png',
  '雪顶咖啡': '../public/cat_sushi.png',
};

const ENCOURAGEMENTS = [
  '每一次专注都在为未来铺路 ✨',
  '知识是最好的咖啡因 ☕',
  '今天的努力，明天的底气 💪',
  '不积跬步，无以至千里 🏔️',
  '脑细胞在燃烧，神经元在连接 🧠',
  '你的咖啡还热着呢～',
  '趁热打铁，正当时！🔥',
  '这杯咖啡在见证你的成长',
  '喝完这杯，又是一条好汉！',
  '喵～主人好认真，值得一条小鱼干 🐟',
  '你学多久，我就陪你多久 🐾',
  '猫咪说：别摸鱼了！🐱',
  '冲冲冲！目标就在前方 🚀',
  '累了就深呼吸，然后继续 🌿',
  '你已经比上一秒更厉害了！',
  '保持节奏，你是最强的 🏆',
  '再坚持一下，奶茶在向你招手 🧋',
  '奖励自己一块小饼干 🍪',
  '胜利的茶歇就在不远处 🍵',
  '努力会有回报的 🌟',
];

const IDLE_MESSAGES = [
  '等你开始学习哦 😸',
  '猫咪在等你喵～ 🐾',
  '准备好了吗？📚',
  '来杯咖啡吧 ☕',
];

// =====================
// STATE
// =====================

let state = {
  isFocusing: false,
  currentFocusTaskId: null,   // 追踪当前专注的任务 ID
  elapsedSeconds: 0,
  currentCoffeeTier: 0,
  lastCoffeeTier: -1,
  encourageIndex: 0,
  idleIndex: 0,
};

let pollTimer = null;
let localTickTimer = null;
let encourageTimer = null;

// =====================
// DOM
// =====================

const $ = (sel) => document.querySelector(sel);
const els = {
  container: $('#petContainer'),
  catImage: $('#catImage'),
  catArea: $('#catArea'),
  speechBubble: $('#speechBubble'),
  speechText: $('#speechText'),
  coffeeImage: $('#coffeeImage'),
  timerDisplay: $('#timerDisplay'),
};

// =====================
// HELPERS
// =====================

function getLocalDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCoffeeTierIndex(seconds) {
  const minutes = seconds / 60;
  for (let i = COFFEE_TIERS.length - 1; i >= 0; i--) {
    if (minutes >= COFFEE_TIERS[i].minMinutes) return i;
  }
  return 0;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// =====================
// DISPLAY
// =====================

function updateCoffee(tierIndex) {
  const tier = COFFEE_TIERS[tierIndex] || COFFEE_TIERS[0];
  els.coffeeImage.src = tier.image;
  els.catImage.src = CAT_IMAGES[tier.name] || CAT_IMAGES['美式咖啡'];

  // Flash on upgrade
  if (state.lastCoffeeTier >= 0 && tierIndex > state.lastCoffeeTier) {
    els.coffeeImage.classList.add('coffee-upgrade');
    setTimeout(() => els.coffeeImage.classList.remove('coffee-upgrade'), 500);
    spawnConfetti(6);
    setSpeech(`升级为${tier.name}了！🎉`);
  }
  state.lastCoffeeTier = tierIndex;
}

function setSpeech(text) {
  els.speechText.textContent = text;
  els.speechBubble.style.animation = 'none';
  void els.speechBubble.offsetHeight;
  els.speechBubble.style.animation = 'bubbleIn 0.4s ease-out';
}

function setRandomSpeech(pool) {
  setSpeech(pool[Math.floor(Math.random() * pool.length)]);
}

function spawnConfetti(count = 8) {
  const colors = ['#e8a840', '#6aaa6a', '#c0614a', '#8c6a4a', '#a8d5a2'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = `${80 + Math.random() * 40}px`;
    p.style.top = `${60 + Math.random() * 20}px`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 100}px`);
    p.style.setProperty('--dy', `${-30 - Math.random() * 60}px`);
    els.container.appendChild(p);
    setTimeout(() => p.remove(), 800);
  }
}

function nextEncouragement() {
  state.encourageIndex = (state.encourageIndex + 1) % ENCOURAGEMENTS.length;
  setSpeech(ENCOURAGEMENTS[state.encourageIndex]);
}

function nextIdleMessage() {
  state.idleIndex = (state.idleIndex + 1) % IDLE_MESSAGES.length;
  setSpeech(IDLE_MESSAGES[state.idleIndex]);
}

// =====================
// SYNC FROM BACKEND
// =====================

async function pollBackend() {
  try {
    const date = getLocalDateStr();
    const res = await fetch(`${API_BASE}/api/tasks/today?date=${date}`);
    if (!res.ok) return;

    const data = await res.json();
    const tasks = data.tasks || [];

    // 找出当前正在专注的任务（有 focusStartedAt，且未完成）
    const focusedTask = tasks.find(t => t.focusStartedAt && t.status !== 'completed');

    if (focusedTask) {
      // 用 focusStartedAt 精确计算经过时间，与前端对齐，无漂移
      const baseElapsed = focusedTask.actualElapsed || 0;
      const startedAt = new Date(focusedTask.focusStartedAt).getTime();
      const liveElapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const totalElapsed = baseElapsed + liveElapsed;

      const taskChanged = state.currentFocusTaskId !== focusedTask.id;
      const wasNotFocusing = !state.isFocusing;

      if (wasNotFocusing || taskChanged) {
        // 刚开始专注，或者切换到了不同的任务 → 重新启动本地计时器
        state.isFocusing = true;
        state.currentFocusTaskId = focusedTask.id;
        state.lastCoffeeTier = -1;
        startLocalTick(totalElapsed, startedAt, baseElapsed);
        if (wasNotFocusing) {
          startEncouragement();
        } else if (taskChanged) {
          // 切换任务时更新气泡提示
          const shortTitle = focusedTask.title.length > 10
            ? focusedTask.title.slice(0, 10) + '…'
            : focusedTask.title;
          setSpeech(`切换任务：${shortTitle} 📝`);
        }
      }

      // 实时更新咖啡等级（本地 tick 也会检测，但这里做即时响应）
      const tier = getCoffeeTierIndex(totalElapsed);
      if (tier !== state.currentCoffeeTier) {
        state.currentCoffeeTier = tier;
        updateCoffee(tier);
      }
    } else {
      // 没有任务在专注中（可能是暂停、完成、或切换到空任务）
      if (state.isFocusing) {
        // 刚从专注切换到暂停/停止
        state.isFocusing = false;
        state.currentFocusTaskId = null;
        stopLocalTick();
        stopEncouragement();

        // 如果有暂停的任务，显示它的已暂停时长
        const pausedTask = tasks.find(t => (t.actualElapsed || 0) > 0 && t.status !== 'completed');
        if (pausedTask) {
          els.timerDisplay.textContent = formatTime(pausedTask.actualElapsed || 0);

          // 根据暂停任务更新咖啡图标
          const tier = getCoffeeTierIndex(pausedTask.actualElapsed || 0);
          if (tier !== state.currentCoffeeTier) {
            state.currentCoffeeTier = tier;
            updateCoffee(tier);
          }
          setSpeech('已暂停 ☕ 随时继续！');
        } else {
          els.timerDisplay.textContent = '00:00';
          nextIdleMessage();
        }
      } else {
        // 本来就没在专注，检查是否有选中任务切换了（有 actualElapsed 但没在专注）
        const pausedTask = tasks.find(t => (t.actualElapsed || 0) > 0 && t.status !== 'completed');
        if (pausedTask) {
          // 更新显示暂停任务的时间（应对主应用切换选中任务的情况）
          els.timerDisplay.textContent = formatTime(pausedTask.actualElapsed || 0);
          const tier = getCoffeeTierIndex(pausedTask.actualElapsed || 0);
          if (tier !== state.currentCoffeeTier) {
            state.currentCoffeeTier = tier;
            // 不触发升级动画，只更新图片
            const tierData = COFFEE_TIERS[tier] || COFFEE_TIERS[0];
            els.coffeeImage.src = tierData.image;
            els.catImage.src = CAT_IMAGES[tierData.name] || CAT_IMAGES['美式咖啡'];
            state.currentCoffeeTier = tier;
            state.lastCoffeeTier = tier;
          }
        }
      }
    }
  } catch (e) {
    // Backend not reachable, that's OK
  }
}

// =====================
// LOCAL TICK (smooth second-by-second updates between polls)
// =====================

function startLocalTick(initialElapsed, focusStartedAt, baseElapsed) {
  stopLocalTick();
  state.elapsedSeconds = initialElapsed;
  els.timerDisplay.textContent = formatTime(initialElapsed);

  localTickTimer = setInterval(() => {
    // 与前端一致：始终从 focusStartedAt 计算，不累加，避免漂移
    const liveElapsed = Math.max(0, Math.floor((Date.now() - focusStartedAt) / 1000));
    state.elapsedSeconds = baseElapsed + liveElapsed;
    els.timerDisplay.textContent = formatTime(state.elapsedSeconds);

    // Check coffee upgrade locally too
    const tier = getCoffeeTierIndex(state.elapsedSeconds);
    if (tier !== state.currentCoffeeTier) {
      state.currentCoffeeTier = tier;
      updateCoffee(tier);
    }
  }, 1000);
}

function stopLocalTick() {
  if (localTickTimer) {
    clearInterval(localTickTimer);
    localTickTimer = null;
  }
}

// =====================
// ENCOURAGEMENT
// =====================

function startEncouragement() {
  stopEncouragement();
  setSpeech('开始学习啦！📖');
  state.encourageIndex = 0;
  encourageTimer = setInterval(() => {
    nextEncouragement();
  }, 25000);
}

function stopEncouragement() {
  if (encourageTimer) {
    clearInterval(encourageTimer);
    encourageTimer = null;
  }
}

// =====================
// INIT
// =====================

function init() {
  // Set initial state
  updateCoffee(0);
  nextIdleMessage();

  // Start polling backend
  pollBackend();
  pollTimer = setInterval(pollBackend, POLL_INTERVAL);

  // Rotate idle messages
  setInterval(() => {
    if (!state.isFocusing) {
      nextIdleMessage();
    }
  }, 15000);

  // =====================
  // DRAG is handled natively by CSS -webkit-app-region: drag
  // (zero latency, OS-level window dragging)
  // Double-click anywhere to cycle messages
  // =====================
  document.addEventListener('dblclick', () => {
    if (state.isFocusing) {
      nextEncouragement();
    } else {
      nextIdleMessage();
    }
  });
}




document.addEventListener('DOMContentLoaded', init);
