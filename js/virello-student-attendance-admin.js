/*
=========================================================
VIRELLO TECHNOLOGIES
STUDENT ATTENDANCE - ADMINISTRATOR DASHBOARD ADD-ON

This file is an ADD-ON only.
It does not replace or modify dashboard.js.

Features:
- Daily student attendance summary
- Shows every Form Master/class that recorded attendance
- Shows Present / Late / Absent counts per Form Master
- Shows every recorded student for the selected date
- Refreshes on demand
- Uses the existing Firebase project and existing
  "attendance", "students", and "organizations" collections
=========================================================
*/

import {
    onAuthStateChanged
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


let currentOrganization = null;
let currentUser = null;


document.addEventListener("DOMContentLoaded", () => {
    /*
       Only activate on the administrator dashboard.
       This keeps the add-on harmless if the script is
       accidentally loaded on another page.
    */
    if (
        !document.getElementById("organizationName") ||
        !document.getElementById("totalStaff")
    ) {
        return;
    }

    onAuthStateChanged(auth, async user => {
        if (!user) {
            return;
        }

        currentUser = user;

        try {
            await loadOrganization();
            if (!currentOrganization) {
                return;
            }

            injectStyles();
            injectDashboardSection();
            await loadStudentAttendance();
        } catch (error) {
            console.error(
                "Virello student attendance dashboard add-on error:",
                error
            );

            showAddonError(
                error.message ||
                "Unable to load student attendance."
            );
        }
    });
});


async function loadOrganization() {
    const organizationsRef = collection(
        db,
        "organizations"
    );

    const organizationQuery = query(
        organizationsRef,
        where(
            "ownerUid",
            "==",
            currentUser.uid
        )
    );

    const snapshot = await getDocs(
        organizationQuery
    );

    if (snapshot.empty) {
        return;
    }

    const organizationDocument = snapshot.docs[0];

    currentOrganization = {
        id: organizationDocument.id,
        ...organizationDocument.data()
    };
}


function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
        date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
}


function normalizeStatus(status) {
    const value = String(
        status || ""
    )
    .trim()
    .toLowerCase();

    if (
        value === "present" ||
        value === "p"
    ) {
        return "present";
    }

    if (
        value === "late" ||
        value === "l"
    ) {
        return "late";
    }

    if (
        value === "absent" ||
        value === "a"
    ) {
        return "absent";
    }

    return "not_recorded";
}


function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function injectStyles() {
    if (
        document.getElementById(
            "virello-student-attendance-addon-styles"
        )
    ) {
        return;
    }

    const style = document.createElement("style");
    style.id =
        "virello-student-attendance-addon-styles";

    style.textContent = `
        .vsa-section {
            margin-top: 30px;
            margin-bottom: 30px;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        }

        .vsa-heading {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 18px;
            margin-bottom: 20px;
        }

        .vsa-heading h2 {
            margin: 0;
            color: #111827;
            font-size: 20px;
        }

        .vsa-heading p {
            margin: 6px 0 0;
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
        }

        .vsa-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .vsa-controls label {
            color: #475569;
            font-size: 12px;
            font-weight: 700;
        }

        .vsa-date {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 9px 11px;
            color: #172033;
            background: #fff;
        }

        .vsa-button {
            border: 0;
            border-radius: 8px;
            padding: 10px 14px;
            font-weight: 700;
            cursor: pointer;
            background: #172554;
            color: #fff;
        }

        .vsa-button:disabled {
            opacity: .6;
            cursor: wait;
        }

        .vsa-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .vsa-stat {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            background: #f8fafc;
        }

        .vsa-stat-label {
            color: #64748b;
            font-size: 12px;
            margin-bottom: 6px;
        }

        .vsa-stat-number {
            color: #111827;
            font-size: 25px;
            font-weight: 800;
        }

        .vsa-subheading {
            margin: 22px 0 12px;
            color: #172033;
            font-size: 16px;
        }

        .vsa-table-wrap {
            width: 100%;
            overflow-x: auto;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
        }

        .vsa-table {
            width: 100%;
            border-collapse: collapse;
            min-width: 760px;
        }

        .vsa-table th,
        .vsa-table td {
            padding: 12px 13px;
            border-bottom: 1px solid #e2e8f0;
            text-align: left;
            font-size: 12px;
        }

        .vsa-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 800;
        }

        .vsa-table tr:last-child td {
            border-bottom: 0;
        }

        .vsa-badge {
            display: inline-flex;
            align-items: center;
            padding: 5px 8px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 800;
        }

        .vsa-present {
            background: #dcfce7;
            color: #166534;
        }

        .vsa-late {
            background: #fef3c7;
            color: #92400e;
        }

        .vsa-absent {
            background: #fee2e2;
            color: #991b1b;
        }

        .vsa-empty {
            padding: 22px;
            text-align: center;
            color: #64748b;
            font-size: 13px;
        }

        .vsa-error {
            margin-top: 12px;
            padding: 12px;
            border-radius: 9px;
            background: #fef2f2;
            color: #991b1b;
            font-size: 12px;
            display: none;
        }

        @media (max-width: 900px) {
            .vsa-stats {
                grid-template-columns: repeat(2, 1fr);
            }

            .vsa-heading {
                flex-direction: column;
            }
        }

        @media (max-width: 600px) {
            .vsa-section {
                padding: 17px;
            }

            .vsa-stats {
                grid-template-columns: 1fr 1fr;
            }

            .vsa-controls {
                width: 100%;
            }

            .vsa-date {
                flex: 1;
            }
        }
    `;

    document.head.appendChild(style);
}


function injectDashboardSection() {
    if (
        document.getElementById(
            "virelloStudentAttendanceSection"
        )
    ) {
        return;
    }

    const section = document.createElement("section");
    section.id =
        "virelloStudentAttendanceSection";
    section.className = "vsa-section";

    section.innerHTML = `
        <div class="vsa-heading">
            <div>
                <h2>Student Attendance Monitor</h2>
                <p>
                    Check daily student attendance and see every
                    Form Master who has called the register.
                </p>
            </div>

            <div class="vsa-controls">
                <label for="vsaAttendanceDate">
                    Attendance Date
                </label>

                <input
                    id="vsaAttendanceDate"
                    class="vsa-date"
                    type="date"
                    value="${getLocalDateString()}"
                >

                <button
                    id="vsaRefreshButton"
                    class="vsa-button"
                    type="button"
                >
                    Refresh
                </button>
            </div>
        </div>

        <div class="vsa-stats">
            <div class="vsa-stat">
                <div class="vsa-stat-label">
                    Attendance Records
                </div>
                <div
                    id="vsaTotalRecords"
                    class="vsa-stat-number"
                >0</div>
            </div>

            <div class="vsa-stat">
                <div class="vsa-stat-label">
                    Students Present
                </div>
                <div
                    id="vsaPresentCount"
                    class="vsa-stat-number"
                >0</div>
            </div>

            <div class="vsa-stat">
                <div class="vsa-stat-label">
                    Students Late
                </div>
                <div
                    id="vsaLateCount"
                    class="vsa-stat-number"
                >0</div>
            </div>

            <div class="vsa-stat">
                <div class="vsa-stat-label">
                    Students Absent
                </div>
                <div
                    id="vsaAbsentCount"
                    class="vsa-stat-number"
                >0</div>
            </div>
        </div>

        <h3 class="vsa-subheading">
            Form Masters Who Called Register
        </h3>

        <div
            id="vsaFormMasterTable"
            class="vsa-table-wrap"
        ></div>

        <h3 class="vsa-subheading">
            Student Attendance For Selected Day
        </h3>

        <div
            id="vsaStudentTable"
            class="vsa-table-wrap"
        ></div>

        <div
            id="vsaError"
            class="vsa-error"
        ></div>
    `;

    /*
       The original dashboard structure has .stats-grid
       followed by the Quick Actions section. Insert the
       new section between them, leaving existing markup
       untouched.
    */
    const statsGrid =
        document.querySelector(".stats-grid");

    if (statsGrid && statsGrid.parentNode) {
        statsGrid.parentNode.insertBefore(
            section,
            statsGrid.nextElementSibling
        );
    } else {
        const page =
            document.querySelector("main.page") ||
            document.body;

        page.appendChild(section);
    }

    const dateInput =
        document.getElementById(
            "vsaAttendanceDate"
        );

    const refreshButton =
        document.getElementById(
            "vsaRefreshButton"
        );

    if (dateInput) {
        dateInput.addEventListener(
            "change",
            loadStudentAttendance
        );
    }

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadStudentAttendance
        );
    }
}


async function loadStudentAttendance() {
    const errorElement =
        document.getElementById("vsaError");

    const dateInput =
        document.getElementById(
            "vsaAttendanceDate"
        );

    const refreshButton =
        document.getElementById(
            "vsaRefreshButton"
        );

    if (!currentOrganization || !dateInput) {
        return;
    }

    const date = dateInput.value;

    if (!date) {
        return;
    }

    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = "Loading...";
    }

    if (errorElement) {
        errorElement.style.display = "none";
        errorElement.textContent = "";
    }

    try {
        const attendanceRef =
            collection(db, "attendance");

        const attendanceQuery =
            query(
                attendanceRef,
                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                ),
                where(
                    "date",
                    "==",
                    date
                )
            );

        const snapshot =
            await getDocs(attendanceQuery);

        const records = [];

        snapshot.forEach(documentSnapshot => {
            const record =
                documentSnapshot.data();

            const status =
                normalizeStatus(record.status);

            if (status === "not_recorded") {
                return;
            }

            records.push({
                id: documentSnapshot.id,
                ...record,
                status
            });
        });

        records.sort((a, b) => {
            const classCompare =
                String(
                    a.className || ""
                ).localeCompare(
                    String(
                        b.className || ""
                    )
                );

            if (classCompare !== 0) {
                return classCompare;
            }

            return String(
                a.studentName || ""
            ).localeCompare(
                String(
                    b.studentName || ""
                )
            );
        });

        renderAttendanceStats(records);
        renderFormMasterSummary(records);
        renderStudentAttendance(records);
    } catch (error) {
        console.error(
            "Virello daily student attendance load failed:",
            error
        );

        showAddonError(
            error.message ||
            "Unable to load attendance for the selected date."
        );
    } finally {
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = "Refresh";
        }
    }
}


function renderAttendanceStats(records) {
    let present = 0;
    let late = 0;
    let absent = 0;

    records.forEach(record => {
        if (record.status === "present") {
            present++;
        } else if (record.status === "late") {
            late++;
        } else if (record.status === "absent") {
            absent++;
        }
    });

    const totalRecords =
        document.getElementById(
            "vsaTotalRecords"
        );

    const presentElement =
        document.getElementById(
            "vsaPresentCount"
        );

    const lateElement =
        document.getElementById(
            "vsaLateCount"
        );

    const absentElement =
        document.getElementById(
            "vsaAbsentCount"
        );

    if (totalRecords) {
        totalRecords.textContent =
            records.length;
    }

    if (presentElement) {
        presentElement.textContent =
            present;
    }

    if (lateElement) {
        lateElement.textContent =
            late;
    }

    if (absentElement) {
        absentElement.textContent =
            absent;
    }
}


function renderFormMasterSummary(records) {
    const container =
        document.getElementById(
            "vsaFormMasterTable"
        );

    if (!container) {
        return;
    }

    if (!records.length) {
        container.innerHTML = `
            <div class="vsa-empty">
                No student attendance register has been recorded
                for this date.
            </div>
        `;
        return;
    }

    const groups = new Map();

    records.forEach(record => {
        const key =
            [
                record.formMasterId ||
                record.staffId ||
                "unknown",
                record.classId ||
                record.className ||
                "unknown"
            ].join("::");

        if (!groups.has(key)) {
            groups.set(key, {
                formMasterId:
                    record.formMasterId ||
                    record.staffId ||
                    "",
                formMasterName:
                    record.formMasterName ||
                    "Form Master",
                className:
                    record.className ||
                    "Class",
                present: 0,
                late: 0,
                absent: 0,
                total: 0
            });
        }

        const group = groups.get(key);

        group.total++;

        if (record.status === "present") {
            group.present++;
        }

        if (record.status === "late") {
            group.late++;
        }

        if (record.status === "absent") {
            group.absent++;
        }
    });

    const rows =
        Array.from(groups.values())
            .sort((a, b) => {
                const classCompare =
                    a.className.localeCompare(
                        b.className
                    );

                if (classCompare !== 0) {
                    return classCompare;
                }

                return a.formMasterName.localeCompare(
                    b.formMasterName
                );
            })
            .map(group => `
                <tr>
                    <td>
                        ${escapeHTML(
                            group.formMasterName
                        )}
                    </td>
                    <td>
                        ${escapeHTML(
                            group.className
                        )}
                    </td>
                    <td>
                        ${group.total}
                    </td>
                    <td>
                        <span class="vsa-badge vsa-present">
                            ${group.present}
                        </span>
                    </td>
                    <td>
                        <span class="vsa-badge vsa-late">
                            ${group.late}
                        </span>
                    </td>
                    <td>
                        <span class="vsa-badge vsa-absent">
                            ${group.absent}
                        </span>
                    </td>
                </tr>
            `)
            .join("");

    container.innerHTML = `
        <table class="vsa-table">
            <thead>
                <tr>
                    <th>Form Master</th>
                    <th>Class</th>
                    <th>Students Recorded</th>
                    <th>Present</th>
                    <th>Late</th>
                    <th>Absent</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}


function renderStudentAttendance(records) {
    const container =
        document.getElementById(
            "vsaStudentTable"
        );

    if (!container) {
        return;
    }

    if (!records.length) {
        container.innerHTML = `
            <div class="vsa-empty">
                No student attendance records are available
                for the selected date.
            </div>
        `;
        return;
    }

    const rows =
        records.map((record, index) => {
            const statusLabel =
                record.status === "present"
                    ? "Present"
                    : record.status === "late"
                        ? "Late"
                        : "Absent";

            const badgeClass =
                record.status === "present"
                    ? "vsa-present"
                    : record.status === "late"
                        ? "vsa-late"
                        : "vsa-absent";

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        ${escapeHTML(
                            record.studentName ||
                            "Student"
                        )}
                    </td>
                    <td>
                        ${escapeHTML(
                            record.studentNumber ||
                            record.studentId ||
                            ""
                        )}
                    </td>
                    <td>
                        ${escapeHTML(
                            record.className ||
                            ""
                        )}
                    </td>
                    <td>
                        ${escapeHTML(
                            record.formMasterName ||
                            "Form Master"
                        )}
                    </td>
                    <td>
                        <span
                            class="vsa-badge ${badgeClass}"
                        >
                            ${statusLabel}
                        </span>
                    </td>
                </tr>
            `;
        })
        .join("");

    container.innerHTML = `
        <table class="vsa-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Student ID</th>
                    <th>Class</th>
                    <th>Form Master</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}


function showAddonError(message) {
    const errorElement =
        document.getElementById("vsaError");

    if (!errorElement) {
        return;
    }

    errorElement.textContent =
        message;

    errorElement.style.display =
        "block";
}
