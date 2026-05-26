/**
 * Study Café 桌面伴宠 — 逻辑
 * 功能: 专注计时器 + 猫咪状态动画 + 随机鼓励语 + 咖啡升级
 */

// =====================
// CONFIGURATION
// =====================

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
  '你的咖啡还热着呢，继续加油！☕',
  '猫咪正在认真看你学习哦 🐱',
  '每一分钟的努力都有意义！✨',
  '专注的你最棒了，继续保持！💪',
  '学习是最好的投资，冲冲冲！🚀',
  '休息一下也没关系，劳逸结合哦 😊',
  '你已经比昨天更进步了！📈',
  '猫咪为你打 call，加油！🎉',
  '深呼吸，保持专注的状态 🌿',
  '知识就像咖啡，越品越香 ☕',
  '你的努力一定会有回报的！🌟',
  '今天也要做最好的自己！💯',
  '学累了就看看窗外，换换心情 🌈',
  '猫咪说：主人辛苦了！🐾',
  '坚持就是胜利，你快到目标了！🏆',
];

const IDLE_MESSAGES = [
  '准备好学习了吗？ 😸',
  '今天想学点什么呢？ 📚',
  '点击开始，我陪你一起哦！ 🐾',
  '来杯咖啡提提神吧！ ☕',
  '猫咪等你很久了喵～ 😺',
];

const MILESTONE_MESSAGES = {
  5:   '已经 5 分钟了！良好的开始 🌱',
  15:  '15 分钟了！进入状态了呢 💪',
  25:  '25 分钟！一个番茄钟完成 🍅',
  30:  '30 分钟！你的咖啡升级为拿铁了！☕',
  45:  '45 分钟！你太厉害了 🌟',
  60:  '一小时了！卡布奇诺来一杯 🎉',
  90:  '90 分钟！抹茶拿铁送给你 🍵',
  120: '两小时！雪顶咖啡！学习大师！🏆',
};

// =====================
// STATE
// =====================

let state = {
  isRunning: false,
  elapsedSeconds: 0,
  currentCoffeeTier: 0,
  catState: 'idle', // idle | working | done
};

let timerInterval = null;
let encouragementInterval = null;

// =====================
// DOM ELEMENTS
// =====================

const $ = (sel) => document.querySelector(sel);

const els = {
  container: $('#petContainer'),
  catImage: $('#catImage'),
  catWrapper: $('#catWrapper'),
  catStatus: $('#catStatus'),
  speechBubble: $('#speechBubble'),
  speechText: $('#speechText'),
  coffeeImage: $('#coffeeImage'),
  coffeeName: $('#coffeeName'),
  timerDisplay: $('#timerDisplay'),
  startBtn: $('#startBtn'),
  stopBtn: $('#stopBtn'),
  closeBtn: $('#closeBtn'),
  tickerText: $('#tickerText'),
};

// =====================
// INITIALIZATION
// =====================

function init() {
  // Set initial images
  updateCatImage('美式咖啡');
  updateCoffeeImage(0);

  // Set initial speech
  setRandomSpeech(IDLE_MESSAGES);

  // Set cat to idle state
  setCatState('idle');

  // Bind events
  els.startBtn.addEventListener('click', startFocus);
  els.stopBtn.addEventListener('click', stopFocus);
  els.closeBtn.addEventListener('click', () => {
    window.close();
  });

  // Rotate idle messages every 20 seconds when not working
  setInterval(() => {
    if (!state.isRunning) {
      setRandomSpeech(IDLE_MESSAGES);
    }
  }, 20000);
}

// =====================
// TIMER CONTROLS
// =====================

function startFocus() {
  state.isRunning = true;
  state.elapsedSeconds = 0;
  state.currentCoffeeTier = 0;

  // Update UI
  els.startBtn.classList.add('hidden');
  els.stopBtn.classList.remove('hidden');
  els.timerDisplay.classList.remove('paused');

  // Set working state
  setCatState('working');
  setSpeech('开始学习啦！一起加油！📖');
  setTicker('专注中... 猫咪会一直陪着你 🐱');

  // Start timer
  timerInterval = setInterval(() => {
    state.elapsedSeconds++;
    updateTimerDisplay();
    checkMilestones();
    checkCoffeeUpgrade();
  }, 1000);

  // Start encouragement rotation
  encouragementInterval = setInterval(() => {
    setRandomSpeech(ENCOURAGEMENTS);
  }, 30000);
}

function stopFocus() {
  state.isRunning = false;

  // Clear intervals
  clearInterval(timerInterval);
  clearInterval(encouragementInterval);
  timerInterval = null;
  encouragementInterval = null;

  // Update UI
  els.startBtn.classList.remove('hidden');
  els.stopBtn.classList.add('hidden');
  els.timerDisplay.classList.add('paused');

  const minutes = Math.floor(state.elapsedSeconds / 60);

  // Determine finish state
  if (minutes >= 25) {
    setCatState('done');
    setSpeech(`太棒了！专注了 ${minutes} 分钟！🎉`);
    setTicker(`🏆 本次专注 ${minutes} 分钟，获得一杯${COFFEE_TIERS[state.currentCoffeeTier].name}！`);
    spawnConfetti();
  } else if (minutes >= 5) {
    setCatState('idle');
    setSpeech(`${minutes} 分钟的努力！继续加油哦 💪`);
    setTicker(`本次专注 ${minutes} 分钟，下次挑战更长时间吧 🌟`);
  } else {
    setCatState('idle');
    setSpeech('休息一下也没关系哦 😊');
    setTicker('再来一次？猫咪永远支持你 🐾');
  }

  // Return to idle after celebration
  setTimeout(() => {
    if (!state.isRunning) {
      setCatState('idle');
    }
  }, 5000);
}

// =====================
// DISPLAY UPDATES
// =====================

function updateTimerDisplay() {
  const mins = Math.floor(state.elapsedSeconds / 60);
  const secs = state.elapsedSeconds % 60;
  els.timerDisplay.textContent =
    `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateCatImage(coffeeName) {
  const src = CAT_IMAGES[coffeeName] || CAT_IMAGES['美式咖啡'];
  els.catImage.src = src;
}

function updateCoffeeImage(tierIndex) {
  const tier = COFFEE_TIERS[tierIndex] || COFFEE_TIERS[0];
  els.coffeeImage.src = tier.image;
  els.coffeeName.textContent = tier.name;
}

function setCatState(newState) {
  state.catState = newState;
  const wrapper = els.catWrapper;
  wrapper.parentElement.className = `cat-section cat-${newState}`;

  // Update status indicator
  const statusDot = els.catStatus.querySelector('.status-dot');
  const statusText = els.catStatus.querySelector('.status-text');

  statusDot.className = `status-dot ${newState}`;

  const statusLabels = {
    idle: '休息中',
    working: '专注中',
    done: '完成！',
  };
  statusText.textContent = statusLabels[newState] || '休息中';
}

function setSpeech(text) {
  els.speechText.textContent = text;
  // Re-trigger animation
  els.speechBubble.style.animation = 'none';
  void els.speechBubble.offsetHeight; // force reflow
  els.speechBubble.style.animation = 'bubbleFadeIn 0.4s ease-out';
}

function setRandomSpeech(pool) {
  const text = pool[Math.floor(Math.random() * pool.length)];
  setSpeech(text);
}

function setTicker(text) {
  els.tickerText.textContent = text;
  // Re-trigger animation
  els.tickerText.style.animation = 'none';
  void els.tickerText.offsetHeight;
  els.tickerText.style.animation = 'tickerFade 0.5s ease-out';
}

// =====================
// MILESTONES & UPGRADES
// =====================

function checkMilestones() {
  const minutes = Math.floor(state.elapsedSeconds / 60);
  // Only trigger at exact minute boundaries
  if (state.elapsedSeconds % 60 !== 0) return;

  const message = MILESTONE_MESSAGES[minutes];
  if (message) {
    setTicker(message);
    // Flash speech bubble for milestones
    setSpeech(message);
  }
}

function checkCoffeeUpgrade() {
  const minutes = state.elapsedSeconds / 60;
  let newTier = 0;

  for (let i = COFFEE_TIERS.length - 1; i >= 0; i--) {
    if (minutes >= COFFEE_TIERS[i].minMinutes) {
      newTier = i;
      break;
    }
  }

  if (newTier !== state.currentCoffeeTier) {
    state.currentCoffeeTier = newTier;
    const tier = COFFEE_TIERS[newTier];

    // Update coffee
    updateCoffeeImage(newTier);

    // Flash animation
    els.coffeeImage.classList.add('coffee-upgrade');
    setTimeout(() => {
      els.coffeeImage.classList.remove('coffee-upgrade');
    }, 600);

    // Update cat to match new coffee
    updateCatImage(tier.name);

    // Spawn mini confetti
    spawnConfetti(6);
  }
}

// =====================
// CONFETTI PARTICLES
// =====================

function spawnConfetti(count = 12) {
  const container = els.container;
  const colors = ['#e8a840', '#6aaa6a', '#c0614a', '#8c6a4a', '#a8d5a2', '#f0c8a0'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    particle.style.left = `${120 + Math.random() * 40}px`;
    particle.style.top = `${80 + Math.random() * 30}px`;
    particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    particle.style.setProperty('--dy', `${-40 - Math.random() * 80}px`);
    particle.style.width = `${4 + Math.random() * 4}px`;
    particle.style.height = particle.style.width;
    container.appendChild(particle);

    setTimeout(() => {
      particle.remove();
    }, 1000);
  }
}

// =====================
// START
// =====================

document.addEventListener('DOMContentLoaded', init);
