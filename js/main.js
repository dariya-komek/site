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

function track(event, params, options) {
  if (window.fbq) fbq('track', event, params, options);
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
    return /^https:\/\/pay\.kaspi\.kz\//.test(data.url) ? data : null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Ожидание оплаты: Kaspi сам на сайт не возвращает, поэтому спрашиваем сервер,
// и после оплаты ведём на страницу «Спасибо». Ссылку помним в localStorage,
// чтобы продолжить проверку, когда человек вернётся из приложения Kaspi.
const PENDING_KEY = 'donate-pending';
const PENDING_TTL = 20 * 60 * 1000;
let pollTimer = null;

function getPending() {
  try {
    const p = JSON.parse(localStorage.getItem(PENDING_KEY) || 'null');
    return p && Date.now() - p.t < PENDING_TTL ? p : null;
  } catch (e) {
    return null;
  }
}

function setPending(p) {
  try {
    if (p) localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PENDING_KEY);
  } catch (e) {}
}

async function checkPending() {
  const p = getPending();
  if (!p) return stopPolling();
  try {
    const resp = await fetch(DONATE_API + '/status?id=' + encodeURIComponent(p.id), { cache: 'no-store' });
    const data = await resp.json();
    if (data.status === 'paid') {
      setPending(null);
      stopPolling();
      window.location.href = 'thanks.html?id=' + encodeURIComponent(p.id);
    } else if (data.status !== 'wait') {
      setPending(null);
      stopPolling();
    }
  } catch (e) {}
}

function startPolling() {
  if (pollTimer || !getPending()) return;
  checkPending();
  pollTimer = setInterval(checkPending, 2500);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

window.addEventListener('pageshow', startPolling);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startPolling();
});

document.querySelectorAll('.donate-amount[data-amount]').forEach(btn => {
  btn.addEventListener('click', async e => {
    e.preventDefault();
    if (btn.classList.contains('loading')) return;
    const amount = Number(btn.dataset.amount);
    track('InitiateCheckout', { value: amount, currency: 'KZT' });
    // На компьютере вкладку открываем сразу, иначе браузер заблокирует её как всплывающее окно
    const tab = isMobile ? null : window.open('', '_blank');
    if (tab) tab.opener = null;
    btn.classList.add('loading');
    const link = await requestKaspiLink(amount);
    btn.classList.remove('loading');
    if (link) {
      setPending({ id: link.id, amount, t: Date.now() });
      startPolling();
    }
    const url = link ? link.url : btn.href;
    if (tab) tab.location.href = url;
    else window.location.href = url;
  });
});

document.querySelectorAll('.donate-other').forEach(a => {
  a.addEventListener('click', () => track('InitiateCheckout', { currency: 'KZT' }));
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
  document.getElementById('prog-remaining').textContent = (Math.round((goal - collected - raised) * 10) / 10).toLocaleString('ru-RU') + ' млн ₸';
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
