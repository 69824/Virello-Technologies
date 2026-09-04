/*
=========================================================
VIRELLO TECHNOLOGIES
RESULT ATTENDANCE SUMMARY - ADD-ON

This file is an ADD-ON only.
It does not replace or modify results.js.

On results.html:
- Adds an Attendance Summary section to the result editor.
- Automatically calculates Present / Late / Absent totals
  from the existing "attendance" collection.
- Allows the administrator to edit the numbers if needed.
- Saves the numbers into the existing result document as
  "attendanceSummary".

The section is injected automatically after the result
editor becomes visible.

Expected saved shape:

attendanceSummary: {
    present: number,
    absent: number,
    late: number,
    totalRecorded: number,
    manuallyAdjusted: boolean,
    updatedAt: server timestamp
}
=========================================================
*/

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase-config.js";


let currentUser = null;
let currentOrganization = null;

let lastLoadedStudentDocumentId = "";
let lastLoadedYear = "";
let lastLoadedTerm = "";


document.addEventListener("DOMContentLoaded", () => {
    /*
       Activate only on the academic results page.
    */
    if (
        !document.getElementById("resultEditor") ||
        !document.getElementById("studentSelect")
    ) {
        return;
    }

    injectStyles();
    startAttendanceIntegration();
});


function startAttendanceIntegration() {
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

            /*
               The existing results.js controls when the result
               editor is opened. A MutationObserver lets this
               add-on react to that without changing results.js.
            */
            const editor =
                document.getElementById(
                    "resultEditor"
                );

            if (editor) {
                observeResultEditor(editor);
            }

            /*
               Also watch the page briefly for the editor if
               the DOM is initialized after this script.
            */
            waitForEditor();
        } catch (error) {
            console.error(
                "Virello result attendance add-on startup error:",
                error
            );
        }
    });
}


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
        return;
    }

    const organizationDocument =
        snapshot.docs[0];

    currentOrganization = {
        id: organizationDocument.id,
        ...organizationDocument.data()
    };
}


function waitForEditor() {
    let attempts = 0;

    const timer =
        setInterval(() => {
            attempts++;

            const editor =
                document.getElementById(
                    "resultEditor"
                );

            if (editor) {
                clearInterval(timer);
                observeResultEditor(editor);
            }

            if (attempts >= 60) {
                clearInterval(timer);
            }
        }, 500);
}


function observeResultEditor(editor) {
    if (
        editor.dataset
            .virelloAttendanceObserver === "true"
    ) {
        return;
    }

    editor.dataset
        .virelloAttendanceObserver = "true";

    const observer =
        new MutationObserver(() => {
            maybeLoadAttendanceSection();
        });

    observer.observe(
        editor,
        {
            attributes: true,
            attributeFilter: ["class"]
        }
    );

    maybeLoadAttendanceSection();

    const studentSelect =
        document.getElementById(
            "studentSelect"
        );

    const academicYear =
        document.getElementById(
            "academicYear"
        );

    const termSelect =
        document.getElementById(
            "termSelect"
        );

    if (studentSelect) {
        studentSelect.addEventListener(
            "change",
            () => {
                lastLoadedStudentDocumentId = "";
                maybeLoadAttendanceSection();
            }
        );
    }

    if (academicYear) {
        academicYear.addEventListener(
            "change",
            () => {
                lastLoadedYear = "";
                maybeLoadAttendanceSection();
            }
        );
    }

    if (termSelect) {
        termSelect.addEventListener(
            "change",
            () => {
                lastLoadedTerm = "";
                maybeLoadAttendanceSection();
            }
        );
    }
}


function isEditorVisible() {
    const editor =
        document.getElementById(
            "resultEditor"
        );

    if (!editor) {
        return false;
    }

    return !editor.classList.contains(
        "hidden"
    );
}


function getSelectedStudentDocumentId() {
    return String(
        document.getElementById(
            "studentSelect"
        )?.value || ""
    ).trim();
}


function getAcademicYear() {
    return String(
        document.getElementById(
            "academicYear"
        )?.value || ""
    ).trim();
}


function getTerm() {
    return String(
        document.getElementById(
            "termSelect"
        )?.value || ""
    ).trim();
}


async function maybeLoadAttendanceSection() {
    if (
        !currentOrganization ||
        !isEditorVisible()
    ) {
        return;
    }

    const studentDocumentId =
        getSelectedStudentDocumentId();

    if (!studentDocumentId) {
        removeAttendanceSection();
        return;
    }

    const year =
        getAcademicYear();

    const term =
        getTerm();

    if (!year || !term) {
        return;
    }

    /*
       Avoid reloading the same student/year/term on
       every mutation.
    */
    if (
        studentDocumentId ===
            lastLoadedStudentDocumentId &&
        year === lastLoadedYear &&
        term === lastLoadedTerm &&
        document.getElementById(
            "virelloResultAttendanceSection"
        )
    ) {
        return;
    }

    lastLoadedStudentDocumentId =
        studentDocumentId;

    lastLoadedYear = year;
    lastLoadedTerm = term;

    await createOrRefreshAttendanceSection(
        studentDocumentId,
        year,
        term
    );
}


function removeAttendanceSection() {
    const existing =
        document.getElementById(
            "virelloResultAttendanceSection"
        );

    if (existing) {
        existing.remove();
    }
}


function injectStyles() {
    if (
        document.getElementById(
            "virello-result-attendance-styles"
        )
    ) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "virello-result-attendance-styles";

    style.textContent = `
        .vra-section {
            margin-top: 22px;
            margin-bottom: 22px;
            padding: 20px;
            border: 1px solid #dbe4f0;
            border-radius: 14px;
            background: #f8fafc;
        }

        .vra-title {
            margin: 0 0 6px;
            color: #172033;
            font-size: 18px;
        }

        .vra-description {
            margin: 0 0 17px;
            color: #64748b;
            font-size: 12px;
            line-height: 1.5;
        }

        .vra-grid {
            display: grid;
            grid-template-columns:
                repeat(4, minmax(0, 1fr));
            gap: 12px;
        }

        .vra-field {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
        }

        .vra-field label {
            display: block;
            margin-bottom: 7px;
            color: #475569;
            font-size: 11px;
            font-weight: 800;
        }

        .vra-field input {
            width: 100%;
            border: 1px solid #cbd5e1;
            border-radius: 7px;
            padding: 9px 10px;
            font-size: 14px;
            font-weight: 700;
        }

        .vra-total {
            margin-top: 13px;
            color: #475569;
            font-size: 12px;
        }

        .vra-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }

        .vra-save {
            border: 0;
            border-radius: 8px;
            padding: 10px 15px;
            background: #172554;
            color: #ffffff;
            font-weight: 800;
            cursor: pointer;
        }

        .vra-save:disabled {
            opacity: .6;
            cursor: wait;
        }

        .vra-refresh {
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 9px 14px;
            background: #ffffff;
            color: #172033;
            font-weight: 700;
            cursor: pointer;
        }

        .vra-message {
            font-size: 12px;
            color: #475569;
        }

        .vra-error {
            margin-top: 10px;
            color: #991b1b;
        }

        @media (max-width: 800px) {
            .vra-grid {
                grid-template-columns: repeat(2, 1fr);
            }
        }

        @media (max-width: 500px) {
            .vra-grid {
                grid-template-columns: 1fr 1fr;
            }

            .vra-section {
                padding: 15px;
            }
        }
    `;

    document.head.appendChild(style);
}


async function createOrRefreshAttendanceSection(
    studentDocumentId,
    year,
    term
) {
    const editor =
        document.getElementById(
            "resultEditor"
        );

    if (!editor) {
        return;
    }

    let section =
        document.getElementById(
            "virelloResultAttendanceSection"
        );

    if (!section) {
        section =
            document.createElement("section");

        section.id =
            "virelloResultAttendanceSection";

        section.className =
            "vra-section";

        /*
           Put it immediately before the comments section
           if possible; otherwise place it at the end of
           the existing result editor.
        */
        const commentsGrid =
            editor.querySelector(
                ".comments-grid"
            );

        if (
            commentsGrid &&
            commentsGrid.parentNode
        ) {
            commentsGrid.parentNode.insertBefore(
                section,
                commentsGrid
            );
        } else {
            editor.appendChild(section);
        }
    }

    section.innerHTML = `
        <h3 class="vra-title">
            Student Attendance Summary
        </h3>

        <p class="vra-description">
            Attendance is calculated from the existing Virello
            student attendance records. You can adjust the
            numbers before saving them to this student's result.
        </p>

        <div class="vra-grid">
            <div class="vra-field">
                <label for="vraPresent">
                    Times Present
                </label>
                <input
                    id="vraPresent"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                >
            </div>

            <div class="vra-field">
                <label for="vraAbsent">
                    Times Absent
                </label>
                <input
                    id="vraAbsent"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                >
            </div>

            <div class="vra-field">
                <label for="vraLate">
                    Times Late
                </label>
                <input
                    id="vraLate"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                >
            </div>

            <div class="vra-field">
                <label for="vraTotal">
                    Total Recorded
                </label>
                <input
                    id="vraTotal"
                    type="number"
                    min="0"
                    step="1"
                    value="0"
                    readonly
                >
            </div>
        </div>

        <div
            id="vraCalculationMessage"
            class="vra-total"
        >
            Loading attendance...
        </div>

        <div class="vra-actions">
            <button
                id="vraSaveButton"
                class="vra-save"
                type="button"
            >
                Save Attendance to Result
            </button>

            <button
                id="vraRefreshButton"
                class="vra-refresh"
                type="button"
            >
                Recalculate
            </button>

            <span
                id="vraMessage"
                class="vra-message"
            ></span>
        </div>

        <div
            id="vraError"
            class="vra-error"
        ></div>
    `;

    bindAttendanceSectionEvents(
        studentDocumentId,
        year,
        term
    );

    await loadAttendanceCounts(
        studentDocumentId,
        year,
        term
    );
}


function bindAttendanceSectionEvents(
    studentDocumentId,
    year,
    term
) {
    const presentInput =
        document.getElementById(
            "vraPresent"
        );

    const absentInput =
        document.getElementById(
            "vraAbsent"
        );

    const lateInput =
        document.getElementById(
            "vraLate"
        );

    const totalInput =
        document.getElementById(
            "vraTotal"
        );

    const saveButton =
        document.getElementById(
            "vraSaveButton"
        );

    const refreshButton =
        document.getElementById(
            "vraRefreshButton"
        );

    const updateTotal = () => {
        const present =
            safeInteger(
                presentInput?.value
            );

        const absent =
            safeInteger(
                absentInput?.value
            );

        const late =
            safeInteger(
                lateInput?.value
            );

        const total =
            present +
            absent +
            late;

        if (totalInput) {
            totalInput.value =
                total;
        }
    };

    [
        presentInput,
        absentInput,
        lateInput
    ].forEach(input => {
        if (input) {
            input.addEventListener(
                "input",
                updateTotal
            );
        }
    });

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            () => {
                loadAttendanceCounts(
                    studentDocumentId,
                    year,
                    term
                );
            }
        );
    }

    if (saveButton) {
        saveButton.addEventListener(
            "click",
            () => {
                saveAttendanceSummary(
                    studentDocumentId,
                    year,
                    term
                );
            }
        );
    }
}


async function loadAttendanceCounts(
    studentDocumentId,
    year,
    term
) {
    const message =
        document.getElementById(
            "vraMessage"
        );

    const errorElement =
        document.getElementById(
            "vraError"
        );

    if (message) {
        message.textContent =
            "Calculating...";
    }

    if (errorElement) {
        errorElement.textContent =
            "";
    }

    try {
        const attendanceRef =
            collection(
                db,
                "attendance"
            );

        /*
           We query by organization only and filter the
           student in JavaScript. This avoids introducing
           a required composite Firestore index for the
           add-on.
        */
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

        let present = 0;
        let absent = 0;
        let late = 0;

        snapshot.forEach(
            attendanceDocument => {
                const record =
                    attendanceDocument.data();

                const recordStudentId =
                    String(
                        record.studentDocumentId ||
                        record.studentId ||
                        ""
                    ).trim();

                /*
                   studentDocumentId is the Firestore student
                   document ID in the existing attendance data.
                   studentId may be the human-facing Student ID,
                   so the document ID comparison is preferred.
                */
                if (
                    recordStudentId !==
                    studentDocumentId
                ) {
                    return;
                }

                const status =
                    normalizeStatus(
                        record.status
                    );

                if (status === "present") {
                    present++;
                }

                if (status === "absent") {
                    absent++;
                }

                if (status === "late") {
                    late++;
                }
            }
        );

        setAttendanceInputs(
            present,
            absent,
            late
        );

        const total =
            present +
            absent +
            late;

        if (message) {
            message.textContent =
                `Calculated from ${total} recorded attendance day${total === 1 ? "" : "s"} for this student. Academic year: ${year}. Term: ${term}.`;
        }
    } catch (error) {
        console.error(
            "Virello attendance count error:",
            error
        );

        if (errorElement) {
            errorElement.textContent =
                error.message ||
                "Unable to calculate attendance.";
        }

        if (message) {
            message.textContent =
                "";
        }
    }
}


function setAttendanceInputs(
    present,
    absent,
    late
) {
    const presentInput =
        document.getElementById(
            "vraPresent"
        );

    const absentInput =
        document.getElementById(
            "vraAbsent"
        );

    const lateInput =
        document.getElementById(
            "vraLate"
        );

    const totalInput =
        document.getElementById(
            "vraTotal"
        );

    if (presentInput) {
        presentInput.value =
            present;
    }

    if (absentInput) {
        absentInput.value =
            absent;
    }

    if (lateInput) {
        lateInput.value =
            late;
    }

    if (totalInput) {
        totalInput.value =
            present +
            absent +
            late;
    }
}


function safeInteger(value) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.max(
        0,
        Math.floor(number)
    );
}


async function saveAttendanceSummary(
    studentDocumentId,
    year,
    term
) {
    const saveButton =
        document.getElementById(
            "vraSaveButton"
        );

    const message =
        document.getElementById(
            "vraMessage"
        );

    const errorElement =
        document.getElementById(
            "vraError"
        );

    if (!currentOrganization) {
        return;
    }

    const present =
        safeInteger(
            document.getElementById(
                "vraPresent"
            )?.value
        );

    const absent =
        safeInteger(
            document.getElementById(
                "vraAbsent"
            )?.value
        );

    const late =
        safeInteger(
            document.getElementById(
                "vraLate"
            )?.value
        );

    const totalRecorded =
        present +
        absent +
        late;

    if (saveButton) {
        saveButton.disabled = true;
        saveButton.textContent =
            "Saving...";
    }

    if (message) {
        message.textContent =
            "";
    }

    if (errorElement) {
        errorElement.textContent =
            "";
    }

    try {
        const resultsRef =
            collection(
                db,
                "results"
            );

        /*
           Query by organization only, then locate the
           exact student/year/term result in JavaScript.
        */
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

        let matchingResult = null;

        snapshot.forEach(
            resultDocument => {
                if (matchingResult) {
                    return;
                }

                const result =
                    resultDocument.data();

                const resultStudentDocumentId =
                    String(
                        result.studentDocumentId ||
                        ""
                    ).trim();

                if (
                    resultStudentDocumentId ===
                        studentDocumentId &&
                    String(
                        result.academicYear ||
                        ""
                    ).trim() === year &&
                    String(
                        result.term ||
                        ""
                    ).trim() === term
                ) {
                    matchingResult = {
                        id:
                            resultDocument.id,
                        ...result
                    };
                }
            }
        );

        if (!matchingResult) {
            throw new Error(
                "Save the academic result first, then save the attendance summary to that result."
            );
        }

        await updateDoc(
            doc(
                db,
                "results",
                matchingResult.id
            ),
            {
                attendanceSummary: {
                    present,
                    absent,
                    late,
                    totalRecorded,
                    manuallyAdjusted: true,
                    academicYear: year,
                    term: term,
                    updatedAt:
                        serverTimestamp(),
                    updatedBy:
                        currentUser.uid
                }
            }
        );

        if (message) {
            message.textContent =
                "Attendance summary saved to the student result.";
        }

        /*
           Keep the original results page untouched while
           updating its in-memory result object when possible.
           The next normal save from results.js may replace
           the document with its existing resultData. If the
           administrator changes subjects/comments afterwards,
           save the attendance summary again after saving the
           result. This is explained in INSTALL.txt.
        */
    } catch (error) {
        console.error(
            "Virello attendance summary save error:",
            error
        );

        if (errorElement) {
            errorElement.textContent =
                error.message ||
                "Unable to save attendance summary.";
        }
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent =
                "Save Attendance to Result";
        }
    }
}


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
