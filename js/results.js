import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import { auth, db } from "./firebase-config.js";


/* ============================================================
   CONFIGURATION
============================================================ */

const RESULTS_COLLECTION = "results";

const REQUIRED_COMPULSORY_SUBJECTS = 4;
const REQUIRED_BEST_ADDITIONAL = 2;
const REQUIRED_FINAL_SUBJECTS = 6;

/*
    TEST = 25%
    EXAM = 75%

    Teacher enters Test and Exam as marks out of 100.

    Example:

    Test = 80
    Exam = 70

    Test contribution:
    80 × 0.25 = 20

    Exam contribution:
    70 × 0.75 = 52.5

    Final subject mark:
    20 + 52.5 = 72.5
*/

const TEST_WEIGHT = 0.25;
const EXAM_WEIGHT = 0.75;


/* ============================================================
   STATE
============================================================ */

let currentUser = null;
let currentOrganization = null;

let classes = [];
let students = [];
let allResults = [];

let selectedStudent = null;
let currentResult = null;


/* ============================================================
   DOM ELEMENTS
============================================================ */

const loadingScreen =
    document.getElementById("loadingScreen");

const errorScreen =
    document.getElementById("errorScreen");

const errorMessage =
    document.getElementById("errorMessage");

const mainContent =
    document.getElementById("mainContent");

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

const publishResultButton =
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


/* ============================================================
   ALL SUBJECTS SUMMARY
============================================================ */

const overallSubjects =
    document.getElementById("overallSubjects");

const overallMarks =
    document.getElementById("overallMarks");

const overallAverage =
    document.getElementById("overallAverage");

const overallGrade =
    document.getElementById("overallGrade");


/* ============================================================
   FINAL CALCULATION
============================================================ */

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

const selectedCompulsorySubjects =
    document.getElementById("selectedCompulsorySubjects");

const selectedBestSubjects =
    document.getElementById("selectedBestSubjects");

const finalCalculationWarning =
    document.getElementById("finalCalculationWarning");


/* ============================================================
   EXISTING RESULTS
============================================================ */

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


/* ============================================================
   CLASS ORDER
============================================================ */

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


/* ============================================================
   DEFAULT SUBJECTS
============================================================ */

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


/* ============================================================
   START
============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        attachEvents();

        onAuthStateChanged(
            auth,
            async (user) => {

                if (!user) {

                    showError(
                        "You are not logged in. Please log in again."
                    );

                    return;
                }

                currentUser = user;

                try {

                    await initializePage();

                } catch (error) {

                    console.error(
                        "Results initialization error:",
                        error
                    );

                    showError(
                        error?.message ||
                        "Unable to load Academic Results Management."
                    );

                }

            }
        );

    }
);


/* ============================================================
   EVENT HANDLERS
============================================================ */

function attachEvents() {

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

    }

    if (classSelect) {

        classSelect.addEventListener(
            "change",
            handleClassChange
        );

    }

    if (loadResultButton) {

        loadResultButton.addEventListener(
            "click",
            loadSelectedResult
        );

    }

    if (addSubjectButton) {

        addSubjectButton.addEventListener(
            "click",
            () => addSubjectRow()
        );

    }

    if (clearResultButton) {

        clearResultButton.addEventListener(
            "click",
            clearEditor
        );

    }

    if (saveResultButton) {

        saveResultButton.addEventListener(
            "click",
            () => saveResult("draft")
        );

    }

    if (publishResultButton) {

        publishResultButton.addEventListener(
            "click",
            () => saveResult("published")
        );

    }

    if (subjectTableBody) {

        subjectTableBody.addEventListener(
            "input",
            handleSubjectInput
        );

        subjectTableBody.addEventListener(
            "change",
            handleSubjectChange
        );

        subjectTableBody.addEventListener(
            "click",
            handleSubjectClick
        );

    }

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

}


/* ============================================================
   INITIALIZE PAGE
============================================================ */

async function initializePage() {

    if (!currentUser) {

        throw new Error(
            "Authentication session not found."
        );

    }


    /* --------------------------------------------------------
       LOAD ORGANIZATION
    -------------------------------------------------------- */

    const profile =
        await loadUserProfile();


    currentOrganization =
        await resolveOrganization(
            profile
        );


    if (!currentOrganization) {

        throw new Error(
            "Your account is authenticated, but no Virello organization could be identified for this account."
        );

    }


    const organizationId =
        getOrganizationId();


    if (!organizationId) {

        throw new Error(
            "Organization ID could not be determined."
        );

    }


    /* --------------------------------------------------------
       USER NAME
    -------------------------------------------------------- */

    if (adminName) {

        adminName.textContent =
            profile.name ||
            profile.fullName ||
            currentUser.displayName ||
            currentUser.email ||
            "Administrator";

    }


    /* --------------------------------------------------------
       ORGANIZATION NAME
    -------------------------------------------------------- */

    if (organizationName) {

        organizationName.textContent =
            profile.organizationName ||
            profile.schoolName ||
            currentOrganization.name ||
            currentOrganization.organizationName ||
            currentOrganization.schoolName ||
            "Star Preparatory School";

    }


    /* --------------------------------------------------------
       LOAD DATA
    -------------------------------------------------------- */

    await loadClasses();

    await loadStudents();

    await loadResults();

    populateClassSelectors();

    updateStatistics();


    /* --------------------------------------------------------
       SHOW PAGE
    -------------------------------------------------------- */

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }

    if (errorScreen) {

        errorScreen.style.display =
            "none";

    }

    if (mainContent) {

        mainContent.classList.remove(
            "hidden"
        );

        mainContent.style.display =
            "";

    }

}


/* ============================================================
   LOAD USER PROFILE
============================================================ */

/*
    IMPORTANT FIX:

    The old version queried:

        users
        staff
        teachers
        admins

    That caused:

        Missing or insufficient permissions

    This version NEVER queries users or admins.

    It checks only collections that are already allowed
    by your existing Virello rules:

        staff
        teachers

    It also supports direct UID document lookup.
*/

async function loadUserProfile() {

    const uid =
        currentUser.uid;


    /* --------------------------------------------------------
       1. STAFF COLLECTION
    -------------------------------------------------------- */

    try {

        const staffQuery =
            query(
                collection(
                    db,
                    "staff"
                ),
                where(
                    "uid",
                    "==",
                    uid
                )
            );

        const staffSnapshot =
            await getDocs(
                staffQuery
            );

        if (!staffSnapshot.empty) {

            return {
                id:
                    staffSnapshot.docs[0].id,

                ...staffSnapshot.docs[0].data(),

                uid
            };

        }

    } catch (error) {

        console.warn(
            "Staff profile lookup failed:",
            error
        );

    }


    /* --------------------------------------------------------
       2. STAFF DOCUMENT WITH UID AS DOCUMENT ID
    -------------------------------------------------------- */

    try {

        const staffRef =
            doc(
                db,
                "staff",
                uid
            );

        const staffDoc =
            await getDoc(
                staffRef
            );

        if (staffDoc.exists()) {

            return {
                id:
                    staffDoc.id,

                ...staffDoc.data(),

                uid
            };

        }

    } catch (error) {

        console.warn(
            "Direct staff profile lookup failed:",
            error
        );

    }


    /* --------------------------------------------------------
       3. TEACHERS COLLECTION
    -------------------------------------------------------- */

    try {

        const teacherQuery =
            query(
                collection(
                    db,
                    "teachers"
                ),
                where(
                    "uid",
                    "==",
                    uid
                )
            );

        const teacherSnapshot =
            await getDocs(
                teacherQuery
            );

        if (!teacherSnapshot.empty) {

            return {
                id:
                    teacherSnapshot.docs[0].id,

                ...teacherSnapshot.docs[0].data(),

                uid
            };

        }

    } catch (error) {

        console.warn(
            "Teacher profile lookup failed:",
            error
        );

    }


    /* --------------------------------------------------------
       4. TEACHER DOCUMENT WITH UID AS DOCUMENT ID
    -------------------------------------------------------- */

    try {

        const teacherRef =
            doc(
                db,
                "teachers",
                uid
            );

        const teacherDoc =
            await getDoc(
                teacherRef
            );

        if (teacherDoc.exists()) {

            return {
                id:
                    teacherDoc.id,

                ...teacherDoc.data(),

                uid
            };

        }

    } catch (error) {

        console.warn(
            "Direct teacher profile lookup failed:",
            error
        );

    }


    /* --------------------------------------------------------
       5. AUTH USER FALLBACK
    -------------------------------------------------------- */

    return {

        uid,

        name:
            currentUser.displayName ||
            currentUser.email ||
            "Administrator",

        email:
            currentUser.email || ""

    };

}


/* ============================================================
   RESOLVE ORGANIZATION
============================================================ */

async function resolveOrganization(
    profile
) {

    /*
        First attempt:
        organization information stored directly
        in the staff/teacher profile.
    */

    const directOrganization =
        extractOrganizationFromProfile(
            profile
        );

    if (directOrganization) {

        return normalizeOrganization(
            directOrganization
        );

    }


    /*
        Second attempt:
        organizationId field directly.
    */

    const directId =
        profile?.organizationId ||
        profile?.orgId ||
        profile?.schoolId;

    if (directId) {

        return {

            id:
                typeof directId === "string"
                    ? directId
                    : directId.id,

            name:
                profile.organizationName ||
                profile.schoolName ||
                "Star Preparatory School"

        };

    }


    /*
        Third attempt:
        Find an organization owned by this Firebase user.
    */

    try {

        const organizationQuery =
            query(
                collection(
                    db,
                    "organizations"
                ),
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

        if (!snapshot.empty) {

            const organizationDoc =
                snapshot.docs[0];

            return {

                id:
                    organizationDoc.id,

                ...organizationDoc.data()

            };

        }

    } catch (error) {

        console.warn(
            "Organization owner lookup failed:",
            error
        );

    }


    /*
        Final fallback.

        If the project has a single school organization
        stored in the profile under another common field,
        attempt to resolve it.
    */

    const possibleId =
        profile?.school?.id ||
        profile?.organization?.id ||
        profile?.organization?.uid ||
        profile?.schoolOrganizationId;

    if (possibleId) {

        return {

            id:
                possibleId,

            name:
                profile?.school?.name ||
                profile?.organization?.name ||
                profile?.schoolName ||
                "Star Preparatory School"

        };

    }


    return null;

}


/* ============================================================
   EXTRACT ORGANIZATION FROM PROFILE
============================================================ */

function extractOrganizationFromProfile(
    profile
) {

    if (!profile) {
        return null;
    }


    const organization =
        profile.organization;


    if (organization) {

        if (
            typeof organization ===
            "string"
        ) {

            return {
                id:
                    organization,

                name:
                    profile.organizationName ||
                    profile.schoolName ||
                    "Star Preparatory School"

            };

        }


        if (
            typeof organization ===
            "object"
        ) {

            return {

                ...organization,

                id:
                    organization.id ||
                    organization.uid ||
                    organization.organizationId ||
                    null

            };

        }

    }


    return null;

}


/* ============================================================
   NORMALIZE ORGANIZATION
============================================================ */

function normalizeOrganization(
    organization
) {

    if (!organization) {
        return null;
    }


    if (
        typeof organization ===
        "string"
    ) {

        return {

            id:
                organization,

            name:
                "Star Preparatory School"

        };

    }


    return {

        ...organization,

        id:
            organization.id ||
            organization.uid ||
            organization.organizationId ||
            null

    };

}


/* ============================================================
   LOAD CLASSES
============================================================ */

async function loadClasses() {

    classes = [];

    const possibleCollections = [
        "classes",
        "schoolClasses"
    ];


    for (
        const collectionName
        of possibleCollections
    ) {

        try {

            const organizationId =
                getOrganizationId();

            if (!organizationId) {
                continue;
            }


            const q =
                query(
                    collection(
                        db,
                        collectionName
                    ),
                    where(
                        "organizationId",
                        "==",
                        organizationId
                    )
                );


            const snapshot =
                await getDocs(q);


            if (!snapshot.empty) {

                classes =
                    snapshot.docs.map(
                        (item) => ({
                            id:
                                item.id,

                            ...item.data()
                        })
                    );

                break;

            }

        } catch (error) {

            console.warn(
                `Unable to load ${collectionName}:`,
                error
            );

        }

    }


    /*
        If the school does not have a classes collection,
        use the official Virello class structure.
    */

    if (!classes.length) {

        classes =
            CLASS_ORDER.map(
                (name, index) => ({

                    id:
                        `class-${index + 1}`,

                    name

                })
            );

    }


    classes.sort(
        (a, b) =>
            getClassOrder(
                getClassName(a)
            ) -
            getClassOrder(
                getClassName(b)
            )
    );

}


/* ============================================================
   LOAD STUDENTS
============================================================ */

/*
    IMPORTANT:

    We do NOT query students unless an organization ID
    has already been identified.

    This prevents an unrestricted collection query.
*/

async function loadStudents() {

    students = [];


    const organizationId =
        getOrganizationId();


    if (!organizationId) {

        throw new Error(
            "Cannot load students because no organization is associated with your account."
        );

    }


    /*
        Try students first.
    */

    try {

        const q =
            query(
                collection(
                    db,
                    "students"
                ),
                where(
                    "organizationId",
                    "==",
                    organizationId
                )
            );


        const snapshot =
            await getDocs(q);


        if (!snapshot.empty) {

            students =
                snapshot.docs.map(
                    (item) => ({

                        id:
                            item.id,

                        ...item.data()

                    })
                );

            return;

        }

    } catch (error) {

        console.warn(
            "Students collection unavailable:",
            error
        );

    }


    /*
        Fallback to schoolStudents.
    */

    try {

        const q =
            query(
                collection(
                    db,
                    "schoolStudents"
                ),
                where(
                    "organizationId",
                    "==",
                    organizationId
                )
            );


        const snapshot =
            await getDocs(q);


        if (!snapshot.empty) {

            students =
                snapshot.docs.map(
                    (item) => ({

                        id:
                            item.id,

                        ...item.data()

                    })
                );

        }

    } catch (error) {

        console.warn(
            "schoolStudents collection unavailable:",
            error
        );

    }

}


/* ============================================================
   LOAD RESULTS
============================================================ */

async function loadResults() {

    allResults = [];


    const organizationId =
        getOrganizationId();


    if (!organizationId) {

        throw new Error(
            "Cannot load results because no organization is associated with your account."
        );

    }


    try {

        const q =
            query(
                collection(
                    db,
                    RESULTS_COLLECTION
                ),
                where(
                    "organizationId",
                    "==",
                    organizationId
                )
            );


        const snapshot =
            await getDocs(q);


        allResults =
            snapshot.docs.map(
                (item) => ({

                    id:
                        item.id,

                    ...item.data()

                })
            );


    } catch (error) {

        console.error(
            "Unable to load results:",
            error
        );

        throw new Error(
            `Unable to load academic results: ${
                error?.message ||
                "Missing or insufficient permissions."
            }`
        );

    }

}


/* ============================================================
   POPULATE CLASS SELECTORS
============================================================ */

function populateClassSelectors() {

    if (classSelect) {

        classSelect.innerHTML =
            `<option value="">Select class</option>`;


        classes.forEach(
            (classItem) => {

                const name =
                    getClassName(
                        classItem
                    );


                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    classItem.id ||
                    name;


                option.textContent =
                    name;


                classSelect.appendChild(
                    option
                );

            }
        );

    }


    if (resultClassFilter) {

        resultClassFilter.innerHTML =
            `<option value="">All Classes</option>`;


        classes.forEach(
            (classItem) => {

                const name =
                    getClassName(
                        classItem
                    );


                const option =
                    document.createElement(
                        "option"
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

}


/* ============================================================
   CLASS CHANGE
============================================================ */

function handleClassChange() {

    if (!studentSelect) {
        return;
    }


    const selectedValue =
        classSelect?.value || "";


    studentSelect.innerHTML =
        `<option value="">Select student</option>`;


    if (!selectedValue) {
        return;
    }


    const selectedClass =
        classes.find(
            (item) =>
                String(item.id) ===
                String(selectedValue)
        );


    const className =
        selectedClass
            ? getClassName(selectedClass)
            : selectedValue;


    const classStudents =
        students
            .filter(
                (student) =>
                    normalizeClass(
                        getStudentClass(student)
                    ) ===
                    normalizeClass(className)
            )
            .sort(
                compareStudentNames
            );


    classStudents.forEach(
        (student) => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                student.id;


            option.textContent =
                getStudentName(
                    student
                );


            studentSelect.appendChild(
                option
            );

        }
    );

}


/* ============================================================
   LOAD SELECTED RESULT
============================================================ */

async function loadSelectedResult() {

    try {

        const studentId =
            studentSelect?.value ||
            "";


        const academicYearValue =
            academicYear?.value.trim() ||
            "";


        const termValue =
            termSelect?.value ||
            "";


        if (!studentId) {

            alert(
                "Please select a student."
            );

            return;

        }


        if (!academicYearValue) {

            alert(
                "Please enter the academic year."
            );

            return;

        }


        if (!termValue) {

            alert(
                "Please select the term."
            );

            return;

        }


        selectedStudent =
            students.find(
                (student) =>
                    String(student.id) ===
                    String(studentId)
            );


        if (!selectedStudent) {

            selectedStudent =
                findStudentInAllClasses(
                    studentId
                );

        }


        if (!selectedStudent) {

            alert(
                "Student record could not be found."
            );

            return;

        }


        const existing =
            allResults.find(
                (result) =>

                    String(
                        result.studentId ||
                        result.studentDocumentId
                    ) ===
                    String(studentId)

                    &&

                    String(
                        result.academicYear
                    ) ===
                    String(academicYearValue)

                    &&

                    String(
                        result.term
                    ) ===
                    String(termValue)
            );


        if (existing) {

            currentResult =
                existing;


            renderResultIntoEditor(
                existing
            );

        } else {

            currentResult =
                null;


            showResultEditor();

            clearEditorFields();

            createDefaultSubjects();

        }


        if (resultEditor) {

            resultEditor.style.display =
                "block";


            resultEditor.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        }

    } catch (error) {

        console.error(
            "Load result error:",
            error
        );


        alert(
            error?.message ||
            "Unable to load result."
        );

    }

}


/* ============================================================
   SHOW RESULT EDITOR
============================================================ */

function showResultEditor() {

    if (!resultEditor) {
        return;
    }


    resultEditor.style.display =
        "block";


    if (!selectedStudent) {
        return;
    }


    const studentFullName =
        getStudentName(
            selectedStudent
        );


    const studentClass =
        getStudentClass(
            selectedStudent
        );


    if (studentName) {

        studentName.textContent =
            studentFullName;

    }


    if (studentDetails) {

        const gender =
            selectedStudent.gender ||
            "";


        const dateOfBirth =
            selectedStudent.dateOfBirth ||
            selectedStudent.dob ||
            "";


        const details =
            [
                gender,
                dateOfBirth
            ]
                .filter(Boolean)
                .join(" • ");


        studentDetails.textContent =
            details ||
            "Student academic record";

    }


    if (displayStudentId) {

        displayStudentId.textContent =
            selectedStudent.studentId ||
            selectedStudent.admissionNumber ||
            selectedStudent.studentNumber ||
            selectedStudent.id ||
            "-";

    }


    if (displayClass) {

        displayClass.textContent =
            studentClass ||
            getSelectedClassName() ||
            "-";

    }


    if (displayAcademicYear) {

        displayAcademicYear.textContent =
            academicYear?.value.trim() ||
            "-";

    }


    if (displayTerm) {

        displayTerm.textContent =
            termSelect?.value ||
            "-";

    }

}


/* ============================================================
   CLEAR EDITOR
============================================================ */

function clearEditor() {

    if (
        !confirm(
            "Clear the current result and start again?"
        )
    ) {

        return;

    }


    currentResult =
        null;


    clearEditorFields();

    createDefaultSubjects();

    showResultEditor();

}


/* ============================================================
   CLEAR EDITOR FIELDS
============================================================ */

function clearEditorFields() {

    if (subjectTableBody) {

        subjectTableBody.innerHTML =
            "";

    }


    if (positionInput) {

        positionInput.value =
            "";

    }


    if (teacherComment) {

        teacherComment.value =
            "";

    }


    if (principalComment) {

        principalComment.value =
            "";

    }


    if (resultStatus) {

        resultStatus.textContent =
            "Draft";

    }


    resetCalculationDisplay();

}


/* ============================================================
   CREATE DEFAULT SUBJECTS
============================================================ */

function createDefaultSubjects() {

    if (!subjectTableBody) {
        return;
    }


    subjectTableBody.innerHTML =
        "";


    DEFAULT_SUBJECTS.forEach(
        (subject, index) => {

            addSubjectRow(
                subject,
                0,
                0,
                index <
                REQUIRED_COMPULSORY_SUBJECTS
            );

        }
    );


    calculateOverall();

}


/* ============================================================
   ADD SUBJECT ROW
============================================================ */

function addSubjectRow(
    subject = "",
    test = 0,
    exam = 0,
    isCompulsory = false
) {

    if (!subjectTableBody) {
        return;
    }


    const row =
        document.createElement(
            "tr"
        );


    row.dataset.compulsory =
        isCompulsory
            ? "true"
            : "false";


    row.innerHTML = `

        <td class="row-number"></td>

        <td>

            <input
                type="text"
                class="subject-name-input"
                value="${escapeAttribute(subject)}"
                placeholder="Subject name"
            >

        </td>

        <td class="compulsory-cell">

            <input
                type="checkbox"
                class="compulsory-input"
                ${isCompulsory ? "checked" : ""}
                title="Count this subject as one of the 4 compulsory subjects"
            >

        </td>

        <td>

            <input
                type="number"
                class="test-input"
                min="0"
                max="100"
                step="0.01"
                value="${safeNumber(test)}"
            >

        </td>

        <td>

            <input
                type="number"
                class="exam-input"
                min="0"
                max="100"
                step="0.01"
                value="${safeNumber(exam)}"
            >

        </td>

        <td class="total-cell">
            0.00
        </td>

        <td class="grade-cell">
            -
        </td>

        <td class="remark-cell">
            -
        </td>

        <td>

            <button
                type="button"
                class="danger-btn remove-subject"
            >
                Remove
            </button>

        </td>

    `;


    subjectTableBody.appendChild(
        row
    );


    calculateSubjectRow(
        row
    );


    enforceCompulsoryLimit();

    calculateOverall();

}


/* ============================================================
   SUBJECT INPUT
============================================================ */

function handleSubjectInput(
    event
) {

    const row =
        event.target.closest(
            "tr"
        );


    if (!row) {
        return;
    }


    if (

        event.target.classList.contains(
            "subject-name-input"
        )

        ||

        event.target.classList.contains(
            "test-input"
        )

        ||

        event.target.classList.contains(
            "exam-input"
        )

    ) {

        calculateSubjectRow(
            row
        );

        calculateOverall();

    }

}


/* ============================================================
   SUBJECT CHANGE
============================================================ */

function handleSubjectChange(
    event
) {

    if (
        event.target.classList.contains(
            "compulsory-input"
        )
    ) {

        enforceCompulsoryLimit();

        calculateOverall();

    }

}


/* ============================================================
   SUBJECT CLICK
============================================================ */

function handleSubjectClick(
    event
) {

    if (
        event.target.classList.contains(
            "remove-subject"
        )
    ) {

        const row =
            event.target.closest(
                "tr"
            );


        if (row) {

            row.remove();

            updateRowNumbers();

            enforceCompulsoryLimit();

            calculateOverall();

        }

    }

}


/* ============================================================
   CALCULATE SUBJECT ROW
============================================================ */

function calculateSubjectRow(
    row
) {

    const testInput =
        row.querySelector(
            ".test-input"
        );


    const examInput =
        row.querySelector(
            ".exam-input"
        );


    const totalCell =
        row.querySelector(
            ".total-cell"
        );


    const gradeCell =
        row.querySelector(
            ".grade-cell"
        );


    const remarkCell =
        row.querySelector(
            ".remark-cell"
        );


    if (
        !testInput ||
        !examInput ||
        !totalCell ||
        !gradeCell ||
        !remarkCell
    ) {

        return;

    }


    const test =
        clampNumber(
            testInput.value,
            0,
            100
        );


    const exam =
        clampNumber(
            examInput.value,
            0,
            100
        );


    const testContribution =
        test *
        TEST_WEIGHT;


    const examContribution =
        exam *
        EXAM_WEIGHT;


    const total =
        testContribution +
        examContribution;


    const gradeInfo =
        calculateGrade(
            total
        );


    totalCell.textContent =
        formatNumber(
            total
        );


    gradeCell.textContent =
        gradeInfo.grade;


    remarkCell.textContent =
        gradeInfo.remark;


    updateRowNumbers();

}


/* ============================================================
   ENFORCE FOUR COMPULSORY SUBJECTS
============================================================ */

function enforceCompulsoryLimit() {

    if (!subjectTableBody) {
        return;
    }


    const checkboxes =
        Array.from(
            subjectTableBody.querySelectorAll(
                ".compulsory-input"
            )
        );


    let checkedCount =
        0;


    checkboxes.forEach(
        (checkbox) => {

            if (checkbox.checked) {

                checkedCount++;


                if (
                    checkedCount >
                    REQUIRED_COMPULSORY_SUBJECTS
                ) {

                    checkbox.checked =
                        false;

                }

            }

        }
    );


    updateCountedSubjectRows();

}


/* ============================================================
   COLLECT SUBJECTS
============================================================ */

function collectSubjects() {

    if (!subjectTableBody) {
        return [];
    }


    const rows =
        Array.from(
            subjectTableBody.querySelectorAll(
                "tr"
            )
        );


    return rows.map(
        (row, index) => {

            const subjectInput =
                row.querySelector(
                    ".subject-name-input"
                );


            const testInput =
                row.querySelector(
                    ".test-input"
                );


            const examInput =
                row.querySelector(
                    ".exam-input"
                );


            const compulsoryInput =
                row.querySelector(
                    ".compulsory-input"
                );


            const test =
                clampNumber(
                    testInput?.value,
                    0,
                    100
                );


            const exam =
                clampNumber(
                    examInput?.value,
                    0,
                    100
                );


            const testWeighted =
                test *
                TEST_WEIGHT;


            const examWeighted =
                exam *
                EXAM_WEIGHT;


            const total =
                testWeighted +
                examWeighted;


            const gradeInfo =
                calculateGrade(
                    total
                );


            return {

                index,

                subject:
                    subjectInput?.value.trim() ||
                    `Subject ${index + 1}`,

                test,

                exam,

                testWeighted,

                examWeighted,

                /*
                    Legacy compatibility.
                    Older code used "ca".
                    Here CA represents Test.
                */

                ca:
                    test,

                total,

                grade:
                    gradeInfo.grade,

                remark:
                    gradeInfo.remark,

                isCompulsory:
                    Boolean(
                        compulsoryInput?.checked
                    )

            };

        }
    );

}


/* ============================================================
   FINAL TERM CALCULATION
============================================================ */

function calculateFinalTermGrade(
    subjects = collectSubjects()
) {

    const compulsorySubjects =
        subjects.filter(
            (item) =>
                item.isCompulsory === true
        );


    const nonCompulsorySubjects =
        subjects
            .filter(
                (item) =>
                    item.isCompulsory !== true
            )
            .map(
                (item, index) => ({

                    ...item,

                    originalIndex:
                        item.index ??
                        index

                })
            )
            .sort(
                (a, b) =>

                    Number(b.total) -
                    Number(a.total)

                    ||

                    Number(a.originalIndex) -
                    Number(b.originalIndex)
            );


    const bestAdditionalSubjects =
        nonCompulsorySubjects.slice(
            0,
            REQUIRED_BEST_ADDITIONAL
        );


    const subjectsCounted = [
        ...compulsorySubjects,
        ...bestAdditionalSubjects
    ];


    const validCompulsory =
        compulsorySubjects.length ===
        REQUIRED_COMPULSORY_SUBJECTS;


    const validAdditional =
        bestAdditionalSubjects.length ===
        REQUIRED_BEST_ADDITIONAL;


    const validFinal =
        validCompulsory &&
        validAdditional &&
        subjectsCounted.length ===
        REQUIRED_FINAL_SUBJECTS;


    const finalTotal =
        subjectsCounted.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.total ||
                    0
                ),
            0
        );


    const finalAverage =
        subjectsCounted.length
            ? finalTotal /
              subjectsCounted.length
            : 0;


    const gradeInfo =
        calculateGrade(
            finalAverage
        );


    return {

        compulsorySubjects,

        bestAdditionalSubjects,

        subjectsCounted,

        validCompulsory,

        validAdditional,

        validFinal,

        finalTotal,

        finalAverage,

        grade:
            gradeInfo.grade,

        remark:
            gradeInfo.remark

    };

}


/* ============================================================
   CALCULATE OVERALL
============================================================ */

function calculateOverall() {

    const subjects =
        collectSubjects();


    /*
        ALL SUBJECTS INFORMATIONAL SUMMARY
    */

    const allTotal =
        subjects.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.total ||
                    0
                ),
            0
        );


    const allAverage =
        subjects.length
            ? allTotal /
              subjects.length
            : 0;


    const allGradeInfo =
        calculateGrade(
            allAverage
        );


    if (overallSubjects) {

        overallSubjects.textContent =
            subjects.length;

    }


    if (overallMarks) {

        overallMarks.textContent =
            formatNumber(
                allTotal
            );

    }


    if (overallAverage) {

        overallAverage.textContent =
            `${formatNumber(allAverage)}%`;

    }


    if (overallGrade) {

        overallGrade.textContent =
            subjects.length
                ? allGradeInfo.grade
                : "-";

    }


    /*
        OFFICIAL FINAL CALCULATION
    */

    const finalCalculation =
        calculateFinalTermGrade(
            subjects
        );


    renderFinalCalculation(
        finalCalculation
    );

}


/* ============================================================
   RENDER FINAL CALCULATION
============================================================ */

function renderFinalCalculation(
    calculation
) {

    if (!calculation) {
        return;
    }


    const {
        compulsorySubjects,
        bestAdditionalSubjects,
        subjectsCounted,
        validFinal,
        finalTotal,
        finalAverage,
        grade,
        remark
    } = calculation;


    if (compulsorySubjectCount) {

        compulsorySubjectCount.textContent =
            `${compulsorySubjects.length} / ${REQUIRED_COMPULSORY_SUBJECTS}`;

    }


    if (bestAdditionalCount) {

        bestAdditionalCount.textContent =
            `${bestAdditionalSubjects.length} / ${REQUIRED_BEST_ADDITIONAL}`;

    }


    if (finalSubjectsCount) {

        finalSubjectsCount.textContent =
            `${subjectsCounted.length} / ${REQUIRED_FINAL_SUBJECTS}`;

    }


    if (finalTotalMarks) {

        finalTotalMarks.textContent =
            formatNumber(
                finalTotal
            );

    }


    if (finalAverage) {

        finalAverage.textContent =
            `${formatNumber(finalAverage)}%`;

    }


    if (selectedCompulsorySubjects) {

        selectedCompulsorySubjects.innerHTML =
            "";


        if (!compulsorySubjects.length) {

            selectedCompulsorySubjects.innerHTML =
                "<li>None selected</li>";

        } else {

            compulsorySubjects.forEach(
                (item) => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    li.textContent =
                        `${item.subject} — ${formatNumber(item.total)} (${item.grade})`;


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

            selectedBestSubjects.innerHTML =
                "<li>None available</li>";

        } else {

            bestAdditionalSubjects.forEach(
                (item) => {

                    const li =
                        document.createElement(
                            "li"
                        );


                    li.textContent =
                        `${item.subject} — ${formatNumber(item.total)} (${item.grade})`;


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


        if (validFinal) {

            finalCalculationStatus.textContent =
                `READY — Grade ${grade} (${remark})`;


            finalCalculationStatus.classList.add(
                "ready"
            );

        } else {

            finalCalculationStatus.textContent =
                "INCOMPLETE";


            finalCalculationStatus.classList.add(
                "warning"
            );

        }

    }


    if (finalCalculationWarning) {

        if (validFinal) {

            finalCalculationWarning.style.display =
                "none";


            finalCalculationWarning.textContent =
                "";

        } else {

            const messages = [];


            if (
                compulsorySubjects.length !==
                REQUIRED_COMPULSORY_SUBJECTS
            ) {

                messages.push(
                    `Select exactly ${REQUIRED_COMPULSORY_SUBJECTS} compulsory subjects.`
                );

            }


            if (
                bestAdditionalSubjects.length <
                REQUIRED_BEST_ADDITIONAL
            ) {

                messages.push(
                    `At least ${REQUIRED_BEST_ADDITIONAL} non-compulsory subjects are required.`
                );

            }


            finalCalculationWarning.textContent =
                messages.join(" ");


            finalCalculationWarning.style.display =
                "block";

        }

    }


    updateCountedSubjectRows();

}


/* ============================================================
   UPDATE COUNTED SUBJECT ROWS
============================================================ */

function updateCountedSubjectRows() {

    if (!subjectTableBody) {
        return;
    }


    const subjects =
        collectSubjects();


    const calculation =
        calculateFinalTermGrade(
            subjects
        );


    const countedIndexes =
        new Set(
            calculation.subjectsCounted.map(
                (item) =>
                    item.index
            )
        );


    const compulsoryIndexes =
        new Set(
            calculation.compulsorySubjects.map(
                (item) =>
                    item.index
            )
        );


    const bestIndexes =
        new Set(
            calculation.bestAdditionalSubjects.map(
                (item) =>
                    item.index
            )
        );


    const rows =
        Array.from(
            subjectTableBody.querySelectorAll(
                "tr"
            )
        );


    rows.forEach(
        (row, index) => {

            row.classList.remove(
                "subject-row-counted"
            );


            const subjectInput =
                row.querySelector(
                    ".subject-name-input"
                );


            if (!subjectInput) {
                return;
            }


            row.querySelectorAll(
                ".counted-badge"
            ).forEach(
                (badge) =>
                    badge.remove()
            );


            row.querySelectorAll(
                ".counted-indicator"
            ).forEach(
                (indicator) =>
                    indicator.remove()
            );


            if (
                countedIndexes.has(index)
            ) {

                row.classList.add(
                    "subject-row-counted"
                );


                const badge =
                    document.createElement(
                        "span"
                    );


                badge.className =
                    "counted-badge";


                if (
                    bestIndexes.has(index)
                ) {

                    badge.classList.add(
                        "best-badge"
                    );


                    badge.textContent =
                        "BEST 2";

                } else if (
                    compulsoryIndexes.has(index)
                ) {

                    badge.textContent =
                        "COMPULSORY";

                }


                subjectInput
                    .parentElement
                    .appendChild(
                        badge
                    );

            }

        }
    );

}


/* ============================================================
   UPDATE ROW NUMBERS
============================================================ */

function updateRowNumbers() {

    if (!subjectTableBody) {
        return;
    }


    const rows =
        Array.from(
            subjectTableBody.querySelectorAll(
                "tr"
            )
        );


    rows.forEach(
        (row, index) => {

            const number =
                row.querySelector(
                    ".row-number"
                );


            if (number) {

                number.textContent =
                    index + 1;

            }

        }
    );

}


/* ============================================================
   SAVE RESULT
============================================================ */

async function saveResult(
    status = "draft"
) {

    try {

        if (!selectedStudent) {

            alert(
                "Please select a student first."
            );

            return;

        }


        const organizationId =
            getOrganizationId();


        if (!organizationId) {

            alert(
                "Your organization could not be identified. Please log out and log in again."
            );

            return;

        }


        const academicYearValue =
            academicYear?.value.trim() ||
            "";


        const termValue =
            termSelect?.value ||
            "";


        if (!academicYearValue) {

            alert(
                "Please enter the academic year."
            );

            return;

        }


        if (!termValue) {

            alert(
                "Please select the term."
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


        const finalCalculation =
            calculateFinalTermGrade(
                subjects
            );


        if (
            !finalCalculation.validFinal
        ) {

            alert(

                "The result cannot be saved because the official final calculation is incomplete.\n\n" +

                `You must select exactly ${REQUIRED_COMPULSORY_SUBJECTS} compulsory subjects and have at least ${REQUIRED_BEST_ADDITIONAL} additional subjects.`

            );

            return;

        }


        const allTotal =
            subjects.reduce(
                (sum, item) =>
                    sum +
                    Number(
                        item.total ||
                        0
                    ),
                0
            );


        const allAverage =
            subjects.length
                ? allTotal /
                  subjects.length
                : 0;


        const allGradeInfo =
            calculateGrade(
                allAverage
            );


        const resultData = {

            organizationId,

            studentId:
                selectedStudent.id,

            studentDocumentId:
                selectedStudent.id,

            studentName:
                getStudentName(
                    selectedStudent
                ),

            studentNumber:
                selectedStudent.studentId ||
                selectedStudent.admissionNumber ||
                selectedStudent.studentNumber ||
                "",

            classId:
                getSelectedClassId(),

            className:
                getSelectedClassName() ||
                getStudentClass(
                    selectedStudent
                ),

            academicYear:
                academicYearValue,

            term:
                termValue,

            subjects,

            subjectCount:
                subjects.length,

            totalMarks:
                roundNumber(
                    finalCalculation.finalTotal
                ),

            average:
                roundNumber(
                    finalCalculation.finalAverage
                ),

            overallGrade:
                finalCalculation.grade,

            overallRemark:
                finalCalculation.remark,

            finalCalculation: {

                rule:
                    "4 compulsory subjects + best 2 additional subjects",

                testWeight:
                    25,

                examWeight:
                    75,

                compulsorySubjects:
                    finalCalculation
                        .compulsorySubjects
                        .map(
                            cleanCalculationSubject
                        ),

                bestAdditionalSubjects:
                    finalCalculation
                        .bestAdditionalSubjects
                        .map(
                            cleanCalculationSubject
                        ),

                subjectsCounted:
                    finalCalculation
                        .subjectsCounted
                        .map(
                            cleanCalculationSubject
                        ),

                subjectsCount:
                    REQUIRED_FINAL_SUBJECTS,

                totalMarks:
                    roundNumber(
                        finalCalculation.finalTotal
                    ),

                average:
                    roundNumber(
                        finalCalculation.finalAverage
                    ),

                grade:
                    finalCalculation.grade,

                remark:
                    finalCalculation.remark

            },

            allSubjectsSummary: {

                subjectCount:
                    subjects.length,

                totalMarks:
                    roundNumber(
                        allTotal
                    ),

                average:
                    roundNumber(
                        allAverage
                    ),

                grade:
                    allGradeInfo.grade,

                remark:
                    allGradeInfo.remark

            },

            position:
                positionInput?.value.trim() ||
                "",

            teacherComment:
                teacherComment?.value.trim() ||
                "",

            principalComment:
                principalComment?.value.trim() ||
                "",

            status,

            updatedAt:
                serverTimestamp(),

            updatedBy:
                currentUser.uid,

            updatedByEmail:
                currentUser.email ||
                "",

            parentUid:
                selectedStudent.parentUid ||
                selectedStudent.parentId ||
                null

        };


        /* ----------------------------------------------------
           UPDATE
        ---------------------------------------------------- */

        if (currentResult?.id) {

            await updateDoc(
                doc(
                    db,
                    RESULTS_COLLECTION,
                    currentResult.id
                ),
                resultData
            );


            const updatedResult = {

                ...currentResult,

                ...resultData,

                id:
                    currentResult.id

            };


            replaceLocalResult(
                updatedResult
            );


            currentResult =
                updatedResult;

        }


        /* ----------------------------------------------------
           CREATE
        ---------------------------------------------------- */

        else {

            const newData = {

                ...resultData,

                createdAt:
                    serverTimestamp(),

                createdBy:
                    currentUser.uid,

                createdByEmail:
                    currentUser.email ||
                    ""

            };


            const resultRef =
                await addDoc(
                    collection(
                        db,
                        RESULTS_COLLECTION
                    ),
                    newData
                );


            currentResult = {

                id:
                    resultRef.id,

                ...resultData

            };


            allResults.push(
                currentResult
            );

        }


        if (resultStatus) {

            resultStatus.textContent =
                status === "published"
                    ? "Published"
                    : "Draft";

        }


        updateStatistics();

        renderExistingResults();


        alert(
            status === "published"
                ? "Result saved and published successfully."
                : "Result saved as draft successfully."
        );


    } catch (error) {

        console.error(
            "Save result error:",
            error
        );


        alert(
            error?.message ||
            "Unable to save result."
        );

    }

}


/* ============================================================
   RENDER EXISTING RESULT
============================================================ */

function renderResultIntoEditor(
    result
) {

    selectedStudent =
        selectedStudent ||
        findStudentInAllClasses(
            result.studentId ||
            result.studentDocumentId
        );


    if (!selectedStudent) {

        selectedStudent = {

            id:
                result.studentId ||
                result.studentDocumentId,

            studentId:
                result.studentNumber ||
                "",

            name:
                result.studentName,

            class:
                result.className

        };

    }


    showResultEditor();


    if (academicYear) {

        academicYear.value =
            result.academicYear ||
            "";

    }


    if (termSelect) {

        termSelect.value =
            result.term ||
            "";

    }


    if (resultStatus) {

        resultStatus.textContent =
            result.status === "published"
                ? "Published"
                : "Draft";

    }


    if (positionInput) {

        positionInput.value =
            result.position ||
            "";

    }


    if (teacherComment) {

        teacherComment.value =
            result.teacherComment ||
            "";

    }


    if (principalComment) {

        principalComment.value =
            result.principalComment ||
            "";

    }


    if (subjectTableBody) {

        subjectTableBody.innerHTML =
            "";


        const subjects =
            Array.isArray(
                result.subjects
            )
                ? result.subjects
                : [];


        const legacyCompulsory =
            getLegacyCompulsorySubjects(
                result
            );


        subjects.forEach(
            (subject) => {

                let isCompulsory =
                    subject.isCompulsory === true;


                if (
                    typeof subject.isCompulsory !==
                    "boolean"
                ) {

                    isCompulsory =
                        legacyCompulsory.has(
                            normalizeSubjectName(
                                subject.subject
                            )
                        );

                }


                const test =
                    subject.test ??
                    subject.ca ??
                    0;


                const exam =
                    subject.exam ??
                    0;


                addSubjectRow(

                    subject.subject ||
                    "",

                    test,

                    exam,

                    isCompulsory

                );

            }
        );

    }


    calculateOverall();

}


/* ============================================================
   LEGACY COMPULSORY SUBJECTS
============================================================ */

function getLegacyCompulsorySubjects(
    result
) {

    const names =
        new Set();


    if (
        result?.finalCalculation
            ?.compulsorySubjects
    ) {

        result.finalCalculation
            .compulsorySubjects
            .forEach(
                (item) => {

                    if (item.subject) {

                        names.add(
                            normalizeSubjectName(
                                item.subject
                            )
                        );

                    }

                }
            );

    }


    if (!names.size) {

        [
            "ENGLISH LANGUAGE",
            "MATHEMATICS",
            "SCIENCE",
            "SOCIAL & ENV. STUDIES"
        ].forEach(
            (name) => {

                names.add(
                    normalizeSubjectName(
                        name
                    )
                );

            }
        );

    }


    return names;

}


/* ============================================================
   PUBLISH EXISTING RESULT
============================================================ */

async function publishExistingResult(
    result
) {

    try {

        const subjects =
            Array.isArray(
                result.subjects
            )
                ? result.subjects
                : [];


        /*
            Existing database records may contain old
            subject structures.

            Normalize them before calculation.
        */

        const normalizedSubjects =
            subjects.map(
                (subject, index) => {

                    const test =
                        Number(
                            subject.test ??
                            subject.ca ??
                            0
                        );


                    const exam =
                        Number(
                            subject.exam ??
                            0
                        );


                    const total =
                        (
                            test *
                            TEST_WEIGHT
                        ) +
                        (
                            exam *
                            EXAM_WEIGHT
                        );


                    const gradeInfo =
                        calculateGrade(
                            total
                        );


                    return {

                        index,

                        subject:
                            subject.subject ||
                            `Subject ${index + 1}`,

                        test,

                        exam,

                        testWeighted:
                            test *
                            TEST_WEIGHT,

                        examWeighted:
                            exam *
                            EXAM_WEIGHT,

                        ca:
                            test,

                        total,

                        grade:
                            gradeInfo.grade,

                        remark:
                            gradeInfo.remark,

                        isCompulsory:
                            subject.isCompulsory === true

                    };

                }
            );


        const calculation =
            calculateFinalTermGrade(
                normalizedSubjects
            );


        if (
            !calculation.validFinal
        ) {

            alert(
                "This result cannot be published because it does not have exactly 4 compulsory subjects and at least 2 additional subjects."
            );

            return;

        }


        const calculationData = {

            rule:
                "4 compulsory subjects + best 2 additional subjects",

            testWeight:
                25,

            examWeight:
                75,

            compulsorySubjects:
                calculation
                    .compulsorySubjects
                    .map(
                        cleanCalculationSubject
                    ),

            bestAdditionalSubjects:
                calculation
                    .bestAdditionalSubjects
                    .map(
                        cleanCalculationSubject
                    ),

            subjectsCounted:
                calculation
                    .subjectsCounted
                    .map(
                        cleanCalculationSubject
                    ),

            subjectsCount:
                6,

            totalMarks:
                roundNumber(
                    calculation.finalTotal
                ),

            average:
                roundNumber(
                    calculation.finalAverage
                ),

            grade:
                calculation.grade,

            remark:
                calculation.remark

        };


        await updateDoc(
            doc(
                db,
                RESULTS_COLLECTION,
                result.id
            ),
            {

                status:
                    "published",

                totalMarks:
                    calculationData.totalMarks,

                average:
                    calculationData.average,

                overallGrade:
                    calculationData.grade,

                overallRemark:
                    calculationData.remark,

                finalCalculation:
                    calculationData,

                updatedAt:
                    serverTimestamp(),

                updatedBy:
                    currentUser.uid

            }
        );


        const updated = {

            ...result,

            status:
                "published",

            totalMarks:
                calculationData.totalMarks,

            average:
                calculationData.average,

            overallGrade:
                calculationData.grade,

            overallRemark:
                calculationData.remark,

            finalCalculation:
                calculationData

        };


        replaceLocalResult(
            updated
        );


        renderExistingResults();

        updateStatistics();


        alert(
            "Result published successfully."
        );


    } catch (error) {

        console.error(
            "Publish error:",
            error
        );


        alert(
            error?.message ||
            "Unable to publish result."
        );

    }

}


/* ============================================================
   EXISTING RESULTS
============================================================ */

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
        (
            resultSearch?.value ||
            ""
        )
            .trim()
            .toLowerCase();


    let filtered =
        [...allResults];


    if (classFilter) {

        filtered =
            filtered.filter(
                (result) =>
                    normalizeClass(
                        result.className
                    ) ===
                    normalizeClass(
                        classFilter
                    )
            );

    }


    if (termFilter) {

        filtered =
            filtered.filter(
                (result) =>
                    String(
                        result.term ||
                        ""
                    ) ===
                    String(
                        termFilter
                    )
            );

    }


    if (search) {

        filtered =
            filtered.filter(
                (result) => {

                    const text =
                        [

                            result.studentName,

                            result.studentNumber,

                            result.className,

                            result.academicYear,

                            result.term

                        ]
                            .filter(Boolean)
                            .join(" ")
                            .toLowerCase();


                    return text.includes(
                        search
                    );

                }
            );

    }


    filtered.sort(
        (a, b) => {

            const classDifference =
                getClassOrder(
                    a.className
                ) -
                getClassOrder(
                    b.className
                );


            if (
                classDifference !==
                0
            ) {

                return classDifference;

            }


            return String(
                a.studentName ||
                ""
            ).localeCompare(
                String(
                    b.studentName ||
                    ""
                )
            );

        }
    );


    existingResultsBody.innerHTML =
        "";


    if (!filtered.length) {

        if (existingResultsEmpty) {

            existingResultsEmpty.style.display =
                "block";

        }

        return;

    }


    if (existingResultsEmpty) {

        existingResultsEmpty.style.display =
            "none";

    }


    filtered.forEach(
        (result) => {

            const row =
                document.createElement(
                    "tr"
                );


            const subjectsCount =
                Array.isArray(
                    result.subjects
                )
                    ? result.subjects.length
                    : result.subjectCount ||
                      0;


            const status =
                result.status ===
                "published"
                    ? "Published"
                    : "Draft";


            row.innerHTML = `

                <td>

                    <strong>
                        ${escapeHtml(
                            result.studentName ||
                            "Unknown Student"
                        )}
                    </strong>

                </td>

                <td>
                    ${escapeHtml(
                        result.className ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        result.academicYear ||
                        "-"
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        result.term ||
                        "-"
                    )}
                </td>

                <td>
                    ${subjectsCount}
                </td>

                <td>
                    ${formatNumber(
                        result.totalMarks ||
                        0
                    )}
                </td>

                <td>
                    ${formatNumber(
                        result.average ||
                        0
                    )}%
                </td>

                <td>

                    <strong>
                        ${escapeHtml(
                            result.overallGrade ||
                            "-"
                        )}
                    </strong>

                </td>

                <td>

                    <span class="${
                        status === "Published"
                            ? "status-published"
                            : "status-draft"
                    }">

                        ${status}

                    </span>

                </td>

                <td>

                    <button
                        type="button"
                        class="secondary-btn edit-result-btn"
                        data-id="${escapeAttribute(
                            result.id
                        )}"
                    >
                        Edit
                    </button>

                    ${
                        status !== "Published"
                            ? `
                                <button
                                    type="button"
                                    class="primary-btn publish-existing-btn"
                                    data-id="${escapeAttribute(
                                        result.id
                                    )}"
                                >
                                    Publish
                                </button>
                            `
                            : ""
                    }

                </td>

            `;


            existingResultsBody.appendChild(
                row
            );

        }
    );


    attachExistingResultActions();

}


/* ============================================================
   EXISTING RESULT ACTIONS
============================================================ */

function attachExistingResultActions() {

    if (!existingResultsBody) {
        return;
    }


    const editButtons =
        existingResultsBody.querySelectorAll(
            ".edit-result-btn"
        );


    editButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const result =
                        allResults.find(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    button.dataset.id
                                )
                        );


                    if (!result) {
                        return;
                    }


                    selectedStudent =
                        findStudentInAllClasses(
                            result.studentId ||
                            result.studentDocumentId
                        );


                    if (
                        !selectedStudent
                    ) {

                        selectedStudent = {

                            id:
                                result.studentId ||
                                result.studentDocumentId,

                            studentId:
                                result.studentNumber ||
                                "",

                            name:
                                result.studentName,

                            class:
                                result.className

                        };

                    }


                    selectStudentInForm(
                        selectedStudent
                    );


                    renderResultIntoEditor(
                        result
                    );


                    if (resultEditor) {

                        resultEditor.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    }

                }
            );

        }
    );


    const publishButtons =
        existingResultsBody.querySelectorAll(
            ".publish-existing-btn"
        );


    publishButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const result =
                        allResults.find(
                            (item) =>
                                String(
                                    item.id
                                ) ===
                                String(
                                    button.dataset.id
                                )
                        );


                    if (!result) {
                        return;
                    }


                    publishExistingResult(
                        result
                    );

                }
            );

        }
    );

}


/* ============================================================
   SELECT STUDENT IN FORM
============================================================ */

function selectStudentInForm(
    student
) {

    if (!student) {
        return;
    }


    const studentClass =
        getStudentClass(
            student
        );


    const matchingClass =
        classes.find(
            (item) =>
                normalizeClass(
                    getClassName(item)
                ) ===
                normalizeClass(
                    studentClass
                )
        );


    if (
        matchingClass &&
        classSelect
    ) {

        classSelect.value =
            matchingClass.id;


        handleClassChange();

    }


    if (studentSelect) {

        studentSelect.value =
            student.id;

    }


    selectedStudent =
        student;

}


/* ============================================================
   STATISTICS
============================================================ */

function updateStatistics() {

    if (totalStudents) {

        totalStudents.textContent =
            students.length;

    }


    if (resultsEntered) {

        resultsEntered.textContent =
            allResults.length;

    }


    if (publishedResults) {

        publishedResults.textContent =
            allResults.filter(
                (result) =>
                    result.status ===
                    "published"
            ).length;

    }


    if (totalClasses) {

        totalClasses.textContent =
            classes.length;

    }


    renderExistingResults();

}


/* ============================================================
   REPLACE LOCAL RESULT
============================================================ */

function replaceLocalResult(
    updatedResult
) {

    const index =
        allResults.findIndex(
            (result) =>
                String(
                    result.id
                ) ===
                String(
                    updatedResult.id
                )
        );


    if (index === -1) {

        allResults.push(
            updatedResult
        );

        return;

    }


    allResults[index] =
        updatedResult;

}


/* ============================================================
   GRADE CALCULATION
============================================================ */

function calculateGrade(
    mark
) {

    const score =
        Number(
            mark ||
            0
        );


    if (score >= 90) {

        return {
            grade: "1",
            remark: "Excellent"
        };

    }


    if (score >= 81) {

        return {
            grade: "2",
            remark: "Very Good"
        };

    }


    if (score >= 76) {

        return {
            grade: "3",
            remark: "Good"
        };

    }


    if (score >= 71) {

        return {
            grade: "4",
            remark: "Credit"
        };

    }


    if (score >= 66) {

        return {
            grade: "5",
            remark: "Credit"
        };

    }


    if (score >= 56) {

        return {
            grade: "6",
            remark: "Credit"
        };

    }


    if (score >= 50) {

        return {
            grade: "7",
            remark: "Pass"
        };

    }


    if (score >= 40) {

        return {
            grade: "8",
            remark: "Pass"
        };

    }


    return {

        grade: "9",

        remark:
            "Fail"

    };

}


/* ============================================================
   CLEAN CALCULATION SUBJECT
============================================================ */

function cleanCalculationSubject(
    item
) {

    return {

        subject:
            item.subject,

        test:
            roundNumber(
                item.test ??
                item.ca ??
                0
            ),

        exam:
            roundNumber(
                item.exam ??
                0
            ),

        testWeighted:
            roundNumber(
                item.testWeighted ??
                (
                    Number(
                        item.test ??
                        item.ca ??
                        0
                    ) *
                    TEST_WEIGHT
                )
            ),

        examWeighted:
            roundNumber(
                item.examWeighted ??
                (
                    Number(
                        item.exam ??
                        0
                    ) *
                    EXAM_WEIGHT
                )
            ),

        total:
            roundNumber(
                item.total ||
                0
            ),

        grade:
            item.grade,

        remark:
            item.remark,

        isCompulsory:
            Boolean(
                item.isCompulsory
            )

    };

}


/* ============================================================
   ORGANIZATION ID
============================================================ */

function getOrganizationId() {

    if (!currentOrganization) {
        return null;
    }


    if (
        typeof currentOrganization ===
        "string"
    ) {

        return currentOrganization;

    }


    return (

        currentOrganization.id ||

        currentOrganization.uid ||

        currentOrganization.organizationId ||

        null

    );

}


/* ============================================================
   SELECTED CLASS ID
============================================================ */

function getSelectedClassId() {

    return classSelect?.value ||
        "";

}


/* ============================================================
   SELECTED CLASS NAME
============================================================ */

function getSelectedClassName() {

    if (!classSelect?.value) {
        return "";
    }


    const selected =
        classes.find(
            (item) =>
                String(
                    item.id
                ) ===
                String(
                    classSelect.value
                )
        );


    return selected
        ? getClassName(selected)
        : classSelect.value;

}


/* ============================================================
   CLASS NAME
============================================================ */

function getClassName(
    classItem
) {

    if (!classItem) {
        return "";
    }


    return (

        classItem.name ||

        classItem.className ||

        classItem.title ||

        ""

    );

}


/* ============================================================
   STUDENT CLASS
============================================================ */

function getStudentClass(
    student
) {

    if (!student) {
        return "";
    }


    return (

        student.className ||

        student.class ||

        student.grade ||

        student.form ||

        student.classId ||

        ""

    );

}


/* ============================================================
   STUDENT NAME
============================================================ */

function getStudentName(
    student
) {

    if (!student) {
        return "Unknown Student";
    }


    return (

        student.name ||

        student.fullName ||

        [
            student.firstName,
            student.middleName,
            student.lastName
        ]
            .filter(Boolean)
            .join(" ") ||

        "Unknown Student"

    );

}


/* ============================================================
   FIND STUDENT
============================================================ */

function findStudentInAllClasses(
    studentId
) {

    return students.find(
        (student) =>

            String(
                student.id
            ) ===
            String(
                studentId
            )

            ||

            String(
                student.studentId ||
                ""
            ) ===
            String(
                studentId
            )

            ||

            String(
                student.admissionNumber ||
                ""
            ) ===
            String(
                studentId
            )
    );

}


/* ============================================================
   NORMALIZE CLASS
============================================================ */

function normalizeClass(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );

}


/* ============================================================
   NORMALIZE SUBJECT
============================================================ */

function normalizeSubjectName(
    value
) {

    return String(
        value ||
        ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\s+/g,
            " "
        );

}


/* ============================================================
   CLASS ORDER
============================================================ */

function getClassOrder(
    className
) {

    const normalized =
        normalizeClass(
            className
        );


    const index =
        CLASS_ORDER.findIndex(
            (name) =>
                normalizeClass(
                    name
                ) ===
                normalized
        );


    return index === -1
        ? 999
        : index;

}


/* ============================================================
   STUDENT SORT
============================================================ */

function compareStudentNames(
    a,
    b
) {

    return getStudentName(a)
        .localeCompare(
            getStudentName(b)
        );

}


/* ============================================================
   NUMBER HELPERS
============================================================ */

function clampNumber(
    value,
    min = 0,
    max = Infinity
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


    return Math.min(
        max,
        Math.max(
            min,
            number
        )
    );

}


/* ============================================================
   ROUND NUMBER
============================================================ */

function roundNumber(
    value
) {

    return Math.round(
        Number(
            value ||
            0
        ) *
        100
    ) / 100;

}


/* ============================================================
   SAFE NUMBER
============================================================ */

function safeNumber(
    value
) {

    const number =
        Number(value);


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


/* ============================================================
   FORMAT NUMBER
============================================================ */

function formatNumber(
    value
) {

    return Number(
        value ||
        0
    ).toFixed(2);

}


/* ============================================================
   RESET CALCULATION DISPLAY
============================================================ */

function resetCalculationDisplay() {

    if (overallSubjects) {

        overallSubjects.textContent =
            "0";

    }


    if (overallMarks) {

        overallMarks.textContent =
            "0.00";

    }


    if (overallAverage) {

        overallAverage.textContent =
            "0.00%";

    }


    if (overallGrade) {

        overallGrade.textContent =
            "-";

    }


    if (compulsorySubjectCount) {

        compulsorySubjectCount.textContent =
            "0 / 4";

    }


    if (bestAdditionalCount) {

        bestAdditionalCount.textContent =
            "0 / 2";

    }


    if (finalSubjectsCount) {

        finalSubjectsCount.textContent =
            "0 / 6";

    }


    if (finalTotalMarks) {

        finalTotalMarks.textContent =
            "0.00";

    }


    if (finalAverage) {

        finalAverage.textContent =
            "0.00%";

    }


    if (selectedCompulsorySubjects) {

        selectedCompulsorySubjects.innerHTML =
            "<li>None selected</li>";

    }


    if (selectedBestSubjects) {

        selectedBestSubjects.innerHTML =
            "<li>None available</li>";

    }


    if (finalCalculationStatus) {

        finalCalculationStatus.className =
            "final-calculation-status";


        finalCalculationStatus.textContent =
            "Waiting";

    }


    if (finalCalculationWarning) {

        finalCalculationWarning.style.display =
            "none";


        finalCalculationWarning.textContent =
            "";

    }

}


/* ============================================================
   LOGOUT
============================================================ */

async function handleLogout() {

    try {

        await signOut(
            auth
        );


        window.location.href =
            "index.html";


    } catch (error) {

        console.error(
            "Logout error:",
            error
        );


        alert(
            "Unable to logout. Please try again."
        );

    }

}


/* ============================================================
   ERROR DISPLAY
============================================================ */

function showError(
    message
) {

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }


    if (mainContent) {

        mainContent.classList.add(
            "hidden"
        );

        mainContent.style.display =
            "none";

    }


    if (errorMessage) {

        errorMessage.textContent =
            message;

    }


    if (errorScreen) {

        errorScreen.style.display =
            "block";

    }

}


/* ============================================================
   HTML ESCAPING
============================================================ */

function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ============================================================
   ATTRIBUTE ESCAPING
============================================================ */

function escapeAttribute(
    value
) {

    return escapeHtml(
        value
    );

}
