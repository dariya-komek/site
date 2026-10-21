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
