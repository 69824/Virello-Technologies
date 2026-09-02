/* =========================================================
VIRELLO TECHNOLOGIES
ACADEMIC RESULTS MANAGEMENT

FILE:
js/results.js

FIRESTORE:
results/{resultId}

GRADING SYSTEM:

ALL SUBJECTS:
All entered subjects remain visible on the report.

OFFICIAL FINAL TERM GRADE:
4 teacher-selected compulsory subjects
+
Best 2 subjects from remaining subjects
=
6 subjects used for final grade.

MARK STRUCTURE:
Test = 25
Exam = 75
Total = 100

GRADE SYSTEM:

90 - 100 = Grade 1 - Excellent
81 - 89  = Grade 2 - Very Good
76 - 80  = Grade 3 - Good
71 - 75  = Grade 4 - Credit
66 - 70  = Grade 5 - Credit
56 - 65  = Grade 6 - Credit
50 - 55  = Grade 7 - Pass
40 - 49  = Grade 8 - Pass
0  - 39  = Grade 9 - Fail
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


/* =========================================================
ALL SUBJECTS SUMMARY DOM
========================================================= */

const overallSubjects =
    document.getElementById("overallSubjects");

const overallMarks =
    document.getElementById("overallMarks");

const overallAverage =
    document.getElementById("overallAverage");

const overallGrade =
    document.getElementById("overallGrade");


/* =========================================================
FINAL CALCULATION DOM
========================================================= */

const finalCalculationStatus =
    document.getElementById("finalCalculationStatus");

const compulsorySubjectCount =
    document.getElementById("compulsorySubjectCount");

const bestAdditionalCount =
    document.getElementById("bestAdditionalCount");

const finalSubjectsCount =
    document.getElementById("finalSubjectsCount");

const finalTotalMarks =
    document.getElementById("finalTotalMarks");

const finalAverage =
    document.getElementById("finalAverage");

const finalGrade =
    document.getElementById("finalGrade");

const selectedCompulsorySubjects =
    document.getElementById("selectedCompulsorySubjects");

const selectedBestSubjects =
    document.getElementById("selectedBestSubjects");

const finalCalculationWarning =
    document.getElementById("finalCalculationWarning");


/* =========================================================
EXISTING RESULTS DOM
========================================================= */

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

    "Grade 4A",
    "Grade 4B",

    "Grade 5A",
    "Grade 5B",

    "Grade 6A",
    "Grade 6B",

    "Grade 7A",
    "Grade 7B",

    "Grade 8A",
    "Grade 8B",

    "Grade 9A",
    "Grade 9B"

];


/* =========================================================
DEFAULT SUBJECTS
========================================================= */

const DEFAULT_SUBJECTS = [

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
    "P.H.E"

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


    const gradeSectionMatch =
        lower.match(
            /^grade\s*(1|2|3|4|5|6|7|8|9)\s*([ab])$/
        );


    if (gradeSectionMatch) {

        return `Grade ${gradeSectionMatch[1]}${gradeSectionMatch[2].toUpperCase()}`;

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
LOAD EXISTING RESULT
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


    DEFAULT_SUBJECTS.forEach(
        (subject, index) => {

            /*
             * First four are initially selected
             * as compulsory subjects.
             *
             * Teacher can change them.
             */

            addSubjectRow(
                subject,
                "",
                "",
                index < 4
            );

        }
    );


    calculateOverall();

}


/* =========================================================
RENDER EXISTING RESULT
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

                const isCompulsory =
                    item.isCompulsory === true
                        ? true
                        : detectLegacyCompulsorySubject(
                            item.subject
                        );


                addSubjectRow(

                    item.subject ||
                    "",

                    item.ca ?? "",

                    item.exam ?? "",

                    isCompulsory

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
LEGACY COMPULSORY DETECTION
========================================================= */

function detectLegacyCompulsorySubject(
    subject
) {

    const normalized =
        String(
            subject ||
            ""
        )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );


    const normalizedWithoutPeriods =
        normalized.replace(
            /\./g,
            ""
        );


    const normalizedWithoutSpaces =
        normalizedWithoutPeriods.replace(
            /\s+/g,
            ""
        );


    if (
        normalized ===
        "english language"
    ) {

        return true;

    }


    if (
        normalized ===
        "mathematics"
    ) {

        return true;

    }


    if (
        normalized ===
        "science"
    ) {

        return true;

    }


    if (
        normalized ===
        "social & env. studies" ||

        normalized ===
        "social and env. studies" ||

        normalized ===
        "social & environmental studies" ||

        normalizedWithoutSpaces ===
        "ses"
    ) {

        return true;

    }


    return false;

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
ADD SUBJECT BUTTON
========================================================= */

if (addSubjectButton) {

    addSubjectButton.addEventListener(
        "click",
        () => {

            addSubjectRow(
                "",
                "",
                "",
                false
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
    exam,
    isCompulsory = false
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


        <td class="compulsory-cell">

            <input
                type="checkbox"
                class="compulsory-input"
                title="Count this subject as one of the 4 compulsory subjects"
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
                title="Remove subject"
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


    const compulsoryInput =
        row.querySelector(
            ".compulsory-input"
        );


    subjectInput.value =
        subject || "";


    caInput.value =
        ca ?? "";


    examInput.value =
        exam ?? "";


    compulsoryInput.checked =
        Boolean(
            isCompulsory
        );


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
        () => {

            calculateOverall();

        }
    );


    compulsoryInput.addEventListener(
        "change",
        () => {

            enforceCompulsoryLimit(
                compulsoryInput
            );

            calculateOverall();

        }
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
ENFORCE 4 COMPULSORY SUBJECTS
========================================================= */

function enforceCompulsoryLimit(
    changedCheckbox
) {

    const checked =
        Array.from(
            subjectTableBody.querySelectorAll(
                ".compulsory-input:checked"
            )
        );


    if (checked.length > 4) {

        changedCheckbox.checked =
            false;


        alert(
            "You can select only 4 compulsory subjects."
        );

    }

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
CALCULATE ALL SUBJECTS SUMMARY
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
        subjectCount
            ? grade.grade
            : "—";


    calculateFinalTermGrade();

}


/* =========================================================
CALCULATE FINAL TERM GRADE
========================================================= */

function calculateFinalTermGrade() {

    if (!subjectTableBody) {

        return {

            valid: false,

            compulsorySubjects: [],

            bestAdditionalSubjects: [],

            subjectsCounted: [],

            totalMarks: 0,

            average: 0,

            grade: calculateGrade(0).grade,

            remark: calculateGrade(0).remark

        };

    }


    const rows =
        Array.from(
            subjectTableBody.querySelectorAll(
                "tr"
            )
        );


    const subjects = [];


    rows.forEach(
        row => {

            const subjectName =
                row.querySelector(
                    ".subject-input"
                ).value.trim();


            if (!subjectName) {
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


            const isCompulsory =
                row.querySelector(
                    ".compulsory-input"
                ).checked;


            subjects.push({

                row,

                subject:
                    subjectName,

                ca,

                exam,

                total,

                grade:
                    grade.grade,

                remark:
                    grade.remark,

                isCompulsory

            });

        }
    );


    const compulsorySubjects =
        subjects.filter(
            item =>
                item.isCompulsory
        );


    const nonCompulsorySubjects =
        subjects.filter(
            item =>
                !item.isCompulsory
        );


    /*
     * Best 2 remaining subjects.
     *
     * Highest total mark wins.
     *
     * If marks are equal, the earlier
     * subject remains first.
     */

    const bestAdditionalSubjects =
        [...nonCompulsorySubjects]
        .sort(
            (a, b) =>
                b.total -
                a.total
        )
        .slice(
            0,
            2
        );


    const subjectsCounted = [

        ...compulsorySubjects,

        ...bestAdditionalSubjects

    ];


    const valid =
        compulsorySubjects.length === 4 &&
        bestAdditionalSubjects.length === 2;


    let totalMarks =
        0;


    subjectsCounted.forEach(
        item => {

            totalMarks +=
                item.total;

        }
    );


    const average =
        subjectsCounted.length
            ? totalMarks /
              subjectsCounted.length
            : 0;


    const grade =
        calculateGrade(
            average
        );


    /*
     * Update row visual indicators.
     */

    subjects.forEach(
        item => {

            const counted =
                subjectsCounted.some(
                    selected =>
                        selected.row ===
                        item.row
                );


            item.row.classList.toggle(
                "subject-row-counted",
                counted
            );


            const subjectInput =
                item.row.querySelector(
                    ".subject-input"
                );


            let existingBadge =
                item.row.querySelector(
                    ".counted-indicator"
                );


            if (existingBadge) {

                existingBadge.remove();

            }


            if (counted) {

                const badge =
                    document.createElement(
                        "span"
                    );


                badge.className =
                    item.isCompulsory
                        ? "counted-badge counted-indicator"
                        : "best-badge counted-indicator";


                badge.textContent =
                    item.isCompulsory
                        ? "Compulsory"
                        : "Best 2";


                subjectInput.insertAdjacentElement(
                    "afterend",
                    badge
                );

            }

        }
    );


    updateFinalCalculationUI(
        compulsorySubjects,
        bestAdditionalSubjects,
        subjectsCounted,
        totalMarks,
        average,
        grade,
        valid
    );


    return {

        valid,

        compulsorySubjects,

        bestAdditionalSubjects,

        subjectsCounted,

        totalMarks,

        average,

        grade:
            grade.grade,

        remark:
            grade.remark

    };

}


/* =========================================================
UPDATE FINAL CALCULATION UI
========================================================= */

function updateFinalCalculationUI(
    compulsorySubjects,
    bestAdditionalSubjects,
    subjectsCounted,
    totalMarks,
    average,
    grade,
    valid
) {

    if (compulsorySubjectCount) {

        compulsorySubjectCount.textContent =
            compulsorySubjects.length;

    }


    if (bestAdditionalCount) {

        bestAdditionalCount.textContent =
            bestAdditionalSubjects.length;

    }


    if (finalSubjectsCount) {

        finalSubjectsCount.textContent =
            subjectsCounted.length;

    }


    if (finalTotalMarks) {

        finalTotalMarks.textContent =
            totalMarks.toFixed(2);

    }


    if (finalAverage) {

        finalAverage.textContent =
            `${average.toFixed(2)}%`;

    }


    if (finalGrade) {

        finalGrade.textContent =
            valid
                ? grade.grade
                : "—";

    }


    if (selectedCompulsorySubjects) {

        selectedCompulsorySubjects.innerHTML =
            "";


        if (!compulsorySubjects.length) {

            selectedCompulsorySubjects.innerHTML = `
                <li>
                    <span>None selected</span>
                </li>
            `;

        }

        else {

            compulsorySubjects.forEach(
                item => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    li.innerHTML = `

                        <span>
                            ${escapeHTML(
                                item.subject
                            )}
                        </span>

                        <strong>
                            ${item.total.toFixed(2)}
                        </strong>

                    `;


                    selectedCompulsorySubjects.appendChild(
                        li
                    );

                }
            );

        }

    }


    if (selectedBestSubjects) {

        selectedBestSubjects.innerHTML =
            "";


        if (!bestAdditionalSubjects.length) {

            selectedBestSubjects.innerHTML = `
                <li>
                    <span>None selected</span>
                </li>
            `;

        }

        else {

            bestAdditionalSubjects.forEach(
                item => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    li.innerHTML = `

                        <span>
                            ${escapeHTML(
                                item.subject
                            )}
                        </span>

                        <strong>
                            ${item.total.toFixed(2)}
                        </strong>

                    `;


                    selectedBestSubjects.appendChild(
                        li
                    );

                }
            );

        }

    }


    if (finalCalculationStatus) {

        finalCalculationStatus.className =
            "final-calculation-status";


        if (valid) {

            finalCalculationStatus.classList.add(
                "ready"
            );


            finalCalculationStatus.textContent =
                "Ready — 6 subjects selected";

        }

        else if (
            compulsorySubjects.length > 4
        ) {

            finalCalculationStatus.classList.add(
                "warning"
            );


            finalCalculationStatus.textContent =
                "Too many compulsory subjects";

        }

        else {

            finalCalculationStatus.classList.add(
                "warning"
            );


            finalCalculationStatus.textContent =
                "Final calculation incomplete";

        }

    }


    if (finalCalculationWarning) {

        if (
            compulsorySubjects.length !== 4
        ) {

            finalCalculationWarning.textContent =
                `Please select exactly 4 compulsory subjects. Currently ${compulsorySubjects.length} are selected.`;

            finalCalculationWarning.style.display =
                "block";

        }

        else if (
            bestAdditionalSubjects.length < 2
        ) {

            finalCalculationWarning.textContent =
                "At least 2 additional subjects are required so the system can select the best 2.";

            finalCalculationWarning.style.display =
                "block";

        }

        else {

            finalCalculationWarning.textContent =
                "Calculation complete. The official final grade is based on the 4 compulsory subjects and the best 2 remaining subjects.";

            finalCalculationWarning.style.display =
                "block";

        }

    }

}


/* =========================================================
SAVE BUTTON
========================================================= */

if (saveResultButton) {

    saveResultButton.addEventListener(
        "click",
        saveResult
    );

}


/* =========================================================
SAVE RESULT
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


    /*
     * Calculate official final grade.
     */

    const calculation =
        calculateFinalTermGrade();


    /*
     * The school rule requires
     * exactly 4 compulsory subjects
     * and 2 additional subjects.
     */

    if (
        calculation.compulsorySubjects.length !== 4
    ) {

        alert(
            `Please select exactly 4 compulsory subjects. You currently have ${calculation.compulsorySubjects.length}.`
        );

        return;

    }


    if (
        calculation.bestAdditionalSubjects.length !== 2
    ) {

        alert(
            "At least 2 non-compulsory subjects with marks are required so the system can select the best 2."
        );

        return;

    }


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


    /*
     * Convert calculation subjects
     * to clean Firestore-safe objects.
     */

    const compulsorySubjects =
        calculation.compulsorySubjects.map(
            item => ({

                subject:
                    item.subject,

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                remark:
                    item.remark

            })
        );


    const bestAdditionalSubjects =
        calculation.bestAdditionalSubjects.map(
            item => ({

                subject:
                    item.subject,

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                remark:
                    item.remark

            })
        );


    const finalSubjects =
        calculation.subjectsCounted.map(
            item => ({

                subject:
                    item.subject,

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                remark:
                    item.remark,

                isCompulsory:
                    item.isCompulsory

            })
        );


    /*
     * Official result data.
     *
     * totalMarks / average / overallGrade
     * now represent the school's OFFICIAL
     * 6-subject final calculation.
     */

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

        /*
         * OFFICIAL FINAL CALCULATION
         */

        totalMarks:
            Number(
                calculation.totalMarks.toFixed(2)
            ),

        average:
            Number(
                calculation.average.toFixed(2)
            ),

        overallGrade:
            calculation.grade,

        overallRemark:
            calculation.remark,

        /*
         * Store the exact calculation
         * for future report-card rendering.
         */

        finalCalculation: {

            rule:
                "4 compulsory subjects + best 2 additional subjects",

            compulsorySubjects:
                compulsorySubjects,

            bestAdditionalSubjects:
                bestAdditionalSubjects,

            subjectsCounted:
                finalSubjects,

            subjectsCount:
                finalSubjects.length,

            totalMarks:
                Number(
                    calculation.totalMarks.toFixed(2)
                ),

            average:
                Number(
                    calculation.average.toFixed(2)
                ),

            grade:
                calculation.grade,

            remark:
                calculation.remark

        },

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
         * Find an existing result first.
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
         * Update local results immediately.
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


        const studentDisplayName =
            selectedStudent.fullName ||
            selectedStudent.name ||
            "student";


        alert(

            isPublished

                ? `Academic result saved and published for ${studentDisplayName}.`

                : `Academic result saved as a draft for ${studentDisplayName}.`

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


            const isCompulsory =
                row.querySelector(
                    ".compulsory-input"
                ).checked;


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
                    grade.remark,

                isCompulsory:
                    isCompulsory

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
                    result.average ??
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
                        ${escapeHTML(
                            studentNameValue
                        )}
                    </strong>

                </td>


                <td>
                    ${escapeHTML(
                        studentIdValue
                    )}
                </td>


                <td>
                    ${escapeHTML(
                        className
                    )}
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
                    ${escapeHTML(
                        position
                    )}
                </td>


                <td>

                    <span
                        class="status-badge ${status}"
                    >
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

                behavior:
                    "smooth",

                block:
                    "start"

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

    const local =
        students.find(
            student =>
                student.id ===
                studentDocumentId
        );


    if (local) {
        return local;
    }


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

    /*
     * Before publishing, verify that the result
     * has the required final calculation.
     */

    const hasValidFinalCalculation =
        result.finalCalculation &&
        Array.isArray(
            result.finalCalculation.compulsorySubjects
        ) &&
        result.finalCalculation.compulsorySubjects.length === 4 &&
        Array.isArray(
            result.finalCalculation.bestAdditionalSubjects
        ) &&
        result.finalCalculation.bestAdditionalSubjects.length === 2;


    if (!hasValidFinalCalculation) {

        alert(
            "This result does not contain the required 4 compulsory subjects and best 2 additional subjects. Please edit and save the result before publishing."
        );

        return;

    }


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
CLEAR RESULT BUTTON
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


    resetFinalCalculationUI();


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


/* =========================================================
RESET FINAL CALCULATION UI
========================================================= */

function resetFinalCalculationUI() {

    if (compulsorySubjectCount) {

        compulsorySubjectCount.textContent =
            "0";

    }


    if (bestAdditionalCount) {

        bestAdditionalCount.textContent =
            "0";

    }


    if (finalSubjectsCount) {

        finalSubjectsCount.textContent =
            "0";

    }


    if (finalTotalMarks) {

        finalTotalMarks.textContent =
            "0";

    }


    if (finalAverage) {

        finalAverage.textContent =
            "0%";

    }


    if (finalGrade) {

        finalGrade.textContent =
            "—";

    }


    if (selectedCompulsorySubjects) {

        selectedCompulsorySubjects.innerHTML = `
            <li>
                <span>None selected</span>
            </li>
        `;

    }


    if (selectedBestSubjects) {

        selectedBestSubjects.innerHTML = `
            <li>
                <span>None selected</span>
            </li>
        `;

    }


    if (finalCalculationStatus) {

        finalCalculationStatus.className =
            "final-calculation-status warning";


        finalCalculationStatus.textContent =
            "Select 4 compulsory subjects";

    }


    if (finalCalculationWarning) {

        finalCalculationWarning.textContent =
            "Select exactly 4 compulsory subjects before saving.";

        finalCalculationWarning.style.display =
            "block";

    }

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
ACADEMIC YEAR CHANGE
========================================================= */

if (academicYear) {

    academicYear.addEventListener(
        "change",
        () => {

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

function calculateGrade(
    score
) {

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
                "Pass"

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

function numberValue(
    value
) {

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

function escapeHTML(
    value
) {

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
