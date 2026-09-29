const $ = id => document.getElementById(id);
let tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
const save = () => localStorage.setItem('tasks', JSON.stringify(tasks));
const toast = msg => { const t = $('toast'); t.textContent = msg; t.className = 'show'; setTimeout(() => t.className = '', 2500); };

// Notificación (vía Service Worker para que funcione en móvil)
async function notify(body) {
  if (Notification.permission !== 'granted') return toast(body);
  const reg = await navigator.serviceWorker.ready;
  reg.showNotification('Estudia+', { body, icon: 'icons/icon-192.png' });
}

// Insignia en el ícono con el número de pendientes
function updateBadge(n) {
  if ('setAppBadge' in navigator) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

function render() {
  $('taskList').innerHTML = tasks.map((t, i) => `
    <li class="${t.done ? 'done' : ''}">
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggle(${i})">
      <span>${t.title.replace(/</g, '&lt;')}${t.due ? `<em>Recordatorio: ${new Date(t.due).toLocaleString('es-MX')}</em>` : ''}</span>
      <button onclick="del(${i})" aria-label="Eliminar">✕</button>
    </li>`).join('') || '<li><span>¡Sin tareas! Agrega la primera.</span></li>';
  const pending = tasks.filter(t => !t.done).length;
  $('count').textContent = pending;
  document.title = pending ? `(${pending}) Estudia+` : 'Estudia+';
  updateBadge(pending);
  save();
}
window.toggle = i => { tasks[i].done = !tasks[i].done; render(); };
window.del = i => { tasks.splice(i, 1); render(); };

$('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  tasks.push({ title: $('taskTitle').value.trim(), due: $('taskDue').value, done: false, notified: false });
  e.target.reset(); render();
});

// Revisa cada 30 s si hay recordatorios vencidos
setInterval(() => {
  tasks.forEach(t => {
    if (t.due && !t.done && !t.notified && new Date(t.due) <= new Date()) { t.notified = true; notify('Recordatorio: ' + t.title); save(); }
  });
}, 30000);

// Permiso de notificaciones
$('btnNotif').onclick = async () => {
  if (!('Notification' in window)) return toast('Tu navegador no soporta notificaciones');
  const p = await Notification.requestPermission();
  if (p === 'granted') { toast('Avisos activados'); notify('¡Listo! Recibirás tus recordatorios.'); }
};

// Instalación
let deferred;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('btnInstall').hidden = false; });
$('btnInstall').onclick = async () => { deferred.prompt(); await deferred.userChoice; deferred = null; $('btnInstall').hidden = true; };
window.addEventListener('appinstalled', () => toast('Estudia+ instalada'));

// Estado de conexión
const net = () => { $('status').textContent = navigator.onLine ? 'En línea' : 'Sin conexión'; $('status').className = 'pill' + (navigator.onLine ? '' : ' off'); };
addEventListener('online', net); addEventListener('offline', net); net();

// Pomodoro
let focus = true, left = 25 * 60, timer = null;
const paint = () => { $('timer').textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0'); $('mode').textContent = focus ? 'Enfoque' : 'Descanso'; };
$('btnStart').onclick = () => {
  if (timer) { clearInterval(timer); timer = null; $('btnStart').textContent = 'Reanudar'; return; }
  $('btnStart').textContent = 'Pausar';
  timer = setInterval(() => {
    if (--left <= 0) { focus = !focus; left = (focus ? 25 : 5) * 60; notify(focus ? '¡A enfocarse de nuevo!' : '¡Descansa 5 minutos!'); }
    paint();
  }, 1000);
};
$('btnReset').onclick = () => { clearInterval(timer); timer = null; focus = true; left = 25 * 60; $('btnStart').textContent = 'Iniciar'; paint(); };

// Service Worker
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render(); paint();
