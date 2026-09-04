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



/* =========================================================
   VIRELLO TERM-SPECIFIC PUBLISHED ATTENDANCE SNAPSHOT

   This additive module creates a frozen attendanceSnapshot on a
   published result. It does not require changes to results.js.

   How it works:
   - On results.html it adds a term start-date field.
   - When the normal Save Result button is used with Publish checked,
     it waits for results.js to finish and then snapshots attendance.
   - When an existing Draft's Publish button is used, it detects the
     row and snapshots the newly published result.
   - The public portal prefers attendanceSnapshot.records.
   - If a result has no snapshot yet, the public portal falls back to
     the existing live attendance behavior so older results keep working.
========================================================= */

let __virelloSnapshotAuthUser = null;
let __virelloSnapshotOrganization = null;
let __virelloSnapshotPollTimers = new Set();

(function initTermSnapshotModule() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupTermSnapshotModule, { once: true });
    } else {
        setupTermSnapshotModule();
    }
})();

function setupTermSnapshotModule() {
    // Only activate on the administrator results page.
    if (!document.getElementById("resultEditor") || !document.getElementById("studentSelect")) {
        return;
    }

    onAuthStateChanged(auth, async user => {
        if (!user) return;
        __virelloSnapshotAuthUser = user;
        try {
            await loadSnapshotOrganization();
            if (!__virelloSnapshotOrganization) return;
            injectSnapshotStyles();
            injectSnapshotPanel();
            bindSnapshotControls();
            observeSnapshotResultEditor();
            bindSnapshotPublishHooks();
            updateSnapshotDateDefaults();
        } catch (error) {
            console.error("Virello term attendance snapshot startup error:", error);
        }
    });
}

async function loadSnapshotOrganization() {
    const q = query(
        collection(db, "organizations"),
        where("ownerUid", "==", __virelloSnapshotAuthUser.uid)
    );
    const snap = await getDocs(q);
    if (snap.empty) return;
    const d = snap.docs[0];
    __virelloSnapshotOrganization = { id: d.id, ...d.data() };
}

function injectSnapshotStyles() {
    if (document.getElementById("virello-term-snapshot-styles")) return;
    const style = document.createElement("style");
    style.id = "virello-term-snapshot-styles";
    style.textContent = `
      .vts-panel{margin:16px 0;padding:16px;border:1px solid #dbe4f0;border-radius:12px;background:#f8fafc}
      .vts-title{margin:0 0 5px;font-size:16px;color:#172033}
      .vts-help{margin:0 0 12px;color:#64748b;font-size:12px;line-height:1.5}
      .vts-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .vts-field label{display:block;margin-bottom:6px;font-size:11px;font-weight:800;color:#475569}
      .vts-field input{width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;background:#fff}
      .vts-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
      .vts-button{border:0;border-radius:8px;padding:9px 13px;font-weight:800;cursor:pointer;background:#172554;color:#fff}
      .vts-button.secondary{background:#fff;color:#172033;border:1px solid #cbd5e1}
      .vts-status{margin-top:10px;font-size:12px;color:#475569}
      .vts-status.ok{color:#166534}.vts-status.error{color:#991b1b}
      @media(max-width:600px){.vts-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
}

function injectSnapshotPanel() {
    const editor = document.getElementById("resultEditor");
    if (!editor || document.getElementById("virelloTermSnapshotPanel")) return;
    const panel = document.createElement("section");
    panel.id = "virelloTermSnapshotPanel";
    panel.className = "vts-panel";
    panel.innerHTML = `
      <h3 class="vts-title">Term Attendance Snapshot</h3>
      <p class="vts-help">
        Set the actual start date of this term. When the result is published,
        Virello saves a frozen attendance history for this result. The end date
        is automatically the publication date.
      </p>
      <div class="vts-grid">
        <div class="vts-field">
          <label for="vtsTermStart">Term Start Date</label>
          <input id="vtsTermStart" type="date">
        </div>
        <div class="vts-field">
          <label for="vtsTermEnd">Snapshot End Date</label>
          <input id="vtsTermEnd" type="date" readonly>
        </div>
      </div>
      <div class="vts-actions">
        <button type="button" class="vts-button" id="vtsCreateButton">Create / Update Snapshot Now</button>
        <button type="button" class="vts-button secondary" id="vtsDefaultButton">Use Term Default</button>
      </div>
      <div id="vtsStatus" class="vts-status"></div>
    `;
    const commentsGrid = editor.querySelector(".comments-grid");
    if (commentsGrid?.parentNode) commentsGrid.parentNode.insertBefore(panel, commentsGrid);
    else editor.appendChild(panel);
}

function bindSnapshotControls() {
    const start = document.getElementById("vtsTermStart");
    const end = document.getElementById("vtsTermEnd");
    const create = document.getElementById("vtsCreateButton");
    const def = document.getElementById("vtsDefaultButton");
    if (!start || !end || !create || !def) return;
    const refresh = () => updateSnapshotDateDefaults(false);
    ["change"].forEach(evt => start.addEventListener(evt, refresh));
    create.addEventListener("click", async () => {
        const target = getCurrentEditorIdentity();
        if (!target) return setSnapshotStatus("Select a student, academic year and term first.", true);
        const result = await findResultForIdentity(target, true);
        if (!result) return setSnapshotStatus("Save the academic result first, then create the attendance snapshot.", true);
        try {
            const snap = await buildAttendanceSnapshot(result, start.value, todayISO());
            await updateDoc(doc(db, "results", result.id), { attendanceSnapshot: snap, updatedAt: serverTimestamp(), updatedBy: __virelloSnapshotAuthUser.uid });
            setSnapshotStatus(`Snapshot saved: ${snap.summary.totalRecorded} attendance record${snap.summary.totalRecorded === 1 ? "" : "s"}.`, false);
        } catch (e) {
            console.error("Manual attendance snapshot error:", e);
            setSnapshotStatus(e.message || "Unable to create attendance snapshot.", true);
        }
    });
    def.addEventListener("click", () => updateSnapshotDateDefaults(true));
}

function observeSnapshotResultEditor() {
    const editor = document.getElementById("resultEditor");
    if (!editor || editor.dataset.virelloSnapshotObserver === "true") return;
    editor.dataset.virelloSnapshotObserver = "true";
    const refresh = () => {
        if (!document.getElementById("virelloTermSnapshotPanel")) injectSnapshotPanel();
        updateSnapshotDateDefaults(false);
    };
    const observer = new MutationObserver(refresh);
    observer.observe(editor, { attributes:true, attributeFilter:["class"] });
    ["studentSelect","academicYear","termSelect"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", () => updateSnapshotDateDefaults(true));
    });
}

function bindSnapshotPublishHooks() {
    if (document.documentElement.dataset.virelloSnapshotPublishHooks === "true") return;
    document.documentElement.dataset.virelloSnapshotPublishHooks = "true";

    const saveButton = document.getElementById("saveResultButton");
    if (saveButton) {
        saveButton.addEventListener("click", () => {
            const publish = document.getElementById("publishResult")?.checked;
            if (!publish) return;
            const identity = getCurrentEditorIdentity();
            if (identity) queueSnapshotAfterPublish(identity);
        }, true);
    }

    document.addEventListener("click", event => {
        const button = event.target?.closest?.(".publish-existing-button");
        if (!button) return;
        const row = button.closest("tr");
        if (!row) return;
        const cells = row.querySelectorAll("td");
        const identity = {
            studentName: String(cells[0]?.textContent || "").trim(),
            studentId: String(cells[1]?.textContent || "").trim(),
            academicYear: String(cells[3]?.textContent || "").trim(),
            term: String(cells[4]?.textContent || "").trim()
        };
        if (identity.studentId && identity.academicYear && identity.term) {
            queueSnapshotAfterPublish(identity);
        }
    }, true);
}

function getCurrentEditorIdentity() {
    const studentSelect = document.getElementById("studentSelect");
    const studentId = String(studentSelect?.value || "").trim();
    const academicYear = String(document.getElementById("academicYear")?.value || "").trim();
    const term = String(document.getElementById("termSelect")?.value || "").trim();
    if (!studentId || !academicYear || !term) return null;
    return { studentDocumentId: studentId, academicYear, term };
}

function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
}

function academicStartYear(year) {
    const m = String(year || "").match(/(20\d{2})/);
    return m ? Number(m[1]) : new Date().getFullYear();
}

function defaultTermStart(year, term) {
    const y = academicStartYear(year);
    const t = String(term || "").toLowerCase();
    if (t.includes("term 2") || t === "2") return `${y+1}-01-01`;
    if (t.includes("term 3") || t === "3") return `${y+1}-04-01`;
    return `${y}-08-01`;
}

function updateSnapshotDateDefaults(force=false) {
    const start = document.getElementById("vtsTermStart");
    const end = document.getElementById("vtsTermEnd");
    if (!start || !end) return;
    const year = String(document.getElementById("academicYear")?.value || "").trim();
    const term = String(document.getElementById("termSelect")?.value || "").trim();
    if (!year || !term) return;
    const desired = defaultTermStart(year, term);
    if (force || !start.value || start.dataset.forYear !== year || start.dataset.forTerm !== term) start.value = desired;
    start.dataset.forYear = year; start.dataset.forTerm = term;
    end.value = todayISO();
}

function setSnapshotStatus(text, error=false) {
    const el = document.getElementById("vtsStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `vts-status ${error ? "error" : "ok"}`;
}

async function findResultForIdentity(identity, requirePublished=false) {
    const q = query(collection(db,"results"), where("organizationId","==",__virelloSnapshotOrganization.id));
    const snap = await getDocs(q);
    const matches = [];
    snap.forEach(d => {
        const r=d.data()||{};
        const sameStudent = String(r.studentDocumentId||"").trim() === String(identity.studentDocumentId||"").trim() || String(r.studentId||"").trim() === String(identity.studentId||"").trim();
        const sameYear = String(r.academicYear||"").trim() === String(identity.academicYear||"").trim();
        const sameTerm = String(r.term||"").trim() === String(identity.term||"").trim();
        if (sameStudent && sameYear && sameTerm && (!requirePublished || r.status === "published")) matches.push({id:d.id,...r});
    });
    return matches[0] || null;
}

async function queueSnapshotAfterPublish(identity) {
    // Give results.js time to finish its Firestore write.
    let attempts = 0;
    const timer = setInterval(async () => {
        attempts++;
        try {
            const result = await findResultForIdentity(identity, true);
            if (result) {
                clearInterval(timer); __virelloSnapshotPollTimers.delete(timer);
                await createSnapshotForPublishedResult(result, identity);
                return;
            }
        } catch (e) {
            console.error("Virello snapshot publish watcher error:", e);
        }
        if (attempts >= 15) {
            clearInterval(timer); __virelloSnapshotPollTimers.delete(timer);
            console.warn("Virello could not find the newly published result to create its attendance snapshot.");
        }
    }, 1000);
    __virelloSnapshotPollTimers.add(timer);
}

async function createSnapshotForPublishedResult(result, identity) {
    const startInput = document.getElementById("vtsTermStart");
    const configuredStart = startInput?.value || defaultTermStart(result.academicYear, result.term);
    const end = todayISO();
    try {
        const snap = await buildAttendanceSnapshot(result, configuredStart, end);
        await updateDoc(doc(db,"results",result.id), {
            attendanceSnapshot: snap,
            updatedAt: serverTimestamp(),
            updatedBy: __virelloSnapshotAuthUser.uid
        });
        setSnapshotStatus(`Published attendance snapshot created: ${snap.summary.totalRecorded} record${snap.summary.totalRecorded===1?"":"s"}.`, false);
        console.log("Virello term attendance snapshot created", {resultId:result.id, term:result.term, summary:snap.summary});
    } catch (e) {
        console.error("Virello published attendance snapshot error:", e);
        setSnapshotStatus(e.message || "Published result saved, but attendance snapshot could not be created.", true);
    }
}

async function buildAttendanceSnapshot(result, startDate, endDate) {
    const studentDocumentId = String(result.studentDocumentId || "").trim();
    if (!studentDocumentId) throw new Error("This result has no student document ID, so attendance cannot be linked.");
    const organizationId = String(result.organizationId || __virelloSnapshotOrganization?.id || "").trim();
    const q = query(collection(db,"attendance"), where("organizationId","==",organizationId));
    const snap = await getDocs(q);
    const records=[];
    snap.forEach(d=>{
        const r=d.data()||{};
        const recordStudent=String(r.studentDocumentId||r.studentId||"").trim();
        if (recordStudent !== studentDocumentId) return;
        const date=String(r.date||"").trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
        if (date < startDate || date > endDate) return;
        const status=normalizeAttendanceStatus(r.status);
        if (!["present","absent","late"].includes(status)) return;
        records.push({
            id:d.id,date,classId:r.classId||"",className:r.className||"",studentId:r.studentId||"",studentDocumentId:r.studentDocumentId||studentDocumentId,
            studentName:r.studentName||result.studentName||"",formMasterId:r.formMasterId||r.staffId||"",formMasterName:r.formMasterName||"",status,
            checkIn:r.checkIn||null,checkOut:r.checkOut||null
        });
    });
    records.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const summary={present:records.filter(r=>r.status==="present").length,absent:records.filter(r=>r.status==="absent").length,late:records.filter(r=>r.status==="late").length,totalRecorded:records.length};
    return {
        version:1, academicYear:String(result.academicYear||""), term:String(result.term||""),
        periodStartDate:startDate, periodEndDate:endDate, publishedAt:serverTimestamp(),
        summary, records
    };
}

/* =========================================================
   VIRELLO PUBLIC RESULT PORTAL ATTENDANCE HISTORY
   ADDITIVE MODULE

   IMPORTANT:
   The same file is also used by results.html for the admin
   attendance summary. The admin code above is intentionally
   preserved. This section activates only on result-portal.html.

   It does NOT depend on result-portal.js calling a global
   attendance function. Instead it watches resultDisplay after
   the portal renders a result, finds the displayed Student ID,
   retrieves the published result document, obtains the student's
   Firestore document ID, and then reads attendance records.
========================================================= */

let __virelloAttendanceTimer = null;
let __virelloAttendanceRequestKey = "";

(function initPublicResultAttendance() {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupPublicResultAttendance, { once: true });
    } else {
        setupPublicResultAttendance();
    }
})();

function setupPublicResultAttendance() {
    const resultDisplay = document.getElementById("resultDisplay");

    // This file is shared with results.html. Do nothing there.
    if (!resultDisplay || !document.getElementById("resultSearchForm")) {
        return;
    }

    injectPublicAttendanceStyles();

    // Keep compatibility with result-portal.js if it calls this hook.
    window.virelloLoadResultAttendance = function(result) {
        window.__virelloPendingPortalResult = result || null;
        schedulePublicAttendanceLoad(result || null);
    };

    const observer = new MutationObserver(() => {
        schedulePublicAttendanceLoad(null);
    });

    observer.observe(resultDisplay, {
        childList: true,
        subtree: true
    });

    // If a result is already rendered before this script finishes.
    schedulePublicAttendanceLoad(null);

    console.log("Virello public result portal attendance integration ready.");
}

function schedulePublicAttendanceLoad(result) {
    clearTimeout(__virelloAttendanceTimer);

    __virelloAttendanceTimer = setTimeout(() => {
        loadPublicAttendanceHistory(result);
    }, 80);
}

async function loadPublicAttendanceHistory(resultFromPortal) {
    const resultDisplay = document.getElementById("resultDisplay");
    if (!resultDisplay) return;

    // Don't inject while the portal is empty.
    const studentIdElement = document.getElementById("studentId");
    const visibleStudentId = String(studentIdElement?.textContent || "").trim();

    if (!visibleStudentId || visibleStudentId === "-") {
        removePublicAttendanceSection();
        return;
    }

    const termText = getVisiblePortalTerm();
    const yearText = getVisiblePortalAcademicYear();
    const requestKey = [visibleStudentId, termText, yearText].join("|");

    if (
        requestKey === __virelloAttendanceRequestKey &&
        document.getElementById("virelloPublicAttendanceSection")
    ) {
        return;
    }

    __virelloAttendanceRequestKey = requestKey;

    // Avoid querying while resultDisplay is still being rebuilt.
    await new Promise(resolve => requestAnimationFrame(resolve));

    const studentIdNow = String(
        document.getElementById("studentId")?.textContent || ""
    ).trim();

    if (!studentIdNow || studentIdNow === "-") return;

    const section = ensurePublicAttendanceSection();
    if (!section) return;

    const message = document.getElementById("vpaMessage");
    if (message) message.textContent = "Loading attendance history...";

    try {
        const publishedResult = await findPublishedResultForPortal(
            resultFromPortal,
            studentIdNow,
            termText,
            yearText
        );

        if (!publishedResult) {
            renderPublicAttendanceError(
                "Attendance history could not be matched to this published result."
            );
            return;
        }

        const studentDocumentId = String(
            publishedResult.studentDocumentId || ""
        ).trim();

        if (!studentDocumentId) {
            renderPublicAttendanceError(
                "This result does not contain the student's attendance link yet."
            );
            return;
        }

        const records = await getPublicStudentAttendance(
            publishedResult.organizationId || "",
            studentDocumentId,
            publishedResult.studentId || studentIdNow,
            publishedResult
        );

        renderPublicAttendance(records, publishedResult);

    } catch (error) {
        console.error("Virello public attendance error:", error);

        const message = String(error?.message || error || "");

        if (
            message.toLowerCase().includes("permission") ||
            message.toLowerCase().includes("missing or insufficient")
        ) {
            renderPublicAttendanceError(
                "Attendance history is available, but Firebase permissions are blocking the public portal from reading it."
            );
        } else {
            renderPublicAttendanceError(
                "Attendance history could not be loaded at this time."
            );
        }
    }
}

async function findPublishedResultForPortal(
    resultFromPortal,
    studentId,
    term,
    year
) {
    // Best case: result-portal.js supplied the exact result object.
    if (
        resultFromPortal &&
        resultFromPortal.studentDocumentId
    ) {
        return resultFromPortal;
    }

    // Otherwise recover the published result using the same public
    // Student ID that the portal already displays.
    const resultsRef = collection(db, "results");

    const q = query(
        resultsRef,
        where("studentId", "==", studentId),
        where("status", "==", "published")
    );

    const snapshot = await getDocs(q);

    const matches = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data() || {};
        matches.push({
            ...data,
            id: docSnap.id
        });
    });

    if (!matches.length) {
        return null;
    }

    const normalizedTerm = String(term || "").trim().toLowerCase();
    const normalizedYear = String(year || "").trim().toLowerCase();

    const exact = matches.find(item =>
        String(item.term || "").trim().toLowerCase() === normalizedTerm &&
        String(item.academicYear || "").trim().toLowerCase() === normalizedYear
    );

    return exact || matches[0];
}

async function getPublicStudentAttendance(
    organizationId,
    studentDocumentId,
    studentId,
    publishedResult = null
) {
    // Published results use a frozen snapshot. This prevents future
    // attendance (for another term) from appearing inside an old result.
    const snapshotRecords = publishedResult?.attendanceSnapshot?.records;
    if (Array.isArray(snapshotRecords)) {
        return snapshotRecords.map((record, index) => ({
            id: record.id || `snapshot-${index + 1}`,
            ...record
        })).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    }

    const attendanceRef = collection(db, "attendance");

    // Query by organization when available. We then match the student
    // in JavaScript because older attendance records may use different
    // student ID fields.
    let snapshot;

    if (organizationId) {
        const q = query(
            attendanceRef,
            where("organizationId", "==", organizationId)
        );
        snapshot = await getDocs(q);
    } else {
        snapshot = await getDocs(attendanceRef);
    }

    const records = [];

    snapshot.forEach(docSnap => {
        const data = docSnap.data() || {};

        const sameDocument =
            String(data.studentDocumentId || "") === String(studentDocumentId);

        const sameLegacyDocument =
            String(data.studentId || "") === String(studentDocumentId);

        const samePublicStudentId =
            String(data.studentId || "") === String(studentId);

        if (sameDocument || sameLegacyDocument || samePublicStudentId) {
            records.push({
                id: docSnap.id,
                ...data
            });
        }
    });

    records.sort((a, b) => {
        return String(b.date || "").localeCompare(String(a.date || ""));
    });

    return records;
}

function ensurePublicAttendanceSection() {
    const resultDisplay = document.getElementById("resultDisplay");
    if (!resultDisplay) return null;

    let section = document.getElementById("virelloPublicAttendanceSection");

    if (!section) {
        section = document.createElement("section");
        section.id = "virelloPublicAttendanceSection";
        section.className = "vpa-section";
        resultDisplay.appendChild(section);
    }

    section.innerHTML = `
        <div class="vpa-header">
            <div>
                <h3 class="vpa-title">Student Attendance History</h3>
                <p class="vpa-subtitle">
                    Attendance recorded by the school for this student.
                </p>
            </div>
            <div class="vpa-live-badge">ATTENDANCE</div>
        </div>

        <div class="vpa-summary-grid">
            <div class="vpa-summary-box">
                <span>Present</span>
                <strong id="vpaPresent">0</strong>
            </div>
            <div class="vpa-summary-box">
                <span>Absent</span>
                <strong id="vpaAbsent">0</strong>
            </div>
            <div class="vpa-summary-box">
                <span>Late</span>
                <strong id="vpaLate">0</strong>
            </div>
            <div class="vpa-summary-box">
                <span>Total Records</span>
                <strong id="vpaTotal">0</strong>
            </div>
        </div>

        <div id="vpaMessage" class="vpa-message">
            Loading attendance history...
        </div>

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
                <tbody id="vpaRows"></tbody>
            </table>
        </div>
    `;

    return section;
}

function renderPublicAttendance(records, publishedResult = null) {
    const present = records.filter(r => normalizeAttendanceStatus(r.status) === "present").length;
    const absent = records.filter(r => normalizeAttendanceStatus(r.status) === "absent").length;
    const late = records.filter(r => normalizeAttendanceStatus(r.status) === "late").length;

    setText("vpaPresent", present);
    setText("vpaAbsent", absent);
    setText("vpaLate", late);
    setText("vpaTotal", records.length);

    const message = document.getElementById("vpaMessage");
    const rows = document.getElementById("vpaRows");

    if (!rows) return;

    if (!records.length) {
        rows.innerHTML = `
            <tr>
                <td colspan="4" class="vpa-empty">
                    No attendance records have been recorded for this student yet.
                </td>
            </tr>
        `;
        if (message) message.textContent = "No attendance records found.";
        return;
    }

    rows.innerHTML = records.map(record => {
        const status = normalizeAttendanceStatus(record.status);
        const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
        const statusClass = `vpa-status-${status}`;

        return `
            <tr>
                <td>${escapePublicAttendanceHtml(record.date || "-")}</td>
                <td>${escapePublicAttendanceHtml(record.className || "-")}</td>
                <td>${escapePublicAttendanceHtml(record.formMasterName || "-")}</td>
                <td>
                    <span class="vpa-status ${statusClass}">
                        ${escapePublicAttendanceHtml(statusLabel)}
                    </span>
                </td>
            </tr>
        `;
    }).join("");

    if (message) {
        if (publishedResult?.attendanceSnapshot) {
            const snap = publishedResult.attendanceSnapshot;
            message.textContent = `${records.length} attendance record${records.length === 1 ? "" : "s"} found for ${snap.term || publishedResult.term || "this term"} (${snap.periodStartDate || ""} to ${snap.periodEndDate || ""}).`;
        } else {
            message.textContent = `${records.length} attendance record${records.length === 1 ? "" : "s"} found.`;
        }
    }
}

function renderPublicAttendanceError(text) {
    ensurePublicAttendanceSection();
    const message = document.getElementById("vpaMessage");
    const rows = document.getElementById("vpaRows");

    if (message) message.textContent = text;

    if (rows) {
        rows.innerHTML = `
            <tr>
                <td colspan="4" class="vpa-empty vpa-error-cell">
                    ${escapePublicAttendanceHtml(text)}
                </td>
            </tr>
        `;
    }
}

function removePublicAttendanceSection() {
    const section = document.getElementById("virelloPublicAttendanceSection");
    if (section) section.remove();
    __virelloAttendanceRequestKey = "";
}

function getVisiblePortalTerm() {
    const title = document.querySelector(".result-card-title");
    const text = String(title?.textContent || "").trim();
    return text === "Student Result" ? "" : text;
}

function getVisiblePortalAcademicYear() {
    const subtitle = document.querySelector(".result-card-subtitle");
    const text = String(subtitle?.textContent || "").trim();
    return text.replace(/^Academic Year:\s*/i, "").trim();
}

function normalizeAttendanceStatus(value) {
    const status = String(value || "").trim().toLowerCase();
    if (status === "late") return "late";
    if (status === "absent") return "absent";
    if (status === "present") return "present";
    return status || "unknown";
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
}

function escapePublicAttendanceHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function injectPublicAttendanceStyles() {
    if (document.getElementById("virello-public-attendance-styles")) {
        return;
    }

    const style = document.createElement("style");
    style.id = "virello-public-attendance-styles";
    style.textContent = `
        .vpa-section {
            margin-top: 24px;
            padding: 20px;
            border: 1px solid #dbe4f0;
            border-radius: 14px;
            background: #ffffff;
            box-shadow: 0 5px 18px rgba(15, 23, 42, .05);
        }

        .vpa-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 15px;
            margin-bottom: 16px;
        }

        .vpa-title {
            margin: 0;
            font-size: 19px;
            color: #172033;
        }

        .vpa-subtitle {
            margin: 5px 0 0;
            color: #64748b;
            font-size: 12px;
        }

        .vpa-live-badge {
            padding: 7px 10px;
            border-radius: 999px;
            background: #eef2ff;
            color: #3730a3;
            font-size: 10px;
            font-weight: 900;
            white-space: nowrap;
        }

        .vpa-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-bottom: 14px;
        }

        .vpa-summary-box {
            padding: 13px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            background: #f8fafc;
            text-align: center;
        }

        .vpa-summary-box span {
            display: block;
            color: #64748b;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .vpa-summary-box strong {
            display: block;
            margin-top: 5px;
            color: #172554;
            font-size: 22px;
        }

        .vpa-message {
            margin: 8px 0 12px;
            color: #64748b;
            font-size: 12px;
        }

        .vpa-table-wrap {
            width: 100%;
            overflow-x: auto;
        }

        .vpa-table {
            width: 100%;
            min-width: 620px;
            border-collapse: collapse;
        }

        .vpa-table th,
        .vpa-table td {
            padding: 11px 10px;
            border-bottom: 1px solid #e5e7eb;
            text-align: left;
            font-size: 12px;
        }

        .vpa-table th {
            background: #f8fafc;
            color: #475569;
            font-weight: 900;
        }

        .vpa-status {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 999px;
            font-weight: 800;
            font-size: 11px;
        }

        .vpa-status-present {
            background: #dcfce7;
            color: #166534;
        }

        .vpa-status-absent {
            background: #fee2e2;
            color: #991b1b;
        }

        .vpa-status-late {
            background: #fef3c7;
            color: #92400e;
        }

        .vpa-empty {
            padding: 22px !important;
            text-align: center !important;
            color: #64748b;
        }

        .vpa-error-cell {
            color: #991b1b;
        }

        @media (max-width: 700px) {
            .vpa-summary-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .vpa-header {
                flex-direction: column;
            }
        }
    `;

    document.head.appendChild(style);
}

console.log("Virello public result attendance history module loaded.");
