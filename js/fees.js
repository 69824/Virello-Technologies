/* =========================================================
   VIRELLO TECHNOLOGIES
   FEES MANAGEMENT
========================================================= */

import {
    auth,
    db
} from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
    collection,
    query,
    where,
    getDocs,
    addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


/* =========================================================
   GLOBAL VARIABLES
========================================================= */

let currentUser = null;

let currentOrganization = null;

let students = [];

let records = [];


/* =========================================================
   HELPERS
========================================================= */

const $ = id =>
    document.getElementById(id);


function money(value) {

    return (
        "GMD " +
        Number(value || 0)
            .toLocaleString()
    );

}


/* =========================================================
   LOAD ORGANIZATION
   SAME SYSTEM USED BY DASHBOARD.JS
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading organization for fees..."
    );


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


    console.log(
        "🏢 Organizations found:",
        snapshot.size
    );


    if (snapshot.empty) {

        console.error(
            "❌ No organization found."
        );

        if ($("message")) {

            $("message").textContent =
                "No organization was found for this administrator account.";

        }

        return false;

    }


    const organizationDocument =
        snapshot.docs[0];


    currentOrganization = {

        id:
            organizationDocument.id,

        ...organizationDocument.data()

    };


    console.log(
        "✅ Organization loaded:",
        currentOrganization.id
    );


    return true;

}


/* =========================================================
   LOAD STUDENTS
========================================================= */

async function loadStudents() {

    if (
        !currentOrganization ||
        !currentOrganization.id
    ) {

        console.error(
            "❌ Organization ID missing."
        );

        return;

    }


    console.log(
        "👨‍🎓 Loading students..."
    );


    students = [];


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
            )
        );


    try {

        const snapshot =
            await getDocs(
                studentsQuery
            );


        snapshot.forEach(
            studentDocument => {

                const student =
                    studentDocument.data();


                /*
                 * Keep the Firestore document ID.
                 */

                students.push({

                    id:
                        studentDocument.id,

                    ...student

                });

            }
        );


        /*
         * Sort alphabetically.
         */

        students.sort(
            (a, b) => {

                const nameA =
                    String(
                        a.fullName || ""
                    );

                const nameB =
                    String(
                        b.fullName || ""
                    );

                return nameA.localeCompare(
                    nameB
                );

            }
        );


        console.log(
            "✅ Students loaded:",
            students.length
        );


        populateStudents();

        populateClasses();


        if ($("totalStudents")) {

            $("totalStudents").textContent =
                students.length;

        }


        if (
            students.length === 0
        ) {

            if ($("message")) {

                $("message").textContent =
                    "No students were found in this organization.";

            }

        }

    }

    catch (error) {

        console.error(
            "❌ Error loading students:",
            error
        );


        if ($("student")) {

            $("student").innerHTML = `
                <option value="">
                    Unable to load students
                </option>
            `;

        }


        if ($("message")) {

            $("message").textContent =
                "Unable to load students. Please check Firestore permissions.";

        }

    }

}


/* =========================================================
   POPULATE STUDENT DROPDOWN
========================================================= */

function populateStudents() {

    const studentSelect =
        $("student");


    if (!studentSelect) {

        console.error(
            "❌ Student select element not found."
        );

        return;

    }


    studentSelect.innerHTML = `
        <option value="">
            Select student
        </option>
    `;


    students.forEach(
        student => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                student.id;


            option.textContent =
                `${student.fullName || "Unnamed Student"} — ${student.studentId || student.id}`;


            studentSelect.appendChild(
                option
            );

        }
    );


    console.log(
        "✅ Student dropdown populated:",
        students.length
    );

}


/* =========================================================
   POPULATE CLASS FILTER
========================================================= */

function populateClasses() {

    const classFilter =
        $("classFilter");


    if (!classFilter) {

        return;

    }


    const classes =
        [
            ...new Set(

                students

                    .map(
                        student =>
                            student.className ||
                            student.class ||
                            ""
                    )

                    .filter(Boolean)

            )
        ];


    classes.sort();


    classFilter.innerHTML = `
        <option value="">
            All Classes
        </option>
    `;


    classes.forEach(
        className => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                className;


            option.textContent =
                className;


            classFilter.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   STUDENT SELECTION
========================================================= */

if ($("student")) {

    $("student").addEventListener(
        "change",
        function () {

            const studentId =
                this.value;


            if (!studentId) {

                return;

            }


            const student =
                students.find(
                    item =>
                        item.id ===
                        studentId
                );


            if (!student) {

                console.error(
                    "❌ Selected student not found."
                );

                return;

            }


            console.log(
                "👨‍🎓 Selected student:",
                student
            );


            /*
             * Automatically load existing
             * student information.
             */

            if ($("feesDue")) {

                $("feesDue").value =
                    student.feesDue ||
                    "";

            }


            /*
             * If the page has these fields,
             * fill them automatically.
             */

            if ($("parentGuardian")) {

                $("parentGuardian").value =
                    student.parentName ||
                    "";

            }


            if ($("parentPhone")) {

                $("parentPhone").value =
                    student.parentTelephone ||
                    student.parentPhone ||
                    "";

            }

        }
    );

}


/* =========================================================
   LOAD FEES RECORDS
========================================================= */

async function loadRecords() {

    if (
        !currentOrganization ||
        !currentOrganization.id
    ) {

        return;

    }


    records = [];


    try {

        const feesRef =
            collection(
                db,
                "fees"
            );


        const feesQuery =
            query(
                feesRef,

                where(
                    "organizationId",
                    "==",
                    currentOrganization.id
                )
            );


        const snapshot =
            await getDocs(
                feesQuery
            );


        snapshot.forEach(
            feeDocument => {

                records.push({

                    id:
                        feeDocument.id,

                    ...feeDocument.data()

                });

            }
        );


        console.log(
            "💰 Fees records loaded:",
            records.length
        );


        render();

    }

    catch (error) {

        console.error(
            "❌ Error loading fees:",
            error
        );


        render();

    }

}


/* =========================================================
   RENDER FEES REGISTER
========================================================= */

function render() {

    const body =
        $("feesBody");


    if (!body) {

        return;

    }


    const search =
        String(
            $("search")?.value || ""
        )
        .trim()
        .toLowerCase();


    const selectedClass =
        $("classFilter")?.value ||
        "";


    const selectedTerm =
        $("termFilter")?.value ||
        "";


    const rows =
        records.filter(
            record => {

                const studentName =
                    String(
                        record.studentName ||
                        ""
                    )
                    .toLowerCase();


                const studentId =
                    String(
                        record.studentId ||
                        ""
                    )
                    .toLowerCase();


                const className =
                    record.className ||
                    record.class ||
                    "";


                return (

                    (
                        !search ||

                        studentName.includes(
                            search
                        ) ||

                        studentId.includes(
                            search
                        )
                    )

                    &&

                    (
                        !selectedClass ||
                        className === selectedClass
                    )

                    &&

                    (
                        !selectedTerm ||
                        record.term === selectedTerm
                    )

                );

            }
        );


    let totalDue = 0;

    let totalPaid = 0;


    rows.forEach(
        record => {

            totalDue +=
                Number(
                    record.feesDue ||
                    0
                );


            totalPaid +=
                Number(
                    record.amountPaid ||
                    0
                );

        }
    );


    if ($("totalDue")) {

        $("totalDue").textContent =
            money(totalDue);

    }


    if ($("totalPaid")) {

        $("totalPaid").textContent =
            money(totalPaid);

    }


    if ($("totalBalance")) {

        $("totalBalance").textContent =
            money(
                Math.max(
                    0,
                    totalDue -
                    totalPaid
                )
            );

    }


    if (!rows.length) {

        body.innerHTML = `
            <tr>
                <td colspan="10">
                    No fees records found.
                </td>
            </tr>
        `;

        return;

    }


    body.innerHTML =
        rows
            .map(
                record => {

                    const due =
                        Number(
                            record.feesDue ||
                            0
                        );


                    const paid =
                        Number(
                            record.amountPaid ||
                            0
                        );


                    const balance =
                        Math.max(
                            0,
                            due - paid
                        );


                    const status =
                        balance <= 0 &&
                        due > 0

                            ? "Paid"

                            : paid > 0

                                ? "Part Paid"

                                : "Not Paid";


                    const statusClass =
                        status === "Paid"

                            ? "paid"

                            : status === "Part Paid"

                                ? "part"

                                : "unpaid";


                    return `

                        <tr>

                            <td>
                                ${record.studentId || ""}
                            </td>

                            <td>
                                ${record.studentName || ""}
                            </td>

                            <td>
                                ${
                                    record.className ||
                                    record.class ||
                                    ""
                                }
                            </td>

                            <td>
                                ${record.term || ""}
                            </td>

                            <td>
                                ${money(due)}
                            </td>

                            <td>
                                ${money(paid)}
                            </td>

                            <td>
                                ${money(balance)}
                            </td>

                            <td>

                                <span
                                    class="status ${statusClass}"
                                >
                                    ${status}
                                </span>

                            </td>

                            <td>
                                ${record.paymentDate || ""}
                            </td>

                            <td>
                                ${record.paymentMethod || ""}
                            </td>

                        </tr>

                    `;

                }
            )
            .join("");

}


/* =========================================================
   SAVE FEES RECORD
========================================================= */

if ($("saveBtn")) {

    $("saveBtn").addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            const student =
                students.find(
                    item =>
                        item.id ===
                        $("student").value
                );


            if (!student) {

                $("message").textContent =
                    "Please select a student.";

                return;

            }


            const feesDue =
                Number(
                    $("feesDue").value ||
                    0
                );


            const amountPaid =
                Number(
                    $("amountPaid").value ||
                    0
                );


            if (
                feesDue < 0 ||
                amountPaid < 0
            ) {

                $("message").textContent =
                    "Amounts cannot be negative.";

                return;

            }


            if (
                amountPaid >
                feesDue
            ) {

                const confirmOverpayment =
                    confirm(
                        "The amount paid is greater than the fees due. Continue?"
                    );


                if (!confirmOverpayment) {

                    return;

                }

            }


            const studentId =
                student.studentId ||
                student.id;


            const className =
                student.className ||
                student.class ||
                "";


            const studentName =
                student.fullName ||
                "";


            const data = {

                organizationId:
                    currentOrganization.id,

                studentId:
                    studentId,

                studentDocumentId:
                    student.id,

                studentName:
                    studentName,

                classId:
                    student.classId ||
                    "",

                className:
                    className,

                gender:
                    student.gender ||
                    "",

                parentName:
                    student.parentName ||
                    "",

                parentTelephone:
                    student.parentTelephone ||
                    student.parentPhone ||
                    "",

                academicYear:
                    $("academicYear").value.trim(),

                term:
                    $("term").value,

                feesDue:
                    feesDue,

                amountPaid:
                    amountPaid,

                balance:
                    Math.max(
                        0,
                        feesDue -
                        amountPaid
                    ),

                paymentDate:
                    $("paymentDate").value,

                receiptNo:
                    $("receiptNo").value.trim(),

                paymentMethod:
                    $("paymentMethod").value,

                createdBy:
                    currentUser.uid,

                createdAt:
                    new Date(),

                updatedAt:
                    new Date()

            };


            try {

                await addDoc(
                    collection(
                        db,
                        "fees"
                    ),
                    data
                );


                $("message").textContent =
                    "Fees record saved successfully.";


                clearForm();


                await loadRecords();

            }

            catch (error) {

                console.error(
                    "❌ Error saving fees:",
                    error
                );


                $("message").textContent =
                    "Unable to save fees record. Check your Firestore permissions.";

            }

        }
    );

}


/* =========================================================
   CLEAR FORM
========================================================= */

function clearForm() {

    if ($("student")) {

        $("student").value =
            "";

    }


    if ($("feesDue")) {

        $("feesDue").value =
            "";

    }


    if ($("amountPaid")) {

        $("amountPaid").value =
            "";

    }


    if ($("receiptNo")) {

        $("receiptNo").value =
            "";

    }


    if ($("paymentDate")) {

        $("paymentDate").value =
            new Date()
                .toISOString()
                .slice(
                    0,
                    10
                );

    }

}


/* =========================================================
   CLEAR BUTTON
========================================================= */

if ($("clearBtn")) {

    $("clearBtn").addEventListener(
        "click",
        clearForm
    );

}


/* =========================================================
   REFRESH BUTTON
========================================================= */

if ($("refreshBtn")) {

    $("refreshBtn").addEventListener(
        "click",
        async function () {

            await loadStudents();

            await loadRecords();

        }
    );

}


/* =========================================================
   SEARCH + FILTERS
========================================================= */

[
    "search",
    "classFilter",
    "termFilter"
]
.forEach(
    id => {

        const element =
            $(id);


        if (!element) {

            return;

        }


        element.addEventListener(
            "input",
            render
        );


        element.addEventListener(
            "change",
            render
        );

    }
);


/* =========================================================
   AUTHENTICATION
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        currentUser =
            user;


        console.log(
            "✅ Fees user:",
            user.email
        );


        if ($("paymentDate")) {

            $("paymentDate").value =
                new Date()
                    .toISOString()
                    .slice(
                        0,
                        10
                    );

        }


        if ($("academicYear")) {

            $("academicYear").value =
                "2026/2027";

        }


        /*
         * IMPORTANT:
         * First find the real organization.
         * Then load students belonging to it.
         */

        const organizationLoaded =
            await loadOrganization();


        if (!organizationLoaded) {

            return;

        }


        await loadStudents();

        await loadRecords();

    }
);
