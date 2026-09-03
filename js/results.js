/* =========================================================
   VIRELLO TECHNOLOGIES
   ACADEMIC RESULTS MANAGEMENT
   =========================================================

   Firestore:
   results/{resultId}

   OFFICIAL FINAL GRADE:

   4 compulsory subjects
   +
   best 2 subjects from all remaining subjects

   Grade 1 = best
   Grade 9 = lowest

   Mark structure:
   Test = 25
   Exam = 75
   Total = 100

   RESULT ACCESS CODE:

   Example:
   VR-8K4P-29XQ

   VERIFICATION:

   Every Firestore result document has a permanent
   verification URL based on its Firestore document ID.

   Published result:
   result-verify.html?id=FIRESTORE_RESULT_ID

   Draft results cannot be publicly verified because
   the verification page only accepts published results.
   ========================================================= */


/* =========================================================
   FIREBASE
   ========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
    document.getElementById("positionInput");

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
   ALL SUBJECTS SUMMARY
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
   FINAL CALCULATION
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
   EXISTING RESULTS
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
   MARK LIMITS
   ========================================================= */

const TEST_MAX = 25;
const EXAM_MAX = 75;
const TOTAL_MAX = 100;


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


function startResults() {

    onAuthStateChanged(
        auth,
        async user => {

            if (!user) {

                window.location.href =
                    "login.html";

                return;

            }


            currentUser =
                user;


            try {

                if (adminName) {

                    adminName.textContent =
                        user.displayName ||
                        user.email ||
                        "Administrator";

                }


                await loadOrganization();

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
                    "Results startup error:",
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

        throw new Error(
            "No organization was found for your account."
        );

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
            currentOrganization.name ||
            currentOrganization.organizationName ||
            "Virello Organization";

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


    const classesQuery =
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
            classesQuery
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

function normalizeClassName(
    value
) {

    const input =
        String(
            value ||
            ""
        )
        .trim()
        .replace(
            /\s+/g,
            " "
        );


    if (!input) {
        return "";
    }


    const nurseryMatch =
        input.match(
            /^nursery\s*([1-3])$/i
        );


    if (nurseryMatch) {

        return `Nursery ${nurseryMatch[1]}`;

    }


    const gradeMatch =
        input.match(
            /^grade\s*([1-9])\s*([ab])?$/i
        );


    if (gradeMatch) {

        const number =
            gradeMatch[1];

        const section =
            gradeMatch[2]
                ? gradeMatch[2].toUpperCase()
                : "";


        return `Grade ${number}${section}`;

    }


    return input;

}


/* =========================================================
   POPULATE CLASS SELECT
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
        item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.id;


            option.textContent =
                normalizeClassName(
                    item.className ||
                    item.name ||
                    "Unnamed Class"
                );


            classSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   POPULATE RESULT CLASS FILTER
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
        item => {

            const option =
                document.createElement(
                    "option"
                );


            const name =
                normalizeClassName(
                    item.className ||
                    item.name ||
                    ""
                );


            option.value =
                name;


            option.textContent =
                name;


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

            currentResult =
                null;

            selectedStudent =
                null;


            hideEditor();


            if (!classSelect.value) {

                studentSelect.innerHTML = `
                    <option value="">
                        Select Student
                    </option>
                `;

                return;

            }


            try {

                await loadStudentsForClass(
                    classSelect.value
                );

            }

            catch (error) {

                console.error(
                    "Load students error:",
                    error
                );

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


            const inactive =
                data.active === false;


            const left =
                data.status === "left" ||
                data.status === "graduated";


            if (
                inactive ||
                left
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
                ).toLowerCase();


            const nameB =
                String(
                    b.fullName ||
                    b.name ||
                    ""
                ).toLowerCase();


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
   POPULATE STUDENT SELECT
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


            const id =
                student.studentId ||
                "No ID";


            option.textContent =
                `${name} — ${id}`;


            studentSelect.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD RESULT BUTTON
   ========================================================= */

if (loadResultButton) {

    loadResultButton.addEventListener(
        "click",
        loadSelectedResult
    );

}


async function loadSelectedResult() {

    if (!classSelect.value) {

        alert(
            "Please select a class."
        );

        return;

    }


    if (!studentSelect.value) {

        alert(
            "Please select a student."
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


    selectedStudent =
        students.find(
            item =>
                item.id ===
                studentSelect.value
        );


    if (!selectedStudent) {

        alert(
            "Student could not be found."
        );

        return;

    }


    await loadExistingResultForStudent();

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
        result =>

            result.studentDocumentId ===
            studentDocumentId &&

            result.academicYear ===
            year &&

            result.term ===
            term

    ) || null;

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

    finally {

        resetButton(
            loadResultButton,
            "Load Result"
        );

    }

}


/* =========================================================
   SHOW RESULT EDITOR
   ========================================================= */

function showResultEditor() {

    if (!resultEditor) {
        return;
    }


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
        selectedStudent?.fullName ||
        selectedStudent?.name ||
        "Unnamed Student";


    const id =
        selectedStudent?.studentId ||
        "—";


    const className =
        normalizeClassName(
            classItem?.className ||
            classItem?.name ||
            selectedStudent?.className ||
            ""
        );


    studentName.textContent =
        name;


    studentDetails.textContent =
        `${id} • ${className}`;


    displayStudentId.textContent =
        id;


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

    if (resultEditor) {

        resultEditor.classList.add(
            "hidden"
        );

    }

}


/* =========================================================
   CREATE DEFAULT SUBJECTS
   ========================================================= */

function createDefaultSubjects() {

    subjectTableBody.innerHTML =
        "";


    DEFAULT_SUBJECTS.forEach(
        (subject, index) => {

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
   RENDER RESULT INTO EDITOR
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


    subjects.forEach(
        item => {

            const compulsory =
                item.isCompulsory === true ||
                detectLegacyCompulsorySubject(
                    item.subject
                );


            addSubjectRow(

                item.subject ||
                "",

                item.ca ?? "",

                item.exam ?? "",

                compulsory

            );

        }
    );


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
        result.status
    );

}


/* =========================================================
   LEGACY COMPULSORY SUBJECT DETECTION
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
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        );


    return (

        normalized ===
            "ENGLISH LANGUAGE" ||

        normalized ===
            "MATHEMATICS" ||

        normalized ===
            "SCIENCE" ||

        normalized ===
            "SOCIAL & ENV. STUDIES" ||

        normalized ===
            "SOCIAL AND ENVIRONMENTAL STUDIES" ||

        normalized ===
            "SOCIAL & ENVIRONMENTAL STUDIES" ||

        normalized ===
            "SOCIAL ENVIRONMENTAL STUDIES" ||

        normalized ===
            "SES"

    );

}


/* =========================================================
   CLEAR COMMENTS AND POSITION
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
    subject = "",
    ca = "",
    exam = "",
    isCompulsory = false
) {

    const row =
        document.createElement(
            "tr"
        );


    row.innerHTML = `

        <td>

            <div class="subject-input-wrapper">

                <input
                    type="text"
                    class="subject-input"
                    value="${escapeHTML(subject)}"
                    placeholder="Subject"
                >

            </div>

        </td>


        <td>

            <input
                type="checkbox"
                class="compulsory-input"
                ${isCompulsory ? "checked" : ""}
            >

        </td>


        <td>

            <input
                type="number"
                class="ca-input"
                min="0"
                max="${TEST_MAX}"
                step="0.01"
                value="${escapeHTML(ca)}"
                placeholder="0"
            >

        </td>


        <td>

            <input
                type="number"
                class="exam-input"
                min="0"
                max="${EXAM_MAX}"
                step="0.01"
                value="${escapeHTML(exam)}"
                placeholder="0"
            >

        </td>


        <td class="total-cell">
            0.00
        </td>


        <td>

            <span class="grade-badge">
                9
            </span>

        </td>


        <td class="remark">
            Fail
        </td>


        <td>

            <button
                type="button"
                class="remove-subject-button"
            >
                Remove
            </button>

        </td>

    `;


    subjectTableBody.appendChild(
        row
    );


    const caInput =
        row.querySelector(
            ".ca-input"
        );


    const examInput =
        row.querySelector(
            ".exam-input"
        );


    const subjectInput =
        row.querySelector(
            ".subject-input"
        );


    const compulsoryInput =
        row.querySelector(
            ".compulsory-input"
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
        calculateOverall
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
        ".remove-subject-button"
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

    const caInput =
        row.querySelector(
            ".ca-input"
        );


    const examInput =
        row.querySelector(
            ".exam-input"
        );


    const ca =
        clamp(
            numberValue(
                caInput.value
            ),
            0,
            TEST_MAX
        );


    const exam =
        clamp(
            numberValue(
                examInput.value
            ),
            0,
            EXAM_MAX
        );


    const total =
        Math.min(
            TOTAL_MAX,
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
   CHECK SUBJECT MARKS
   ========================================================= */

function subjectHasMarks(row) {

    const caValue =
        String(
            row.querySelector(
                ".ca-input"
            ).value ||
            ""
        ).trim();


    const examValue =
        String(
            row.querySelector(
                ".exam-input"
            ).value ||
            ""
        ).trim();


    return (
        caValue !== "" ||
        examValue !== ""
    );

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
                clamp(
                    numberValue(
                        row.querySelector(
                            ".ca-input"
                        ).value
                    ),
                    0,
                    TEST_MAX
                );


            const exam =
                clamp(
                    numberValue(
                        row.querySelector(
                            ".exam-input"
                        ).value
                    ),
                    0,
                    EXAM_MAX
                );


            totalMarks +=
                Math.min(
                    TOTAL_MAX,
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


    if (overallSubjects) {

        overallSubjects.textContent =
            subjectCount;

    }


    if (overallMarks) {

        overallMarks.textContent =
            totalMarks.toFixed(2);

    }


    if (overallAverage) {

        overallAverage.textContent =
            `${average.toFixed(2)}%`;

    }


    if (overallGrade) {

        overallGrade.textContent =
            subjectCount
                ? grade.grade
                : "—";

    }


    calculateFinalTermGrade();

}


/* =========================================================
   CALCULATE OFFICIAL FINAL TERM GRADE
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

            aggregate: 0,

            grade: "—",

            remark: "Incomplete"

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
        (row, rowIndex) => {

            const subjectName =
                row.querySelector(
                    ".subject-input"
                ).value.trim();


            if (!subjectName) {
                return;
            }


            const ca =
                clamp(
                    numberValue(
                        row.querySelector(
                            ".ca-input"
                        ).value
                    ),
                    0,
                    TEST_MAX
                );


            const exam =
                clamp(
                    numberValue(
                        row.querySelector(
                            ".exam-input"
                        ).value
                    ),
                    0,
                    EXAM_MAX
                );


            const total =
                Math.min(
                    TOTAL_MAX,
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


            const hasMarks =
                subjectHasMarks(
                    row
                );


            subjects.push({

                row,

                rowIndex,

                subject:
                    subjectName,

                ca,

                exam,

                total,

                grade:
                    grade.grade,

                gradeNumber:
                    Number(
                        grade.grade
                    ),

                remark:
                    grade.remark,

                isCompulsory,

                hasMarks

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
                !item.isCompulsory &&
                item.hasMarks
        );


    const bestAdditionalSubjects =
        [...nonCompulsorySubjects]
        .sort(
            (a, b) => {

                if (
                    a.gradeNumber !==
                    b.gradeNumber
                ) {

                    return (
                        a.gradeNumber -
                        b.gradeNumber
                    );

                }


                return (
                    b.total -
                    a.total
                );

            }
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


    const aggregate =
        subjectsCounted.reduce(
            (sum, item) => {

                return (
                    sum +
                    Number(
                        item.gradeNumber
                    )
                );

            },
            0
        );


    const totalMarks =
        subjectsCounted.reduce(
            (sum, item) => {

                return (
                    sum +
                    Number(
                        item.total
                    )
                );

            },
            0
        );


    const average =
        subjectsCounted.length
            ? totalMarks /
              subjectsCounted.length
            : 0;


    const averageGrade =
        calculateGrade(
            average
        );


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

        aggregate,

        averageGrade,

        valid

    );


    return {

        valid,

        compulsorySubjects,

        bestAdditionalSubjects,

        subjectsCounted,

        totalMarks,

        average,

        aggregate,

        grade:
            valid
                ? String(
                    aggregate
                )
                : "—",

        remark:
            valid
                ? averageGrade.remark
                : "Incomplete"

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

    aggregate,

    averageGrade,

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
            valid
                ? String(
                    aggregate
                )
                : "—";

    }


    if (finalAverage) {

        finalAverage.textContent =
            subjectsCounted.length
                ? `${average.toFixed(2)}%`
                : "0%";

    }


    if (finalGrade) {

        finalGrade.textContent =
            valid
                ? String(
                    aggregate
                )
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
                            Grade ${escapeHTML(
                                item.grade
                            )}
                            ·
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
                            Grade ${escapeHTML(
                                item.grade
                            )}
                            ·
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
                `Ready — Aggregate ${aggregate}`;

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

        else if (
            compulsorySubjects.length < 4
        ) {

            finalCalculationStatus.classList.add(
                "warning"
            );


            finalCalculationStatus.textContent =
                `Need ${4 - compulsorySubjects.length} more compulsory subject(s)`;

        }

        else if (
            bestAdditionalSubjects.length < 2
        ) {

            finalCalculationStatus.classList.add(
                "warning"
            );


            finalCalculationStatus.textContent =
                "Need at least 2 additional subjects with marks";

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
                "At least 2 additional subjects with marks are required so the system can automatically select the best 2 grade numbers.";

            finalCalculationWarning.style.display =
                "block";

        }

        else {

            finalCalculationWarning.textContent =
                `Calculation complete. The official aggregate is ${aggregate}. It is calculated by adding the 4 compulsory grade numbers and the 2 lowest grade numbers from the remaining subjects. Final average: ${average.toFixed(2)}%.`;

            finalCalculationWarning.style.display =
                "block";

        }

    }

}


/* =========================================================
   RESULT ACCESS CODE
   ========================================================= */

function generateResultAccessCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    const getRandomCharacter =
        () => {

            if (
                window.crypto &&
                window.crypto.getRandomValues
            ) {

                const array =
                    new Uint32Array(1);


                window.crypto.getRandomValues(
                    array
                );


                return characters[
                    array[0] %
                    characters.length
                ];

            }


            return characters[
                Math.floor(
                    Math.random() *
                    characters.length
                )
            ];

        };


    let firstPart =
        "";

    let secondPart =
        "";


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        firstPart +=
            getRandomCharacter();

    }


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        secondPart +=
            getRandomCharacter();

    }


    return `VR-${firstPart}-${secondPart}`;

}


/* =========================================================
   UNIQUE ACCESS CODE
   ========================================================= */

async function generateUniqueResultAccessCode() {

    let attempts =
        0;


    while (
        attempts < 10
    ) {

        const code =
            generateResultAccessCode();


        const existingLocal =
            allResults.find(
                result =>
                    result.resultAccessCode ===
                    code
            );


        if (existingLocal) {

            attempts++;

            continue;

        }


        try {

            const resultsRef =
                collection(
                    db,
                    "results"
                );


            const codeQuery =
                query(

                    resultsRef,

                    where(
                        "resultAccessCode",
                        "==",
                        code
                    )

                );


            const snapshot =
                await getDocs(
                    codeQuery
                );


            if (snapshot.empty) {

                return code;

            }

        }

        catch (error) {

            console.warn(
                "Result code uniqueness check failed. Using generated code.",
                error
            );


            return code;

        }


        attempts++;

    }


    return generateResultAccessCode();

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


    const calculation =
        calculateFinalTermGrade();


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
            "At least 2 additional subjects with marks are required so the system can select the best 2."
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


    const compulsorySubjects =
        calculation.compulsorySubjects.map(
            item => ({

                subject:
                    item.subject,

                ca:
                    Number(
                        item.ca.toFixed(2)
                    ),

                exam:
                    Number(
                        item.exam.toFixed(2)
                    ),

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                gradeNumber:
                    Number(
                        item.gradeNumber
                    ),

                remark:
                    item.remark

            })
        );


    const bestAdditionalSubjects =
        calculation.bestAdditionalSubjects.map(
            item => ({

                subject:
                    item.subject,

                ca:
                    Number(
                        item.ca.toFixed(2)
                    ),

                exam:
                    Number(
                        item.exam.toFixed(2)
                    ),

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                gradeNumber:
                    Number(
                        item.gradeNumber
                    ),

                remark:
                    item.remark

            })
        );


    const finalSubjects =
        calculation.subjectsCounted.map(
            item => ({

                subject:
                    item.subject,

                ca:
                    Number(
                        item.ca.toFixed(2)
                    ),

                exam:
                    Number(
                        item.exam.toFixed(2)
                    ),

                total:
                    Number(
                        item.total.toFixed(2)
                    ),

                grade:
                    item.grade,

                gradeNumber:
                    Number(
                        item.gradeNumber
                    ),

                remark:
                    item.remark,

                isCompulsory:
                    item.isCompulsory,

                selectedForFinalCalculation:
                    true

            })
        );


    let resultAccessCode =
        currentResult?.resultAccessCode ||
        currentResult?.resultCode ||
        null;


    if (!resultAccessCode) {

        resultAccessCode =
            await generateUniqueResultAccessCode();

    }


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

        resultAccessCode:
            resultAccessCode,

        subjects:
            subjects,

        subjectCount:
            subjects.length,

        allSubjectsTotalMarks:
            Number(
                subjects.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.total ||
                            0
                        ),
                    0
                ).toFixed(2)
            ),

        allSubjectsAverage:
            Number(
                (
                    subjects.length
                        ? subjects.reduce(
                            (sum, item) =>
                                sum +
                                Number(
                                    item.total ||
                                    0
                                ),
                            0
                        ) /
                        subjects.length
                        : 0
                ).toFixed(2)
            ),

        totalMarks:
            Number(
                calculation.totalMarks.toFixed(2)
            ),

        average:
            Number(
                calculation.average.toFixed(2)
            ),

        aggregate:
            Number(
                calculation.aggregate
            ),

        overallGrade:
            calculation.grade,

        overallRemark:
            calculation.remark,

        finalCalculation: {

            rule:
                "4 compulsory grade numbers + best 2 lowest grade numbers from remaining subjects",

            compulsoryRule:
                "Exactly 4 teacher-selected compulsory subjects",

            additionalRule:
                "Automatically select the 2 remaining subjects with the lowest grade numbers; if tied, higher total mark wins",

            gradeSystem:
                "Grade 1 is best and Grade 9 is lowest",

            markStructure: {

                test: 25,

                exam: 75,

                total: 100

            },

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

            aggregate:
                Number(
                    calculation.aggregate
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

            const existingCode =
                existing.resultAccessCode ||
                existing.resultCode ||
                null;


            if (existingCode) {

                resultData.resultAccessCode =
                    existingCode;

            }


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

                ? `Academic result saved and published for ${studentDisplayName}.\n\nResult Access Code: ${resultAccessCode}\n\nAggregate: ${calculation.aggregate}\nAverage: ${calculation.average.toFixed(2)}%.\n\nA QR verification code is now available in the results list.`

                : `Academic result saved as a draft for ${studentDisplayName}.\n\nResult Access Code: ${resultAccessCode}\n\nAggregate: ${calculation.aggregate}\nAverage: ${calculation.average.toFixed(2)}%.`

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
                clamp(
                    numberValue(
                        row.querySelector(
                            ".ca-input"
                        ).value
                    ),
                    0,
                    TEST_MAX
                );


            const exam =
                clamp(
                    numberValue(
                        row.querySelector(
                            ".exam-input"
                        ).value
                    ),
                    0,
                    EXAM_MAX
                );


            const total =
                Math.min(
                    TOTAL_MAX,
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

                gradeNumber:
                    Number(
                        grade.grade
                    ),

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


            const aggregate =
                result.aggregate ??
                result.finalCalculation?.aggregate ??
                result.overallGrade ??
                "—";


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
                            aggregate
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

                        ${
                            status === "published"
                                ? `

                                    <button
                                        class="secondary-button qr-result-button"
                                        type="button"
                                    >
                                        QR Verify
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


            const qrButton =
                row.querySelector(
                    ".qr-result-button"
                );


            if (qrButton) {

                qrButton.addEventListener(
                    "click",
                    () => {

                        openResultQRCode(
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

    const finalCalculation =
        result.finalCalculation;


    const hasValidFinalCalculation =

        finalCalculation &&

        Array.isArray(
            finalCalculation.compulsorySubjects
        ) &&

        finalCalculation.compulsorySubjects.length === 4 &&

        Array.isArray(
            finalCalculation.bestAdditionalSubjects
        ) &&

        finalCalculation.bestAdditionalSubjects.length === 2;


    if (!hasValidFinalCalculation) {

        alert(
            "This result does not contain the required 4 compulsory subjects and best 2 additional subjects. Please edit and save the result before publishing."
        );

        return;

    }


    const aggregate =
        finalCalculation.aggregate ??
        result.aggregate ??
        result.overallGrade;


    if (
        aggregate === undefined ||
        aggregate === null ||
        aggregate === ""
    ) {

        alert(
            "This result does not contain a valid final aggregate. Please edit and save the result before publishing."
        );

        return;

    }


    const confirmed =
        window.confirm(
            `Publish the academic result for ${result.studentName || "this student"}?\n\nFinal Aggregate: ${aggregate}\nAverage: ${Number(result.average || 0).toFixed(2)}%`
        );


    if (!confirmed) {
        return;
    }


    try {

        let resultAccessCode =
            result.resultAccessCode ||
            result.resultCode ||
            null;


        if (!resultAccessCode) {

            resultAccessCode =
                await generateUniqueResultAccessCode();

        }


        await updateDoc(

            doc(
                db,
                "results",
                result.id
            ),

            {

                status:
                    "published",

                resultAccessCode:
                    resultAccessCode,

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
                    "published",

                resultAccessCode:
                    resultAccessCode

            };

        }


        if (
            currentResult &&
            currentResult.id ===
            result.id
        ) {

            currentResult.status =
                "published";


            currentResult.resultAccessCode =
                resultAccessCode;

        }


        renderExistingResults();

        updateDashboardStatistics();


        alert(
            `Result published successfully.\n\nResult Access Code: ${resultAccessCode}\n\nQR verification is now available from the results list.`
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
   QR CODE LIBRARY
   ========================================================= */

let qrLibraryPromise =
    null;


function loadQRCodeLibrary() {

    if (
        window.QRCode
    ) {

        return Promise.resolve(
            window.QRCode
        );

    }


    if (qrLibraryPromise) {

        return qrLibraryPromise;

    }


    qrLibraryPromise =
        new Promise(
            (resolve, reject) => {

                const existing =
                    document.querySelector(
                        'script[data-virello-qrcode="true"]'
                    );


                if (existing) {

                    existing.addEventListener(
                        "load",
                        () => {

                            if (window.QRCode) {

                                resolve(
                                    window.QRCode
                                );

                            }

                            else {

                                reject(
                                    new Error(
                                        "QR Code library failed to initialize."
                                    )
                                );

                            }

                        }
                    );


                    existing.addEventListener(
                        "error",
                        () => {

                            reject(
                                new Error(
                                    "Unable to load QR Code library."
                                )
                            );

                        }
                    );


                    return;

                }


                const script =
                    document.createElement(
                        "script"
                    );


                script.src =
                    "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";


                script.async =
                    true;


                script.dataset.virelloQrcode =
                    "true";


                script.onload =
                    () => {

                        if (window.QRCode) {

                            resolve(
                                window.QRCode
                            );

                        }

                        else {

                            reject(
                                new Error(
                                    "QR Code library failed to initialize."
                                )
                            );

                        }

                    };


                script.onerror =
                    () => {

                        reject(
                            new Error(
                                "Unable to load QR Code library."
                            )
                        );

                    };


                document.head.appendChild(
                    script
                );

            }
        );


    return qrLibraryPromise;

}


/* =========================================================
   BUILD VERIFICATION URL
   ========================================================= */

function buildVerificationURL(
    resultId
) {

    const url =
        new URL(
            "result-verify.html",
            window.location.href
        );


    url.searchParams.set(
        "id",
        resultId
    );


    return url.href;

}


/* =========================================================
   OPEN RESULT QR CODE
   ========================================================= */

async function openResultQRCode(
    result
) {

    if (!result?.id) {

        alert(
            "This result does not have a valid verification ID."
        );

        return;

    }


    if (
        result.status !==
        "published"
    ) {

        alert(
            "Only published results can have a public verification QR code."
        );

        return;

    }


    try {

        await loadQRCodeLibrary();


        const verificationURL =
            buildVerificationURL(
                result.id
            );


        showQRModal(
            result,
            verificationURL
        );

    }

    catch (error) {

        console.error(
            "QR code error:",
            error
        );


        alert(
            error.message ||
            "Unable to generate QR code."
        );

    }

}


/* =========================================================
   SHOW QR MODAL
   ========================================================= */

function showQRModal(
    result,
    verificationURL
) {

    const oldModal =
        document.getElementById(
            "virelloQRModal"
        );


    if (oldModal) {

        oldModal.remove();

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.id =
        "virelloQRModal";


    modal.innerHTML = `

        <div
            class="virello-qr-overlay"
            data-close-qr="true"
        >

            <div
                class="virello-qr-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="virelloQRTitle"
            >

                <button
                    type="button"
                    class="virello-qr-close"
                    aria-label="Close"
                    data-close-qr="true"
                >
                    ×
                </button>


                <div class="virello-qr-header">

                    <div class="virello-qr-icon">
                        ✓
                    </div>

                    <div>

                        <h2 id="virelloQRTitle">
                            Result Verification
                        </h2>

                        <p>
                            Scan this QR code to verify
                            this published academic result.
                        </p>

                    </div>

                </div>


                <div
                    id="virelloQRCode"
                    class="virello-qr-code"
                ></div>


                <div class="virello-qr-student">

                    <strong>
                        ${escapeHTML(
                            result.studentName ||
                            "Student"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            result.studentId ||
                            "—"
                        )}
                    </span>

                    <span>
                        ${escapeHTML(
                            normalizeClassName(
                                result.className ||
                                "—"
                            )
                        )}
                    </span>

                </div>


                <div class="virello-qr-code-display">

                    <span>
                        Result Access Code
                    </span>

                    <strong>
                        ${escapeHTML(
                            result.resultAccessCode ||
                            "—"
                        )}
                    </strong>

                </div>


                <div class="virello-qr-url">

                    ${escapeHTML(
                        verificationURL
                    )}

                </div>


                <div class="virello-qr-actions">

                    <button
                        type="button"
                        id="virelloDownloadQR"
                        class="virello-qr-primary"
                    >
                        Download QR
                    </button>


                    <button
                        type="button"
                        id="virelloCopyVerification"
                        class="virello-qr-secondary"
                    >
                        Copy Verification Link
                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    injectQRModalStyles();


    const qrContainer =
        document.getElementById(
            "virelloQRCode"
        );


    new window.QRCode(
        qrContainer,
        {

            text:
                verificationURL,

            width:
                240,

            height:
                240,

            correctLevel:
                window.QRCode.CorrectLevel.H

        }
    );


    const closeElements =
        modal.querySelectorAll(
            "[data-close-qr='true']"
        );


    closeElements.forEach(
        element => {

            element.addEventListener(
                "click",
                () => modal.remove()
            );

        }
    );


    document.addEventListener(
        "keydown",
        function qrEscapeHandler(
            event
        ) {

            if (
                event.key ===
                "Escape"
            ) {

                modal.remove();

                document.removeEventListener(
                    "keydown",
                    qrEscapeHandler
                );

            }

        }
    );


    const downloadButton =
        document.getElementById(
            "virelloDownloadQR"
        );


    downloadButton.addEventListener(
        "click",
        () => {

            const canvas =
                qrContainer.querySelector(
                    "canvas"
                );


            const image =
                qrContainer.querySelector(
                    "img"
                );


            let dataURL =
                null;


            if (canvas) {

                dataURL =
                    canvas.toDataURL(
                        "image/png"
                    );

            }

            else if (image) {

                dataURL =
                    image.src;

            }


            if (!dataURL) {

                alert(
                    "Unable to prepare the QR image."
                );

                return;

            }


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                dataURL;


            link.download =
                `Virello-Result-QR-${result.studentId || result.id}.png`;


            document.body.appendChild(
                link
            );


            link.click();

            link.remove();

        }
    );


    const copyButton =
        document.getElementById(
            "virelloCopyVerification"
        );


    copyButton.addEventListener(
        "click",
        async () => {

            try {

                await navigator.clipboard.writeText(
                    verificationURL
                );


                copyButton.textContent =
                    "Copied ✓";


                setTimeout(
                    () => {

                        copyButton.textContent =
                            "Copy Verification Link";

                    },
                    1800
                );

            }

            catch (error) {

                window.prompt(
                    "Copy this verification link:",
                    verificationURL
                );

            }

        }
    );

}


/* =========================================================
   QR MODAL STYLES
   ========================================================= */

function injectQRModalStyles() {

    if (
        document.getElementById(
            "virelloQRModalStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "virelloQRModalStyles";


    style.textContent = `

        .virello-qr-overlay {

            position: fixed;
            inset: 0;
            z-index: 99999;

            display: flex;
            align-items: center;
            justify-content: center;

            padding: 20px;

            background: rgba(0,0,0,.68);

            backdrop-filter: blur(6px);

        }


        .virello-qr-modal {

            position: relative;

            width: min(520px, 100%);

            max-height: 92vh;

            overflow-y: auto;

            background: #ffffff;

            border-radius: 24px;

            padding: 28px;

            box-shadow:
                0 30px 80px
                rgba(0,0,0,.28);

        }


        .virello-qr-close {

            position: absolute;

            top: 14px;
            right: 16px;

            width: 38px;
            height: 38px;

            border: 0;

            border-radius: 50%;

            background: #f1f5f9;

            font-size: 26px;

            cursor: pointer;

        }


        .virello-qr-header {

            display: flex;

            gap: 14px;

            align-items: center;

            padding-right: 35px;

        }


        .virello-qr-icon {

            width: 48px;
            height: 48px;

            display: flex;

            align-items: center;
            justify-content: center;

            border-radius: 14px;

            background: #0f766e;

            color: white;

            font-size: 24px;

            font-weight: 800;

        }


        .virello-qr-header h2 {

            margin: 0 0 5px;

            font-size: 21px;

        }


        .virello-qr-header p {

            margin: 0;

            color: #64748b;

            font-size: 13px;

            line-height: 1.5;

        }


        .virello-qr-code {

            width: 270px;
            height: 270px;

            margin: 25px auto 15px;

            display: flex;

            align-items: center;
            justify-content: center;

            background: white;

            padding: 14px;

            border-radius: 18px;

            border: 1px solid #e2e8f0;

        }


        .virello-qr-code img,
        .virello-qr-code canvas {

            max-width: 100%;
            max-height: 100%;

        }


        .virello-qr-student {

            display: flex;

            flex-direction: column;

            align-items: center;

            gap: 4px;

            text-align: center;

        }


        .virello-qr-student strong {

            font-size: 18px;

        }


        .virello-qr-student span {

            color: #64748b;

            font-size: 13px;

        }


        .virello-qr-code-display {

            margin-top: 18px;

            padding: 14px;

            border-radius: 14px;

            background: #f8fafc;

            text-align: center;

        }


        .virello-qr-code-display span {

            display: block;

            color: #64748b;

            font-size: 11px;

            text-transform: uppercase;

            letter-spacing: .08em;

        }


        .virello-qr-code-display strong {

            display: block;

            margin-top: 5px;

            font-size: 18px;

            letter-spacing: .08em;

        }


        .virello-qr-url {

            margin-top: 12px;

            padding: 10px;

            background: #f8fafc;

            border-radius: 10px;

            font-size: 10px;

            color: #64748b;

            word-break: break-all;

        }


        .virello-qr-actions {

            display: grid;

            grid-template-columns: 1fr 1fr;

            gap: 10px;

            margin-top: 18px;

        }


        .virello-qr-actions button {

            min-height: 45px;

            border-radius: 12px;

            border: 0;

            cursor: pointer;

            font-weight: 700;

        }


        .virello-qr-primary {

            background: #0f766e;

            color: white;

        }


        .virello-qr-secondary {

            background: #e2e8f0;

            color: #0f172a;

        }


        @media(max-width:600px) {

            .virello-qr-modal {

                padding: 20px;

                border-radius: 18px;

            }


            .virello-qr-code {

                width: 230px;
                height: 230px;

            }


            .virello-qr-actions {

                grid-template-columns: 1fr;

            }

        }

    `;


    document.head.appendChild(
        style
    );

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

        top: 0,

        behavior: "smooth"

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

            grade: "1",

            remark: "Excellent"

        };

    }


    if (value >= 81) {

        return {

            grade: "2",

            remark: "Very Good"

        };

    }


    if (value >= 76) {

        return {

            grade: "3",

            remark: "Good"

        };

    }


    if (value >= 71) {

        return {

            grade: "4",

            remark: "Credit"

        };

    }


    if (value >= 66) {

        return {

            grade: "5",

            remark: "Credit"

        };

    }


    if (value >= 56) {

        return {

            grade: "6",

            remark: "Credit"

        };

    }


    if (value >= 50) {

        return {

            grade: "7",

            remark: "Pass"

        };

    }


    if (value >= 40) {

        return {

            grade: "8",

            remark: "Pass"

        };

    }


    return {

        grade: "9",

        remark: "Fail"

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
   CLAMP
   ========================================================= */

function clamp(
    value,
    minimum,
    maximum
) {

    return Math.min(
        maximum,
        Math.max(
            minimum,
            value
        )
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

console.log(
    "Official grading rule: 4 compulsory subjects + best 2 lowest grade numbers."
);

console.log(
    "Automatic random Result Access Code system enabled."
);

console.log(
    "Result Verification + QR Code system enabled."
);
