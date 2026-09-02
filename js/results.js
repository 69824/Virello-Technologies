/* =========================================================
VIRELLO TECHNOLOGIES
ACADEMIC RESULTS MANAGEMENT

FILE:
js/results.js

FIRESTORE:
results/{resultId}

WORKFLOW:

1. Select Class
2. Select Student
3. Select Academic Year
4. Select Term
5. Enter Subjects & Marks
6. Enter Position / Comments
7. Save as Draft OR Publish
8. Result immediately appears under Existing Results
9. Edit existing result whenever necessary

SUPPORTED CLASSES:

Nursery 1
Nursery 2
Nursery 3
Grade 1
Grade 2
Grade 3
Grade 4
Grade 5
Grade 6
Grade 7
Grade 8
Grade 9
========================================================= */

/* =========================================================
FIREBASE AUTH
========================================================= */

import {
onAuthStateChanged,
signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

/* =========================================================
FIRESTORE
========================================================= */

import {
collection,
query,
where,
getDocs,
addDoc,
updateDoc,
doc,
serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* =========================================================
FIREBASE CONFIG
========================================================= */

import {
auth,
db
} from "./firebase-config.js";

/* =========================================================
STATE
========================================================= */

let currentUser = null;

let currentOrganization = null;

let classes = [];

let students = [];

let allResults = [];

let selectedStudent = null;

let currentResult = null;

/* =========================================================
DOM
========================================================= */

const loadingScreen =
document.getElementById("loadingScreen");

const errorScreen =
document.getElementById("errorScreen");

const errorMessage =
document.getElementById("errorMessage");

const adminName =
document.getElementById("adminName");

const organizationName =
document.getElementById("organizationName");

const logoutButton =
document.getElementById("logoutButton");

const classSelect =
document.getElementById("classSelect");

const academicYear =
document.getElementById("academicYear");

const termSelect =
document.getElementById("termSelect");

const studentSelect =
document.getElementById("studentSelect");

const loadResultButton =
document.getElementById("loadResultButton");

const resultEditor =
document.getElementById("resultEditor");

const studentName =
document.getElementById("studentName");

const studentDetails =
document.getElementById("studentDetails");

const resultStatus =
document.getElementById("resultStatus");

const displayStudentId =
document.getElementById("displayStudentId");

const displayClass =
document.getElementById("displayClass");

const displayAcademicYear =
document.getElementById("displayAcademicYear");

const displayTerm =
document.getElementById("displayTerm");

const subjectTableBody =
document.getElementById("subjectTableBody");

const addSubjectButton =
document.getElementById("addSubjectButton");

const clearResultButton =
document.getElementById("clearResultButton");

const saveResultButton =
document.getElementById("saveResultButton");

const publishResult =
document.getElementById("publishResult");

const positionInput =
document.getElementById("position");

const teacherComment =
document.getElementById("teacherComment");

const principalComment =
document.getElementById("principalComment");

const totalStudents =
document.getElementById("totalStudents");

const resultsEntered =
document.getElementById("resultsEntered");

const publishedResults =
document.getElementById("publishedResults");

const totalClasses =
document.getElementById("totalClasses");

const overallSubjects =
document.getElementById("overallSubjects");

const overallMarks =
document.getElementById("overallMarks");

const overallAverage =
document.getElementById("overallAverage");

const overallGrade =
document.getElementById("overallGrade");

const existingResultsBody =
document.getElementById("existingResultsBody");

const existingResultsEmpty =
document.getElementById("existingResultsEmpty");

const resultClassFilter =
document.getElementById("resultClassFilter");

const resultTermFilter =
document.getElementById("resultTermFilter");

const resultSearch =
document.getElementById("resultSearch");

/* =========================================================
CLASS ORDER
========================================================= */

const CLASS_ORDER = [


"Nursery 1",
"Nursery 2",
"Nursery 3",

"Grade 1",
"Grade 2",
"Grade 3",
"Grade 4",
"Grade 5",
"Grade 6",
"Grade 7",
"Grade 8",
"Grade 9"


];

/* =========================================================
START
========================================================= */

document.addEventListener(
"DOMContentLoaded",
startResults
);

/* =========================================================
AUTH
========================================================= */

function startResults() {


onAuthStateChanged(
    auth,
    async user => {

        try {

            if (!user) {

                window.location.href =
                    "login.html";

                return;

            }


            currentUser = user;


            if (adminName) {

                adminName.textContent =
                    user.displayName ||
                    user.email ||
                    "Administrator";

            }


            await loadOrganization();


            if (!currentOrganization) {

                return;

            }


            await loadClasses();

            populateClassSelect();

            populateResultClassFilter();

            await loadAllStudents();

            await loadAllResults();

            updateDashboardStatistics();

            hideLoading();

        }

        catch (error) {

            console.error(
                "Results initialization error:",
                error
            );

            showError(
                error.message ||
                "Unable to load academic results."
            );

        }

    }
);


}

/* =========================================================
LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {


const organizationsRef =
    collection(
        db,
        "organizations"
    );


const organizationQuery =
    query(
        organizationsRef,
        where(
            "ownerUid",
            "==",
            currentUser.uid
        )
    );


const snapshot =
    await getDocs(
        organizationQuery
    );


if (snapshot.empty) {

    showError(
        "No organization was found for this administrator account."
    );

    return;

}


const organizationDocument =
    snapshot.docs[0];


currentOrganization = {

    id:
        organizationDocument.id,

    ...organizationDocument.data()

};


if (organizationName) {

    organizationName.textContent =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        "Organization";

}


}

/* =========================================================
LOAD CLASSES
========================================================= */

async function loadClasses() {


const classesRef =
    collection(
        db,
        "classes"
    );


const classQuery =
    query(
        classesRef,

        where(
            "organizationId",
            "==",
            currentOrganization.id
        )

    );


const snapshot =
    await getDocs(
        classQuery
    );


classes = [];


snapshot.forEach(
    classDocument => {

        classes.push({

            id:
                classDocument.id,

            ...classDocument.data()

        });

    }
);


classes.sort(
    sortClasses
);


if (totalClasses) {

    totalClasses.textContent =
        classes.length;

}


}

/* =========================================================
SORT CLASSES
========================================================= */

function sortClasses(a, b) {


const nameA =
    normalizeClassName(
        a.className ||
        a.name ||
        ""
    );

const nameB =
    normalizeClassName(
        b.className ||
        b.name ||
        ""
    );


const indexA =
    CLASS_ORDER.indexOf(
        nameA
    );

const indexB =
    CLASS_ORDER.indexOf(
        nameB
    );


if (
    indexA !== -1 &&
    indexB !== -1
) {

    return indexA - indexB;

}


if (indexA !== -1) {

    return -1;

}


if (indexB !== -1) {

    return 1;

}


return nameA.localeCompare(
    nameB
);


}

/* =========================================================
NORMALIZE CLASS NAME
========================================================= */

function normalizeClassName(name) {


const value =
    String(
        name ||
        ""
    )
    .trim()
    .replace(
        /\s+/g,
        " "
    );


const lower =
    value.toLowerCase();


const nurseryMatch =
    lower.match(
        /^nursery\s*(1|2|3)$/
    );


if (nurseryMatch) {

    return `Nursery ${nurseryMatch[1]}`;

}


const gradeMatch =
    lower.match(
        /^grade\s*(1|2|3|4|5|6|7|8|9)$/
    );


if (gradeMatch) {

    return `Grade ${gradeMatch[1]}`;

}


return value;


}

/* =========================================================
CLASS SELECT
========================================================= */

function populateClassSelect() {


if (!classSelect) {
    return;
}


classSelect.innerHTML = `

    <option value="">
        Select Class
    </option>

`;


classes.forEach(
    classItem => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            classItem.id;


        option.textContent =
            normalizeClassName(
                classItem.className ||
                classItem.name ||
                "Unnamed Class"
            );


        classSelect.appendChild(
            option
        );

    }
);


}

/* =========================================================
RESULT CLASS FILTER
========================================================= */

function populateResultClassFilter() {


if (!resultClassFilter) {
    return;
}


resultClassFilter.innerHTML = `

    <option value="">
        All Classes
    </option>

`;


classes.forEach(
    classItem => {

        const className =
            normalizeClassName(
                classItem.className ||
                classItem.name ||
                ""
            );


        const option =
            document.createElement(
                "option"
            );


        option.value =
            className;


        option.textContent =
            className;


        resultClassFilter.appendChild(
            option
        );

    }
);


}

/* =========================================================
CLASS CHANGE
========================================================= */

if (classSelect) {


classSelect.addEventListener(
    "change",
    async () => {

        const classId =
            classSelect.value;


        students = [];

        selectedStudent = null;

        currentResult = null;


        hideEditor();


        studentSelect.innerHTML = `

            <option value="">
                Loading students...
            </option>

        `;


        studentSelect.disabled =
            true;


        if (!classId) {

            studentSelect.innerHTML = `

                <option value="">
                    Select Student
                </option>

            `;

            return;

        }


        try {

            await loadStudentsForClass(
                classId
            );

        }

        catch (error) {

            console.error(
                "Student loading error:",
                error
            );


            studentSelect.innerHTML = `

                <option value="">
                    Unable to load students
                </option>

            `;


            alert(
                error.message ||
                "Unable to load students."
            );

        }

    }
);


}

/* =========================================================
LOAD STUDENTS FOR CLASS
========================================================= */

async function loadStudentsForClass(
classId
) {


const studentsRef =
    collection(
        db,
        "students"
    );


const studentsQuery =
    query(

        studentsRef,

        where(
            "organizationId",
            "==",
            currentOrganization.id
        ),

        where(
            "classId",
            "==",
            classId
        )

    );


const snapshot =
    await getDocs(
        studentsQuery
    );


students = [];


snapshot.forEach(
    studentDocument => {

        const data =
            studentDocument.data();


        const status =
            String(
                data.status ||
                "active"
            )
            .toLowerCase();


        if (
            status === "inactive" ||
            status === "left" ||
            status === "graduated"
        ) {

            return;

        }


        students.push({

            id:
                studentDocument.id,

            ...data

        });

    }
);


students.sort(
    (a, b) => {

        const nameA =
            String(
                a.fullName ||
                a.name ||
                ""
            );


        const nameB =
            String(
                b.fullName ||
                b.name ||
                ""
            );


        return nameA.localeCompare(
            nameB
        );

    }
);


populateStudentSelect();


}

/* =========================================================
LOAD ALL STUDENTS
========================================================= */

async function loadAllStudents() {


const studentsRef =
    collection(
        db,
        "students"
    );


const studentsQuery =
    query(

        studentsRef,

        where(
            "organizationId",
            "==",
            currentOrganization.id
        )

    );


const snapshot =
    await getDocs(
        studentsQuery
    );


if (totalStudents) {

    totalStudents.textContent =
        snapshot.size;

}


}

/* =========================================================
STUDENT SELECT
========================================================= */

function populateStudentSelect() {


if (!studentSelect) {
    return;
}


studentSelect.innerHTML = `

    <option value="">
        Select Student
    </option>

`;


students.forEach(
    student => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            student.id;


        const name =
            student.fullName ||
            student.name ||
            "Unnamed Student";


        const studentId =
            student.studentId ||
            student.id ||
            "No ID";


        option.textContent =
            `${name} — ${studentId}`;


        studentSelect.appendChild(
            option
        );

    }
);


studentSelect.disabled =
    false;


}

/* =========================================================
LOAD RESULT BUTTON
========================================================= */

if (loadResultButton) {


loadResultButton.addEventListener(
    "click",
    async () => {

        const studentDocumentId =
            studentSelect.value;


        if (!classSelect.value) {

            alert(
                "Please select a class."
            );

            return;

        }


        if (!studentDocumentId) {

            alert(
                "Please select a student."
            );

            return;

        }


        const year =
            academicYear.value.trim();


        if (!year) {

            alert(
                "Please enter the academic year."
            );

            academicYear.focus();

            return;

        }


        if (!termSelect.value) {

            alert(
                "Please select a term."
            );

            return;

        }


        selectedStudent =
            students.find(
                student =>
                    student.id ===
                    studentDocumentId
            );


        if (!selectedStudent) {

            alert(
                "Student could not be found."
            );

            return;

        }


        await loadExistingResultForStudent();

    }
);


}

/* =========================================================
LOAD EXISTING RESULT FOR STUDENT
========================================================= */

async function loadExistingResultForStudent() {


const year =
    academicYear.value.trim();


const term =
    termSelect.value;


setButtonLoading(
    loadResultButton,
    "Loading..."
);


try {

    const result =
        findExistingResult(
            selectedStudent.id,
            year,
            term
        );


    if (result) {

        currentResult =
            result;


        showResultEditor();

        renderResultIntoEditor(
            result
        );

    }

    else {

        currentResult =
            null;


        showResultEditor();

        createDefaultSubjects();

        clearCommentsAndPosition();

        publishResult.checked =
            false;


        setResultStatus(
            "draft"
        );

    }

}

catch (error) {

    console.error(
        "Load result error:",
        error
    );


    alert(
        error.message ||
        "Unable to load result."
    );

}

finally {

    resetButton(
        loadResultButton,
        "Load Student Result"
    );

}


}

/* =========================================================
FIND EXISTING RESULT
========================================================= */

function findExistingResult(
studentDocumentId,
year,
term
) {


return allResults.find(
    result => {

        return (

            result.studentDocumentId ===
            studentDocumentId

        )

        &&

        result.academicYear ===
        year

        &&

        result.term ===
        term;

    }
) || null;


}

/* =========================================================
SHOW EDITOR
========================================================= */

function showResultEditor() {


resultEditor.classList.remove(
    "hidden"
);


const classItem =
    classes.find(
        item =>
            item.id ===
            classSelect.value
    );


const name =
    selectedStudent.fullName ||
    selectedStudent.name ||
    "Unnamed Student";


const studentId =
    selectedStudent.studentId ||
    selectedStudent.id ||
    "No Student ID";


const className =
    normalizeClassName(
        classItem?.className ||
        classItem?.name ||
        selectedStudent.className ||
        ""
    );


studentName.textContent =
    name;


studentDetails.textContent =
    `${className} • ${studentId}`;


displayStudentId.textContent =
    studentId;


displayClass.textContent =
    className;


displayAcademicYear.textContent =
    academicYear.value.trim();


displayTerm.textContent =
    termSelect.value;


}

/* =========================================================
HIDE EDITOR
========================================================= */

function hideEditor() {


resultEditor.classList.add(
    "hidden"
);


}

/* =========================================================
CREATE DEFAULT SUBJECTS
========================================================= */

function createDefaultSubjects() {


subjectTableBody.innerHTML =
    "";


const defaultSubjects = [

    "ENGLISH LANGUAGE",
    "MATHEMATICS",
    "SCIENCE",
    "SOCIAL & ENV. STUDIES",
    "ENGLISH LITERATURE",
    "ARTS & CRAFT",
    "HOME ECONOMICS",
    "TECHNICAL DRAWING",
    "INFO.COM.TECH (ICT)",
    "FRENCH",
    "ISLAMIC RELIGIOUS STUDIES",
    "CHRISTIAN RELIGIOUS EDUCATION",
    "P.H.E",

];


defaultSubjects.forEach(
    subject => {

        addSubjectRow(
            subject,
            "",
            ""
        );

    }
);


calculateOverall();


}

/* =========================================================
RENDER RESULT
========================================================= */

function renderResultIntoEditor(
result
) {


subjectTableBody.innerHTML =
    "";


const subjects =
    Array.isArray(
        result.subjects
    )
        ? result.subjects
        : [];


if (subjects.length) {

    subjects.forEach(
        item => {

            addSubjectRow(

                item.subject ||
                "",

                item.ca ?? "",

                item.exam ?? ""

            );

        }
    );

}

else {

    createDefaultSubjects();

}


positionInput.value =
    result.position ||
    "";


teacherComment.value =
    result.teacherComment ||
    "";


principalComment.value =
    result.principalComment ||
    "";


publishResult.checked =
    result.status ===
    "published";


calculateOverall();


setResultStatus(
    result.status ||
    "draft"
);


}

/* =========================================================
CLEAR COMMENTS
========================================================= */

function clearCommentsAndPosition() {


positionInput.value =
    "";

teacherComment.value =
    "";

principalComment.value =
    "";


}

/* =========================================================
ADD SUBJECT
========================================================= */

if (addSubjectButton) {


addSubjectButton.addEventListener(
    "click",
    () => {

        addSubjectRow(
            "",
            "",
            ""
        );

        calculateOverall();

    }
);


}

/* =========================================================
ADD SUBJECT ROW
========================================================= */

function addSubjectRow(
subject,
ca,
exam
) {


const row =
    document.createElement(
        "tr"
    );


row.innerHTML = `

    <td>

        <input
            type="text"
            class="subject-input"
            placeholder="Subject name"
        >

    </td>


    <td>

        <input
            type="number"
            class="ca-input"
            min="0"
            max="40"
            step="0.01"
            placeholder="0"
        >

    </td>


    <td>

        <input
            type="number"
            class="exam-input"
            min="0"
            max="60"
            step="0.01"
            placeholder="0"
        >

    </td>


    <td class="total-cell">
        0.00
    </td>


    <td>

        <span class="grade-badge">
            —
        </span>

    </td>


    <td>

        <span class="remark">
            —
        </span>

    </td>


    <td>

        <button
            type="button"
            class="remove-subject"
        >
            ×
        </button>

    </td>

`;


subjectTableBody.appendChild(
    row
);


const subjectInput =
    row.querySelector(
        ".subject-input"
    );


const caInput =
    row.querySelector(
        ".ca-input"
    );


const examInput =
    row.querySelector(
        ".exam-input"
    );


subjectInput.value =
    subject || "";


caInput.value =
    ca ?? "";


examInput.value =
    exam ?? "";


caInput.addEventListener(
    "input",
    () => {

        calculateRow(
            row
        );

        calculateOverall();

    }
);


examInput.addEventListener(
    "input",
    () => {

        calculateRow(
            row
        );

        calculateOverall();

    }
);


subjectInput.addEventListener(
    "input",
    calculateOverall
);


row.querySelector(
    ".remove-subject"
).addEventListener(
    "click",
    () => {

        row.remove();

        calculateOverall();

    }
);


calculateRow(
    row
);


}

/* =========================================================
CALCULATE ROW
========================================================= */

function calculateRow(row) {


const ca =
    numberValue(
        row.querySelector(
            ".ca-input"
        ).value
    );


const exam =
    numberValue(
        row.querySelector(
            ".exam-input"
        ).value
    );


const total =
    Math.min(
        100,
        ca + exam
    );


const grade =
    calculateGrade(
        total
    );


row.querySelector(
    ".total-cell"
).textContent =
    total.toFixed(2);


row.querySelector(
    ".grade-badge"
).textContent =
    grade.grade;


row.querySelector(
    ".remark"
).textContent =
    grade.remark;


}

/* =========================================================
CALCULATE OVERALL
========================================================= */

function calculateOverall() {

if (!subjectTableBody) {
    return;
}


const rows =
    Array.from(
        subjectTableBody.querySelectorAll(
            "tr"
        )
    );


let totalMarks =
    0;


let subjectCount =
    0;


rows.forEach(
    row => {

        const subject =
            row.querySelector(
                ".subject-input"
            ).value.trim();


        if (!subject) {
            return;
        }


        calculateRow(
            row
        );


        const ca =
            numberValue(
                row.querySelector(
                    ".ca-input"
                ).value
            );


        const exam =
            numberValue(
                row.querySelector(
                    ".exam-input"
                ).value
            );


        totalMarks +=
            Math.min(
                100,
                ca + exam
            );


        subjectCount++;

    }
);


const average =
    subjectCount
        ? totalMarks /
          subjectCount
        : 0;


const grade =
    calculateGrade(
        average
    );


overallSubjects.textContent =
    subjectCount;


overallMarks.textContent =
    totalMarks.toFixed(2);


overallAverage.textContent =
    `${average.toFixed(2)}%`;


overallGrade.textContent =
    grade.grade;


}

/* =========================================================
SAVE RESULT
========================================================= */

if (saveResultButton) {


saveResultButton.addEventListener(
    "click",
    saveResult
);


}

/* =========================================================
SAVE RESULT FUNCTION
========================================================= */

async function saveResult() {


if (!selectedStudent) {

    alert(
        "Please select a student first."
    );

    return;

}


const year =
    academicYear.value.trim();


const term =
    termSelect.value;


if (!year) {

    alert(
        "Please enter the academic year."
    );

    academicYear.focus();

    return;

}


if (!term) {

    alert(
        "Please select a term."
    );

    return;

}


const subjects =
    collectSubjects();


if (!subjects.length) {

    alert(
        "Please enter at least one subject."
    );

    return;

}


const totalMarks =
    subjects.reduce(
        (
            sum,
            subject
        ) => {

            return sum +
                Number(
                    subject.total ||
                    0
                );

        },
        0
    );


const average =
    totalMarks /
    subjects.length;


const overall =
    calculateGrade(
        average
    );


const classItem =
    classes.find(
        item =>
            item.id ===
            classSelect.value
    );


const className =
    normalizeClassName(
        classItem?.className ||
        classItem?.name ||
        selectedStudent.className ||
        ""
    );


const parentUid =
    selectedStudent.parentUid ||
    selectedStudent.parentUID ||
    selectedStudent.parentId ||
    null;


const isPublished =
    publishResult.checked;


const resultData = {

    organizationId:
        currentOrganization.id,

    studentId:
        selectedStudent.studentId ||
        "",

    studentDocumentId:
        selectedStudent.id,

    studentName:
        selectedStudent.fullName ||
        selectedStudent.name ||
        "",

    classId:
        classSelect.value,

    className:
        className,

    academicYear:
        year,

    term:
        term,

    subjects:
        subjects,

    subjectCount:
        subjects.length,

    totalMarks:
        Number(
            totalMarks.toFixed(2)
        ),

    average:
        Number(
            average.toFixed(2)
        ),

    overallGrade:
        overall.grade,

    overallRemark:
        overall.remark,

    position:
        positionInput.value.trim(),

    teacherComment:
        teacherComment.value.trim(),

    principalComment:
        principalComment.value.trim(),

    status:
        isPublished
            ? "published"
            : "draft",

    updatedAt:
        serverTimestamp(),

    updatedBy:
        currentUser.uid

};


if (parentUid) {

    resultData.parentUid =
        parentUid;

}


setButtonLoading(
    saveResultButton,
    isPublished
        ? "Publishing..."
        : "Saving..."
);


try {

    /*
     * IMPORTANT:
     *
     * We identify results by:
     *
     * organization
     * + student
     * + academic year
     * + term
     *
     * This prevents accidental duplicate results.
     */


    let existing =
        currentResult;


    if (!existing) {

        existing =
            findExistingResult(
                selectedStudent.id,
                year,
                term
            );

    }


    if (existing) {

        await updateDoc(

            doc(
                db,
                "results",
                existing.id
            ),

            resultData

        );


        currentResult = {

            id:
                existing.id,

            ...existing,

            ...resultData

        };

    }

    else {

        resultData.createdAt =
            serverTimestamp();


        resultData.createdBy =
            currentUser.uid;


        const resultDocument =
            await addDoc(

                collection(
                    db,
                    "results"
                ),

                resultData

            );


        currentResult = {

            id:
                resultDocument.id,

            ...resultData

        };

    }


    /*
     * Update local results list immediately.
     */

    replaceLocalResult(
        currentResult
    );


    setResultStatus(
        isPublished
            ? "published"
            : "draft"
    );


    renderExistingResults();

    updateDashboardStatistics();


    alert(

        isPublished

            ? `Academic result saved and published for ${selectedStudent.fullName || selectedStudent.name}.`

            : `Academic result saved as a draft for ${selectedStudent.fullName || selectedStudent.name}.`

    );

}

catch (error) {

    console.error(
        "Save result error:",
        error
    );


    alert(
        error.message ||
        "Unable to save academic result."
    );

}

finally {

    resetButton(
        saveResultButton,
        "Save Result"
    );

}


}

/* =========================================================
COLLECT SUBJECTS
========================================================= */

function collectSubjects() {


const rows =
    Array.from(
        subjectTableBody.querySelectorAll(
            "tr"
        )
    );


const subjects = [];


rows.forEach(
    row => {

        const subject =
            row.querySelector(
                ".subject-input"
            ).value.trim();


        if (!subject) {
            return;
        }


        const ca =
            numberValue(
                row.querySelector(
                    ".ca-input"
                ).value
            );


        const exam =
            numberValue(
                row.querySelector(
                    ".exam-input"
                ).value
            );


        const total =
            Math.min(
                100,
                ca + exam
            );


        const grade =
            calculateGrade(
                total
            );


        subjects.push({

            subject:
                subject,

            ca:
                Number(
                    ca.toFixed(2)
                ),

            exam:
                Number(
                    exam.toFixed(2)
                ),

            total:
                Number(
                    total.toFixed(2)
                ),

            grade:
                grade.grade,

            remark:
                grade.remark

        });

    }
);


return subjects;


}

/* =========================================================
REPLACE LOCAL RESULT
========================================================= */

function replaceLocalResult(
updatedResult
) {


const index =
    allResults.findIndex(
        result =>
            result.id ===
            updatedResult.id
    );


if (index === -1) {

    allResults.unshift(
        updatedResult
    );

    return;

}


allResults[index] =
    updatedResult;


}

/* =========================================================
LOAD ALL RESULTS
========================================================= */

async function loadAllResults() {


const resultsRef =
    collection(
        db,
        "results"
    );


const resultsQuery =
    query(

        resultsRef,

        where(
            "organizationId",
            "==",
            currentOrganization.id
        )

    );


const snapshot =
    await getDocs(
        resultsQuery
    );


allResults = [];


snapshot.forEach(
    resultDocument => {

        allResults.push({

            id:
                resultDocument.id,

            ...resultDocument.data()

        });

    }
);


allResults.sort(
    sortResults
);


renderExistingResults();


}

/* =========================================================
SORT RESULTS
========================================================= */

function sortResults(a, b) {


const dateA =
    getTimestampMillis(
        a.updatedAt ||
        a.createdAt
    );


const dateB =
    getTimestampMillis(
        b.updatedAt ||
        b.createdAt
    );


return dateB - dateA;


}

/* =========================================================
RENDER EXISTING RESULTS
========================================================= */

function renderExistingResults() {


if (!existingResultsBody) {
    return;
}


const classFilter =
    resultClassFilter?.value ||
    "";


const termFilter =
    resultTermFilter?.value ||
    "";


const search =
    String(
        resultSearch?.value ||
        ""
    )
    .trim()
    .toLowerCase();


const filtered =
    allResults.filter(
        result => {

            const studentNameValue =
                String(
                    result.studentName ||
                    ""
                )
                .toLowerCase();


            const studentIdValue =
                String(
                    result.studentId ||
                    ""
                )
                .toLowerCase();


            const resultClass =
                normalizeClassName(
                    result.className ||
                    ""
                );


            if (
                classFilter &&
                resultClass !==
                classFilter
            ) {

                return false;

            }


            if (
                termFilter &&
                result.term !==
                termFilter
            ) {

                return false;

            }


            if (
                search &&
                !studentNameValue.includes(
                    search
                ) &&
                !studentIdValue.includes(
                    search
                )
            ) {

                return false;

            }


            return true;

        }
    );


existingResultsBody.innerHTML =
    "";


if (!filtered.length) {

    existingResultsEmpty.classList.remove(
        "hidden"
    );

    return;

}


existingResultsEmpty.classList.add(
    "hidden"
);


filtered.forEach(
    result => {

        const row =
            document.createElement(
                "tr"
            );


        const status =
            result.status ===
            "published"
                ? "published"
                : "draft";


        const statusText =
            status === "published"
                ? "Published"
                : "Draft";


        const average =
            Number(
                result.average ||
                0
            ).toFixed(2);


        const studentNameValue =
            result.studentName ||
            "Unnamed Student";


        const studentIdValue =
            result.studentId ||
            "—";


        const className =
            normalizeClassName(
                result.className ||
                "—"
            );


        const position =
            result.position ||
            "—";


        row.innerHTML = `

            <td>
                <strong>
                    ${escapeHTML(studentNameValue)}
                </strong>
            </td>

            <td>
                ${escapeHTML(studentIdValue)}
            </td>

            <td>
                ${escapeHTML(className)}
            </td>

            <td>
                ${escapeHTML(
                    result.academicYear ||
                    "—"
                )}
            </td>

            <td>
                ${escapeHTML(
                    result.term ||
                    "—"
                )}
            </td>

            <td>
                <strong>
                    ${average}%
                </strong>
            </td>

            <td>
                <span class="grade-badge">
                    ${escapeHTML(
                        result.overallGrade ||
                        "—"
                    )}
                </span>
            </td>

            <td>
                ${escapeHTML(position)}
            </td>

            <td>
                <span class="status-badge ${status}">
                    ${statusText}
                </span>
            </td>

            <td>

                <div class="action-buttons">

                    <button
                        class="secondary-button edit-result-button"
                        type="button"
                    >
                        Edit
                    </button>

                    ${
                        status === "draft"
                            ? `
                                <button
                                    class="publish-button publish-existing-button"
                                    type="button"
                                >
                                    Publish
                                </button>
                              `
                            : ""
                    }

                </div>

            </td>

        `;


        row.querySelector(
            ".edit-result-button"
        ).addEventListener(
            "click",
            () => {

                editExistingResult(
                    result
                );

            }
        );


        const publishButton =
            row.querySelector(
                ".publish-existing-button"
            );


        if (publishButton) {

            publishButton.addEventListener(
                "click",
                () => {

                    publishExistingResult(
                        result
                    );

                }
            );

        }


        existingResultsBody.appendChild(
            row
        );

    }
);


}

/* =========================================================
EDIT EXISTING RESULT
========================================================= */

function editExistingResult(
result
) {


currentResult =
    result;


const classItem =
    classes.find(
        item =>
            item.id ===
            result.classId
    );


let student =
    students.find(
        item =>
            item.id ===
            result.studentDocumentId
    );


/*
 * If the current class is different,
 * find the student from all available
 * students by document ID.
 */

if (!student) {

    student =
        findStudentInAllClasses(
            result.studentDocumentId
        );

}


if (!student) {

    alert(
        "The student connected to this result could not be found."
    );

    return;

}


selectedStudent =
    student;


classSelect.value =
    result.classId ||
    "";


academicYear.value =
    result.academicYear ||
    "";


termSelect.value =
    result.term ||
    "Term 1";


/*
 * Load the student's class list.
 * This ensures the student selector
 * matches the selected result.
 */

loadStudentsForClass(
    result.classId
)
.then(
    () => {

        studentSelect.value =
            result.studentDocumentId;


        showResultEditor();

        renderResultIntoEditor(
            result
        );


        resultEditor.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }
)
.catch(
    error => {

        console.error(
            "Edit result error:",
            error
        );

        alert(
            error.message ||
            "Unable to open result."
        );

    }
);


}

/* =========================================================
FIND STUDENT IN ALL CLASSES
========================================================= */

function findStudentInAllClasses(
studentDocumentId
) {


/*
 * First check the currently loaded students.
 */

const local =
    students.find(
        student =>
            student.id ===
            studentDocumentId
    );


if (local) {
    return local;
}


/*
 * Search result cache for basic student
 * information if available.
 */

const result =
    allResults.find(
        item =>
            item.studentDocumentId ===
            studentDocumentId
    );


if (result) {

    return {

        id:
            studentDocumentId,

        studentId:
            result.studentId,

        fullName:
            result.studentName,

        name:
            result.studentName,

        classId:
            result.classId,

        className:
            result.className

    };

}


return null;


}

/* =========================================================
PUBLISH EXISTING RESULT
========================================================= */

async function publishExistingResult(
result
) {


const confirmed =
    window.confirm(
        `Publish the academic result for ${result.studentName || "this student"}?`
    );


if (!confirmed) {
    return;
}


try {

    await updateDoc(

        doc(
            db,
            "results",
            result.id
        ),

        {

            status:
                "published",

            updatedAt:
                serverTimestamp(),

            updatedBy:
                currentUser.uid

        }

    );


    const index =
        allResults.findIndex(
            item =>
                item.id ===
                result.id
        );


    if (index !== -1) {

        allResults[index] = {

            ...allResults[index],

            status:
                "published"

        };

    }


    if (
        currentResult &&
        currentResult.id ===
        result.id
    ) {

        currentResult.status =
            "published";

    }


    renderExistingResults();

    updateDashboardStatistics();


    alert(
        "Result published successfully. It is now available for parent viewing, subject to your Firestore parent-access rules."
    );

}

catch (error) {

    console.error(
        "Publish result error:",
        error
    );


    alert(
        error.message ||
        "Unable to publish result."
    );

}


}

/* =========================================================
CLEAR RESULT
========================================================= */

if (clearResultButton) {


clearResultButton.addEventListener(
    "click",
    clearEditor
);


}

/* =========================================================
CLEAR EDITOR
========================================================= */

function clearEditor() {


currentResult =
    null;


selectedStudent =
    null;


studentSelect.value =
    "";


subjectTableBody.innerHTML =
    "";


clearCommentsAndPosition();


publishResult.checked =
    false;


hideEditor();


studentName.textContent =
    "No Student Selected";


studentDetails.textContent =
    "Select a student to enter academic results.";


setResultStatus(
    "draft"
);


overallSubjects.textContent =
    "0";


overallMarks.textContent =
    "0";


overallAverage.textContent =
    "0%";


overallGrade.textContent =
    "—";


window.scrollTo({

    top: 0,

    behavior: "smooth"

});


}

/* =========================================================
FILTER EVENTS
========================================================= */

if (resultClassFilter) {


resultClassFilter.addEventListener(
    "change",
    renderExistingResults
);


}

if (resultTermFilter) {


resultTermFilter.addEventListener(
    "change",
    renderExistingResults
);


}

if (resultSearch) {


resultSearch.addEventListener(
    "input",
    renderExistingResults
);


}

/* =========================================================
TERM CHANGE
========================================================= */

if (termSelect) {


termSelect.addEventListener(
    "change",
    () => {

        /*
         * Do not silently replace a loaded
         * result when changing term.
         *
         * The user must press Load Student Result.
         */

        if (
            selectedStudent
        ) {

            currentResult =
                null;

            clearEditor();

        }

    }
);


}

/* =========================================================
CLASS CHANGE
========================================================= */

if (academicYear) {


academicYear.addEventListener(
    "change",
    () => {

        if (selectedStudent) {

            currentResult =
                null;

            clearEditor();

        }

    }
);


}

/* =========================================================
STATUS
========================================================= */

function setResultStatus(
status
) {


if (!resultStatus) {
    return;
}


const normalized =
    status === "published"
        ? "published"
        : "draft";


resultStatus.className =
    `result-status ${normalized}`;


resultStatus.textContent =
    normalized === "published"
        ? "Published"
        : "Draft";


}

/* =========================================================
DASHBOARD STATISTICS
========================================================= */

function updateDashboardStatistics() {


if (resultsEntered) {

    resultsEntered.textContent =
        allResults.length;

}


if (publishedResults) {

    publishedResults.textContent =
        allResults.filter(
            result =>
                result.status ===
                "published"
        ).length;

}

}

/* =========================================================
GRADE SYSTEM
========================================================= */

function calculateGrade(score) {


const value =
    Number(score) || 0;


if (value >= 90) {

    return {

        grade:
            "1",

        remark:
            "Excellent"

    };

}


if (value >= 81) {

    return {

        grade:
            "2",

        remark:
            "Very Good"

    };

}


if (value >= 76) {

    return {

        grade:
            "3",

        remark:
            "Good"

    };

}


if (value >= 71) {

    return {

        grade:
            "4",

        remark:
            "Credit"

    };

}


if (value >= 66) {

    return {

        grade:
            "5",

        remark:
            "Credit"

    };

}

if (value >= 56) {

    return {

        grade:
            "6",

        remark:
            "Credit"

    };

}

if (value >= 50) {

    return {

        grade:
            "7",

        remark:
            "Pass"

    };

}

if (value >= 40) {

    return {

        grade:
            "8",

        remark:
            "pass"

    };

}



return {

    grade:
        "9",

    remark:
        "Fail"

};


}

/* =========================================================
NUMBER
========================================================= */

function numberValue(value) {


const number =
    Number(value);


if (
    !Number.isFinite(
        number
    )
) {

    return 0;

}


return Math.max(
    0,
    number
);


}

/* =========================================================
TIMESTAMP
========================================================= */

function getTimestampMillis(
timestamp
) {


if (!timestamp) {
    return 0;
}


if (
    typeof timestamp.toMillis ===
    "function"
) {

    return timestamp.toMillis();

}


if (
    timestamp.seconds
) {

    return (
        Number(
            timestamp.seconds
        ) * 1000
    );

}


if (
    timestamp instanceof Date
) {

    return timestamp.getTime();

}


return 0;


}

/* =========================================================
ESCAPE HTML
========================================================= */

function escapeHTML(value) {


return String(
    value ??
    ""
)

    .replace(
        /&/g,
        "&amp;"
    )

    .replace(
        /</g,
        "&lt;"
    )

    .replace(
        />/g,
        "&gt;"
    )

    .replace(
        /"/g,
        "&quot;"
    )

    .replace(
        /'/g,
        "&#039;"
    );


}

/* =========================================================
BUTTON LOADING
========================================================= */

function setButtonLoading(
button,
text
) {


if (!button) {
    return;
}


button.disabled =
    true;


button.dataset.originalText =
    button.textContent;


button.textContent =
    text;


}

/* =========================================================
RESET BUTTON
========================================================= */

function resetButton(
button,
fallbackText
) {


if (!button) {
    return;
}


button.disabled =
    false;


button.textContent =
    button.dataset.originalText ||
    fallbackText;


delete button.dataset.originalText;


}

/* =========================================================
LOGOUT
========================================================= */

if (logoutButton) {


logoutButton.addEventListener(
    "click",
    async () => {

        try {

            logoutButton.disabled =
                true;


            logoutButton.textContent =
                "Logging out...";


            await signOut(
                auth
            );


            window.location.href =
                "login.html";

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );


            logoutButton.disabled =
                false;


            logoutButton.textContent =
                "Logout";

        }

    }
);


}

/* =========================================================
HIDE LOADING
========================================================= */

function hideLoading() {


if (loadingScreen) {

    loadingScreen.style.display =
        "none";

}


}

/* =========================================================
SHOW ERROR
========================================================= */

function showError(
message
) {


if (loadingScreen) {

    loadingScreen.style.display =
        "none";

}


if (errorScreen) {

    errorScreen.style.display =
        "flex";

}


if (errorMessage) {

    errorMessage.textContent =
        message;

}


}

/* =========================================================
READY
========================================================= */

console.log(
"Virello Academic Results Management loaded successfully."
);
