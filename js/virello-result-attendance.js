/*
=========================================================
VIRELLO TECHNOLOGIES
PUBLIC RESULT PORTAL - STUDENT ATTENDANCE HISTORY

This file is specifically for result-portal.html.

It works with the existing:
    result-portal.js
    attendance collection

When a parent checks a published result, this add-on
displays the student's attendance history.

It does NOT replace result-portal.js.
=========================================================
*/

import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    db
} from "./firebase-config.js";


/*
=========================================================
STATE
=========================================================
*/

let pendingResult = null;

let currentAttendanceRequest = 0;


/*
=========================================================
INITIALIZATION
=========================================================
*/

document.addEventListener("DOMContentLoaded", () => {

    injectAttendanceStyles();

});


/*
=========================================================
PUBLIC FUNCTION
=========================================================

result-portal.js already calls:

window.virelloLoadResultAttendance(result);

We expose that function here.
*/

window.virelloLoadResultAttendance =
    loadAttendanceForResult;


/*
=========================================================
LOAD ATTENDANCE FOR SELECTED RESULT
=========================================================
*/

function loadAttendanceForResult(result) {

    if (!result) {
        return;
    }

    pendingResult = result;

    const requestId =
        ++currentAttendanceRequest;


    /*
    IMPORTANT:

    result-portal.js currently calls this function BEFORE
    renderResult().

    Therefore we wait until the current JavaScript
    rendering cycle has finished before inserting the
    attendance section.
    */

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            if (
                requestId !==
                currentAttendanceRequest
            ) {
                return;
            }

            renderAttendanceSection(result);

        });

    });

}


/*
=========================================================
RENDER ATTENDANCE SECTION
=========================================================
*/

async function renderAttendanceSection(result) {

    const resultDisplay =
        document.getElementById(
            "resultDisplay"
        );

    if (!resultDisplay) {
        return;
    }


    /*
    Remove previous attendance section.
    */

    const oldSection =
        document.getElementById(
            "virelloPublicAttendance"
        );

    if (oldSection) {
        oldSection.remove();
    }


    /*
    Create attendance section.
    */

    const section =
        document.createElement("section");

    section.id =
        "virelloPublicAttendance";

    section.className =
        "vpa-section";


    section.innerHTML = `

        <div class="vpa-header">

            <div>

                <h3 class="vpa-title">
                    Student Attendance History
                </h3>

                <p class="vpa-subtitle">
                    Attendance records currently stored
                    by the school for this student.
                </p>

            </div>

            <div class="vpa-badge">
                ATTENDANCE
            </div>

        </div>


        <div class="vpa-loading">

            <div class="vpa-spinner"></div>

            <span>
                Loading attendance history...
            </span>

        </div>

        <div
            id="vpaContent"
            style="display:none;"
        ></div>

        <div
            id="vpaError"
            class="vpa-error"
            style="display:none;"
        ></div>

    `;


    /*
    Put attendance AFTER the result.
    */

    resultDisplay.appendChild(section);


    /*
    Load records.
    */

    await loadAttendanceRecords(result);

}


/*
=========================================================
LOAD ATTENDANCE RECORDS
=========================================================
*/

async function loadAttendanceRecords(result) {

    const section =
        document.getElementById(
            "virelloPublicAttendance"
        );

    if (!section) {
        return;
    }


    const loading =
        section.querySelector(
            ".vpa-loading"
        );

    const content =
        document.getElementById(
            "vpaContent"
        );

    const errorElement =
        document.getElementById(
            "vpaError"
        );


    try {

        /*
        -------------------------------------------------
        IDENTIFY STUDENT
        -------------------------------------------------
        */

        const studentDocumentId =
            String(
                result.studentDocumentId || ""
            ).trim();


        const studentId =
            String(
                result.studentId || ""
            ).trim();


        const organizationId =
            String(
                result.organizationId || ""
            ).trim();


        if (!organizationId) {

            throw new Error(
                "This result does not contain a school organization ID."
            );

        }


        if (
            !studentDocumentId &&
            !studentId
        ) {

            throw new Error(
                "This result does not contain enough student information to load attendance."
            );

        }


        /*
        -------------------------------------------------
        QUERY ATTENDANCE
        -------------------------------------------------

        We query only by organization.

        Then we match the student in JavaScript.

        This avoids requiring a new composite Firestore
        index.
        */

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
                    organizationId
                )
            );


        const snapshot =
            await getDocs(
                attendanceQuery
            );


        const records = [];


        snapshot.forEach(
            attendanceDocument => {

                const record =
                    attendanceDocument.data();


                const recordDocumentId =
                    String(
                        record.studentDocumentId ||
                        ""
                    ).trim();


                const recordStudentId =
                    String(
                        record.studentId ||
                        ""
                    ).trim();


                /*
                -------------------------------------------------
                STUDENT MATCHING
                -------------------------------------------------

                Existing Virello attendance uses
                studentDocumentId.

                We also check studentId as a fallback.
                */

                let matchesStudent = false;


                if (
                    studentDocumentId &&
                    recordDocumentId ===
                    studentDocumentId
                ) {

                    matchesStudent = true;

                }


                if (
                    !matchesStudent &&
                    studentId &&
                    recordStudentId ===
                    studentId
                ) {

                    matchesStudent = true;

                }


                if (!matchesStudent) {
                    return;
                }


                const status =
                    normalizeStatus(
                        record.status
                    );


                /*
                Ignore unknown statuses.
                */

                if (
                    status ===
                    "not_recorded"
                ) {

                    return;

                }


                records.push({

                    id:
                        attendanceDocument.id,

                    date:
                        getAttendanceDate(
                            record
                        ),

                    className:
                        record.className ||
                        "-",

                    formMasterName:
                        record.formMasterName ||
                        "-",

                    status:
                        status,

                    raw:
                        record

                });

            }
        );


        /*
        -------------------------------------------------
        SORT NEWEST FIRST
        -------------------------------------------------
        */

        records.sort(
            (a, b) => {

                return String(b.date)
                    .localeCompare(
                        String(a.date)
                    );

            }
        );


        /*
        -------------------------------------------------
        SUMMARY
        -------------------------------------------------
        */

        let present = 0;
        let absent = 0;
        let late = 0;


        records.forEach(
            record => {

                if (
                    record.status ===
                    "present"
                ) {
                    present++;
                }

                if (
                    record.status ===
                    "absent"
                ) {
                    absent++;
                }

                if (
                    record.status ===
                    "late"
                ) {
                    late++;
                }

            }
        );


        const total =
            records.length;


        /*
        -------------------------------------------------
        BUILD CONTENT
        -------------------------------------------------
        */

        if (loading) {
            loading.style.display =
                "none";
        }


        if (!content) {
            return;
        }


        content.style.display =
            "block";


        content.innerHTML = `

            <div class="vpa-summary-grid">

                <div class="vpa-summary-card">

                    <div class="vpa-summary-label">
                        Present
                    </div>

                    <div class="vpa-summary-number">
                        ${present}
                    </div>

                </div>


                <div class="vpa-summary-card">

                    <div class="vpa-summary-label">
                        Absent
                    </div>

                    <div class="vpa-summary-number">
                        ${absent}
                    </div>

                </div>


                <div class="vpa-summary-card">

                    <div class="vpa-summary-label">
                        Late
                    </div>

                    <div class="vpa-summary-number">
                        ${late}
                    </div>

                </div>


                <div class="vpa-summary-card">

                    <div class="vpa-summary-label">
                        Total Records
                    </div>

                    <div class="vpa-summary-number">
                        ${total}
                    </div>

                </div>

            </div>


            <div class="vpa-table-wrapper">

                <table class="vpa-table">

                    <thead>

                        <tr>

                            <th>
                                Date
                            </th>

                            <th>
                                Class
                            </th>

                            <th>
                                Form Master
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        ${
                            records.length > 0
                                ? records
                                    .map(
                                        record =>
                                            createAttendanceRow(
                                                record
                                            )
                                    )
                                    .join("")
                                : `
                                    <tr>

                                        <td
                                            colspan="4"
                                            class="vpa-empty"
                                        >
                                            No attendance records
                                            are currently available
                                            for this student.
                                        </td>

                                    </tr>
                                `
                        }

                    </tbody>

                </table>

            </div>


            <div class="vpa-footer-note">

                Attendance history is based on records
                currently stored by the school.

            </div>

        `;


    } catch (error) {

        console.error(
            "Virello public attendance error:",
            error
        );


        if (loading) {
            loading.style.display =
                "none";
        }


        if (errorElement) {

            errorElement.style.display =
                "block";

            errorElement.textContent =
                "Attendance history could not be loaded at this time.";

        }

    }

}


/*
=========================================================
CREATE ATTENDANCE TABLE ROW
=========================================================
*/

function createAttendanceRow(record) {

    const statusLabel =
        capitalize(
            record.status
        );


    const statusClass =
        `vpa-status-${record.status}`;


    return `

        <tr>

            <td>
                ${escapeHTML(
                    formatDate(
                        record.date
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    String(
                        record.className ||
                        "-"
                    )
                )}
            </td>

            <td>
                ${escapeHTML(
                    String(
                        record.formMasterName ||
                        "-"
                    )
                )}
            </td>

            <td>

                <span
                    class="
                        vpa-status
                        ${statusClass}
                    "
                >
                    ${escapeHTML(
                        statusLabel
                    )}
                </span>

            </td>

        </tr>

    `;

}


/*
=========================================================
GET ATTENDANCE DATE
=========================================================
*/

function getAttendanceDate(record) {

    /*
    Existing attendance uses "date".
    */

    if (record.date) {

        return String(
            record.date
        );

    }


    /*
    Fallbacks for future records.
    */

    if (record.attendanceDate) {

        return String(
            record.attendanceDate
        );

    }


    return "";

}


/*
=========================================================
FORMAT DATE
=========================================================
*/

function formatDate(value) {

    if (!value) {
        return "-";
    }


    const date =
        new Date(
            `${value}T00:00:00`
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }


    return date.toLocaleDateString(
        undefined,
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/*
=========================================================
NORMALIZE STATUS
=========================================================
*/

function normalizeStatus(status) {

    const value =
        String(
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
        value === "absent" ||
        value === "a"
    ) {

        return "absent";

    }


    if (
        value === "late" ||
        value === "l"
    ) {

        return "late";

    }


    return "not_recorded";

}


/*
=========================================================
CAPITALIZE
=========================================================
*/

function capitalize(value) {

    const text =
        String(
            value || ""
        );


    return text.charAt(0)
        .toUpperCase() +
        text.slice(1);

}


/*
=========================================================
ESCAPE HTML
=========================================================
*/

function escapeHTML(value) {

    return String(value)

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


/*
=========================================================
STYLES
=========================================================
*/

function injectAttendanceStyles() {

    if (
        document.getElementById(
            "virello-public-attendance-styles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "virello-public-attendance-styles";


    style.textContent = `

        .vpa-section {

            margin-top: 28px;
            padding: 22px;

            border: 1px solid #e2e8f0;
            border-radius: 14px;

            background: #ffffff;

            box-shadow:
                0 5px 18px
                rgba(15, 23, 42, 0.05);

        }


        .vpa-header {

            display: flex;
            align-items: center;
            justify-content: space-between;

            gap: 15px;

            margin-bottom: 20px;

        }


        .vpa-title {

            margin: 0 0 5px;

            font-size: 20px;
            font-weight: 800;

            color: #0b3d91;

        }


        .vpa-subtitle {

            margin: 0;

            color: #64748b;

            font-size: 13px;

            line-height: 1.5;

        }


        .vpa-badge {

            padding: 7px 11px;

            border-radius: 999px;

            background: #eff6ff;

            color: #1d4ed8;

            font-size: 10px;

            font-weight: 800;

            letter-spacing: .5px;

            white-space: nowrap;

        }


        .vpa-summary-grid {

            display: grid;

            grid-template-columns:
                repeat(4, minmax(0, 1fr));

            gap: 12px;

            margin-bottom: 20px;

        }


        .vpa-summary-card {

            padding: 15px;

            border:
                1px solid #e2e8f0;

            border-radius: 10px;

            background: #f8fafc;

        }


        .vpa-summary-label {

            color: #64748b;

            font-size: 11px;

            font-weight: 700;

            text-transform: uppercase;

            letter-spacing: .4px;

        }


        .vpa-summary-number {

            margin-top: 6px;

            color: #0f172a;

            font-size: 25px;

            font-weight: 800;

        }


        .vpa-table-wrapper {

            width: 100%;

            overflow-x: auto;

            border:
                1px solid #e2e8f0;

            border-radius: 10px;

        }


        .vpa-table {

            width: 100%;

            border-collapse: collapse;

            min-width: 620px;

        }


        .vpa-table th {

            padding: 12px;

            text-align: left;

            background: #f8fafc;

            border-bottom:
                1px solid #e2e8f0;

            color: #475569;

            font-size: 11px;

            text-transform: uppercase;

        }


        .vpa-table td {

            padding: 13px 12px;

            border-bottom:
                1px solid #eef2f7;

            color: #334155;

            font-size: 13px;

        }


        .vpa-table tbody tr:last-child td {

            border-bottom: 0;

        }


        .vpa-status {

            display: inline-block;

            padding: 5px 9px;

            border-radius: 999px;

            font-size: 11px;

            font-weight: 800;

        }


        .vpa-status-present {

            background: #ecfdf3;
            color: #027a48;

        }


        .vpa-status-absent {

            background: #fef3f2;
            color: #b42318;

        }


        .vpa-status-late {

            background: #fffaeb;
            color: #b54708;

        }


        .vpa-empty {

            padding: 30px !important;

            text-align: center;

            color: #64748b !important;

        }


        .vpa-footer-note {

            margin-top: 12px;

            color: #94a3b8;

            font-size: 11px;

        }


        .vpa-loading {

            display: flex;

            align-items: center;

            gap: 10px;

            padding: 20px;

            color: #64748b;

            font-size: 13px;

        }


        .vpa-spinner {

            width: 18px;
            height: 18px;

            border:
                2px solid #e2e8f0;

            border-top-color:
                #0b3d91;

            border-radius: 50%;

            animation:
                vpaSpin .7s linear infinite;

        }


        @keyframes vpaSpin {

            to {
                transform: rotate(360deg);
            }

        }


        .vpa-error {

            padding: 15px;

            border-radius: 8px;

            background: #fef2f2;

            color: #991b1b;

            font-size: 13px;

        }


        @media (max-width: 800px) {

            .vpa-summary-grid {

                grid-template-columns:
                    repeat(2, 1fr);

            }

        }


        @media (max-width: 500px) {

            .vpa-section {

                padding: 15px;

            }


            .vpa-header {

                align-items: flex-start;

                flex-direction: column;

            }


            .vpa-summary-grid {

                grid-template-columns:
                    repeat(2, 1fr);

            }

        }


        @media print {

            .vpa-section {

                box-shadow: none;

                break-inside: avoid;

            }

        }

    `;


    document.head.appendChild(
        style
    );

}


/*
=========================================================
END
=========================================================
*/

console.log(
    "Virello public result attendance add-on loaded successfully."
);
