/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/form-master.js

   PURPOSE:
   FORM MASTER DASHBOARD + CLASS ATTENDANCE REGISTER

   FIXES:
   - Automatically connects existing staff profile to Firebase login
   - Searches staff by userUid
   - Searches by uid
   - Searches by userId
   - Searches by email
   - Searches by organization + email
   - Loads organization correctly using document ID
   - Loads Form Master assigned classes
   - Loads students
   - Attendance register
   - Present / Late / Absent
   - Save attendance
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
    getDoc,
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
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentOrganization = null;
let currentTeacher = null;

let assignedClasses = [];
let selectedClass = null;
let selectedStudents = [];

let attendanceMap = {};
let existingAttendance = {};


/* =========================================================
   DOM
========================================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const errorScreen =
    document.getElementById("errorScreen");

const errorMessage =
    document.getElementById("errorMessage");

const teacherNameElement =
    document.getElementById("teacherName");

const welcomeNameElement =
    document.getElementById("welcomeName");

const organizationNameElement =
    document.getElementById("organizationName");

const totalClassesElement =
    document.getElementById("totalClasses");

const totalStudentsElement =
    document.getElementById("totalStudents");

const presentTodayElement =
    document.getElementById("presentToday");

const lateTodayElement =
    document.getElementById("lateToday");

const classListElement =
    document.getElementById("classList");

const attendanceDateInput =
    document.getElementById("attendanceDate");

const registerClassName =
    document.getElementById("registerClassName");

const registerDescription =
    document.getElementById("registerDescription");

const attendanceRegister =
    document.getElementById("attendanceRegister");

const registerToolbar =
    document.getElementById("registerToolbar");

const toolbarInfo =
    document.getElementById("toolbarInfo");

const saveAttendanceButton =
    document.getElementById("saveAttendanceButton");

const markAllPresentButton =
    document.getElementById("markAllPresent");

const markAllAbsentButton =
    document.getElementById("markAllAbsent");

const logoutButton =
    document.getElementById("logoutButton");


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Form Master dashboard starting..."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (attendanceDateInput) {
            attendanceDateInput.value =
                getLocalDateString();
        }

        startFormMasterDashboard();
    }
);


/* =========================================================
   START DASHBOARD
========================================================= */

function startFormMasterDashboard() {

    console.log(
        "🔐 Checking Firebase authentication..."
    );

    onAuthStateChanged(
        auth,
        async user => {

            try {

                if (!user) {

                    console.log(
                        "⚠️ No authenticated user."
                    );

                    window.location.href =
                        "login.html";

                    return;
                }

                currentUser = user;

                console.log(
                    "✅ Logged in user:",
                    user.email
                );

                console.log(
                    "🆔 Firebase UID:",
                    user.uid
                );


                /* =========================================
                   LOAD STAFF PROFILE
                ========================================= */

                await loadTeacherProfile();


                if (!currentTeacher) {
                    return;
                }


                /* =========================================
                   LOAD ORGANIZATION
                ========================================= */

                await loadOrganization();


                if (!currentOrganization) {
                    return;
                }


                /* =========================================
                   LOAD CLASSES
                ========================================= */

                await loadAssignedClasses();


                /* =========================================
                   STATISTICS
                ========================================= */

                await loadTodayDashboardStatistics();


                renderClasses();

                updateStatistics();

                hideLoading();


                console.log(
                    "✅ Virello Form Master dashboard ready."
                );

            }

            catch (error) {

                console.error(
                    "❌ Form Master dashboard error:",
                    error
                );

                showError(
                    error.message ||
                    "Unable to load Form Master dashboard."
                );

            }

        }
    );
}


/* =========================================================
   LOAD TEACHER PROFILE
========================================================= */

async function loadTeacherProfile() {

    console.log(
        "👨‍🏫 Searching for Virello staff profile..."
    );


    const staffRef =
        collection(
            db,
            "staff"
        );


    let teacherSnapshot = null;


    /* =========================================
       1. SEARCH userUid
    ========================================= */

    console.log(
        "🔎 Searching staff.userUid..."
    );

    teacherSnapshot =
        await getDocs(
            query(
                staffRef,
                where(
                    "userUid",
                    "==",
                    currentUser.uid
                )
            )
        );


    /* =========================================
       2. SEARCH uid
    ========================================= */

    if (teacherSnapshot.empty) {

        console.log(
            "🔎 Searching staff.uid..."
        );

        teacherSnapshot =
            await getDocs(
                query(
                    staffRef,
                    where(
                        "uid",
                        "==",
                        currentUser.uid
                    )
                )
            );
    }


    /* =========================================
       3. SEARCH userId
    ========================================= */

    if (teacherSnapshot.empty) {

        console.log(
            "🔎 Searching staff.userId..."
        );

        teacherSnapshot =
            await getDocs(
                query(
                    staffRef,
                    where(
                        "userId",
                        "==",
                        currentUser.uid
                    )
                )
            );
    }


    /* =========================================
       4. SEARCH EMAIL
    ========================================= */

    if (
        teacherSnapshot.empty &&
        currentUser.email
    ) {

        console.log(
            "🔎 Searching staff.email..."
        );

        teacherSnapshot =
            await getDocs(
                query(
                    staffRef,
                    where(
                        "email",
                        "==",
                        currentUser.email
                    )
                )
            );
    }


    /* =========================================
       5. EMAIL LOWERCASE
    ========================================= */

    if (
        teacherSnapshot.empty &&
        currentUser.email
    ) {

        console.log(
            "🔎 Searching staff.emailLower..."
        );

        teacherSnapshot =
            await getDocs(
                query(
                    staffRef,
                    where(
                        "emailLower",
                        "==",
                        currentUser.email.toLowerCase()
                    )
                )
            );
    }


    /* =========================================
       NO STAFF PROFILE
    ========================================= */

    if (teacherSnapshot.empty) {

        console.error(
            "❌ No staff profile found."
        );

        showError(
            "Your Virello staff profile could not be connected to this login. The administrator must first create your staff account using the same email address as your Virello login."
        );

        return;
    }


    /* =========================================
       GET FIRST STAFF DOCUMENT
    ========================================= */

    const teacherDocument =
        teacherSnapshot.docs[0];


    currentTeacher = {

        id:
            teacherDocument.id,

        ...teacherDocument.data()

    };


    console.log(
        "✅ Staff profile found:",
        currentTeacher
    );


    /* =========================================
       AUTOMATICALLY CONNECT STAFF TO LOGIN
    ========================================= */

    const connectionData = {};


    if (
        currentTeacher.userUid !==
        currentUser.uid
    ) {

        connectionData.userUid =
            currentUser.uid;
    }


    if (
        currentTeacher.uid !==
        currentUser.uid
    ) {

        connectionData.uid =
            currentUser.uid;
    }


    if (
        currentTeacher.userId !==
        currentUser.uid
    ) {

        connectionData.userId =
            currentUser.uid;
    }


    if (
        currentUser.email &&
        currentTeacher.email !==
        currentUser.email
    ) {

        connectionData.email =
            currentUser.email;
    }


    if (
        currentUser.email &&
        currentTeacher.emailLower !==
        currentUser.email.toLowerCase()
    ) {

        connectionData.emailLower =
            currentUser.email.toLowerCase();
    }


    if (
        Object.keys(connectionData).length
    ) {

        console.log(
            "🔗 Connecting staff profile to Firebase login..."
        );

        try {

            await updateDoc(
                doc(
                    db,
                    "staff",
                    currentTeacher.id
                ),
                connectionData
            );


            currentTeacher = {

                ...currentTeacher,

                ...connectionData

            };


            console.log(
                "✅ Staff profile successfully connected to login."
            );

        }

        catch (error) {

            console.warn(
                "⚠️ Could not automatically update staff profile:",
                error
            );

        }

    }


    /* =========================================
       DISPLAY TEACHER NAME
    ========================================= */

    const name =
        getTeacherName(
            currentTeacher
        );


    if (teacherNameElement) {

        teacherNameElement.textContent =
            name;

    }


    if (welcomeNameElement) {

        welcomeNameElement.textContent =
            `Welcome, ${name}`;

    }

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading Form Master organization..."
    );


    let organizationId =
        currentTeacher.organizationId ||
        currentTeacher.orgId ||
        currentTeacher.organizationID ||
        null;


    /* =========================================
       ORGANIZATION ID EXISTS
    ========================================= */

    if (organizationId) {

        console.log(
            "🏢 Organization ID:",
            organizationId
        );


        try {

            const organizationDocument =
                await getDoc(
                    doc(
                        db,
                        "organizations",
                        organizationId
                    )
                );


            if (
                organizationDocument.exists()
            ) {

                currentOrganization = {

                    id:
                        organizationDocument.id,

                    ...organizationDocument.data()

                };

            }

        }

        catch (error) {

            console.error(
                "❌ Organization lookup failed:",
                error
            );

        }

    }


    /* =========================================
       FALLBACK ownerUid
    ========================================= */

    if (
        !currentOrganization &&
        currentTeacher.ownerUid
    ) {

        console.log(
            "🔎 Searching organization by ownerUid..."
        );


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
                    currentTeacher.ownerUid
                )
            );


        const organizationSnapshot =
            await getDocs(
                organizationQuery
            );


        if (
            !organizationSnapshot.empty
        ) {

            const organizationDocument =
                organizationSnapshot.docs[0];


            currentOrganization = {

                id:
                    organizationDocument.id,

                ...organizationDocument.data()

            };

        }

    }


    /* =========================================
       FALLBACK organization owner
    ========================================= */

    if (
        !currentOrganization &&
        currentTeacher.organization
    ) {

        const organizationsRef =
            collection(
                db,
                "organizations"
            );


        const organizationQuery =
            query(
                organizationsRef,
                where(
                    "name",
                    "==",
                    currentTeacher.organization
                )
            );


        const organizationSnapshot =
            await getDocs(
                organizationQuery
            );


        if (
            !organizationSnapshot.empty
        ) {

            const organizationDocument =
                organizationSnapshot.docs[0];


            currentOrganization = {

                id:
                    organizationDocument.id,

                ...organizationDocument.data()

            };

        }

    }


    /* =========================================
       ORGANIZATION NOT FOUND
    ========================================= */

    if (!currentOrganization) {

        showError(
            "Your staff account was found, but it is not connected to a Virello organization. Please make sure your staff profile has an organizationId."
        );

        return;
    }


    /* =========================================
       DISPLAY ORGANIZATION
    ========================================= */

    const organizationName =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        currentOrganization.schoolName ||
        "Organization";


    if (organizationNameElement) {

        organizationNameElement.textContent =
            organizationName;

    }


    console.log(
        "✅ Organization loaded:",
        currentOrganization.id,
        organizationName
    );

}


/* =========================================================
   LOAD ASSIGNED CLASSES
========================================================= */

async function loadAssignedClasses() {

    console.log(
        "📚 Loading classes assigned to:",
        currentTeacher.id
    );


    const classesRef =
        collection(
            db,
            "classes"
        );


    let snapshot = null;


    /* =========================================
       PRIMARY:
       formMasterId
    ========================================= */

    try {

        const classQuery =
            query(
                classesRef,

                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                ),

                where(
                    "formMasterId",
                    "==",
                    currentTeacher.id
                )
            );


        snapshot =
            await getDocs(
                classQuery
            );

    }

    catch (error) {

        console.warn(
            "⚠️ Primary class query failed:",
            error
        );

        snapshot = {
            empty: true,
            docs: []
        };

    }


    /* =========================================
       FALLBACK:
       formMaster
    ========================================= */

    if (snapshot.empty) {

        try {

            const classQuery =
                query(
                    classesRef,

                    where(
                        "organizationId",
                        "==",
                        currentOrganization.id
                    ),

                    where(
                        "formMaster",
                        "==",
                        currentTeacher.id
                    )
                );


            snapshot =
                await getDocs(
                    classQuery
                );

        }

        catch (error) {

            console.warn(
                "⚠️ formMaster class query failed."
            );

        }

    }


    /* =========================================
       BUILD CLASS LIST
    ========================================= */

    assignedClasses = [];


    snapshot.forEach(
        classDocument => {

            assignedClasses.push({

                id:
                    classDocument.id,

                ...classDocument.data(),

                studentCount:
                    0

            });

        }
    );


    /* =========================================
       LOAD STUDENT COUNTS
    ========================================= */

    for (
        const classItem
        of assignedClasses
    ) {

        try {

            const studentsQuery =
                query(

                    collection(
                        db,
                        "students"
                    ),

                    where(
                        "organizationId",
                        "==",
                        currentOrganization.id
                    ),

                    where(
                        "classId",
                        "==",
                        classItem.id
                    )

                );


            const studentsSnapshot =
                await getDocs(
                    studentsQuery
                );


            classItem.studentCount =
                studentsSnapshot.size;

        }

        catch (error) {

            console.warn(
                "⚠️ Could not count students:",
                error
            );

            classItem.studentCount = 0;

        }

    }


    assignedClasses.sort(
        (a, b) =>
            getGradeNumber(
                a.className ||
                a.name
            ) -
            getGradeNumber(
                b.className ||
                b.name
            )
    );


    console.log(
        "✅ Assigned classes:",
        assignedClasses
    );

}


/* =========================================================
   RENDER CLASSES
========================================================= */

function renderClasses() {

    if (!classListElement) {
        return;
    }


    classListElement.innerHTML = "";


    if (!assignedClasses.length) {

        classListElement.innerHTML = `
            <div class="no-classes">
                No classes are currently assigned
                to you as Form Master.
            </div>
        `;

        return;
    }


    assignedClasses.forEach(
        classItem => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "class-item";


            if (
                selectedClass &&
                selectedClass.id ===
                classItem.id
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.dataset.classId =
                classItem.id;


            const className =
                classItem.className ||
                classItem.name ||
                "Class";


            button.innerHTML = `
                <div class="class-item-name">
                    ${escapeHtml(className)}
                </div>

                <span class="class-item-count">
                    ${classItem.studentCount}
                    Student${classItem.studentCount === 1 ? "" : "s"}
                </span>
            `;


            classListElement.appendChild(
                button
            );

        }
    );

}


/* =========================================================
   CLASS CLICK
========================================================= */

if (classListElement) {

    classListElement.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-class-id]"
                );


            if (!button) {
                return;
            }


            const classId =
                button.dataset.classId;


            const classItem =
                assignedClasses.find(
                    item =>
                        item.id ===
                        classId
                );


            if (!classItem) {
                return;
            }


            await selectClass(
                classItem
            );

        }
    );

}


/* =========================================================
   SELECT CLASS
========================================================= */

async function selectClass(
    classItem
) {

    console.log(
        "📚 Selected class:",
        classItem
    );


    selectedClass =
        classItem;


    renderClasses();


    const className =
        classItem.className ||
        classItem.name ||
        "Class";


    if (registerClassName) {

        registerClassName.textContent =
            className;

    }


    if (registerDescription) {

        registerDescription.textContent =
            `Attendance register for ${className}.`;

    }


    if (registerToolbar) {

        registerToolbar.style.display =
            "flex";

    }


    if (saveAttendanceButton) {

        saveAttendanceButton.disabled =
            false;

    }


    await loadStudents();

    await loadAttendanceForSelectedDate();

    renderAttendanceRegister();

    updateStatistics();

}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    if (!selectedClass) {

        selectedStudents = [];

        return;
    }


    console.log(
        "👨‍🎓 Loading students:",
        selectedClass.id
    );


    const studentsQuery =
        query(

            collection(
                db,
                "students"
            ),

            where(
                "organizationId",
                "==",
                currentOrganization.id
            ),

            where(
                "classId",
                "==",
                selectedClass.id
            )

        );


    const snapshot =
        await getDocs(
            studentsQuery
        );


    selectedStudents = [];


    snapshot.forEach(
        studentDocument => {

            const student =
                studentDocument.data();


            const status =
                String(
                    student.status ||
                    "active"
                ).toLowerCase();


            if (
                status ===
                "inactive"
            ) {
                return;
            }


            selectedStudents.push({

                id:
                    studentDocument.id,

                ...student

            });

        }
    );


    selectedStudents.sort(
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


    console.log(
        "👨‍🎓 Students loaded:",
        selectedStudents.length
    );

}


/* =========================================================
   LOAD ATTENDANCE
========================================================= */

async function loadAttendanceForSelectedDate() {

    if (
        !selectedClass ||
        !attendanceDateInput
    ) {
        return;
    }


    const date =
        attendanceDateInput.value;


    if (!date) {
        return;
    }


    attendanceMap = {};
    existingAttendance = {};


    const attendanceQuery =
        query(

            collection(
                db,
                "attendance"
            ),

            where(
                "organizationId",
                "==",
                currentOrganization.id
            ),

            where(
                "classId",
                "==",
                selectedClass.id
            ),

            where(
                "date",
                "==",
                date
            )

        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    snapshot.forEach(
        attendanceDocument => {

            const record =
                attendanceDocument.data();


            const studentId =
                record.studentId;


            if (!studentId) {
                return;
            }


            existingAttendance[
                studentId
            ] = {

                id:
                    attendanceDocument.id,

                ...record

            };


            attendanceMap[
                studentId
            ] =
                normalizeStatus(
                    record.status
                );

        }
    );


    selectedStudents.forEach(
        student => {

            if (
                !attendanceMap[
                    student.id
                ]
            ) {

                attendanceMap[
                    student.id
                ] =
                    "present";

            }

        }
    );


    console.log(
        "📋 Attendance records loaded:",
        Object.keys(
            existingAttendance
        ).length
    );

}


/* =========================================================
   RENDER ATTENDANCE REGISTER
========================================================= */

function renderAttendanceRegister() {

    if (!attendanceRegister) {
        return;
    }


    if (!selectedClass) {

        attendanceRegister.innerHTML = `
            <div class="empty-register">
                Select a class to view its students.
            </div>
        `;

        return;
    }


    if (!selectedStudents.length) {

        attendanceRegister.innerHTML = `
            <div class="empty-register">
                No students have been added to
                ${escapeHtml(
                    selectedClass.className ||
                    selectedClass.name ||
                    "this class"
                )}
                yet.
            </div>
        `;

        return;
    }


    attendanceRegister.innerHTML = `
        <table class="attendance-table">

            <thead>
                <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Attendance Status</th>
                </tr>
            </thead>

            <tbody id="attendanceTableBody"></tbody>

        </table>
    `;


    const tableBody =
        document.getElementById(
            "attendanceTableBody"
        );


    selectedStudents.forEach(
        (student, index) => {

            const status =
                attendanceMap[
                    student.id
                ] ||
                "present";


            const studentName =
                student.fullName ||
                student.name ||
                "Unnamed Student";


            const studentNumber =
                student.studentId ||
                student.studentNumber ||
                "";


            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `
                <td class="student-number">
                    ${index + 1}
                </td>

                <td>
                    <div class="student-name">
                        ${escapeHtml(studentName)}
                    </div>
                </td>

                <td>
                    <div class="student-id">
                        ${escapeHtml(studentNumber)}
                    </div>
                </td>

                <td>

                    <div
                        class="status-buttons"
                        data-student-id="${escapeHtml(student.id)}"
                    >

                        <button
                            type="button"
                            class="status-button present ${
                                status === "present"
                                    ? "active"
                                    : ""
                            }"
                            data-status="present"
                        >
                            Present
                        </button>

                        <button
                            type="button"
                            class="status-button late ${
                                status === "late"
                                    ? "active"
                                    : ""
                            }"
                            data-status="late"
                        >
                            Late
                        </button>

                        <button
                            type="button"
                            class="status-button absent ${
                                status === "absent"
                                    ? "active"
                                    : ""
                            }"
                            data-status="absent"
                        >
                            Absent
                        </button>

                    </div>

                </td>
            `;


            tableBody.appendChild(
                row
            );

        }
    );


    updateToolbarInfo();

}


/* =========================================================
   STATUS BUTTONS
========================================================= */

if (attendanceRegister) {

    attendanceRegister.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-status]"
                );


            if (!button) {
                return;
            }


            const container =
                button.closest(
                    "[data-student-id]"
                );


            if (!container) {
                return;
            }


            const studentId =
                container.dataset.studentId;


            const status =
                normalizeStatus(
                    button.dataset.status
                );


            attendanceMap[
                studentId
            ] =
                status;


            container
                .querySelectorAll(
                    "[data-status]"
                )
                .forEach(
                    item => {
                        item.classList.remove(
                            "active"
                        );
                    }
                );


            button.classList.add(
                "active"
            );


            updateToolbarInfo();

        }
    );

}


/* =========================================================
   DATE CHANGE
========================================================= */

if (attendanceDateInput) {

    attendanceDateInput.addEventListener(
        "change",
        async () => {

            if (!selectedClass) {
                return;
            }


            try {

                attendanceDateInput.disabled =
                    true;


                await loadAttendanceForSelectedDate();

                renderAttendanceRegister();

                updateStatistics();

            }

            catch (error) {

                console.error(
                    "❌ Attendance date error:",
                    error
                );

                showError(
                    error.message ||
                    "Unable to load attendance."
                );

            }

            finally {

                attendanceDateInput.disabled =
                    false;

            }

        }
    );

}


/* =========================================================
   MARK ALL PRESENT
========================================================= */

if (markAllPresentButton) {

    markAllPresentButton.addEventListener(
        "click",
        () => {

            selectedStudents.forEach(
                student => {

                    attendanceMap[
                        student.id
                    ] =
                        "present";

                }
            );


            renderAttendanceRegister();

        }
    );

}


/* =========================================================
   MARK ALL ABSENT
========================================================= */

if (markAllAbsentButton) {

    markAllAbsentButton.addEventListener(
        "click",
        () => {

            selectedStudents.forEach(
                student => {

                    attendanceMap[
                        student.id
                    ] =
                        "absent";

                }
            );


            renderAttendanceRegister();

        }
    );

}


/* =========================================================
   SAVE ATTENDANCE
========================================================= */

if (saveAttendanceButton) {

    saveAttendanceButton.addEventListener(
        "click",
        async () => {

            if (!selectedClass) {

                alert(
                    "Please select a class first."
                );

                return;
            }


            const date =
                attendanceDateInput?.value;


            if (!date) {

                alert(
                    "Please select an attendance date."
                );

                return;
            }


            if (!selectedStudents.length) {

                alert(
                    "There are no students in this class."
                );

                return;
            }


            saveAttendanceButton.disabled =
                true;


            saveAttendanceButton.textContent =
                "Saving Attendance...";


            try {

                let saved = 0;


                for (
                    const student
                    of selectedStudents
                ) {

                    const status =
                        normalizeStatus(
                            attendanceMap[
                                student.id
                            ] ||
                            "present"
                        );


                    const existing =
                        existingAttendance[
                            student.id
                        ];


                    const attendanceData = {

                        organizationId:
                            currentOrganization.id,

                        classId:
                            selectedClass.id,

                        className:
                            selectedClass.className ||
                            selectedClass.name ||
                            "Class",

                        studentId:
                            student.id,

                        studentDocumentId:
                            student.id,

                        studentName:
                            student.fullName ||
                            student.name ||
                            "Student",

                        studentNumber:
                            student.studentId ||
                            student.studentNumber ||
                            "",

                        staffId:
                            currentTeacher.id,

                        formMasterId:
                            currentTeacher.id,

                        formMasterName:
                            getTeacherName(
                                currentTeacher
                            ),

                        date:
                            date,

                        status:
                            status,

                        updatedAt:
                            serverTimestamp()

                    };


                    if (
                        status === "present" ||
                        status === "late"
                    ) {

                        if (
                            !existing ||
                            !existing.checkIn
                        ) {

                            attendanceData.checkIn =
                                serverTimestamp();

                        }

                    }


                    if (
                        status === "absent"
                    ) {

                        attendanceData.checkIn =
                            null;

                        attendanceData.checkOut =
                            null;

                    }


                    if (existing) {

                        await updateDoc(
                            doc(
                                db,
                                "attendance",
                                existing.id
                            ),
                            attendanceData
                        );

                    }

                    else {

                        attendanceData.createdAt =
                            serverTimestamp();


                        await addDoc(
                            collection(
                                db,
                                "attendance"
                            ),
                            attendanceData
                        );

                    }


                    saved++;

                }


                await loadAttendanceForSelectedDate();

                renderAttendanceRegister();

                await loadTodayDashboardStatistics();

                updateStatistics();


                alert(
                    `Attendance saved successfully for ${saved} student${saved === 1 ? "" : "s"}.`
                );

            }

            catch (error) {

                console.error(
                    "❌ Save attendance error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to save attendance."
                );

            }

            finally {

                saveAttendanceButton.disabled =
                    false;

                saveAttendanceButton.textContent =
                    "Save Attendance";

            }

        }
    );

}


/* =========================================================
   TODAY STATISTICS
========================================================= */

async function loadTodayDashboardStatistics() {

    if (!currentOrganization) {
        return;
    }


    const today =
        getLocalDateString();


    const total =
        assignedClasses.reduce(
            (
                value,
                classItem
            ) =>
                value +
                Number(
                    classItem.studentCount ||
                    0
                ),
            0
        );


    let present = 0;
    let late = 0;


    for (
        const classItem
        of assignedClasses
    ) {

        const attendanceQuery =
            query(

                collection(
                    db,
                    "attendance"
                ),

                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                ),

                where(
                    "classId",
                    "==",
                    classItem.id
                ),

                where(
                    "date",
                    "==",
                    today
                )

            );


        const snapshot =
            await getDocs(
                attendanceQuery
            );


        snapshot.forEach(
            attendanceDocument => {

                const status =
                    normalizeStatus(
                        attendanceDocument.data().status
                    );


                if (
                    status === "present"
                ) {
                    present++;
                }


                if (
                    status === "late"
                ) {
                    late++;
                }

            }
        );

    }


    if (totalStudentsElement) {
        totalStudentsElement.textContent =
            total;
    }


    if (presentTodayElement) {
        presentTodayElement.textContent =
            present;
    }


    if (lateTodayElement) {
        lateTodayElement.textContent =
            late;
    }

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    if (totalClassesElement) {

        totalClassesElement.textContent =
            assignedClasses.length;

    }


    const totalStudents =
        assignedClasses.reduce(
            (
                total,
                classItem
            ) =>
                total +
                Number(
                    classItem.studentCount ||
                    0
                ),
            0
        );


    if (totalStudentsElement) {

        totalStudentsElement.textContent =
            totalStudents;

    }


    let present = 0;
    let late = 0;


    Object.values(
        attendanceMap
    ).forEach(
        status => {

            if (status === "present") {
                present++;
            }

            if (status === "late") {
                late++;
            }

        }
    );


    if (presentTodayElement) {

        presentTodayElement.textContent =
            present;

    }


    if (lateTodayElement) {

        lateTodayElement.textContent =
            late;

    }

}


/* =========================================================
   TOOLBAR
========================================================= */

function updateToolbarInfo() {

    if (!toolbarInfo) {
        return;
    }


    const total =
        selectedStudents.length;


    const present =
        Object.values(
            attendanceMap
        ).filter(
            status =>
                status === "present"
        ).length;


    const late =
        Object.values(
            attendanceMap
        ).filter(
            status =>
                status === "late"
        ).length;


    const absent =
        Object.values(
            attendanceMap
        ).filter(
            status =>
                status === "absent"
        ).length;


    toolbarInfo.textContent =
        `${total} Students • ${present} Present • ${late} Late • ${absent} Absent`;

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (value === "late") {
        return "late";
    }


    if (value === "absent") {
        return "absent";
    }


    return "present";

}


/* =========================================================
   TEACHER NAME
========================================================= */

function getTeacherName(teacher) {

    if (!teacher) {
        return "Form Master";
    }


    return (

        teacher.fullName ||

        teacher.name ||

        teacher.staffName ||

        teacher.employeeName ||

        teacher.displayName ||

        teacher.email ||

        "Form Master"

    );

}


/* =========================================================
   GRADE NUMBER
========================================================= */

function getGradeNumber(className) {

    const match =
        String(
            className || ""
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
   LOCAL DATE
========================================================= */

function getLocalDateString(
    date = new Date()
) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
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
                    "❌ Logout error:",
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

    console.error(
        "❌ Virello Form Master Error:",
        message
    );


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
   FINAL
========================================================= */

console.log(
    "✅ Virello form-master.js loaded successfully."
);
