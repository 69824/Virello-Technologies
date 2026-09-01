/* =========================================================
   VIRELLO TECHNOLOGIES
   ACADEMIC RESULTS MANAGEMENT

   FILE:
   js/results.js

   CONNECTED FIRESTORE COLLECTION:
   results/{resultId}

   RESULT STRUCTURE:

   {
       organizationId,
       studentId,
       studentDocumentId,
       studentName,

       classId,
       className,

       academicYear,
       term,

       subjects: [
           {
               subject,
               ca,
               exam,
               total,
               grade,
               remark
           }
       ],

       subjectCount,
       totalMarks,
       average,

       overallGrade,
       overallRemark,

       status,

       createdAt,
       updatedAt,
       createdBy
   }

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

const resultEmpty =
    document.getElementById("resultEmpty");

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

const displayTerm =
    document.getElementById("displayTerm");

const subjectTableBody =
    document.getElementById("subjectTableBody");

const addSubjectButton =
    document.getElementById("addSubjectButton");

const saveResultButton =
    document.getElementById("saveResultButton");

const totalStudents =
    document.getElementById("totalStudents");

const resultsEntered =
    document.getElementById("resultsEntered");

const totalClasses =
    document.getElementById("totalClasses");

const currentTermDisplay =
    document.getElementById("currentTermDisplay");

const overallSubjects =
    document.getElementById("overallSubjects");

const overallMarks =
    document.getElementById("overallMarks");

const overallAverage =
    document.getElementById("overallAverage");

const overallGrade =
    document.getElementById("overallGrade");


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {
        startResults();
    }
);


/* =========================================================
   AUTHENTICATION
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

                await updateDashboardStatistics();

                updateTermDisplay();

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
        (a, b) =>
            getGradeNumber(
                a.className
            ) -
            getGradeNumber(
                b.className
            )
    );


    if (totalClasses) {

        totalClasses.textContent =
            classes.length;
    }

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
        classItem => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                classItem.id;


            option.textContent =
                classItem.className ||
                classItem.name ||
                "Unnamed Class";


            classSelect.appendChild(
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


            resultEditor.classList.add(
                "hidden"
            );


            resultEmpty.classList.remove(
                "hidden"
            );


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

                await loadStudents(
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
   LOAD STUDENTS
   ========================================================= */

async function loadStudents(classId) {

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
                ).toLowerCase();


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
        (a, b) =>
            String(
                a.fullName ||
                a.name ||
                ""
            ).localeCompare(
                String(
                    b.fullName ||
                    b.name ||
                    ""
                )
            )
    );


    populateStudentSelect();


    if (totalStudents) {

        const allStudentsRef =
            collection(
                db,
                "students"
            );


        const allStudentsQuery =
            query(
                allStudentsRef,

                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                )

            );


        const allStudentsSnapshot =
            await getDocs(
                allStudentsQuery
            );


        totalStudents.textContent =
            allStudentsSnapshot.size;
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
                student.id ||
                "No ID";


            option.textContent =
                `${name} — ${id}`;


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


            if (
                !academicYear.value.trim()
            ) {

                alert(
                    "Please enter the academic year."
                );

                academicYear.focus();

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


            await loadExistingResult();

        }
    );

}


/* =========================================================
   LOAD EXISTING RESULT
   ========================================================= */

async function loadExistingResult() {

    const academicYearValue =
        academicYear.value.trim();


    const term =
        termSelect.value;


    setButtonLoading(
        loadResultButton,
        "Loading..."
    );


    try {

        const resultsRef =
            collection(
                db,
                "results"
            );


        const resultQuery =
            query(

                resultsRef,

                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                ),

                where(
                    "studentDocumentId",
                    "==",
                    selectedStudent.id
                ),

                where(
                    "academicYear",
                    "==",
                    academicYearValue
                ),

                where(
                    "term",
                    "==",
                    term
                )

            );


        const snapshot =
            await getDocs(
                resultQuery
            );


        if (snapshot.empty) {

            currentResult = null;

            showResultEditor();

            createDefaultSubjects();

            setResultStatus(
                false
            );

        }

        else {

            const resultDocument =
                snapshot.docs[0];


            currentResult = {

                id:
                    resultDocument.id,

                ...resultDocument.data()

            };


            showResultEditor();


            renderExistingSubjects(
                currentResult.subjects ||
                []
            );


            setResultStatus(
                true
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
   SHOW RESULT EDITOR
   ========================================================= */

function showResultEditor() {

    resultEditor.classList.remove(
        "hidden"
    );


    resultEmpty.classList.add(
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
        classItem?.className ||
        classItem?.name ||
        selectedStudent.className ||
        "—";


    studentName.textContent =
        name;


    studentDetails.textContent =
        `${className} • ${studentId}`;


    displayStudentId.textContent =
        studentId;


    displayClass.textContent =
        className;


    displayTerm.textContent =
        `${termSelect.value} • ${academicYear.value.trim()}`;

}


/* =========================================================
   DEFAULT SUBJECTS
   ========================================================= */

function createDefaultSubjects() {

    subjectTableBody.innerHTML =
        "";


    const defaultSubjects = [

        "English Language",

        "Mathematics",

        "Science",

        "Social Studies"

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
   EXISTING SUBJECTS
   ========================================================= */

function renderExistingSubjects(subjects) {

    subjectTableBody.innerHTML =
        "";


    if (!subjects.length) {

        createDefaultSubjects();

        return;
    }


    subjects.forEach(
        item => {

            addSubjectRow(

                item.subject ||
                "",

                item.ca ??
                "",

                item.exam ??
                ""

            );

        }
    );


    calculateOverall();

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
                value="${escapeAttribute(subject)}"
            >

        </td>


        <td>

            <input
                type="number"
                class="ca-input"
                min="0"
                max="40"
                step="0.01"
                value="${escapeAttribute(ca)}"
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
                value="${escapeAttribute(exam)}"
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


    const result =
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
        result.grade;


    row.querySelector(
        ".remark"
    ).textContent =
        result.remark;

}


/* =========================================================
   CALCULATE OVERALL
   ========================================================= */

function calculateOverall() {

    const rows =
        Array.from(
            subjectTableBody.querySelectorAll(
                "tr"
            )
        );


    let totalMarks = 0;

    let subjectCount = 0;


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


    const result =
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
        result.grade;

}


/* =========================================================
   SAVE RESULT
   ========================================================= */

if (saveResultButton) {

    saveResultButton.addEventListener(
        "click",
        async () => {

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

                return;
            }


            if (!term) {

                alert(
                    "Please select a term."
                );

                return;
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


                    const result =
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
                            result.grade,

                        remark:
                            result.remark

                    });

                }
            );


            if (!subjects.length) {

                alert(
                    "Please enter at least one subject."
                );

                return;
            }


            const totalMarks =
                subjects.reduce(
                    (
                        total,
                        subject
                    ) => {

                        return total +
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
                classItem?.className ||
                classItem?.name ||
                selectedStudent.className ||
                "";


            /*
             * IMPORTANT:
             * Keep the parent relationship information
             * already stored on the student.
             *
             * This makes the result easier to connect to
             * the existing parent/student system.
             */

            const parentUid =
                selectedStudent.parentUid ||
                selectedStudent.parentUID ||
                selectedStudent.parentId ||
                null;


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

                status:
                    "published",

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentUser.uid

            };


            /*
             * Only add parentUid when the existing
             * student record actually has one.
             *
             * This does not change the existing
             * student system.
             */

            if (parentUid) {

                resultData.parentUid =
                    parentUid;

            }


            setButtonLoading(
                saveResultButton,
                "Saving..."
            );


            try {

                if (currentResult) {

                    /*
                     * UPDATE EXISTING RESULT
                     */

                    await updateDoc(

                        doc(
                            db,
                            "results",
                            currentResult.id
                        ),

                        resultData

                    );


                    currentResult = {

                        id:
                            currentResult.id,

                        ...currentResult,

                        ...resultData

                    };

                }

                else {

                    /*
                     * CREATE NEW RESULT
                     */

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


                setResultStatus(
                    true
                );


                await updateDashboardStatistics();


                alert(
                    `Academic result saved successfully for ${selectedStudent.fullName || selectedStudent.name}.`
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
                    "Save Results"
                );

            }

        }
    );

}


/* =========================================================
   RESULT STATUS
   ========================================================= */

function setResultStatus(saved) {

    if (!resultStatus) {
        return;
    }


    if (saved) {

        resultStatus.textContent =
            "Published";


        resultStatus.classList.add(
            "saved"
        );

    }

    else {

        resultStatus.textContent =
            "Not Saved";


        resultStatus.classList.remove(
            "saved"
        );

    }

}


/* =========================================================
   DASHBOARD STATISTICS
   ========================================================= */

async function updateDashboardStatistics() {

    try {

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


        if (resultsEntered) {

            resultsEntered.textContent =
                snapshot.size;

        }


        if (totalStudents) {

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


            const studentsSnapshot =
                await getDocs(
                    studentsQuery
                );


            totalStudents.textContent =
                studentsSnapshot.size;

        }

    }

    catch (error) {

        console.warn(
            "Unable to update result statistics:",
            error
        );

    }

}


/* =========================================================
   TERM DISPLAY
   ========================================================= */

function updateTermDisplay() {

    if (!currentTermDisplay) {
        return;
    }


    currentTermDisplay.textContent =
        termSelect?.value ||
        "Term 1";

}


/* =========================================================
   TERM CHANGE
   ========================================================= */

if (termSelect) {

    termSelect.addEventListener(
        "change",
        () => {

            updateTermDisplay();

            /*
             * If a student is already selected,
             * clear the current editor because the
             * administrator has changed the term.
             */

            currentResult = null;

            if (resultEditor) {

                resultEditor.classList.add(
                    "hidden"
                );

            }


            if (resultEmpty) {

                resultEmpty.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


/* =========================================================
   GRADE SYSTEM
   =========================================================

   80 - 100 = A
   70 - 79  = B
   60 - 69  = C
   50 - 59  = D
   40 - 49  = E
   0  - 39  = F

   ========================================================= */

function calculateGrade(score) {

    const value =
        Number(score) || 0;


    if (value >= 80) {

        return {

            grade:
                "A",

            remark:
                "Excellent"

        };

    }


    if (value >= 70) {

        return {

            grade:
                "B",

            remark:
                "Very Good"

        };

    }


    if (value >= 60) {

        return {

            grade:
                "C",

            remark:
                "Good"

        };

    }


    if (value >= 50) {

        return {

            grade:
                "D",

            remark:
                "Satisfactory"

        };

    }


    if (value >= 40) {

        return {

            grade:
                "E",

            remark:
                "Pass"

        };

    }


    return {

        grade:
            "F",

        remark:
            "Needs Improvement"

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
   GRADE NUMBER
   ========================================================= */

function getGradeNumber(className) {

    const match =
        String(
            className ||
            ""
        ).match(
            /(\d+)/
        );


    if (!match) {

        return 999;

    }


    return Number(
        match[1]
    );

}


/* =========================================================
   ESCAPE ATTRIBUTE
   ========================================================= */

function escapeAttribute(value) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
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

function showError(message) {

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
   MODULE READY
   ========================================================= */

console.log(
    "Virello Academic Results Management connected successfully."
);
