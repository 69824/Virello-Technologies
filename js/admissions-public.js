import { auth, db } from "./firebase-config.js";
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

const params = new URLSearchParams(location.search);
const schoolId = params.get("school");
const storage = getStorage();
const form = document.getElementById("applicationForm");
const notice = document.getElementById("notice");
const schoolLine = document.getElementById("schoolLine");
const classSelect = document.getElementById("classId");
const filesInput = document.getElementById("documents");
const fileList = document.getElementById("fileList");
let school = null;

function show(msg,type="error"){notice.textContent=msg;notice.className=`notice show ${type}`;window.scrollTo({top:0,behavior:"smooth"});}
function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

async function loadSchool(){
  if(!schoolId){show("This admission link is incomplete. Please ask the school for its official application link.");form.style.display="none";return;}
  const snap=await getDoc(doc(db,"organizations",schoolId));
  if(!snap.exists()){show("School application link not found.");form.style.display="none";return;}
  school={id:snap.id,...snap.data()};
  schoolLine.textContent=school.organizationName||school.name||"School";
  const qs=await getDocs(query(collection(db,"classes"),where("organizationId","==",schoolId)));
  classSelect.innerHTML='<option value="">Select class</option>';
  qs.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>String(a.className||"").localeCompare(String(b.className||""))).forEach(c=>{
    const o=document.createElement("option");o.value=c.id;o.textContent=c.className||c.name||"Class";classSelect.appendChild(o);
  });
}
filesInput.addEventListener("change",()=>{const fs=[...filesInput.files];fileList.textContent=fs.length?fs.map(f=>`${f.name} (${Math.round(f.size/1024)} KB)`).join(" • "):"No files selected";});

form.addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=document.getElementById("submitButton");
  const files=[...filesInput.files];
  if(files.some(f=>f.size>5*1024*1024)){show("Each document must be 5 MB or smaller.");return;}
  if(files.some(f=>!['application/pdf','image/jpeg','image/png'].includes(f.type))){show("Only PDF, JPG and PNG documents are accepted.");return;}
  btn.disabled=true;btn.textContent="Submitting Application...";
  try{
    const selected=classSelect.options[classSelect.selectedIndex];
    const firstName=document.getElementById("firstName").value.trim();
    const lastName=document.getElementById("lastName").value.trim();
    const applicationNo=`ADM-${new Date().getFullYear()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
    const data={organizationId:schoolId,applicationNumber:applicationNo,firstName,lastName,fullName:`${firstName} ${lastName}`.trim(),dateOfBirth:document.getElementById("dateOfBirth").value,gender:document.getElementById("gender").value,classId:classSelect.value,className:selected?.textContent||"",previousSchool:document.getElementById("previousSchool").value.trim(),studentAddress:document.getElementById("studentAddress").value.trim(),parentName:document.getElementById("parentName").value.trim(),parentTelephone:document.getElementById("parentTelephone").value.trim(),parentEmail:document.getElementById("parentEmail").value.trim(),relationship:document.getElementById("relationship").value.trim(),parentAddress:document.getElementById("parentAddress").value.trim(),message:document.getElementById("message").value.trim(),status:"pending",documentCount:files.length,documents:[],createdAt:serverTimestamp(),updatedAt:serverTimestamp()};
    const appRef=await addDoc(collection(db,"admissionApplications"),data);
    const docs=[];
    for(const file of files){const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");const storageRef=ref(storage,`admissionApplications/${schoolId}/${appRef.id}/${safe}`);await uploadBytes(storageRef,file,{contentType:file.type});docs.push({name:file.name,type:file.type,size:file.size,url:await getDownloadURL(storageRef)});}
    if(docs.length) await updateDoc(appRef,{documents:docs,documentCount:docs.length,updatedAt:serverTimestamp()});
    form.style.display="none";document.getElementById("result").style.display="block";document.getElementById("applicationNumber").textContent=applicationNo;notice.className="notice";
  }catch(err){console.error(err);show(err.message||"Unable to submit application. Please try again.");btn.disabled=false;btn.textContent="Submit Admission Application";}
});
loadSchool().catch(err=>{console.error(err);show("Unable to load this school application page.");});
