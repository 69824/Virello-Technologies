import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const money = n => "GMD " + Number(n || 0).toLocaleString();
let students = [];
let records = [];
let organizationId = null;

function orgId(user){
  return user?.organizationId || user?.orgId || user?.uid || null;
}

async function loadStudents(){
  if(!organizationId) return;
  const sources = ["students"];
  let all = [];
  for(const name of sources){
    try{
      const snap = await getDocs(query(collection(db,name), where("organizationId","==",organizationId)));
      snap.forEach(d => all.push({id:d.id,...d.data()}));
    }catch(e){}
  }
  if(!all.length){
    try{
      const snap = await getDocs(collection(db,"students"));
      snap.forEach(d => {
        const x={id:d.id,...d.data()};
        if(!x.organizationId || x.organizationId===organizationId) all.push(x);
      });
    }catch(e){}
  }
  const seen=new Set();
  students=all.filter(s=>{
    const key=s.studentId||s.id;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b)=>(a.fullName||a.name||"").localeCompare(b.fullName||b.name||""));
  $("student").innerHTML='<option value="">Select student</option>'+students.map(s=>{
    const name=s.fullName||s.name||"Unnamed Student";
    const sid=s.studentId||s.id;
    return `<option value="${s.id}">${name} — ${sid}</option>`;
  }).join("");
  const classes=[...new Set(students.map(s=>s.className||s.class||s.grade).filter(Boolean))].sort();
  $("classFilter").innerHTML='<option value="">All Classes</option>'+classes.map(c=>`<option>${c}</option>`).join("");
  $("totalStudents").textContent=students.length;
}

async function loadRecords(){
  if(!organizationId) return;
  records=[];
  try{
    const snap=await getDocs(query(collection(db,"fees"),where("organizationId","==",organizationId)));
    snap.forEach(d=>records.push({id:d.id,...d.data()}));
  }catch(e){
    try{
      const snap=await getDocs(collection(db,"fees"));
      snap.forEach(d=>{const x={id:d.id,...d.data()}; if(!x.organizationId || x.organizationId===organizationId) records.push(x);});
    }catch(err){console.error(err)}
  }
  render();
}

function render(){
  const search=($("search").value||"").toLowerCase();
  const cls=$("classFilter").value;
  const term=$("termFilter").value;
  const rows=records.filter(r=>{
    const s=(r.studentName||"").toLowerCase(), id=(r.studentId||"").toLowerCase();
    const c=r.className||r.class||r.grade||"";
    return (!search || s.includes(search)||id.includes(search)) && (!cls||c===cls) && (!term||r.term===term);
  });
  let due=0,paid=0;
  rows.forEach(r=>{due+=Number(r.feesDue||0);paid+=Number(r.amountPaid||0)});
  $("totalDue").textContent=money(due);
  $("totalPaid").textContent=money(paid);
  $("totalBalance").textContent=money(Math.max(0,due-paid));
  $("feesBody").innerHTML=rows.length?rows.map(r=>{
    const d=Number(r.feesDue||0), p=Number(r.amountPaid||0), b=Math.max(0,d-p);
    const status=b<=0&&d>0?"Paid":p>0?"Part Paid":"Not Paid";
    const cls2=status==="Paid"?"paid":status==="Part Paid"?"part":"unpaid";
    return `<tr><td>${r.studentId||""}</td><td>${r.studentName||""}</td><td>${r.className||r.class||r.grade||""}</td><td>${r.term||""}</td><td>${money(d)}</td><td>${money(p)}</td><td>${money(b)}</td><td><span class="status ${cls2.toLowerCase().replace(" ","")}">${status}</span></td><td>${r.paymentDate||""}</td><td>${r.paymentMethod||""}</td></tr>`;
  }).join(""):'<tr><td colspan="10">No fees records found.</td></tr>';
}

$("student").addEventListener("change",()=>{
  const s=students.find(x=>x.id===$("student").value);
  if(!s)return;
  $("feesDue").value=s.feesDue||"";
});
$("saveBtn").addEventListener("click",async()=>{
  const s=students.find(x=>x.id===$("student").value);
  if(!s){$("message").textContent="Please select a student.";return}
  const feesDue=Number($("feesDue").value||0), amountPaid=Number($("amountPaid").value||0);
  if(feesDue<0||amountPaid<0){$("message").textContent="Amounts cannot be negative.";return}
  const data={
    organizationId, studentId:s.studentId||s.id, studentName:s.fullName||s.name||"",
    className:s.className||s.class||s.grade||"", gender:s.gender||"",
    parentGuardian:s.parentGuardian||s.parentName||"", parentPhone:s.parentPhone||s.phone||"",
    academicYear:$("academicYear").value.trim(), term:$("term").value,
    feesDue, amountPaid, balance:Math.max(0,feesDue-amountPaid),
    paymentDate:$("paymentDate").value, receiptNo:$("receiptNo").value.trim(),
    paymentMethod:$("paymentMethod").value, updatedAt:new Date().toISOString()
  };
  try{
    await addDoc(collection(db,"fees"),data);
    $("message").textContent="Fees record saved successfully.";
    clearForm(); await loadRecords();
  }catch(e){
    console.error(e); $("message").textContent="Unable to save. Check your Firestore permissions.";
  }
});
function clearForm(){
  $("student").value="";$("feesDue").value="";$("amountPaid").value="";$("receiptNo").value="";
  $("paymentDate").value=new Date().toISOString().slice(0,10);$("message").textContent="";
}
$("clearBtn").onclick=clearForm;
$("refreshBtn").onclick=async()=>{await loadStudents();await loadRecords()};
["search","classFilter","termFilter"].forEach(id=>$(id).addEventListener("input",render));

onAuthStateChanged(auth,async user=>{
  if(!user){location.href="login.html";return}
  organizationId=orgId(user);
  $("paymentDate").value=new Date().toISOString().slice(0,10);
  $("academicYear").value="2026/2027";
  await loadStudents();
  await loadRecords();
});
