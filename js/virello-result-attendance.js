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
    injectStyles();

    // Public parent result portal. No authentication is required.
    if (document.getElementById("resultDisplay")) {
        startPublicResultAttendance();
        return;
    }

    // Administrator results editor.
    if (
        document.getElementById("resultEditor") &&
        document.getElementById("studentSelect")
    ) {
        startAttendanceIntegration();
    }
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
            setupPublicationSnapshotHooks();
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

        .vra-term-box {
            margin-top: 14px;
            padding: 12px;
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            background: #ffffff;
        }

        .vra-date-field {
            max-width: 360px;
        }

        .vra-field small {
            display: block;
            margin-top: 7px;
            color: #64748b;
            font-size: 11px;
            line-height: 1.45;
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

        <div class="vra-term-box">
            <div class="vra-field vra-date-field">
                <label for="vraTermStartDate">
                    Attendance Term Start Date
                </label>
                <input
                    id="vraTermStartDate"
                    type="date"
                    title="The first date of this academic term"
                >
                <small>
                    Attendance from this date through the publication date will be frozen into the published result.
                </small>
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
                id="vraSnapshotButton"
                class="vra-refresh"
                type="button"
            >
                Create / Update Term Snapshot
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

    await loadExistingSnapshotState(
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

    const snapshotButton =
        document.getElementById("vraSnapshotButton");

    if (snapshotButton) {
        snapshotButton.addEventListener(
            "click",
            () => {
                createTermAttendanceSnapshot(
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

        const termStartDate =
            getTermStartInputValue();
        const today = getTodayISODate();

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

                const recordDate =
                    normalizeDateValue(record.date);

                if (
                    termStartDate &&
                    recordDate &&
                    (recordDate < termStartDate ||
                     recordDate > today)
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



/* =========================================================
   TERM ATTENDANCE SNAPSHOT
   ---------------------------------------------------------
   A published result receives a frozen attendanceSnapshot.
   This prevents future attendance records from appearing in
   an older published term result.
========================================================= */

function getTodayISODate() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function normalizeDateValue(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 10);
    if (typeof value?.toDate === "function") {
        const date = value.toDate();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    return "";
}

function getTermStartInputValue() {
    return String(
        document.getElementById("vraTermStartDate")?.value || ""
    ).trim();
}

async function createTermAttendanceSnapshot(
    studentDocumentId,
    year,
    term,
    options = {}
) {
    const message = document.getElementById("vraMessage");
    const errorElement = document.getElementById("vraError");
    const snapshotButton = document.getElementById("vraSnapshotButton");

    let termStartDate = getTermStartInputValue();

    if (!termStartDate) {
        try {
            const inferred = await inferEarliestAttendanceDate(studentDocumentId);
            if (inferred) {
                termStartDate = inferred;
                const input = document.getElementById("vraTermStartDate");
                if (input) input.value = inferred;
            }
        } catch (error) {
            console.warn("Unable to infer attendance term start date:", error);
        }
    }

    if (!termStartDate) {
        if (errorElement) {
            errorElement.textContent =
                "Enter the Attendance Term Start Date before creating the term snapshot.";
        }
        return false;
    }

    const snapshotEndDate = getTodayISODate();

    if (termStartDate > snapshotEndDate) {
        if (errorElement) {
            errorElement.textContent =
                "The term start date cannot be after today.";
        }
        return false;
    }

    if (snapshotButton) {
        snapshotButton.disabled = true;
        snapshotButton.textContent = "Creating Snapshot...";
    }
    if (message) message.textContent = "Freezing term attendance...";
    if (errorElement) errorElement.textContent = "";

    try {
        const resultsSnapshot = await getDocs(
            query(
                collection(db, "results"),
                where("organizationId", "==", currentOrganization.id)
            )
        );

        let matchingResult = null;
        resultsSnapshot.forEach(resultDocument => {
            if (matchingResult) return;
            const result = resultDocument.data();
            if (
                String(result.studentDocumentId || "").trim() === String(studentDocumentId).trim() &&
                String(result.academicYear || "").trim() === year &&
                String(result.term || "").trim() === term
            ) {
                matchingResult = { id: resultDocument.id, ...result };
            }
        });

        if (!matchingResult) {
            throw new Error(
                "Save the academic result first, then create its attendance snapshot."
            );
        }

        const attendanceSnapshot = await buildAttendanceSnapshot(
            studentDocumentId,
            year,
            term,
            termStartDate,
            snapshotEndDate
        );

        await updateDoc(
            doc(db, "results", matchingResult.id),
            {
                attendanceSnapshot: {
                    ...attendanceSnapshot,
                    capturedAt: serverTimestamp(),
                    capturedBy: currentUser?.uid || null
                },
                // Keep the simple summary in sync with the frozen snapshot.
                attendanceSummary: {
                    present: attendanceSnapshot.present,
                    absent: attendanceSnapshot.absent,
                    late: attendanceSnapshot.late,
                    totalRecorded: attendanceSnapshot.totalRecorded,
                    manuallyAdjusted: false,
                    academicYear: year,
                    term: term,
                    termStartDate,
                    snapshotEndDate,
                    updatedAt: serverTimestamp(),
                    updatedBy: currentUser?.uid || null
                },
                updatedAt: serverTimestamp()
            }
        );

        if (message) {
            message.textContent =
                `Term snapshot saved: ${attendanceSnapshot.totalRecorded} attendance record${attendanceSnapshot.totalRecorded === 1 ? "" : "s"} from ${termStartDate} to ${snapshotEndDate}.`;
        }
        return true;
    } catch (error) {
        console.error("Virello term attendance snapshot error:", error);
        if (errorElement) {
            errorElement.textContent = error.message || "Unable to create attendance snapshot.";
        }
        if (message) message.textContent = "";
        return false;
    } finally {
        if (snapshotButton) {
            snapshotButton.disabled = false;
            snapshotButton.textContent = "Create / Update Term Snapshot";
        }
    }
}

async function inferEarliestAttendanceDate(studentDocumentId) {
    if (!currentOrganization) return "";

    const snapshot = await getDocs(
        query(
            collection(db, "attendance"),
            where("organizationId", "==", currentOrganization.id)
        )
    );

    const dates = [];
    snapshot.forEach(attendanceDocument => {
        const record = attendanceDocument.data();
        const recordStudent = String(
            record.studentDocumentId || record.studentId || ""
        ).trim();
        if (recordStudent !== String(studentDocumentId).trim()) return;
        const date = normalizeDateValue(record.date);
        if (date) dates.push(date);
    });

    dates.sort();
    return dates[0] || "";
}

async function buildAttendanceSnapshot(
    studentDocumentId,
    year,
    term,
    startDate,
    endDate
) {
    const snapshot = await getDocs(
        query(
            collection(db, "attendance"),
            where("organizationId", "==", currentOrganization.id)
        )
    );

    const records = [];
    let present = 0;
    let absent = 0;
    let late = 0;

    snapshot.forEach(attendanceDocument => {
        const record = attendanceDocument.data();
        const recordStudent = String(
            record.studentDocumentId || record.studentId || ""
        ).trim();
        if (recordStudent !== String(studentDocumentId).trim()) return;

        const date = normalizeDateValue(record.date);
        if (!date || date < startDate || date > endDate) return;

        const status = normalizeStatus(record.status);
        if (status === "present") present++;
        if (status === "absent") absent++;
        if (status === "late") late++;
        if (status === "not_recorded") return;

        records.push({
            date,
            className: String(record.className || "").trim(),
            classId: String(record.classId || "").trim(),
            formMasterName: String(
                record.formMasterName || record.staffName || ""
            ).trim(),
            formMasterId: String(
                record.formMasterId || record.staffId || ""
            ).trim(),
            status
        });
    });

    records.sort((a, b) => b.date.localeCompare(a.date));

    return {
        version: 1,
        academicYear: year,
        term,
        startDate,
        endDate,
        present,
        absent,
        late,
        totalRecorded: present + absent + late,
        records
    };
}

/* Populate the term start date and indicate whether a frozen snapshot exists. */
async function loadExistingSnapshotState(studentDocumentId, year, term) {
    const input = document.getElementById("vraTermStartDate");
    const message = document.getElementById("vraCalculationMessage");
    if (!input || !currentOrganization) return;

    try {
        const snapshot = await getDocs(
            query(
                collection(db, "results"),
                where("organizationId", "==", currentOrganization.id)
            )
        );

        let matchingResult = null;
        snapshot.forEach(resultDocument => {
            if (matchingResult) return;
            const result = resultDocument.data();
            if (
                String(result.studentDocumentId || "").trim() === String(studentDocumentId).trim() &&
                String(result.academicYear || "").trim() === year &&
                String(result.term || "").trim() === term
            ) {
                matchingResult = result;
            }
        });

        const frozen = matchingResult?.attendanceSnapshot;
        if (frozen?.startDate) input.value = frozen.startDate;
        else if (matchingResult?.attendanceSummary?.termStartDate) {
            input.value = matchingResult.attendanceSummary.termStartDate;
        } else if (!input.value) {
            const inferred = await inferEarliestAttendanceDate(studentDocumentId);
            if (inferred) input.value = inferred;
        }

        if (message && frozen) {
            message.textContent =
                `Frozen term snapshot: ${frozen.totalRecorded || 0} records from ${frozen.startDate || "-"} to ${frozen.endDate || "-"}.`;
        }
    } catch (error) {
        console.warn("Unable to load attendance snapshot state:", error);
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




/* =========================================================
   AUTOMATIC SNAPSHOT AFTER PUBLISH
   ---------------------------------------------------------
   This is additive: the original results.js remains intact.
   We watch the existing Save/Publish controls and, after the
   original save/publish operation finishes, freeze attendance
   into the published result if no snapshot exists yet.
========================================================= */

let __virelloPublicationHooksInstalled = false;

function setupPublicationSnapshotHooks() {
    if (__virelloPublicationHooksInstalled) return;
    __virelloPublicationHooksInstalled = true;

    const saveButton = document.getElementById("saveResultButton");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            // results.js performs its async Firestore save first.
            setTimeout(() => {
                snapshotPublishedEditorResult();
            }, 1800);
        }, true);
    }

    // Existing-result Publish buttons are generated dynamically.
    document.addEventListener("click", event => {
        const button = event.target.closest?.(".publish-existing-button");
        if (!button) return;

        const row = button.closest("tr");
        const cells = row?.querySelectorAll("td") || [];
        const studentId = String(cells[1]?.textContent || "").trim();
        const year = String(cells[3]?.textContent || "").trim();
        const term = String(cells[4]?.textContent || "").trim();

        setTimeout(() => {
            snapshotPublishedResultByPublicFields(studentId, year, term);
        }, 1800);
    }, true);
}

async function snapshotPublishedEditorResult() {
    if (!currentOrganization) return;

    const checkbox = document.getElementById("publishResult");
    if (!checkbox?.checked) return;

    const studentDocumentId = getSelectedStudentDocumentId();
    const year = getAcademicYear();
    const term = getTerm();
    if (!studentDocumentId || !year || !term) return;

    await snapshotPublishedResultByStudentDocumentId(
        studentDocumentId,
        year,
        term
    );
}

async function snapshotPublishedResultByPublicFields(studentId, year, term) {
    if (!currentOrganization || !studentId || !year || !term) return;

    try {
        const snapshot = await getDocs(
            query(
                collection(db, "results"),
                where("organizationId", "==", currentOrganization.id)
            )
        );

        for (const resultDocument of snapshot.docs) {
            const result = resultDocument.data();
            if (
                String(result.studentId || "").trim() === studentId &&
                String(result.academicYear || "").trim() === year &&
                String(result.term || "").trim() === term &&
                result.status === "published"
            ) {
                await snapshotPublishedResultDocument(
                    { id: resultDocument.id, ...result }
                );
                return;
            }
        }
    } catch (error) {
        console.error("Automatic published attendance snapshot error:", error);
    }
}

async function snapshotPublishedResultByStudentDocumentId(
    studentDocumentId,
    year,
    term
) {
    try {
        const snapshot = await getDocs(
            query(
                collection(db, "results"),
                where("organizationId", "==", currentOrganization.id)
            )
        );

        for (const resultDocument of snapshot.docs) {
            const result = resultDocument.data();
            if (
                String(result.studentDocumentId || "").trim() === String(studentDocumentId).trim() &&
                String(result.academicYear || "").trim() === year &&
                String(result.term || "").trim() === term &&
                result.status === "published"
            ) {
                await snapshotPublishedResultDocument(
                    { id: resultDocument.id, ...result }
                );
                return;
            }
        }
    } catch (error) {
        console.error("Automatic editor attendance snapshot error:", error);
    }
}

async function snapshotPublishedResultDocument(result) {
    if (!result || result.attendanceSnapshot?.records) {
        return;
    }

    const studentDocumentId = String(result.studentDocumentId || "").trim();
    if (!studentDocumentId) return;

    let startDate = String(
        result.attendanceSummary?.termStartDate || ""
    ).trim();

    if (!startDate) {
        startDate = await inferEarliestAttendanceDate(studentDocumentId);
    }

    if (!startDate) {
        console.warn(
            "No attendance date found; published result was not snapshotted:",
            result.id
        );
        return;
    }

    const endDate = getTodayISODate();
    const attendanceSnapshot = await buildAttendanceSnapshot(
        studentDocumentId,
        result.academicYear || "",
        result.term || "",
        startDate,
        endDate
    );

    await updateDoc(
        doc(db, "results", result.id),
        {
            attendanceSnapshot: {
                ...attendanceSnapshot,
                capturedAt: serverTimestamp(),
                capturedBy: currentUser?.uid || null
            },
            attendanceSummary: {
                present: attendanceSnapshot.present,
                absent: attendanceSnapshot.absent,
                late: attendanceSnapshot.late,
                totalRecorded: attendanceSnapshot.totalRecorded,
                manuallyAdjusted: false,
                academicYear: result.academicYear || "",
                term: result.term || "",
                termStartDate: startDate,
                snapshotEndDate: endDate,
                updatedAt: serverTimestamp(),
                updatedBy: currentUser?.uid || null
            }
        }
    );

    console.log(
        `Virello: frozen attendance snapshot created for ${result.studentName || result.studentId || "student"} — ${result.term || "term"}.`
    );
}

/* =========================================================
   PUBLIC PARENT RESULT PORTAL
   ---------------------------------------------------------
   The portal prefers the frozen attendanceSnapshot stored
   inside the published result. Legacy results without a
   snapshot fall back to live attendance for compatibility.
========================================================= */

let __virelloPublicAttendanceTimer = null;
let __virelloPublicAttendanceObserver = null;
let __virelloPublicAttendancePendingResult = null;
let __virelloPublicAttendanceRequestId = 0;

function startPublicResultAttendance() {
    const resultDisplay = document.getElementById("resultDisplay");
    if (!resultDisplay) return;

    window.virelloLoadResultAttendance = loadPublicAttendanceForResult;

    __virelloPublicAttendanceObserver = new MutationObserver(() => {
        schedulePublicAttendanceLoad();
    });

    __virelloPublicAttendanceObserver.observe(resultDisplay, {
        childList: true,
        subtree: true
    });

    schedulePublicAttendanceLoad();
    console.log("Virello public term attendance module loaded successfully.");
}

function loadPublicAttendanceForResult(result) {
    __virelloPublicAttendancePendingResult = result || null;
    schedulePublicAttendanceLoad();
}

function schedulePublicAttendanceLoad() {
    if (__virelloPublicAttendanceTimer) {
        clearTimeout(__virelloPublicAttendanceTimer);
    }

    __virelloPublicAttendanceTimer = setTimeout(() => {
        __virelloPublicAttendanceTimer = null;
        renderPublicAttendanceForCurrentResult();
    }, 0);
}

async function renderPublicAttendanceForCurrentResult() {
    const result = __virelloPublicAttendancePendingResult;
    const resultDisplay = document.getElementById("resultDisplay");
    if (!result || !resultDisplay) return;

    const requestId = ++__virelloPublicAttendanceRequestId;
    const existing = document.getElementById("virelloPublicAttendanceHistory");
    if (existing) existing.remove();

    const section = document.createElement("section");
    section.id = "virelloPublicAttendanceHistory";
    section.className = "vpa-section";
    section.innerHTML = `
        <div class="vpa-header">
            <div>
                <h3 class="vpa-title">Student Attendance History</h3>
                <p class="vpa-description">Attendance recorded for this published academic result.</p>
            </div>
            <span class="vpa-term-badge">${escapeVPA(result.term || "Term")}</span>
        </div>
        <div class="vpa-loading">Loading attendance...</div>
    `;
    resultDisplay.appendChild(section);

    try {
        let snapshot = result.attendanceSnapshot;

        // Preferred: frozen data captured when the result was published.
        if (
            snapshot &&
            Array.isArray(snapshot.records)
        ) {
            renderPublicAttendanceSnapshot(section, snapshot);
            return;
        }

        // Security-first behavior: public parents should not read the
        // entire attendance collection. Older published results must be
        // snapshotted by an administrator before attendance is shown.
        if (requestId !== __virelloPublicAttendanceRequestId) return;
        renderPublicAttendanceSnapshotUnavailable(section, result);
    } catch (error) {
        console.error("Virello public attendance error:", error);
        const loading = section.querySelector(".vpa-loading");
        if (loading) {
            loading.textContent =
                "Attendance history could not be loaded at this time.";
        }
    }
}

function renderPublicAttendanceSnapshotUnavailable(section, result) {
    section.innerHTML = `
        <div class="vpa-header">
            <div>
                <h3 class="vpa-title">Student Attendance History</h3>
                <p class="vpa-description">Attendance for this published result has not been frozen yet.</p>
            </div>
            <span class="vpa-term-badge">${escapeVPA(result.term || "Term")}</span>
        </div>
        <div class="vpa-unavailable">
            The school has not yet attached the term attendance snapshot to this published result.
        </div>
    `;
}

function renderPublicAttendanceSnapshot(section, snapshot, legacy = false) {
    const records = Array.isArray(snapshot.records) ? snapshot.records : [];
    const present = Number(snapshot.present || 0);
    const absent = Number(snapshot.absent || 0);
    const late = Number(snapshot.late || 0);
    const total = Number(snapshot.totalRecorded ?? present + absent + late);

    const range = snapshot.startDate && snapshot.endDate
        ? `<div class="vpa-range">Term attendance period: <strong>${escapeVPA(snapshot.startDate)}</strong> to <strong>${escapeVPA(snapshot.endDate)}</strong>${legacy ? "" : " · frozen at publication"}</div>`
        : `<div class="vpa-range">Frozen at publication.</div>`;

    const rows = records.length
        ? records.map(record => `
            <tr>
                <td>${escapeVPA(record.date || "-")}</td>
                <td>${escapeVPA(record.className || "-")}</td>
                <td>${escapeVPA(record.formMasterName || "-")}</td>
                <td><span class="vpa-status ${escapeVPA(record.status || "")}">${escapeVPA(capitalizeVPA(record.status || "Not recorded"))}</span></td>
            </tr>
        `).join("")
        : `<tr><td colspan="4" class="vpa-empty">No attendance records were recorded for this period.</td></tr>`;

    section.innerHTML = `
        <div class="vpa-header">
            <div>
                <h3 class="vpa-title">Student Attendance History</h3>
                <p class="vpa-description">Attendance recorded by the school for this student.</p>
            </div>
            <span class="vpa-term-badge">${escapeVPA(snapshot.term || "Term")}</span>
        </div>

        ${range}

        <div class="vpa-stats">
            <div class="vpa-stat"><span>Present</span><strong>${present}</strong></div>
            <div class="vpa-stat"><span>Absent</span><strong>${absent}</strong></div>
            <div class="vpa-stat"><span>Late</span><strong>${late}</strong></div>
            <div class="vpa-stat"><span>Total Records</span><strong>${total}</strong></div>
        </div>

        <p class="vpa-count">${total} attendance record${total === 1 ? "" : "s"} found.</p>

        <div class="vpa-table-wrap">
            <table class="vpa-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Class</th>
                        <th>Form Master</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function escapeVPA(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function capitalizeVPA(value) {
    const text = String(value || "");
    return text.charAt(0).toUpperCase() + text.slice(1);
}

(function injectPublicAttendanceStyles() {
    if (document.getElementById("virello-public-attendance-styles")) return;
    const style = document.createElement("style");
    style.id = "virello-public-attendance-styles";
    style.textContent = `
        .vpa-section{margin-top:24px;margin-bottom:24px;padding:20px;border:1px solid #dbe4f0;border-radius:14px;background:#f8fafc;font-family:inherit}
        .vpa-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
        .vpa-title{margin:0 0 5px;font-size:19px;color:#172033}
        .vpa-description{margin:0;color:#64748b;font-size:12px;line-height:1.5}
        .vpa-term-badge{padding:7px 10px;border-radius:999px;background:#e2e8f0;color:#334155;font-size:11px;font-weight:800}
        .vpa-range{margin-top:14px;color:#64748b;font-size:11px;line-height:1.5}
        .vpa-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:15px}
        .vpa-stat{padding:13px;border:1px solid #e2e8f0;border-radius:10px;background:#fff}
        .vpa-stat span{display:block;color:#64748b;font-size:10px;font-weight:800;text-transform:uppercase}
        .vpa-stat strong{display:block;margin-top:5px;color:#172033;font-size:21px}
        .vpa-count{margin:14px 0 10px;color:#475569;font-size:12px}
        .vpa-table-wrap{overflow-x:auto}
        .vpa-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0}
        .vpa-table th,.vpa-table td{padding:10px 11px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:11px;white-space:nowrap}
        .vpa-table th{background:#f1f5f9;color:#475569;font-weight:800}
        .vpa-status{display:inline-block;padding:4px 8px;border-radius:999px;font-weight:800}
        .vpa-status.present{background:#dcfce7;color:#166534}
        .vpa-status.absent{background:#fee2e2;color:#991b1b}
        .vpa-status.late{background:#fef3c7;color:#92400e}
        .vpa-empty{text-align:center;color:#64748b;padding:20px!important}
        .vpa-loading{margin-top:14px;color:#64748b;font-size:12px}
        .vpa-unavailable{margin-top:14px;padding:14px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;font-size:12px;line-height:1.5}
        @media(max-width:700px){.vpa-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.vpa-section{padding:15px}}
    `;
    document.head.appendChild(style);
})();
