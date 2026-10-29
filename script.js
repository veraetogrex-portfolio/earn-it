// Earn It — github.com/veraetogrex-portfolio · zero dependencies
// The Ship button runs from the pointer until the form is filled.
// Each filled field makes it slower to flee; when both are done it comes home.

const modal  = document.querySelector('#release');
const fields = [...modal.querySelectorAll('.ei-field')];
const title  = modal.querySelector('.ei-title');
const hint   = modal.querySelector('.ei-hint');
const hintTx = modal.querySelector('.ei-hint-text');
const dots   = [...modal.querySelectorAll('.ei-dots i')];
const track  = modal.querySelector('.ei-track');
const ship   = modal.querySelector('.ei-ship');
const label  = modal.querySelector('.ei-label b');
const trail  = modal.querySelector('.ei-trail');
const flood  = document.querySelector('.ei-flood');
const ring   = document.querySelector('.ei-ring');
const sky    = document.querySelector('.ei-confetti');

const MAX = 198;     // furthest the button may go from the middle of its track, px
const GAP = 188;     // distance it keeps from the pointer while both fields are empty, px
const HINTS = ['2 fields to go', "1 to go — it's slowing down", "All set — it's yours"];
const COLORS = ['#7c6cff', '#3fe0d0', '#ff6fb5', '#a69bff'];

let x = 0, v = 0, target = 0;          // button offset, velocity, where the spring pulls it
let pointer = null, keyboard = false, state = 'idle';
const filled = new Set();

const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const animate = (ms, fn) => new Promise(done => {
  const t0 = performance.now();
  const step = now => { const p = Math.min(1, (now - t0) / ms); fn(p); p < 1 ? requestAnimationFrame(step) : done(); };
  requestAnimationFrame(step);
});

// 1 · a field counts as filled once the user pauses typing
fields.forEach(f => f.addEventListener('input', () => {
  clearTimeout(f.timer);
  f.parentElement.classList.remove('is-err');
  if (!f.value.trim()) { filled.delete(f); return update(); }
  f.timer = setTimeout(() => { filled.add(f); update(); }, 240);
}));

function update() {
  const n = filled.size;
  fields.forEach(f => f.parentElement.classList.toggle('is-done', filled.has(f)));
  dots.forEach((d, i) => d.classList.toggle('is-on', i < n));
  if (state !== 'idle') return;
  hintTx.textContent = HINTS[n];
  hint.classList.toggle('is-ready', n === 2);
  ship.classList.toggle('is-ready', n === 2);
  label.textContent = n === 2 ? 'Ship it' : 'Ship';
  if (n === 2) target = 0;                       // earned: it comes home
}

// 2 · how hard it runs: full with an empty form, half with one field, not at all with two
const strength = () => [1, .5, 0][filled.size];

// 3 · flee: keep GAP × strength away from the pointer, slip past it when cornered
function flee() {
  const k = strength();
  if (!pointer || !k || state !== 'idle' || keyboard) return;
  const r = track.getBoundingClientRect(), scale = r.width / track.offsetWidth;
  const px = (pointer.x - r.left - r.width / 2) / scale;   // pointer, relative to the track centre
  const py = (pointer.y - r.top - r.height / 2) / scale;
  const gap = GAP * k, dx = px - x;
  if (Math.abs(py) > 120 || Math.abs(dx) >= gap) return;
  let dir = dx > 0 ? -1 : 1;
  if (Math.abs(dx) < 4) dir = px > 0 ? -1 : 1;
  let to = px - dir * gap;                       // run away from the pointer…
  if (Math.abs(to) > MAX) {                      // …or dodge past it if the wall is behind
    const past = px + dir * gap;
    to = Math.abs(past) <= MAX ? past : clamp(to, -MAX, MAX);
  }
  target = to;
}
addEventListener('pointermove', e => {
  pointer = { x: e.clientX, y: e.clientY };
  keyboard = false;
});

// 4 · a spring pulls the button to its target; it leans and squashes with speed
let last = performance.now();
requestAnimationFrame(function frame(now) {
  const dt = Math.min(.032, (now - last) / 1000); last = now;
  flee();
  v += (300 * (target - x) - 19 * v) * dt;
  x += v * dt;
  const lean = clamp(v * .02, -9, 9), squash = 1 - Math.min(.08, Math.abs(v) * .00012);
  ship.style.transform = `translateX(${x}px) rotate(${lean}deg) scale(${2 - squash}, ${squash})`;
  trail.style.transform = `translateX(${x - v * .05}px)`;
  trail.style.opacity = Math.min(1, Math.abs(v) / 900);
  requestAnimationFrame(frame);
});

ship.addEventListener('click', () => {
  if (state === 'shipped') return reset();
  if (state !== 'idle') return;
  fields.every(f => f.value.trim()) ? shipIt() : reject();
});

// 5 · earned: a short spinner, then "Shipped"
async function shipIt() {
  fields.forEach(f => filled.add(f)); update();
  state = 'busy';
  ship.classList.add('is-busy');
  hint.classList.remove('is-ready'); hintTx.textContent = 'Deploying to production…';
  await wait(560);
  state = 'shipped';
  ship.classList.replace('is-busy', 'is-shipped');
  modal.classList.add('is-live');
  title.innerHTML = '<em>v1.0</em> is live.';
  hint.classList.add('is-ok'); hintTx.textContent = `${fields[0].value.trim()} is live`;
  const b = ship.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
  celebrate(cx, cy);
  confetti(cx, cy, 110);
}

// 6 · light: a wash and a shock ring flare from the button over the whole page
function celebrate(cx, cy) {
  document.body.style.setProperty('--x', cx + 'px');
  document.body.style.setProperty('--y', cy + 'px');
  animate(1200, t => flood.style.opacity = t < .14 ? t / .14 : (1 - t) / .86);
  animate(900, t => {
    ring.style.opacity = .75 * (1 - t);
    ring.style.scale = .4 + 9 * (1 - (1 - t) ** 3);
  });
}

// 7 · confetti: squares fly up from the button, gravity and drag bring them down
function confetti(cx, cy, n) {
  const bits = Array.from({ length: n }, (_, i) => {
    const el = document.createElement('i'), size = 7 + Math.random() * 9;
    const angle = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.35;   // a wide fan, upward
    const speed = 600 + Math.random() * 900;
    el.style.width = el.style.height = size + 'px';
    if (i % 5 === 0) el.style.border = `2px solid ${COLORS[i % 3]}`;
    else el.style.background = COLORS[i % 4];
    sky.append(el);
    return { el, size, x: cx + (Math.random() - .5) * 160, y: cy, r: Math.random() * 360,
             vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, vr: (Math.random() - .5) * 900,
             life: .9 + Math.random() * .5 };
  });
  let prev = 0;
  animate(1400, p => {
    const t = p * 1.4, dt = t - prev; prev = t;
    for (const b of bits) {
      b.vy += 1400 * dt; b.vx *= 1 - 1.6 * dt; b.vy *= 1 - .9 * dt;
      b.x += b.vx * dt; b.y += b.vy * dt; b.r += b.vr * dt;
      b.el.style.opacity = t < .08 ? t / .08 : Math.max(0, 1 - (t - .08) / (b.life - .08));
      b.el.style.transform = `translate(${b.x - b.size / 2}px, ${b.y - b.size / 2}px) rotate(${b.r}deg)`;
    }
  }).then(() => bits.forEach(b => b.el.remove()));
}

function reset() {
  state = 'idle'; filled.clear();
  fields.forEach(f => f.value = '');
  ship.classList.remove('is-shipped', 'is-ready');
  modal.classList.remove('is-live');
  hint.classList.remove('is-ok');
  title.innerHTML = 'Ready to ship <em>v1.0</em>?';
  update();
  fields[0].focus();
}

// ── keyboard and the error path ─────────────────────────
ship.addEventListener('focus', () => { if (ship.matches(':focus-visible')) { keyboard = true; target = 0; } });
ship.addEventListener('blur', () => { keyboard = false; });
fields.forEach((f, i) => f.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); (fields[i + 1] || ship).focus(); }
}));

async function reject() {
  // never disabled: a keyboard press (or a lucky click) gets a clear answer
  fields.filter(f => !f.value.trim()).forEach(f => {
    const g = f.parentElement;
    g.classList.remove('is-shake'); void g.offsetWidth; g.classList.add('is-err', 'is-shake');
  });
  hint.classList.add('is-bad');
  hintTx.textContent = fields.every(f => !f.value.trim()) ? 'Name it and log it first' : 'One more field first';
  await wait(1400);
  hint.classList.remove('is-bad');
  fields.forEach(f => f.parentElement.classList.remove('is-err', 'is-shake'));
  update();
}
