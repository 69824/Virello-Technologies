/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/reports.js

   PURPOSE:
   Attendance Reporting System
========================================================= */

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs
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

let staffMembers = [];
let attendanceRecords = [];

let allReportRows = [];


/* =========================================================
   DOM
========================================================= */

const fromDate =
    document.getElementById("fromDate");

const toDate =
    document.getElementById("toDate");

const staffFilter =
    document.getElementById("staffFilter");

const departmentFilter =
    document.getElementById("departmentFilter");

const generateButton =
    document.getElementById("generateButton");

const resetButton =
    document.getElementById("resetButton");

const printButton =
    document.getElementById("printButton");

const reportTableBody =
    document.getElementById("reportTableBody");

const reportPeriod =
    document.getElementById("reportPeriod");

const totalStaff =
    document.getElementById("totalStaff");

const presentCount =
    document.getElementById("presentCount");

const lateCount =
    document.getElementById("lateCount");

const absentCount =
    document.getElementById("absentCount");

const attendanceRate =
    document.getElementById("attendanceRate");

const errorBox =
    document.getElementById("errorBox");


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "🔥 Virello Reports starting..."
        );

        setDefaultDates();

        startReports();

    }
);


/* =========================================================
   AUTHENTICATION
========================================================= */

function startReports() {

    onAuthStateChanged(
        auth,
        async user => {

            try {

                if (!user) {

                    window.location.href =
                        "login.html";

                    return;

                }

                currentUser =
                    user;

                console.log(
                    "✅ Reports authenticated:",
                    user.email
                );


                await loadOrganization();


                if (!currentOrganization) {

                    return;

                }


                await loadStaff();


                populateFilters();


                await loadAttendance();


                generateReport();


            }

            catch (error) {

                console.error(
                    "❌ Reports initialization error:",
                    error
                );

                showError(
                    error.message ||
                    "Unable to load reports."
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
            "No organization was found for this administrator account."
        );

    }


    const organizationDocument =
        snapshot.docs[0];


    currentOrganization = {

        id:
            organizationDocument.id,

        ...organizationDocument.data()

    };


    console.log(
        "🏢 Organization:",
        currentOrganization
    );

}


/* =========================================================
   LOAD STAFF
========================================================= */

async function loadStaff() {

    const staffRef =
        collection(
            db,
            "staff"
        );


    const staffQuery =
        query(
            staffRef,

            where(
                "organizationId",
                "==",
                currentOrganization.id
            )
        );


    const snapshot =
        await getDocs(
            staffQuery
        );


    staffMembers = [];


    snapshot.forEach(
        staffDocument => {

            const staff = {

                id:
                    staffDocument.id,

                ...staffDocument.data()

            };


            const status =
                String(
                    staff.status ||
                    "active"
                ).toLowerCase();


            if (
                status !== "inactive"
            ) {

                staffMembers.push(
                    staff
                );

            }

        }
    );


    console.log(
        "👥 Staff loaded:",
        staffMembers.length
    );

}


/* =========================================================
   LOAD ATTENDANCE
========================================================= */

async function loadAttendance() {

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


    attendanceRecords = [];


    snapshot.forEach(
        attendanceDocument => {

            attendanceRecords.push({

                id:
                    attendanceDocument.id,

                ...attendanceDocument.data()

            });

        }
    );


    console.log(
        "📅 Attendance records loaded:",
        attendanceRecords.length
    );

}


/* =========================================================
   DEFAULT DATES
========================================================= */

function setDefaultDates() {

    const today =
        getLocalDateString();


    fromDate.value =
        today;


    toDate.value =
        today;

}


/* =========================================================
   POPULATE FILTERS
========================================================= */

function populateFilters() {

    staffFilter.innerHTML =
        `<option value="all">All Staff</option>`;


    const departments =
        new Set();


    staffMembers.forEach(
        staff => {

            const name =
                getStaffName(
                    staff
                );


            const option =
                document.createElement(
                    "option"
                );


            option.value =
                staff.id;


            option.textContent =
                name;


            staffFilter.appendChild(
                option
            );


            const department =
                getDepartment(
                    staff
                );


            if (
                department &&
                department !== "—"
            ) {

                departments.add(
                    department
                );

            }

        }
    );


    departmentFilter.innerHTML =
        `<option value="all">All Departments</option>`;


    Array
        .from(departments)
        .sort()
        .forEach(
            department => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    department;


                option.textContent =
                    department;


                departmentFilter.appendChild(
                    option
                );

            }
        );

}


/* =========================================================
   GENERATE REPORT
========================================================= */

function generateReport() {

    hideError();


    const start =
        fromDate.value;


    const end =
        toDate.value;


    if (!start || !end) {

        showError(
            "Please select both a start date and an end date."
        );

        return;

    }


    if (start > end) {

        showError(
            "The From Date cannot be later than the To Date."
        );

        return;

    }


    const selectedStaff =
        staffFilter.value;


    const selectedDepartment =
        departmentFilter.value;


    const rows = [];


    /*
       Generate one attendance row
       for every selected staff member
       and every date in the period.
    */

    const dates =
        getDatesBetween(
            start,
            end
        );


    dates.forEach(
        date => {

            staffMembers.forEach(
                staff => {

                    if (
                        selectedStaff !== "all" &&
                        staff.id !== selectedStaff
                    ) {

                        return;

                    }


                    const department =
                        getDepartment(
                            staff
                        );


                    if (
                        selectedDepartment !== "all" &&
                        department !== selectedDepartment
                    ) {

                        return;

                    }


                    const record =
                        findAttendanceRecord(
                            staff.id,
                            date
                        );


                    const status =
                        getStatus(
                            record
                        );


                    rows.push({

                        staff,
                        date,
                        record,
                        status,
                        department

                    });

                }
            );

        }
    );


    allReportRows =
        rows;


    renderReport(
        rows
    );


    updateStatistics(
        rows
    );


    reportPeriod.textContent =
        `${formatDisplayDate(start)} — ${formatDisplayDate(end)}`;

}


/* =========================================================
   FIND ATTENDANCE RECORD
========================================================= */

function findAttendanceRecord(
    staffDocumentId,
    date
) {

    return attendanceRecords.find(
        record => {

            const correctStaff =

                record.staffDocumentId ===
                    staffDocumentId

                ||

                record.staffId ===
                    staffDocumentId

                ||

                record.workerStaffId ===
                    staffDocumentId;


            const correctDate =
                record.date === date;


            return (
                correctStaff &&
                correctDate
            );

        }
    );

}


/* =========================================================
   STATUS
========================================================= */

function getStatus(
    record
) {

    if (!record) {

        return "absent";

    }


    const status =
        String(
            record.status ||
            ""
        ).toLowerCase();


    if (
        status === "late"
    ) {

        return "late";

    }


    if (
        status === "present"
    ) {

        return "present";

    }


    if (
        record.checkIn
    ) {

        return "present";

    }


    return "absent";

}


/* =========================================================
   RENDER REPORT
========================================================= */

function renderReport(
    rows
) {

    reportTableBody.innerHTML =
        "";


    if (!rows.length) {

        reportTableBody.innerHTML = `

            <tr>

                <td
                    colspan="7"
                    class="empty"
                >
                    No attendance records found.
                </td>

            </tr>

        `;

        return;

    }


    rows.forEach(
        row => {

            const name =
                getStaffName(
                    row.staff
                );


            const staffId =
                row.staff.staffId ||
                row.staff.employeeId ||
                row.staff.id;


            const checkIn =
                formatTime(
                    row.record?.checkIn
                );


            const checkOut =
                formatTime(
                    row.record?.checkOut
                );


            const statusLabel =
                capitalize(
                    row.status
                );


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML = `

                <td>
                    ${escapeHtml(name)}
                </td>

                <td>
                    ${escapeHtml(staffId)}
                </td>

                <td>
                    ${escapeHtml(row.department)}
                </td>

                <td>
                    ${escapeHtml(
                        formatDisplayDate(
                            row.date
                        )
                    )}
                </td>

                <td>
                    ${escapeHtml(checkIn)}
                </td>

                <td>
                    ${escapeHtml(checkOut)}
                </td>

                <td>
                    ${getStatusBadge(
                        row.status,
                        statusLabel
                    )}
                </td>

            `;


            reportTableBody.appendChild(
                tr
            );

        }
    );

}


/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics(
    rows
) {

    let present =
        0;

    let late =
        0;

    let absent =
        0;


    rows.forEach(
        row => {

            if (
                row.status === "present"
            ) {

                present++;

            }

            else if (
                row.status === "late"
            ) {

                late++;

            }

            else {

                absent++;

            }

        }
    );


    const total =
        rows.length;


    const attended =
        present +
        late;


    const rate =
        total > 0
            ? (
                attended /
                total
            ) *
            100
            : 0;


    /*
       Total Staff is the number of
       selected staff, not number of
       attendance rows.
    */

    const uniqueStaff =
        new Set(
            rows.map(
                row =>
                    row.staff.id
            )
        );


    totalStaff.textContent =
        uniqueStaff.size;


    presentCount.textContent =
        present;


    lateCount.textContent =
        late;


    absentCount.textContent =
        absent;


    attendanceRate.textContent =
        `${rate.toFixed(1)}%`;

}


/* =========================================================
   STATUS BADGE
========================================================= */

function getStatusBadge(
    status,
    label
) {

    if (
        status === "present"
    ) {

        return `
            <span class="badge badge-present">
                ${label}
            </span>
        `;

    }


    if (
        status === "late"
    ) {

        return `
            <span class="badge badge-late">
                ${label}
            </span>
        `;

    }


    return `
        <span class="badge badge-absent">
            Absent
        </span>
    `;

}


/* =========================================================
   GET STAFF NAME
========================================================= */

function getStaffName(
    staff
) {

    return (

        staff.name ||

        staff.fullName ||

        staff.staffName ||

        staff.employeeName ||

        "Unnamed Staff"

    );

}


/* =========================================================
   DEPARTMENT
========================================================= */

function getDepartment(
    staff
) {

    return (

        staff.department ||

        staff.departmentName ||

        staff.dept ||

        "—"

    );

}


/* =========================================================
   FORMAT TIME
========================================================= */

function formatTime(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    if (
        typeof value.toDate === "function"
    ) {

        return formatDateTime(
            value.toDate()
        );

    }


    if (
        typeof value === "object" &&
        typeof value.seconds === "number"
    ) {

        const milliseconds =
            (
                value.seconds *
                1000
            ) +
            (
                (value.nanoseconds || 0) /
                1000000
            );


        return formatDateTime(
            new Date(
                milliseconds
            )
        );

    }


    if (
        value instanceof Date
    ) {

        return formatDateTime(
            value
        );

    }


    if (
        typeof value === "number"
    ) {

        let milliseconds =
            value;


        if (
            value < 100000000000
        ) {

            milliseconds =
                value *
                1000;

        }


        return formatDateTime(
            new Date(
                milliseconds
            )
        );

    }


    if (
        typeof value === "string"
    ) {

        if (
            isSimpleTimeString(
                value
            )
        ) {

            return value;

        }


        const date =
            new Date(
                value
            );


        if (
            !Number.isNaN(
                date.getTime()
            )
        ) {

            return formatDateTime(
                date
            );

        }


        return value;

    }


    return "—";

}


/* =========================================================
   FORMAT DATE TIME
========================================================= */

function formatDateTime(
    date
) {

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }


    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================================
   SIMPLE TIME
========================================================= */

function isSimpleTimeString(
    value
) {

    return /^\d{1,2}:\d{2}(\s?(AM|PM|am|pm))?$/
        .test(
            value.trim()
        );

}


/* =========================================================
   DATE RANGE
========================================================= */

function getDatesBetween(
    start,
    end
) {

    const dates = [];

    const current =
        new Date(
            `${start}T00:00:00`
        );


    const last =
        new Date(
            `${end}T00:00:00`
        );


    while (
        current <= last
    ) {

        dates.push(
            getLocalDateString(
                current
            )
        );


        current.setDate(
            current.getDate() +
            1
        );

    }


    return dates;

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
   DISPLAY DATE
========================================================= */

function formatDisplayDate(
    value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    return date.toLocaleDateString(
        [],
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );

}


/* =========================================================
   CAPITALIZE
========================================================= */

function capitalize(
    value
) {

    if (!value) {

        return "";

    }


    return (
        value.charAt(0).toUpperCase() +
        value.slice(1)
    );

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
   ERROR
========================================================= */

function showError(
    message
) {

    if (!errorBox) {

        return;

    }


    errorBox.textContent =
        message;


    errorBox.style.display =
        "block";

}


function hideError() {

    if (errorBox) {

        errorBox.style.display =
            "none";

    }

}


/* =========================================================
   GENERATE BUTTON
========================================================= */

generateButton.addEventListener(
    "click",
    async () => {

        generateButton.disabled =
            true;

        generateButton.textContent =
            "Loading...";


        try {

            /*
               Reload attendance so the report
               always uses the latest records.
            */

            await loadAttendance();


            generateReport();

        }

        catch (error) {

            console.error(
                error
            );

            showError(
                error.message ||
                "Unable to generate report."
            );

        }

        finally {

            generateButton.disabled =
                false;

            generateButton.textContent =
                "Generate Report";

        }

    }
);


/* =========================================================
   RESET
========================================================= */

resetButton.addEventListener(
    "click",
    () => {

        setDefaultDates();

        staffFilter.value =
            "all";

        departmentFilter.value =
            "all";

        generateReport();

    }
);


/* =========================================================
   PRINT
========================================================= */

printButton.addEventListener(
    "click",
    () => {

        window.print();

    }
);


/* =========================================================
   FINAL
========================================================= */

console.log(
    "✅ Virello Reports module loaded."
);