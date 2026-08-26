/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/form-master-reports.js

   PURPOSE:
   FORM MASTER ATTENDANCE REPORTS

   FEATURES:
   - Firebase authentication
   - Load Form Master staff profile
   - Load organization directly from Firebase
   - Load Form Master's assigned classes
   - Load attendance records
   - Filter by class
   - Filter by date
   - Filter by status
   - Attendance statistics
   - Export CSV
   - Print report
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
    doc
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

let currentTeacher = null;

let currentOrganization = null;

let assignedClasses = [];

let allRecords = [];

let visibleRecords = [];


/* =========================================================
   DOM HELPER
========================================================= */

function $(id) {
    return document.getElementById(id);
}


/* =========================================================
   DOM
========================================================= */

const loading =
    $("loading");

const teacherName =
    $("teacherName");

const organizationName =
    $("organizationName");

const classFilter =
    $("classFilter");

const fromDate =
    $("fromDate");

const toDate =
    $("toDate");

const statusFilter =
    $("statusFilter");

const reportBody =
    $("reportBody");

const applyButton =
    $("applyButton");

const csvButton =
    $("csvButton");

const printButton =
    $("printButton");

const logoutButton =
    $("logoutButton");


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Form Master Reports starting..."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        startReports();

    }
);


/* =========================================================
   START REPORTS
========================================================= */

function startReports() {

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
                        "form-master-login.html";

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


                const role =
                    String(
                        currentTeacher.role ||
                        ""
                    )
                        .trim()
                        .toLowerCase();


                if (
                    role !== "form_master" &&
                    currentTeacher.isFormMaster !== true
                ) {

                    console.error(
                        "⛔ Account is not a Form Master:",
                        currentTeacher
                    );


                    await signOut(
                        auth
                    );


                    window.location.href =
                        "form-master-login.html";

                    return;

                }


                await loadOrganization();


                if (!currentOrganization) {

                    return;

                }


                await loadAssignedClasses();


                await loadAttendanceRecords();


                buildClassFilter();


                applyFilters();


                console.log(
                    "✅ Form Master Reports ready."
                );

            }

            catch (error) {

                console.error(
                    "❌ Form Master Reports Error:",
                    error
                );


                showReportError(
                    error.message ||
                    "Unable to load attendance reports."
                );

            }

            finally {

                hideLoading();

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


    let snapshot =
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


    /* -----------------------------------------------------
       FALLBACK: uid
    ----------------------------------------------------- */

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


    /* -----------------------------------------------------
       FALLBACK: email
    ----------------------------------------------------- */

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


    if (snapshot.empty) {

        throw new Error(
            "Your Form Master staff profile could not be found."
        );

    }


    const staffDocument =
        snapshot.docs[0];


    currentTeacher = {

        id:
            staffDocument.id,

        ...staffDocument.data()

    };


    const name =
        getTeacherName(
            currentTeacher
        );


    if (teacherName) {

        teacherName.textContent =
            name;

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


    const organizationId =
        String(
            currentTeacher.organizationId ||
            currentTeacher.orgId ||
            currentTeacher.organizationID ||
            ""
        ).trim();


    if (!organizationId) {

        throw new Error(
            "Your Form Master account is missing its organization ID."
        );

    }


    console.log(
        "🏢 Organization ID:",
        organizationId
    );


    const organizationRef =
        doc(
            db,
            "organizations",
            organizationId
        );


    const organizationSnapshot =
        await getDoc(
            organizationRef
        );


    if (
        organizationSnapshot.exists()
    ) {

        currentOrganization = {

            id:
                organizationSnapshot.id,

            ...organizationSnapshot.data()

        };

    }


    /*
       Fallback:
       Some older Virello records may not have the
       organization document ID stored exactly as expected.
    */

    if (!currentOrganization) {

        const organizationsRef =
            collection(
                db,
                "organizations"
            );


        const ownerUid =
            currentTeacher.ownerUid;


        if (ownerUid) {

            const ownerQuery =
                query(
                    organizationsRef,
                    where(
                        "ownerUid",
                        "==",
                        ownerUid
                    )
                );


            const ownerSnapshot =
                await getDocs(
                    ownerQuery
                );


            if (
                !ownerSnapshot.empty
            ) {

                const organizationDocument =
                    ownerSnapshot.docs[0];


                currentOrganization = {

                    id:
                        organizationDocument.id,

                    ...organizationDocument.data()

                };

            }

        }

    }


    if (!currentOrganization) {

        throw new Error(
            "No organization could be found for this Form Master."
        );

    }


    const name =
        currentOrganization.organizationName ||
        currentOrganization.name ||
        currentOrganization.schoolName ||
        "Organization";


    if (organizationName) {

        organizationName.textContent =
            name;

    }


    console.log(
        "✅ Organization loaded:",
        currentOrganization
    );

}


/* =========================================================
   LOAD ASSIGNED CLASSES
========================================================= */

async function loadAssignedClasses() {

    console.log(
        "📚 Loading Form Master classes..."
    );


    assignedClasses = [];


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
            ),

            where(
                "formMasterId",
                "==",
                currentTeacher.id
            )

        );


    const snapshot =
        await getDocs(
            classesQuery
        );


    snapshot.forEach(
        classDocument => {

            assignedClasses.push({

                id:
                    classDocument.id,

                ...classDocument.data()

            });

        }
    );


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
   LOAD ATTENDANCE RECORDS
========================================================= */

async function loadAttendanceRecords() {

    console.log(
        "📋 Loading attendance records..."
    );


    allRecords = [];


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
            )

        );


    const snapshot =
        await getDocs(
            attendanceQuery
        );


    const assignedClassIds =
        new Set(
            assignedClasses.map(
                classItem =>
                    String(
                        classItem.id
                    )
            )
        );


    snapshot.forEach(
        attendanceDocument => {

            const record = {

                id:
                    attendanceDocument.id,

                ...attendanceDocument.data()

            };


            const classId =
                getClassId(
                    record
                );


            /*
               Only attendance from the Form Master's
               assigned classes is included.
            */

            if (
                assignedClassIds.has(
                    String(
                        classId
                    )
                )
            ) {

                allRecords.push(
                    record
                );

            }

        }
    );


    console.log(
        "✅ Attendance records loaded:",
        allRecords.length
    );

}


/* =========================================================
   BUILD CLASS FILTER
========================================================= */

function buildClassFilter() {

    if (!classFilter) {

        return;

    }


    classFilter.innerHTML =
        "";


    const allOption =
        document.createElement(
            "option"
        );


    allOption.value =
        "";


    allOption.textContent =
        "All My Classes";


    classFilter.appendChild(
        allOption
    );


    assignedClasses.forEach(
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
                "Class";


            classFilter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   APPLY FILTERS
========================================================= */

function applyFilters() {

    const selectedClass =
        classFilter?.value ||
        "";


    const from =
        fromDate?.value ||
        "";


    const to =
        toDate?.value ||
        "";


    const selectedStatus =
        normalizeStatus(
            statusFilter?.value ||
            ""
        );


    visibleRecords =
        allRecords
            .filter(
                record => {

                    const recordClassId =
                        String(
                            getClassId(
                                record
                            )
                        );


                    const recordDate =
                        getDate(
                            record
                        );


                    const recordStatus =
                        getStatus(
                            record
                        );


                    if (
                        selectedClass &&
                        recordClassId !==
                        String(
                            selectedClass
                        )
                    ) {

                        return false;

                    }


                    if (
                        from &&
                        recordDate &&
                        recordDate < from
                    ) {

                        return false;

                    }


                    if (
                        to &&
                        recordDate &&
                        recordDate > to
                    ) {

                        return false;

                    }


                    if (
                        selectedStatus &&
                        recordStatus !==
                        selectedStatus
                    ) {

                        return false;

                    }


                    return true;

                }
            )
            .sort(
                (a, b) => {

                    const dateB =
                        getDate(
                            b
                        );


                    const dateA =
                        getDate(
                            a
                        );


                    const dateComparison =
                        dateB.localeCompare(
                            dateA
                        );


                    if (
                        dateComparison !== 0
                    ) {

                        return dateComparison;

                    }


                    return getStudentName(
                        a
                    )
                        .localeCompare(
                            getStudentName(
                                b
                            )
                        );

                }
            );


    renderStatistics();


    renderReport();

}


/* =========================================================
   STATISTICS
========================================================= */

function renderStatistics() {

    if ($("totalRecords")) {

        $("totalRecords").textContent =
            visibleRecords.length;

    }


    const students =
        new Set();


    visibleRecords.forEach(
        record => {

            students.add(
                getStudentId(
                    record
                ) ||
                getStudentName(
                    record
                )
            );

        }
    );


    if ($("studentCount")) {

        $("studentCount").textContent =
            students.size;

    }


    if ($("presentCount")) {

        $("presentCount").textContent =
            visibleRecords.filter(
                record =>
                    getStatus(
                        record
                    ) === "present"
            ).length;

    }


    if ($("lateCount")) {

        $("lateCount").textContent =
            visibleRecords.filter(
                record =>
                    getStatus(
                        record
                    ) === "late"
            ).length;

    }


    if ($("absentCount")) {

        $("absentCount").textContent =
            visibleRecords.filter(
                record =>
                    getStatus(
                        record
                    ) === "absent"
            ).length;

    }


    const className =
        classFilter?.value
            ? classFilter
                .options[
                    classFilter.selectedIndex
                ]
                .text
            : "All My Classes";


    if ($("reportSubtitle")) {

        $("reportSubtitle").textContent =
            `${className} • ${
                fromDate?.value ||
                "All dates"
            } to ${
                toDate?.value ||
                "All dates"
            }`;

    }

}


/* =========================================================
   RENDER REPORT
========================================================= */

function renderReport() {

    if (!reportBody) {

        return;

    }


    if (
        visibleRecords.length === 0
    ) {

        reportBody.innerHTML = `

            <tr>

                <td colspan="6">

                    <div class="empty">

                        No attendance records
                        match the selected filters.

                    </div>

                </td>

            </tr>

        `;

        return;

    }


    reportBody.innerHTML =
        visibleRecords
            .map(
                (record, index) => {

                    const status =
                        getStatus(
                            record
                        );


                    let label =
                        "Not Recorded";


                    if (
                        status === "present"
                    ) {

                        label =
                            "Present";

                    }

                    else if (
                        status === "late"
                    ) {

                        label =
                            "Late";

                    }

                    else if (
                        status === "absent"
                    ) {

                        label =
                            "Absent";

                    }


                    const statusClass =
                        status === "present"
                            ? "status-present"
                            : status === "late"
                                ? "status-late"
                                : status === "absent"
                                    ? "status-absent"
                                    : "status-none";


                    return `

                        <tr>

                            <td>
                                ${index + 1}
                            </td>

                            <td>

                                <div class="student-name">

                                    ${escapeHtml(
                                        getStudentName(
                                            record
                                        )
                                    )}

                                </div>

                                <div class="muted">

                                    ${escapeHtml(
                                        getStudentId(
                                            record
                                        ) ||
                                        "—"
                                    )}

                                </div>

                            </td>

                            <td>

                                ${escapeHtml(
                                    getClassName(
                                        record
                                    )
                                )}

                            </td>

                            <td>

                                ${escapeHtml(
                                    getDate(
                                        record
                                    ) ||
                                    "—"
                                )}

                            </td>

                            <td>

                                <span
                                    class="status-badge ${statusClass}"
                                >

                                    ${label}

                                </span>

                            </td>

                            <td>

                                ${escapeHtml(
                                    getCheckIn(
                                        record
                                    )
                                )}

                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   GET CLASS ID
========================================================= */

function getClassId(record) {

    return String(
        record.classId ||
        record.classID ||
        record.assignedClassId ||
        ""
    ).trim();

}


/* =========================================================
   GET CLASS NAME
========================================================= */

function getClassName(record) {

    return String(
        record.className ||
        record.class ||
        record.class_name ||
        findClassName(
            getClassId(
                record
            )
        ) ||
        "Class"
    ).trim();

}


/* =========================================================
   FIND CLASS NAME
========================================================= */

function findClassName(classId) {

    const found =
        assignedClasses.find(
            classItem =>
                String(
                    classItem.id
                ) ===
                String(
                    classId
                )
        );


    if (!found) {

        return "";

    }


    return (
        found.className ||
        found.name ||
        ""
    );

}


/* =========================================================
   GET STUDENT ID
========================================================= */

function getStudentId(record) {

    return String(
        record.studentId ||
        record.studentID ||
        record.studentUid ||
        record.studentUID ||
        record.studentDocumentId ||
        ""
    ).trim();

}


/* =========================================================
   GET STUDENT NAME
========================================================= */

function getStudentName(record) {

    return String(
        record.studentName ||
        record.fullName ||
        record.name ||
        "Student"
    ).trim();

}


/* =========================================================
   GET STATUS
========================================================= */

function getStatus(record) {

    const rawStatus =
        String(
            record.status ||
            record.attendanceStatus ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        rawStatus.includes(
            "late"
        )
    ) {

        return "late";

    }


    if (
        rawStatus.includes(
            "absent"
        )
    ) {

        return "absent";

    }


    if (
        rawStatus.includes(
            "present"
        )
    ) {

        return "present";

    }


    return rawStatus || "none";

}


/* =========================================================
   NORMALIZE STATUS
========================================================= */

function normalizeStatus(status) {

    const normalized =
        String(
            status ||
            ""
        )
            .trim()
            .toLowerCase();


    if (
        normalized ===
        "present"
    ) {

        return "present";

    }


    if (
        normalized ===
        "late"
    ) {

        return "late";

    }


    if (
        normalized ===
        "absent"
    ) {

        return "absent";

    }


    return "";

}


/* =========================================================
   GET DATE
========================================================= */

function getDate(record) {

    const date =
        record.date ||
        record.attendanceDate ||
        record.attendance_date ||
        "";


    if (
        typeof date ===
        "string"
    ) {

        return date.substring(
            0,
            10
        );

    }


    if (
        date &&
        typeof date.toDate ===
        "function"
    ) {

        const converted =
            date.toDate();


        return getLocalDateString(
            converted
        );

    }


    return "";

}


/* =========================================================
   GET CHECK-IN
========================================================= */

function getCheckIn(record) {

    const checkIn =
        record.checkIn ||
        record.checkInTime ||
        record.time ||
        record.checkedInAt ||
        null;


    if (!checkIn) {

        return "—";

    }


    if (
        typeof checkIn.toDate ===
        "function"
    ) {

        return formatDateTime(
            checkIn.toDate()
        );

    }


    if (
        checkIn instanceof Date
    ) {

        return formatDateTime(
            checkIn
        );

    }


    return String(
        checkIn
    );

}


/* =========================================================
   TEACHER NAME
========================================================= */

function getTeacherName(teacher) {

    return (
        teacher?.fullName ||
        teacher?.name ||
        teacher?.staffName ||
        teacher?.employeeName ||
        teacher?.displayName ||
        teacher?.email ||
        "Form Master"
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
   FORMAT DATE TIME
========================================================= */

function formatDateTime(date) {

    if (!date) {

        return "—";

    }


    return date.toLocaleString(
        [],
        {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   TODAY
========================================================= */

const today =
    getLocalDateString();


if (fromDate) {

    fromDate.value =
        today;

}


if (toDate) {

    toDate.value =
        today;

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
   EXPORT CSV
========================================================= */

function exportCSV() {

    if (
        visibleRecords.length === 0
    ) {

        alert(
            "There are no attendance records to export."
        );

        return;

    }


    const rows = [

        [
            "Student",
            "Student ID",
            "Class",
            "Date",
            "Status",
            "Check-in"
        ]

    ];


    visibleRecords.forEach(
        record => {

            rows.push([

                getStudentName(
                    record
                ),

                getStudentId(
                    record
                ),

                getClassName(
                    record
                ),

                getDate(
                    record
                ),

                getStatus(
                    record
                ),

                getCheckIn(
                    record
                )

            ]);

        }
    );


    const csv =
        rows
            .map(
                row =>
                    row
                        .map(
                            cell =>
                                `"${String(
                                    cell ?? ""
                                ).replace(
                                    /"/g,
                                    '""'
                                )}"`
                        )
                        .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        `virello-attendance-report-${fromDate?.value || "all"}-${toDate?.value || "dates"}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );

}


/* =========================================================
   PRINT
========================================================= */

function printReport() {

    window.print();

}


/* =========================================================
   EVENTS
========================================================= */

if (applyButton) {

    applyButton.addEventListener(
        "click",
        applyFilters
    );

}


if (csvButton) {

    csvButton.addEventListener(
        "click",
        exportCSV
    );

}


if (printButton) {

    printButton.addEventListener(
        "click",
        printReport
    );

}


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

            }

            catch (error) {

                console.warn(
                    "Firebase logout:",
                    error
                );

            }


            localStorage.removeItem(
                "virelloFormMaster"
            );


            window.location.href =
                "form-master-login.html";

        }
    );

}


/* =========================================================
   SHOW ERROR
========================================================= */

function showReportError(message) {

    console.error(
        "❌ Virello Form Master Reports:",
        message
    );


    if (!reportBody) {

        return;

    }


    reportBody.innerHTML = `

        <tr>

            <td colspan="6">

                <div class="empty">

                    ${escapeHtml(
                        message
                    )}

                </div>

            </td>

        </tr>

    `;

}


/* =========================================================
   HIDE LOADING
========================================================= */

function hideLoading() {

    if (loading) {

        loading.style.display =
            "none";

    }

}


/* =========================================================
   FINAL
========================================================= */

console.log(
    "✅ Virello form-master-reports.js loaded successfully."
);
