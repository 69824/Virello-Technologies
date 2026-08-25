/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/form-master.js

   PURPOSE:
   FORM MASTER CLASS REGISTER

   FLOW:

   Form Master Login
        ↓
   Staff Profile
        ↓
   Organization
        ↓
   Assigned Class
        ↓
   Students
        ↓
   CHECK IN
        ↓
   Firestore attendance
        ↓
   Administrator Dashboard

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
    document.getElementById(
        "loadingScreen"
    );

const errorScreen =
    document.getElementById(
        "errorScreen"
    );

const errorMessage =
    document.getElementById(
        "errorMessage"
    );

const teacherNameElement =
    document.getElementById(
        "teacherName"
    );

const welcomeNameElement =
    document.getElementById(
        "welcomeName"
    );

const organizationNameElement =
    document.getElementById(
        "organizationName"
    );

const totalClassesElement =
    document.getElementById(
        "totalClasses"
    );

const totalStudentsElement =
    document.getElementById(
        "totalStudents"
    );

const presentTodayElement =
    document.getElementById(
        "presentToday"
    );

const lateTodayElement =
    document.getElementById(
        "lateToday"
    );

const classListElement =
    document.getElementById(
        "classList"
    );

const attendanceDateInput =
    document.getElementById(
        "attendanceDate"
    );

const registerClassName =
    document.getElementById(
        "registerClassName"
    );

const registerDescription =
    document.getElementById(
        "registerDescription"
    );

const attendanceRegister =
    document.getElementById(
        "attendanceRegister"
    );

const registerToolbar =
    document.getElementById(
        "registerToolbar"
    );

const toolbarInfo =
    document.getElementById(
        "toolbarInfo"
    );

const markAllPresentButton =
    document.getElementById(
        "markAllPresent"
    );

const markAllAbsentButton =
    document.getElementById(
        "markAllAbsent"
    );

const logoutButton =
    document.getElementById(
        "logoutButton"
    );


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        if (attendanceDateInput) {

            attendanceDateInput.value =
                getLocalDateString();

        }

        startDashboard();

    }
);


/* =========================================================
   AUTH
========================================================= */

function startDashboard() {

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


                console.log(
                    "✅ Form Master logged in:",
                    user.email
                );


                await loadTeacherProfile();


                if (!currentTeacher) {
                    return;
                }


                await loadOrganization();


                if (!currentOrganization) {
                    return;
                }


                await loadAssignedClasses();


                await loadTodayStatistics();


                renderClasses();


                updateStatistics();


                hideLoading();


                console.log(
                    "🔥 Form Master dashboard ready."
                );

            }

            catch (error) {

                console.error(
                    "FORM MASTER ERROR:",
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
   STAFF PROFILE
========================================================= */

async function loadTeacherProfile() {

    const staffRef =
        collection(
            db,
            "staff"
        );


    let snapshot;


    /* -----------------------------------------
       USER UID
    ----------------------------------------- */

    snapshot =
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


    /* -----------------------------------------
       UID
    ----------------------------------------- */

    if (snapshot.empty) {

        snapshot =
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


    /* -----------------------------------------
       USER ID
    ----------------------------------------- */

    if (snapshot.empty) {

        snapshot =
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


    /* -----------------------------------------
       EMAIL
    ----------------------------------------- */

    if (
        snapshot.empty &&
        currentUser.email
    ) {

        snapshot =
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


    /* -----------------------------------------
       LOWER EMAIL
    ----------------------------------------- */

    if (
        snapshot.empty &&
        currentUser.email
    ) {

        snapshot =
            await getDocs(
                query(
                    staffRef,
                    where(
                        "emailLower",
                        "==",
                        currentUser.email
                            .toLowerCase()
                    )
                )
            );

    }


    /* -----------------------------------------
       NOT FOUND
    ----------------------------------------- */

    if (snapshot.empty) {

        showError(
            "Your Virello staff profile could not be connected to this login."
        );

        return;

    }


    const staffDocument =
        snapshot.docs[0];


    currentTeacher = {

        id:
            staffDocument.id,

        ...staffDocument.data()

    };


    console.log(
        "👨‍🏫 Staff profile:",
        currentTeacher
    );


    /* -----------------------------------------
       CONNECT LOGIN
    ----------------------------------------- */

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
        Object.keys(
            connectionData
        ).length
    ) {

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

        }

        catch (error) {

            console.warn(
                "Staff connection update failed:",
                error
            );

        }

    }


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
   ORGANIZATION
========================================================= */

async function loadOrganization() {

    let organizationId =
        currentTeacher.organizationId ||
        currentTeacher.orgId ||
        currentTeacher.organizationID ||
        null;


    if (organizationId) {

        const organizationDoc =
            await getDoc(
                doc(
                    db,
                    "organizations",
                    organizationId
                )
            );


        if (
            organizationDoc.exists()
        ) {

            currentOrganization = {

                id:
                    organizationDoc.id,

                ...organizationDoc.data()

            };

        }

    }


    /* -----------------------------------------
       OWNER FALLBACK
    ----------------------------------------- */

    if (
        !currentOrganization &&
        currentTeacher.ownerUid
    ) {

        const snapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "organizations"
                    ),
                    where(
                        "ownerUid",
                        "==",
                        currentTeacher.ownerUid
                    )
                )
            );


        if (!snapshot.empty) {

            const organizationDoc =
                snapshot.docs[0];


            currentOrganization = {

                id:
                    organizationDoc.id,

                ...organizationDoc.data()

            };

        }

    }


    /* -----------------------------------------
       NAME FALLBACK
    ----------------------------------------- */

    if (
        !currentOrganization &&
        currentTeacher.organization
    ) {

        const snapshot =
            await getDocs(
                query(
                    collection(
                        db,
                        "organizations"
                    ),
                    where(
                        "name",
                        "==",
                        currentTeacher.organization
                    )
                )
            );


        if (!snapshot.empty) {

            const organizationDoc =
                snapshot.docs[0];


            currentOrganization = {

                id:
                    organizationDoc.id,

                ...organizationDoc.data()

            };

        }

    }


    if (!currentOrganization) {

        showError(
            "Your staff account is not connected to an organization."
        );

        return;

    }


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
        "🏢 Organization:",
        currentOrganization.id
    );

}


/* =========================================================
   ASSIGNED CLASSES
========================================================= */

async function loadAssignedClasses() {

    const classesRef =
        collection(
            db,
            "classes"
        );


    let snapshot = {
        empty: true,
        docs: []
    };


    /* -----------------------------------------
       FORM MASTER ID
    ----------------------------------------- */

    try {

        snapshot =
            await getDocs(
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
                )
            );

    }

    catch (error) {

        console.warn(
            "Primary class query failed.",
            error
        );

    }


    /* -----------------------------------------
       FALLBACK
    ----------------------------------------- */

    if (snapshot.empty) {

        try {

            snapshot =
                await getDocs(
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
                    )
                );

        }

        catch (error) {

            console.warn(
                "Fallback class query failed.",
                error
            );

        }

    }


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


    /* -----------------------------------------
       STUDENT COUNTS
    ----------------------------------------- */

    for (
        const classItem
        of assignedClasses
    ) {

        try {

            const snapshot =
                await getDocs(
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
                    )
                );


            classItem.studentCount =
                snapshot.size;

        }

        catch (error) {

            console.warn(
                "Student count failed:",
                error
            );

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
        "📚 Assigned classes:",
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

                No classes have been assigned
                to you yet.

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


            button.dataset.classId =
                classItem.id;


            if (
                selectedClass &&
                selectedClass.id ===
                classItem.id
            ) {

                button.classList.add(
                    "active"
                );

            }


            const name =
                classItem.className ||
                classItem.name ||
                "Class";


            button.innerHTML = `

                <div class="class-item-name">

                    ${escapeHtml(name)}

                </div>

                <span class="class-item-count">

                    ${classItem.studentCount}

                    Student${

                        classItem.studentCount === 1
                            ? ""
                            : "s"

                    }

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


            const classItem =
                assignedClasses.find(
                    item =>
                        item.id ===
                        button.dataset.classId
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

    selectedClass =
        classItem;


    renderClasses();


    const className =
        classItem.className ||
        classItem.name ||
        "Class";


    registerClassName.textContent =
        className;


    registerDescription.textContent =
        `Daily attendance register for ${className}.`;


    registerToolbar.style.display =
        "flex";


    await loadStudents();


    await loadAttendance();


    renderAttendanceRegister();


    updateStatistics();

}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    selectedStudents = [];


    if (!selectedClass) {
        return;
    }


    const snapshot =
        await getDocs(
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
            )
        );


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
        "👨‍🎓 Students:",
        selectedStudents.length
    );

}


/* =========================================================
   LOAD ATTENDANCE
========================================================= */

async function loadAttendance() {

    attendanceMap = {};

    existingAttendance = {};


    if (
        !selectedClass ||
        !attendanceDateInput.value
    ) {
        return;
    }


    const snapshot =
        await getDocs(
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
                    attendanceDateInput.value
                )
            )
        );


    snapshot.forEach(
        attendanceDocument => {

            const record =
                attendanceDocument.data();


            if (!record.studentId) {
                return;
            }


            existingAttendance[
                record.studentId
            ] = {

                id:
                    attendanceDocument.id,

                ...record

            };


            attendanceMap[
                record.studentId
            ] =
                normalizeStatus(
                    record.status
                );

        }
    );


    console.log(
        "📋 Attendance loaded:",
        Object.keys(
            existingAttendance
        ).length
    );

}


/* =========================================================
   RENDER REGISTER
========================================================= */

function renderAttendanceRegister() {

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

                No students have been added to this class yet.

            </div>

        `;

        return;

    }


    attendanceRegister.innerHTML = `

        <div class="table-wrapper">

            <table class="attendance-table">

                <thead>

                    <tr>

                        <th>
                            #
                        </th>

                        <th>
                            Student
                        </th>

                        <th>
                            Student ID
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Action
                        </th>

                    </tr>

                </thead>

                <tbody
                    id="attendanceTableBody"
                ></tbody>

            </table>

        </div>

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
                ] || null;


            const existing =
                existingAttendance[
                    student.id
                ];


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

                    ${renderStatus(
                        status
                    )}

                    ${
                        existing &&
                        existing.checkIn
                            ? `
                                <div class="check-time">
                                    ${formatTimestamp(
                                        existing.checkIn
                                    )}
                                </div>
                              `
                            : ""
                    }

                </td>


                <td>

                    <button

                        type="button"

                        class="checkin-button
                        ${
                            status === "present"
                                ? "checked"
                                : ""
                        }
                        ${
                            status === "late"
                                ? "late"
                                : ""
                        }
                        ${
                            status === "absent"
                                ? "absent"
                                : ""
                        }"

                        data-checkin-student=
                            "${escapeHtml(student.id)}"

                        ${
                            status === "present"
                                ? "disabled"
                                : ""
                        }

                    >

                        ${
                            status === "present"
                                ? "✓ Checked In"
                                : status === "late"
                                    ? "Mark Present"
                                    : status === "absent"
                                        ? "Check In"
                                        : "Check In"
                        }

                    </button>

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
   CHECK IN CLICK
========================================================= */

if (attendanceRegister) {

    attendanceRegister.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-checkin-student]"
                );


            if (!button) {
                return;
            }


            const studentId =
                button.dataset.checkinStudent;


            await checkInStudent(
                studentId,
                button
            );

        }
    );

}


/* =========================================================
   CHECK IN STUDENT
========================================================= */

async function checkInStudent(
    studentId,
    button
) {

    if (!selectedClass) {

        alert(
            "Please select a class first."
        );

        return;

    }


    const student =
        selectedStudents.find(
            item =>
                item.id ===
                studentId
        );


    if (!student) {

        alert(
            "Student could not be found."
        );

        return;

    }


    const date =
        attendanceDateInput.value;


    if (!date) {

        alert(
            "Please select the attendance date."
        );

        return;

    }


    button.disabled =
        true;

    button.textContent =
        "Checking In...";


    try {

        const existing =
            existingAttendance[
                studentId
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
                "present",

            checkIn:
                serverTimestamp(),

            updatedAt:
                serverTimestamp(),

            attendanceMethod:
                "form_master"

        };


        /* -----------------------------------------
           UPDATE EXISTING RECORD
        ----------------------------------------- */

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


        /* -----------------------------------------
           CREATE NEW RECORD
        ----------------------------------------- */

        else {

            attendanceData.createdAt =
                serverTimestamp();


            const newDocument =
                await addDoc(
                    collection(
                        db,
                        "attendance"
                    ),
                    attendanceData
                );


            existingAttendance[
                studentId
            ] = {

                id:
                    newDocument.id,

                ...attendanceData

            };

        }


        attendanceMap[
            studentId
        ] =
            "present";


        console.log(
            "✅ Student checked in:",
            student.fullName ||
            student.name
        );


        renderAttendanceRegister();


        await loadTodayStatistics();


        updateStatistics();


    }

    catch (error) {

        console.error(
            "❌ Check in error:",
            error
        );


        alert(
            error.message ||
            "Unable to check in student."
        );


        button.disabled =
            false;

        button.textContent =
            "Check In";

    }

}


/* =========================================================
   MARK ALL PRESENT
========================================================= */

if (markAllPresentButton) {

    markAllPresentButton.addEventListener(
        "click",
        async () => {

            if (!selectedStudents.length) {
                return;
            }


            if (
                !confirm(
                    "Check in all students in this class?"
                )
            ) {
                return;
            }


            for (
                const student
                of selectedStudents
            ) {

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
                        attendanceDateInput.value,

                    status:
                        "present",

                    checkIn:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    attendanceMethod:
                        "form_master"

                };


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

                    const newDocument =
                        await addDoc(
                            collection(
                                db,
                                "attendance"
                            ),
                            {
                                ...attendanceData,

                                createdAt:
                                    serverTimestamp()

                            }
                        );


                    existingAttendance[
                        student.id
                    ] = {

                        id:
                            newDocument.id,

                        ...attendanceData

                    };

                }


                attendanceMap[
                    student.id
                ] =
                    "present";

            }


            renderAttendanceRegister();


            await loadTodayStatistics();


            updateStatistics();


            alert(
                "All students have been checked in."
            );

        }
    );

}


/* =========================================================
   MARK ALL ABSENT
========================================================= */

if (markAllAbsentButton) {

    markAllAbsentButton.addEventListener(
        "click",
        async () => {

            if (!selectedStudents.length) {
                return;
            }


            if (
                !confirm(
                    "Mark all students absent?"
                )
            ) {
                return;
            }


            for (
                const student
                of selectedStudents
            ) {

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
                        attendanceDateInput.value,

                    status:
                        "absent",

                    checkIn:
                        null,

                    checkOut:
                        null,

                    updatedAt:
                        serverTimestamp(),

                    attendanceMethod:
                        "form_master"

                };


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

                    const newDocument =
                        await addDoc(
                            collection(
                                db,
                                "attendance"
                            ),
                            {
                                ...attendanceData,

                                createdAt:
                                    serverTimestamp()

                            }
                        );


                    existingAttendance[
                        student.id
                    ] = {

                        id:
                            newDocument.id,

                        ...attendanceData

                    };

                }


                attendanceMap[
                    student.id
                ] =
                    "absent";

            }


            renderAttendanceRegister();


            await loadTodayStatistics();


            updateStatistics();


            alert(
                "All students have been marked absent."
            );

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


                await loadAttendance();


                renderAttendanceRegister();


                updateStatistics();

            }

            catch (error) {

                console.error(
                    "Date change error:",
                    error
                );

                showError(
                    error.message
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
   TODAY STATISTICS
========================================================= */

async function loadTodayStatistics() {

    if (!currentOrganization) {
        return;
    }


    const today =
        getLocalDateString();


    let present = 0;

    let late = 0;


    for (
        const classItem
        of assignedClasses
    ) {

        const snapshot =
            await getDocs(
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
                )
            );


        snapshot.forEach(
            attendanceDocument => {

                const status =
                    normalizeStatus(
                        attendanceDocument
                            .data()
                            .status
                    );


                if (
                    status ===
                    "present"
                ) {
                    present++;
                }


                if (
                    status ===
                    "late"
                ) {
                    late++;
                }

            }
        );

    }


    presentTodayElement.textContent =
        present;


    lateTodayElement.textContent =
        late;

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {

    totalClassesElement.textContent =
        assignedClasses.length;


    totalStudentsElement.textContent =
        assignedClasses.reduce(
            (
                total,
                item
            ) =>
                total +
                Number(
                    item.studentCount ||
                    0
                ),
            0
        );


    let present = 0;

    let late = 0;


    Object.values(
        attendanceMap
    ).forEach(
        status => {

            if (
                status ===
                "present"
            ) {
                present++;
            }


            if (
                status ===
                "late"
            ) {
                late++;
            }

        }
    );


    presentTodayElement.textContent =
        present;


    lateTodayElement.textContent =
        late;


    updateToolbarInfo();

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
        )
        .filter(
            status =>
                status === "present"
        )
        .length;


    const late =
        Object.values(
            attendanceMap
        )
        .filter(
            status =>
                status === "late"
        )
        .length;


    const absent =
        Object.values(
            attendanceMap
        )
        .filter(
            status =>
                status === "absent"
        )
        .length;


    const unmarked =
        total -
        present -
        late -
        absent;


    toolbarInfo.textContent =
        `${total} Students • ${present} Present • ${late} Late • ${absent} Absent • ${unmarked} Unmarked`;

}


/* =========================================================
   STATUS
========================================================= */

function renderStatus(status) {

    if (
        status ===
        "present"
    ) {

        return `
            <span class="status-pill status-present">
                PRESENT
            </span>
        `;

    }


    if (
        status ===
        "late"
    ) {

        return `
            <span class="status-pill status-late">
                LATE
            </span>
        `;

    }


    if (
        status ===
        "absent"
    ) {

        return `
            <span class="status-pill status-absent">
                ABSENT
            </span>
        `;

    }


    return `
        <span class="status-pill status-unmarked">
            NOT CHECKED
        </span>
    `;

}


/* =========================================================
   TIMESTAMP
========================================================= */

function formatTimestamp(
    timestamp
) {

    if (
        !timestamp ||
        typeof timestamp.toDate !==
        "function"
    ) {

        return "";

    }


    return timestamp
        .toDate()
        .toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    status
) {

    const value =
        String(
            status || ""
        )
        .trim()
        .toLowerCase();


    if (
        value ===
        "late"
    ) {
        return "late";
    }


    if (
        value ===
        "absent"
    ) {
        return "absent";
    }


    if (
        value ===
        "present"
    ) {
        return "present";
    }


    return "present";

}


/* =========================================================
   TEACHER NAME
========================================================= */

function getTeacherName(
    teacher
) {

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

function getGradeNumber(
    className
) {

    const match =
        String(
            className || ""
        )
        .match(
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
        )
        .padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        )
        .padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

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
   LOADING
========================================================= */

function hideLoading() {

    if (loadingScreen) {

        loadingScreen.style.display =
            "none";

    }

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    console.error(
        "Virello Form Master Error:",
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


console.log(
    "✅ Virello form-master.js loaded successfully."
);
