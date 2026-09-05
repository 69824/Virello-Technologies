import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import { collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';

export { auth, db, onAuthStateChanged, signOut, collection, query, where, getDocs, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, serverTimestamp };

export async function getProfile(user){
  for(const collectionName of ['teachers','staff']){
    const snap=await getDocs(query(collection(db,collectionName),where('uid','==',user.uid)));
    if(!snap.empty) return {id:snap.docs[0].id,...snap.docs[0].data(),uid:user.uid};
    if(user.email){
      const byEmail=await getDocs(query(collection(db,collectionName),where('email','==',user.email)));
      if(!byEmail.empty) return {id:byEmail.docs[0].id,...byEmail.docs[0].data(),uid:user.uid};
    }
  }
  return null;
}

export async function getOrganization(profile,user){
  const orgId=profile?.organizationId||profile?.orgId;
  if(orgId){ const snap=await getDoc(doc(db,'organizations',orgId)); if(snap.exists()) return {id:snap.id,...snap.data()}; }
  const snap=await getDocs(query(collection(db,'organizations'),where('ownerUid','==',user.uid)));
  if(!snap.empty) return {id:snap.docs[0].id,...snap.docs[0].data()};
  return null;
}

export async function loadClasses(orgId){
  const snap=await getDocs(query(collection(db,'classes'),where('organizationId','==',orgId)));
  return snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(a.className||a.name||'').localeCompare(b.className||b.name||''));
}
export async function loadStudents(orgId,classId=''){
  const snap=await getDocs(query(collection(db,'students'),where('organizationId','==',orgId)));
  return snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>!classId||s.classId===classId).filter(s=>String(s.status||'active').toLowerCase()!=='inactive').sort((a,b)=>(a.fullName||'').localeCompare(b.fullName||''));
}
export async function loadTeachers(orgId){
  const snap=await getDocs(query(collection(db,'teachers'),where('organizationId','==',orgId)));
  return snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>['teacher','form_master'].includes(String(t.role||'teacher').toLowerCase()) && String(t.status||'active').toLowerCase()!=='inactive').sort((a,b)=>(a.fullName||a.name||'').localeCompare(b.fullName||b.name||''));
}
export function teacherName(t){return t?.fullName||t?.name||'Teacher';}
export function money(n,currency='GMD'){return new Intl.NumberFormat(undefined,{style:'currency',currency,maximumFractionDigits:2}).format(Number(n)||0);}
export function currentAcademicYear(){const y=new Date().getFullYear(); return `${y}/${y+1}`;}
export const TERMS=['First Term','Second Term','Third Term'];
export const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday'];
export function esc(v=''){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
export function showToast(message,type='ok'){
  let el=document.getElementById('virelloToast');
  if(!el){el=document.createElement('div');el.id='virelloToast';document.body.appendChild(el);}
  el.textContent=message;el.className=`toast ${type}`;setTimeout(()=>el.className='toast',2800);
}
export function injectStyles(){
  if(document.getElementById('virelloAcademicStyles')) return;
  const s=document.createElement('style');s.id='virelloAcademicStyles';s.textContent=`
  .toast{position:fixed;right:20px;bottom:20px;padding:13px 16px;border-radius:10px;background:#111827;color:#fff;opacity:0;transform:translateY(10px);pointer-events:none;transition:.25s;z-index:9999;font:600 13px Arial}.toast.ok,.toast.error{opacity:1;transform:none}.toast.error{background:#b91c1c}
  .va-shell{min-height:100vh;background:#f5f7fb;color:#172033;font-family:Inter,Arial,sans-serif}.va-header{height:70px;background:#fff;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:10}.va-brand{font-weight:800;font-size:19px}.va-brand span{display:block;font-size:11px;color:#64748b;font-weight:500;margin-top:3px}.va-head-actions{display:flex;gap:10px;align-items:center}.va-btn{border:0;border-radius:9px;padding:10px 14px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer}.va-btn.secondary{background:#eef2ff;color:#1e40af}.va-btn.danger{background:#fee2e2;color:#b91c1c}.va-container{max-width:1250px;margin:auto;padding:28px 20px 60px}.va-title{margin-bottom:22px}.va-title h1{margin:0;font-size:30px}.va-title p{margin:7px 0;color:#64748b}.va-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 5px 20px rgba(15,23,42,.04);margin-bottom:18px}.va-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}.va-stat{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px}.va-stat b{font-size:27px;display:block;margin-top:5px}.va-stat small{color:#64748b}.va-form{display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.va-field label{font-size:12px;font-weight:700;display:block;margin-bottom:6px}.va-field input,.va-field select,.va-field textarea{width:100%;padding:11px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;box-sizing:border-box}.va-field textarea{min-height:90px;resize:vertical}.va-wide{grid-column:1/-1}.va-table{width:100%;border-collapse:collapse}.va-table th,.va-table td{padding:11px 9px;border-bottom:1px solid #edf0f4;text-align:left;font-size:13px}.va-table th{background:#f8fafc;color:#475569;font-size:11px;text-transform:uppercase}.va-scroll{overflow:auto}.va-actions{display:flex;gap:8px;flex-wrap:wrap}.va-badge{display:inline-block;padding:5px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8;font-size:11px;font-weight:700}.va-empty{text-align:center;padding:35px;color:#64748b}.va-nav{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.va-nav a{padding:9px 12px;border-radius:9px;background:#fff;border:1px solid #e2e8f0;color:#334155;text-decoration:none;font-size:12px;font-weight:700}.va-nav a.active{background:#2563eb;color:#fff;border-color:#2563eb}.timetable{min-width:850px;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid #e2e8f0;border-radius:12px}.timetable th,.timetable td{border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:12px;vertical-align:top;min-width:145px}.timetable th{background:#f8fafc;font-size:12px}.slot{background:#eff6ff;border-left:3px solid #2563eb;border-radius:8px;padding:9px}.slot strong{display:block;font-size:13px}.slot span{display:block;font-size:11px;color:#64748b;margin-top:3px}.login{min-height:100vh;background:linear-gradient(135deg,#eff6ff,#f8fafc);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,Arial,sans-serif}.login-card{width:min(430px,100%);background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:30px;box-shadow:0 20px 50px rgba(15,23,42,.08)}.login-card h1{margin:0 0 8px}.login-card p{color:#64748b;font-size:13px}.login-card .va-field{margin:15px 0}.login-card .va-btn{width:100%}
  @media(max-width:900px){.va-grid{grid-template-columns:repeat(2,1fr)}.va-form{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.va-header{padding:0 14px}.va-container{padding:20px 13px}.va-grid,.va-form{grid-template-columns:1fr}.va-title h1{font-size:24px}.va-brand span{display:none}.va-table{min-width:760px}}
  `;document.head.appendChild(s);
}
