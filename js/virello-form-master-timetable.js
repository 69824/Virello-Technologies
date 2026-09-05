/*
  VIRELLO FORM MASTER TIMETABLE INTEGRATION

  Add this file to the existing Virello project and include it on:
  - form-master.html
  - form-master-dashboard.html

  It does not replace form-master.js.
  It adds a read-only timetable directly to the same Form Master page
  where the teacher normally takes attendance.
*/

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

function injectStyles() {
  if (document.getElementById('virelloFormMasterTimetableStyles')) return;
  const style = document.createElement('style');
  style.id = 'virelloFormMasterTimetableStyles';
  style.textContent = `
    .vfm-timetable-card{margin:22px 0;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 5px 20px rgba(15,23,42,.05)}
    .vfm-timetable-head{display:flex;justify-content:space-between;gap:15px;align-items:center;flex-wrap:wrap;margin-bottom:15px}
    .vfm-timetable-head h2{margin:0;font-size:20px;color:#172033}
    .vfm-timetable-head p{margin:4px 0 0;color:#64748b;font-size:13px}
    .vfm-today{background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:800}
    .vfm-day-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px}
    .vfm-day-tabs button{border:1px solid #dbe2ea;background:#fff;border-radius:9px;padding:8px 11px;font-weight:700;font-size:12px;cursor:pointer;color:#334155}
    .vfm-day-tabs button.active{background:#2563eb;color:#fff;border-color:#2563eb}
    .vfm-day-title{font-size:14px;font-weight:800;margin:10px 0;color:#334155}
    .vfm-lessons{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
    .vfm-lesson{border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:10px;padding:12px;background:#f8fafc}
    .vfm-lesson strong{display:block;font-size:14px;color:#172033}
    .vfm-lesson .time{font-weight:800;color:#2563eb;font-size:12px;margin-bottom:5px}
    .vfm-lesson .meta{font-size:11px;color:#64748b;margin-top:4px}
    .vfm-empty{padding:18px;text-align:center;color:#64748b;background:#f8fafc;border-radius:10px;font-size:13px}
    @media(max-width:600px){.vfm-timetable-card{padding:14px}.vfm-lessons{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

async function findProfile(user) {
  for (const name of ['staff', 'teachers']) {
    const byUid = await getDocs(query(collection(db, name), where('uid', '==', user.uid)));
    if (!byUid.empty) return { id: byUid.docs[0].id, ...byUid.docs[0].data() };

    if (user.email) {
      const byEmail = await getDocs(query(collection(db, name), where('email', '==', user.email)));
      if (!byEmail.empty) return { id: byEmail.docs[0].id, ...byEmail.docs[0].data() };
    }
  }
  return null;
}

async function findOrganization(profile, user) {
  const orgId = profile?.organizationId || profile?.orgId;
  if (orgId) {
    const snap = await getDocs(query(collection(db, 'organizations'), where('__name__', '==', orgId)));
    if (!snap.empty) return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }
  const own = await getDocs(query(collection(db, 'organizations'), where('ownerUid', '==', user.uid)));
  if (!own.empty) return { id: own.docs[0].id, ...own.docs[0].data() };
  return null;
}

async function loadTimetable(profile, org, user) {
  const snap = await getDocs(query(
    collection(db, 'timetableEntries'),
    where('organizationId', '==', org.id)
  ));

  const teacherIds = new Set([user.uid, profile.id].filter(Boolean).map(String));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(item => teacherIds.has(String(item.teacherId || '')))
    .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));
}

function render(container, entries) {
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
  let selectedDay = DAYS.includes(today) ? today : 'Monday';

  const draw = () => {
    const dayEntries = entries.filter(x => String(x.day || '').toLowerCase() === selectedDay.toLowerCase())
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')));

    container.innerHTML = `
      <div class="vfm-timetable-card">
        <div class="vfm-timetable-head">
          <div><h2>My Timetable</h2><p>Your teaching timetable is shown here while you take attendance.</p></div>
          <span class="vfm-today">Today: ${esc(today)}</span>
        </div>
        <div class="vfm-day-tabs">
          ${DAYS.map(day => `<button type="button" data-day="${esc(day)}" class="${day === selectedDay ? 'active' : ''}">${esc(day)}</button>`).join('')}
        </div>
        <div class="vfm-day-title">${esc(selectedDay)}</div>
        <div class="vfm-lessons">
          ${dayEntries.length ? dayEntries.map(x => `
            <div class="vfm-lesson">
              <div class="time">${esc(x.startTime || '')} – ${esc(x.endTime || '')}</div>
              <strong>${esc(x.subject || 'Lesson')}</strong>
              <div class="meta">Class: ${esc(x.className || 'Class not set')}</div>
              <div class="meta">Room: ${esc(x.room || 'Not set')}</div>
            </div>
          `).join('') : '<div class="vfm-empty">No timetable entry for this day.</div>'}
        </div>
      </div>
    `;

    container.querySelectorAll('[data-day]').forEach(button => {
      button.addEventListener('click', () => {
        selectedDay = button.dataset.day;
        draw();
      });
    });
  };

  draw();
}

async function start(user) {
  injectStyles();

  const host = document.createElement('div');
  host.id = 'virelloFormMasterTimetable';

  // Put the timetable immediately before the attendance register.
  const register = document.getElementById('attendanceRegister');
  if (register?.parentElement) register.parentElement.insertBefore(host, register);
  else document.body.appendChild(host);

  try {
    const profile = await findProfile(user);
    if (!profile) return;
    const org = await findOrganization(profile, user);
    if (!org) return;

    const entries = await loadTimetable(profile, org, user);
    render(host, entries);
  } catch (error) {
    console.error('Virello Form Master timetable error:', error);
    host.innerHTML = `
      <div class="vfm-timetable-card">
        <div class="vfm-empty">Unable to load your timetable right now.</div>
      </div>
    `;
  }
}

onAuthStateChanged(auth, user => {
  if (user) start(user);
});
