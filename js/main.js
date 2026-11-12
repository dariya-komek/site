const isKz = document.documentElement.lang === 'kk';

function copyText(id, btn) {
  const text = document.getElementById(id).innerText.replace(/\s/g, '');
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerText;
    btn.innerText = isKz ? 'Көшірілді!' : 'Скопировано!';
    setTimeout(() => btn.innerText = orig, 2000);
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// Кнопки сумм: просим у сервера ссылку Kaspi с уже введённой суммой.
// Если сервер не ответил, открываем обычную ссылку Kaspi — сумму человек введёт сам.
const DONATE_API = 'https://dariyakomek.kz/api/donate';
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));

function donateClientId() {
  try {
    let id = sessionStorage.getItem('donate-client');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('donate-client', id);
    }
    return id;
  } catch (e) {
    return '';
  }
}

async function requestKaspiLink(amount) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const resp = await fetch(DONATE_API, {
      method: 'POST',
      body: JSON.stringify({ amount, client: donateClientId() }),
      signal: ctrl.signal,
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return /^https:\/\/pay\.kaspi\.kz\//.test(data.url) ? data.url : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

document.querySelectorAll('.donate-amount[data-amount]').forEach(btn => {
  btn.addEventListener('click', async e => {
    e.preventDefault();
    if (btn.classList.contains('loading')) return;
    // На компьютере вкладку открываем сразу, иначе браузер заблокирует её как всплывающее окно
    const tab = isMobile ? null : window.open('', '_blank');
    if (tab) tab.opener = null;
    btn.classList.add('loading');
    const url = (await requestKaspiLink(Number(btn.dataset.amount))) || btn.href;
    btn.classList.remove('loading');
    if (tab) tab.location.href = url;
    else window.location.href = url;
  });
});

function animateFill(fill, pct) {
  fill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.width = Math.min(100, pct).toFixed(1) + '%';
  }));
}

// Блок «Сбор средств»: data-collected (оплачено), data-raised (собрано из долга), data-goal (бюджет)
function updateProgress() {
  const wrap = document.querySelector('.progress-wrap[data-collected]');
  if (!wrap) return;
  const collected = parseFloat(wrap.dataset.collected);
  const goal = parseFloat(wrap.dataset.goal);
  const raised = parseFloat(wrap.dataset.raised || 0);
  document.getElementById('prog-collected').textContent = collected + ' млн ₸';
  document.getElementById('prog-goal').textContent = goal + ' млн ₸';
  document.getElementById('prog-remaining').textContent = (goal - collected - raised).toFixed(0) + ' млн ₸';
  animateFill(document.getElementById('prog-fill'), ((collected + raised) / goal) * 100);
}

// Полоски с data-value / data-total (главный экран)
function updateBars() {
  document.querySelectorAll('.progress-fill[data-value]').forEach(fill => {
    animateFill(fill, (parseFloat(fill.dataset.value) / parseFloat(fill.dataset.total)) * 100);
  });
}

function openLightbox(img) {
  const overlay = document.getElementById('lightbox');
  document.getElementById('lightbox-img').src = img.src;
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

document.addEventListener('DOMContentLoaded', function() {
  updateProgress();
  updateBars();
  document.getElementById('lightbox').addEventListener('click', function() {
    this.style.display = 'none';
    document.body.style.overflow = '';
  });
});
