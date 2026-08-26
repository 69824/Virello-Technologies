/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/form-master.js

   PURPOSE:
   FORM MASTER DASHBOARD + CLASS ATTENDANCE REGISTER

   FEATURES:
   - Firebase authentication
   - Load Form Master staff profile
   - Load organization
   - Load classes assigned to Form Master
   - Load students
   - Select class
   - Select attendance date
   - Mark Present
   - Mark Late
   - Mark Absent
   - Save attendance
   - Load previously saved attendance
   - Prevent duplicate attendance records
   - Dashboard statistics
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

const saveAttendanceButton =
    document.getElementById(
        "saveAttendanceButton"
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
   ATTENDANCE HISTORY BUTTON
========================================================= */

function addAttendanceHistoryButton() {

    const topbarRight =
        document.querySelector(
            ".topbar-right"
        );

    if (!topbarRight) {
        return;
    }

    if (
        document.getElementById(
            "attendanceHistoryButton"
        )
    ) {
        return;
    }

    const button =
        document.createElement(
            "a"
        );

    button.id =
        "attendanceHistoryButton";

    button.href =
        "form-master-history.html";

    button.textContent =
        "Attendance History";

    button.style.cssText = `
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border:0;
        background:#eef2ff;
        color:#3730a3;
        padding:9px 15px;
        border-radius:8px;
        font-weight:700;
        font-size:13px;
        text-decoration:none;
        white-space:nowrap;
    `;

    topbarRight.insertBefore(
        button,
        logoutButton || null
    );
}


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Form Master dashboard starting..."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        addAttendanceHistoryButton();

        const today =
            getLocalDateString();

        if (attendanceDateInput) {

            attendanceDateInput.value =
                today;

        }


        startFormMasterDashboard();

    }
);


/* =========================================================
   START DASHBOARD
========================================================= */

function startFormMasterDashboard() {

    console.log(
        "🔐 Checking Form Master authentication..."
    );


    onAuthStateChanged(
        auth,
        async user => {

            try {

                if (!user) {

                    console.log(
                        "⚠️ No authenticated Form Master."
                    );

                    window.location.href =
                        "login.html";

                    return;

                }


                currentUser =
                    user;


                console.log(
                    "✅ Form Master authenticated:",
                    user.email
                );


                await loadTeacherProfile();

                if (!currentTeacher) {
                    return;
                }

                const currentRole =
                    String(currentTeacher.role || "")
                        .trim()
                        .toLowerCase();

                if (
                    currentRole !== "form_master" &&
                    currentTeacher.isFormMaster !== true
                ) {
                    console.error(
                        "⛔ Account rejected from Form Master dashboard:",
                        currentTeacher
                    );

                    try {
                        await signOut(auth);
                    } catch {}

                    localStorage.removeItem("virelloFormMaster");
                    window.location.href = "form-master-login.html";
                    return;
                }

                await loadOrganization();


                if (!currentOrganization) {

                    return;

                }


                await loadAssignedClasses();


                await loadTodayDashboardStatistics();


                renderClasses();


                updateStatistics();


                hideLoading();


                console.log(
                    "✅ Form Master dashboard ready."
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
        "👨‍🏫 Loading Form Master profile..."
    );


    const staffRef =
        collection(
            db,
            "staff"
        );


    /*
       First try userUid.
    */

    let teacherSnapshot =
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


    /*
       If userUid is not stored,
       try uid.
    */

    if (teacherSnapshot.empty) {

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


    /*
       If still not found, try email.
    */

    if (teacherSnapshot.empty &&
        currentUser.email) {

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


    if (teacherSnapshot.empty) {

        showError(
            "Your Form Master staff profile could not be found. Please make sure your staff account is connected to your Virello login."
        );

        return;

    }


    const teacherDocument =
        teacherSnapshot.docs[0];


    currentTeacher = {

        id:
            teacherDocument.id,

        ...teacherDocument.data()

    };


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


    console.log(
        "✅ Form Master profile loaded:",
        currentTeacher
    );

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading organization..."
    );


    let organizationId =
        currentTeacher.organizationId ||
        null;


    /*
       If staff has organizationId,
       use it directly.
    */

    if (organizationId) {

        const organizationRef =
            doc(
                db,
                "organizations",
                organizationId
            );


        /*
           Instead of getDoc dependency,
           query organizations by document id
           through getDocs is avoided here.

           We therefore load by owner when needed.
        */

    }


    /*
       Find organization through
       current teacher organizationId.
    */

    const organizationsRef =
        collection(
            db,
            "organizations"
        );


    if (organizationId) {

        const organizationQuery =
            query(
                organizationsRef,
                where(
                    "__name__",
                    "==",
                    organizationId
                )
            );


        const organizationSnapshot =
            await getDocs(
                organizationQuery
            );


        if (!organizationSnapshot.empty) {

            const organizationDocument =
                organizationSnapshot.docs[0];


            currentOrganization = {

                id:
                    organizationDocument.id,

                ...organizationDocument.data()

            };

        }

    }


    /*
       Fallback:
       find organization using
       ownerUid if available.
    */

    if (!currentOrganization) {

        if (currentTeacher.ownerUid) {

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


            if (!organizationSnapshot.empty) {

                const organizationDocument =
                    organizationSnapshot.docs[0];


                currentOrganization = {

                    id:
                        organizationDocument.id,

                    ...organizationDocument.data()

                };

            }

        }

    }


    if (!currentOrganization) {

        showError(
            "No organization could be found for this Form Master."
        );

        return;

    }


    if (organizationNameElement) {

        organizationNameElement.textContent =
            currentOrganization.organizationName ||
            currentOrganization.name ||
            "Organization";

    }


    console.log(
        "✅ Organization loaded:",
        currentOrganization.id
    );

}


/* =========================================================
   LOAD ASSIGNED CLASSES
========================================================= */

async function loadAssignedClasses() {

    console.log(
        "📚 Loading assigned classes..."
    );


    const classesRef =
        collection(
            db,
            "classes"
        );


    /*
       Classes are assigned using
       formMasterId = staff document ID.
    */

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


    const snapshot =
        await getDocs(
            classQuery
        );


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


    /*
       Load student counts.
    */

    for (
        const classItem
        of assignedClasses
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


    assignedClasses.sort(
        (a, b) =>
            getGradeNumber(
                a.className
            ) -
            getGradeNumber(
                b.className
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


    classListElement.innerHTML =
        "";


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


            button.innerHTML = `

                <div class="class-item-name">

                    ${escapeHtml(
                        classItem.className ||
                        "Class"
                    )}

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
        "📚 Selecting class:",
        classItem.className
    );


    selectedClass =
        classItem;


    renderClasses();


    if (registerClassName) {

        registerClassName.textContent =
            classItem.className;

    }


    if (registerDescription) {

        registerDescription.textContent =
            `Attendance register for ${classItem.className}.`;

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
        selectedClass.className
    );


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
                ""
            ).localeCompare(
                String(
                    b.fullName ||
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


    console.log(
        "📅 Loading attendance:",
        date
    );


    attendanceMap = {};

    existingAttendance = {};


    const attendanceRef =
        collection(
            db,
            "attendance"
        );


    const attendanceQuery =
        query(

            attendanceRef,

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


    /*
       Students without a saved attendance
       record are initially Present.

       This makes the register faster to use.
    */

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
        "📋 Existing attendance:",
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
                    selectedClass.className
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
                        Attendance Status
                    </th>

                </tr>

            </thead>

            <tbody id="attendanceTableBody">

            </tbody>

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

                        ${escapeHtml(
                            student.fullName ||
                            "Unnamed Student"
                        )}

                    </div>

                </td>


                <td>

                    <div class="student-id">

                        ${escapeHtml(
                            student.studentId ||
                            ""
                        )}

                    </div>

                </td>


                <td>

                    <div
                        class="status-buttons"
                        data-student-id="${escapeHtml(
                            student.id
                        )}"
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
   STATUS BUTTON CLICK
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
                button.dataset.status;


            attendanceMap[
                studentId
            ] =
                normalizeStatus(
                    status
                );


            const buttons =
                container.querySelectorAll(
                    "[data-status]"
                );


            buttons.forEach(
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
                    "❌ Date attendance load error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load attendance for this date."
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

                let saved =
                    0;


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
                            selectedClass.className,

                        studentId:
                            student.id,

                        studentDocumentId:
                            student.id,

                        studentName:
                            student.fullName ||
                            "Student",

                        studentNumber:
                            student.studentId ||
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


                    /*
                       Create check-in time for
                       Present / Late records.
                    */

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


                    /*
                       If the student is absent,
                       do not create a check-in.
                    */

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


                /*
                   Reload attendance so the screen
                   exactly matches Firestore.
                */

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
   TODAY DASHBOARD STATISTICS
========================================================= */

async function loadTodayDashboardStatistics() {

    if (!currentOrganization) {

        return;

    }


    const today =
        getLocalDateString();


    /*
       Total students across assigned classes.
    */

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


    let present =
        0;

    let late =
        0;


    /*
       Count today's records across
       the Form Master's classes.
    */

    for (
        const classItem
        of assignedClasses
    ) {

        const attendanceRef =
            collection(
                db,
                "attendance"
            );


        const attendanceQuery =
            query(

                attendanceRef,

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

                const record =
                    attendanceDocument.data();


                const status =
                    normalizeStatus(
                        record.status
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


    /*
       Store dashboard values.
    */

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


    console.log(
        "📊 Form Master statistics:",
        {
            total,
            present,
            late
        }
    );

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


    let present =
        0;

    let late =
        0;


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
   TOOLBAR INFO
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
                status ===
                "present"
        ).length;


    const late =
        Object.values(
            attendanceMap
        ).filter(
            status =>
                status ===
                "late"
        ).length;


    const absent =
        Object.values(
            attendanceMap
        ).filter(
            status =>
                status ===
                "absent"
        ).length;


    toolbarInfo.textContent =
        `${total} Students • ${present} Present • ${late} Late • ${absent} Absent`;

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(
    status
) {

    const value =
        String(
            status ||
            ""
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


    return "present";

}


/* =========================================================
   GET TEACHER NAME
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
   GET GRADE NUMBER
========================================================= */

function getGradeNumber(
    className
) {

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
   GET LOCAL DATE
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

function showError(
    message
) {

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
