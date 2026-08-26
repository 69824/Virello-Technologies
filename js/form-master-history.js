/* =========================================================
   VIRELLO TECHNOLOGIES
   FORM MASTER ATTENDANCE HISTORY

   FILE:
   js/form-master-history.js

   PURPOSE:
   - Secure Form Master access
   - Keep every query inside the current organization
   - Load attendance history
   - Filter by class/date/student/status
   - Show attendance statistics
   - Show student attendance percentage
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


let currentUser = null;
let currentTeacher = null;
let currentOrganization = null;
let assignedClasses = [];
let attendanceRecords = [];
let filteredRecords = [];


const loadingScreen = document.getElementById("loadingScreen");
const errorScreen = document.getElementById("errorScreen");
const errorMessage = document.getElementById("errorMessage");

const teacherNameElement = document.getElementById("teacherName");
const organizationNameElement = document.getElementById("organizationName");

const classFilter = document.getElementById("classFilter");
const dateFrom = document.getElementById("dateFrom");
const dateTo = document.getElementById("dateTo");
const studentSearch = document.getElementById("studentSearch");
const statusFilter = document.getElementById("statusFilter");

const applyFiltersButton = document.getElementById("applyFilters");
const clearFiltersButton = document.getElementById("clearFilters");

const totalRecordsElement = document.getElementById("totalRecords");
const presentCountElement = document.getElementById("presentCount");
const lateCountElement = document.getElementById("lateCount");
const absentCountElement = document.getElementById("absentCount");
const attendanceRateElement = document.getElementById("attendanceRate");

const tableBody = document.getElementById("historyTableBody");
const emptyState = document.getElementById("emptyState");
const resultInfo = document.getElementById("resultInfo");

const logoutButton = document.getElementById("logoutButton");


document.addEventListener("DOMContentLoaded", () => {
    setDefaultDates();
    startHistory();
});


function setDefaultDates() {
    const today = getLocalDateString();

    if (dateFrom) dateFrom.value = today;
    if (dateTo) dateTo.value = today;
}


function startHistory() {
    onAuthStateChanged(auth, async user => {
        try {
            if (!user) {
                window.location.href = "form-master-login.html";
                return;
            }

            currentUser = user;

            await loadTeacherProfile();

            if (!currentTeacher) return;

            const role = String(currentTeacher.role || "")
                .trim()
                .toLowerCase();

            if (
                role !== "form_master" &&
                currentTeacher.isFormMaster !== true
            ) {
                await safeSignOut();
                window.location.href = "form-master-login.html";
                return;
            }

            await loadOrganization();

            if (!currentOrganization) return;

            await loadAssignedClasses();
            renderClassFilter();

            await loadAttendanceHistory();

            hideLoading();

        } catch (error) {
            console.error("Form Master history error:", error);
            showError(
                error.message ||
                "Unable to load attendance history."
            );
        }
    });
}


async function loadTeacherProfile() {
    const staffRef = collection(db, "staff");

    let snapshot = await getDocs(
        query(
            staffRef,
            where("userUid", "==", currentUser.uid)
        )
    );

    if (snapshot.empty) {
        snapshot = await getDocs(
            query(
                staffRef,
                where("uid", "==", currentUser.uid)
            )
        );
    }

    if (snapshot.empty && currentUser.email) {
        snapshot = await getDocs(
            query(
                staffRef,
                where(
                    "email",
                    "==",
                    currentUser.email.trim().toLowerCase()
                )
            )
        );
    }

    if (snapshot.empty) {
        showError(
            "Your Form Master staff profile could not be found."
        );
        return;
    }

    const item = snapshot.docs[0];

    currentTeacher = {
        id: item.id,
        ...item.data()
    };

    const name = getTeacherName(currentTeacher);

    if (teacherNameElement) {
        teacherNameElement.textContent = name;
    }
}


async function loadOrganization() {
    const organizationId =
        currentTeacher.organizationId ||
        currentTeacher.orgId ||
        currentTeacher.organizationID ||
        "";

    if (!organizationId) {
        showError(
            "Your Form Master account is not connected to an organization."
        );
        return;
    }

    const organizationsRef = collection(db, "organizations");

    const snapshot = await getDocs(
        query(
            organizationsRef,
            where("__name__", "==", organizationId)
        )
    );

    if (snapshot.empty) {
        showError(
            "Your organization could not be found."
        );
        return;
    }

    const item = snapshot.docs[0];

    currentOrganization = {
        id: item.id,
        ...item.data()
    };

    if (organizationNameElement) {
        organizationNameElement.textContent =
            currentOrganization.organizationName ||
            currentOrganization.name ||
            "Organization";
    }
}


async function loadAssignedClasses() {
    const classesRef = collection(db, "classes");

    const snapshot = await getDocs(
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

    assignedClasses = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

    assignedClasses.sort((a, b) =>
        getGradeNumber(a.className) -
        getGradeNumber(b.className)
    );
}


function renderClassFilter() {
    if (!classFilter) return;

    classFilter.innerHTML = `
        <option value="">All My Classes</option>
    `;

    assignedClasses.forEach(item => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.className || "Class";
        classFilter.appendChild(option);
    });
}


async function loadAttendanceHistory() {
    if (!currentOrganization) return;

    showTableLoading();

    const attendanceRef = collection(db, "attendance");

    /*
       Important:
       We query by organization only.
       This prevents Star Preparatory records from
       ever being mixed with Royal School records.
    */
    const snapshot = await getDocs(
        query(
            attendanceRef,
            where(
                "organizationId",
                "==",
                currentOrganization.id
            )
        )
    );

    const allowedClassIds =
        new Set(
            assignedClasses.map(item => item.id)
        );

    attendanceRecords = [];

    snapshot.forEach(item => {
        const record = item.data();

        /*
           A Form Master can only see attendance
           for classes currently assigned to them.
        */
        if (
            record.classId &&
            allowedClassIds.has(record.classId)
        ) {
            attendanceRecords.push({
                id: item.id,
                ...record
            });
        }
    });

    attendanceRecords.sort((a, b) =>
        String(b.date || "").localeCompare(
            String(a.date || "")
        )
    );

    applyFilters();
}


function applyFilters() {
    const from = dateFrom?.value || "";
    const to = dateTo?.value || "";
    const classId = classFilter?.value || "";
    const search = (studentSearch?.value || "")
        .trim()
        .toLowerCase();
    const status = statusFilter?.value || "";

    filteredRecords = attendanceRecords.filter(record => {
        const recordDate = String(record.date || "");

        if (from && recordDate < from) return false;
        if (to && recordDate > to) return false;

        if (
            classId &&
            String(record.classId || "") !== classId
        ) {
            return false;
        }

        if (status &&
            normalizeStatus(record.status) !== status) {
            return false;
        }

        if (search) {
            const name = String(
                record.studentName || ""
            ).toLowerCase();

            const studentId = String(
                record.studentNumber ||
                record.studentId ||
                ""
            ).toLowerCase();

            if (
                !name.includes(search) &&
                !studentId.includes(search)
            ) {
                return false;
            }
        }

        return true;
    });

    renderHistory();
    updateStatistics();
}


function renderHistory() {
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!filteredRecords.length) {
        if (emptyState) {
            emptyState.style.display = "block";
        }

        if (resultInfo) {
            resultInfo.textContent =
                "No attendance records match your filters.";
        }

        return;
    }

    if (emptyState) {
        emptyState.style.display = "none";
    }

    if (resultInfo) {
        resultInfo.textContent =
            `${filteredRecords.length} attendance record${
                filteredRecords.length === 1 ? "" : "s"
            } found`;
    }

    filteredRecords.forEach((record, index) => {
        const row = document.createElement("tr");

        const status = normalizeStatus(record.status);

        row.innerHTML = `
            <td>${index + 1}</td>

            <td>
                <strong>
                    ${escapeHtml(record.studentName || "Student")}
                </strong>
                <small>
                    ${escapeHtml(
                        record.studentNumber ||
                        record.studentId ||
                        ""
                    )}
                </small>
            </td>

            <td>
                ${escapeHtml(record.className || "Class")}
            </td>

            <td>
                ${escapeHtml(record.date || "")}
            </td>

            <td>
                <span class="status ${status}">
                    ${capitalize(status)}
                </span>
            </td>

            <td>
                ${formatTimestamp(record.checkIn)}
            </td>
        `;

        tableBody.appendChild(row);
    });
}


function updateStatistics() {
    const total = filteredRecords.length;

    const present = filteredRecords.filter(
        r => normalizeStatus(r.status) === "present"
    ).length;

    const late = filteredRecords.filter(
        r => normalizeStatus(r.status) === "late"
    ).length;

    const absent = filteredRecords.filter(
        r => normalizeStatus(r.status) === "absent"
    ).length;

    const attended = present + late;

    const rate =
        total > 0
            ? Math.round((attended / total) * 100)
            : 0;

    if (totalRecordsElement) {
        totalRecordsElement.textContent = total;
    }

    if (presentCountElement) {
        presentCountElement.textContent = present;
    }

    if (lateCountElement) {
        lateCountElement.textContent = late;
    }

    if (absentCountElement) {
        absentCountElement.textContent = absent;
    }

    if (attendanceRateElement) {
        attendanceRateElement.textContent = `${rate}%`;
    }
}


if (applyFiltersButton) {
    applyFiltersButton.addEventListener(
        "click",
        applyFilters
    );
}


if (clearFiltersButton) {
    clearFiltersButton.addEventListener(
        "click",
        () => {
            if (classFilter) classFilter.value = "";
            if (statusFilter) statusFilter.value = "";

            const today = getLocalDateString();

            if (dateFrom) dateFrom.value = today;
            if (dateTo) dateTo.value = today;
            if (studentSearch) studentSearch.value = "";

            applyFilters();
        }
    );
}


if (studentSearch) {
    studentSearch.addEventListener("input", () => {
        applyFilters();
    });
}


if (logoutButton) {
    logoutButton.addEventListener(
        "click",
        async () => {
            logoutButton.disabled = true;
            logoutButton.textContent = "Logging out...";

            try {
                await signOut(auth);
                localStorage.removeItem("virelloFormMaster");
                window.location.href =
                    "form-master-login.html";
            } catch (error) {
                console.error(error);
                logoutButton.disabled = false;
                logoutButton.textContent = "Logout";
            }
        }
    );
}


function showTableLoading() {
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="table-loading">
                Loading attendance history...
            </td>
        </tr>
    `;

    if (emptyState) {
        emptyState.style.display = "none";
    }
}


function hideLoading() {
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }
}


function showError(message) {
    if (loadingScreen) {
        loadingScreen.style.display = "none";
    }

    if (errorScreen) {
        errorScreen.style.display = "flex";
    }

    if (errorMessage) {
        errorMessage.textContent = message;
    }
}


async function safeSignOut() {
    try {
        await signOut(auth);
    } catch {}
}


function normalizeStatus(status) {
    const value = String(status || "")
        .trim()
        .toLowerCase();

    if (value === "late") return "late";
    if (value === "absent") return "absent";

    return "present";
}


function capitalize(value) {
    return String(value || "")
        .charAt(0)
        .toUpperCase() +
        String(value || "").slice(1);
}


function formatTimestamp(timestamp) {
    if (!timestamp) return "—";

    try {
        if (
            typeof timestamp.toDate === "function"
        ) {
            return timestamp
                .toDate()
                .toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                });
        }

        return "—";
    } catch {
        return "—";
    }
}


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


function getGradeNumber(className) {
    const match = String(className || "")
        .match(/(\d+)/);

    return match ? Number(match[1]) : 999;
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


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


console.log(
    "✅ Virello Form Master Attendance History loaded."
);
