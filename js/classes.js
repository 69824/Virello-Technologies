/* =========================================================
   VIRELLO TECHNOLOGIES
   DIGITAL ATTENDANCE PLATFORM

   FILE:
   js/classes.js

   PURPOSE:
   CLASS + STUDENT MANAGEMENT

   FEATURES:
   - Administrator authentication
   - Organization loading
   - Load staff / teachers
   - Create classes
   - Assign Form Master
   - Edit class / Form Master
   - Load classes
   - Select class
   - Add students
   - Search students
   - Edit students
   - Move students between classes
   - Activate / deactivate students
   - Remove students
   - Delete empty classes
   - Display statistics
   - Firebase Hosting compatible
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
    deleteDoc,
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

let classes = [];

let teachers = [];

let selectedClass = null;

let selectedStudents = [];

let studentSearchTerm = "";


/* =========================================================
   DOM
========================================================= */

const loadingScreen =
    document.getElementById("loadingScreen");

const errorScreen =
    document.getElementById("errorScreen");

const errorMessage =
    document.getElementById("errorMessage");

const adminName =
    document.getElementById("adminName");

const organizationName =
    document.getElementById("organizationName");

const logoutButton =
    document.getElementById("logoutButton");

const classForm =
    document.getElementById("classForm");

const classNameInput =
    document.getElementById("className");

const formMasterInput =
    document.getElementById("formMaster");

const createClassButton =
    document.getElementById("createClassButton");

const classList =
    document.getElementById("classList");

const totalClasses =
    document.getElementById("totalClasses");

const totalStudents =
    document.getElementById("totalStudents");

const assignedTeachers =
    document.getElementById("assignedTeachers");

const selectedClassTitle =
    document.getElementById("selectedClassTitle");

const selectedClassTeacher =
    document.getElementById("selectedClassTeacher");

const studentCount =
    document.getElementById("studentCount");

const studentForm =
    document.getElementById("studentForm");

const studentIdInput =
    document.getElementById("studentIdInput");

const studentNameInput =
    document.getElementById("studentNameInput");

const addStudentButton =
    document.getElementById("addStudentButton");

const studentList =
    document.getElementById("studentList");


/* =========================================================
   OPTIONAL SEARCH INPUT
   Works automatically if classes.html contains:
   id="studentSearch"
========================================================= */

const studentSearch =
    document.getElementById("studentSearch");


/* =========================================================
   START
========================================================= */

console.log(
    "🔥 Virello Classes Management loaded."
);


document.addEventListener(
    "DOMContentLoaded",
    () => {

        startClasses();

    }
);


/* =========================================================
   START CLASSES
========================================================= */

function startClasses() {

    onAuthStateChanged(
        auth,
        async user => {

            try {

                if (!user) {

                    window.location.href =
                        "login.html";

                    return;

                }


                currentUser = user;


                console.log(
                    "✅ Administrator authenticated:",
                    user.email
                );


                if (adminName) {

                    adminName.textContent =
                        user.displayName ||
                        user.email ||
                        "Administrator";

                }


                await loadOrganization();


                if (!currentOrganization) {

                    return;

                }


                await loadTeachers();

                await loadClasses();

                renderClasses();

                updateStatistics();

                hideLoading();


                console.log(
                    "✅ Classes system ready."
                );

            }

            catch (error) {

                console.error(
                    "❌ Classes initialization error:",
                    error
                );


                showError(
                    error.message ||
                    "Unable to load classes."
                );

            }

        }
    );

}


/* =========================================================
   LOAD ORGANIZATION
========================================================= */

async function loadOrganization() {

    console.log(
        "🏢 Loading organization..."
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


    if (snapshot.empty) {

        showError(
            "No organization was found for this administrator account."
        );

        return;

    }


    const organizationDocument =
        snapshot.docs[0];


    currentOrganization = {

        id:
            organizationDocument.id,

        ...organizationDocument.data()

    };


    if (organizationName) {

        organizationName.textContent =
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
   LOAD TEACHERS
========================================================= */

async function loadTeachers() {

    console.log(
        "👨‍🏫 Loading teachers..."
    );


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


    teachers = [];


    snapshot.forEach(
        staffDocument => {

            const staff =
                staffDocument.data();


            const status =
                String(
                    staff.status ||
                    "active"
                ).toLowerCase();


            if (
                status === "inactive"
            ) {

                return;

            }


            teachers.push({

                id:
                    staffDocument.id,

                ...staff

            });

        }
    );


    populateTeacherSelect();


    console.log(
        "👨‍🏫 Teachers loaded:",
        teachers.length
    );

}


/* =========================================================
   POPULATE TEACHER SELECT
========================================================= */

function populateTeacherSelect() {

    if (!formMasterInput) {

        return;

    }


    formMasterInput.innerHTML = `
        <option value="">
            No Form Master
        </option>
    `;


    teachers.forEach(
        teacher => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                teacher.id;


            option.textContent =
                getTeacherName(
                    teacher
                );


            formMasterInput.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD CLASSES
========================================================= */

async function loadClasses() {

    console.log(
        "📚 Loading classes..."
    );


    const classesRef =
        collection(
            db,
            "classes"
        );


    const classQuery =
        query(
            classesRef,
            where(
                "organizationId",
                "==",
                currentOrganization.id
            )
        );


    const snapshot =
        await getDocs(
            classQuery
        );


    classes = [];


    for (
        const classDocument
        of snapshot.docs
    ) {

        const classData =
            classDocument.data();


        const classObject = {

            id:
                classDocument.id,

            ...classData,

            studentCount:
                0

        };


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
                    classDocument.id
                )

            );


        const studentsSnapshot =
            await getDocs(
                studentsQuery
            );


        classObject.studentCount =
            studentsSnapshot.size;


        classes.push(
            classObject
        );

    }


    classes.sort(
        (a, b) =>
            getGradeNumber(
                a.className
            ) -
            getGradeNumber(
                b.className
            )
    );


    console.log(
        "✅ Classes loaded:",
        classes
    );

}


/* =========================================================
   CREATE CLASS
========================================================= */

if (classForm) {

    classForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const className =
                String(
                    classNameInput?.value ||
                    ""
                ).trim();


            const formMasterId =
                formMasterInput?.value ||
                "";


            if (!className) {

                alert(
                    "Please select a class."
                );

                return;

            }


            const existing =
                classes.find(
                    item =>
                        String(
                            item.className
                        ).toLowerCase() ===
                        className.toLowerCase()
                );


            if (existing) {

                alert(
                    `${className} already exists.`
                );

                return;

            }


            setButtonLoading(
                createClassButton,
                "Creating..."
            );


            try {

                const teacher =
                    teachers.find(
                        item =>
                            item.id ===
                            formMasterId
                    );


                const classData = {

                    organizationId:
                        currentOrganization.id,

                    className:
                        className,

                    grade:
                        getGradeNumber(
                            className
                        ),

                    formMasterId:
                        formMasterId ||
                        null,

                    formMasterName:
                        teacher
                            ? getTeacherName(
                                teacher
                            )
                            : "",

                    status:
                        "active",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    createdBy:
                        currentUser.uid

                };


                const classesRef =
                    collection(
                        db,
                        "classes"
                    );


                const newClass =
                    await addDoc(
                        classesRef,
                        classData
                    );


                console.log(
                    "✅ Class created:",
                    newClass.id
                );


                classForm.reset();


                await loadClasses();


                renderClasses();

                updateStatistics();


                const createdClass =
                    classes.find(
                        item =>
                            item.id ===
                            newClass.id
                    );


                if (createdClass) {

                    await selectClass(
                        createdClass
                    );

                }


                alert(
                    `${className} created successfully.`
                );

            }

            catch (error) {

                console.error(
                    "❌ Create class error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to create class."
                );

            }

            finally {

                resetButton(
                    createClassButton,
                    "+ Create Class"
                );

            }

        }
    );

}


/* =========================================================
   RENDER CLASSES
========================================================= */

function renderClasses() {

    if (!classList) {

        return;

    }


    classList.innerHTML =
        "";


    if (!classes.length) {

        classList.innerHTML = `

            <div class="empty">
                No classes created yet.
                Create Grade 1–9 using the form.
            </div>

        `;

        return;

    }


    classes.forEach(
        classItem => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "class-item";


            if (
                selectedClass &&
                selectedClass.id ===
                classItem.id
            ) {

                item.classList.add(
                    "active"
                );

            }


            const teacherName =
                classItem.formMasterName ||
                getTeacherNameById(
                    classItem.formMasterId
                ) ||
                "No Form Master assigned";


            item.innerHTML = `

                <div class="class-item-header">

                    <div class="class-name">
                        ${escapeHtml(
                            classItem.className
                        )}
                    </div>

                    <div class="class-count">
                        ${Number(
                            classItem.studentCount || 0
                        )}
                        Student${
                            Number(
                                classItem.studentCount || 0
                            ) === 1
                                ? ""
                                : "s"
                        }
                    </div>

                </div>


                <div class="class-teacher">

                    Form Master:
                    ${escapeHtml(
                        teacherName
                    )}

                </div>


                <div class="class-actions">

                    <button
                        type="button"
                        class="small-button"
                        data-select-class="${escapeHtml(
                            classItem.id
                        )}"
                    >
                        Manage Students
                    </button>


                    <button
                        type="button"
                        class="small-button"
                        data-edit-class="${escapeHtml(
                            classItem.id
                        )}"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="small-button danger-button"
                        data-delete-class="${escapeHtml(
                            classItem.id
                        )}"
                    >
                        Delete
                    </button>

                </div>

            `;


            classList.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   CLASS BUTTON EVENTS
========================================================= */

if (classList) {

    classList.addEventListener(
        "click",
        async event => {

            const selectButton =
                event.target.closest(
                    "[data-select-class]"
                );


            const editButton =
                event.target.closest(
                    "[data-edit-class]"
                );


            const deleteButton =
                event.target.closest(
                    "[data-delete-class]"
                );


            if (selectButton) {

                const classId =
                    selectButton.dataset
                        .selectClass;


                const classItem =
                    classes.find(
                        item =>
                            item.id ===
                            classId
                    );


                if (classItem) {

                    await selectClass(
                        classItem
                    );

                }

                return;

            }


            if (editButton) {

                const classId =
                    editButton.dataset
                        .editClass;


                await editClass(
                    classId
                );

                return;

            }


            if (deleteButton) {

                const classId =
                    deleteButton.dataset
                        .deleteClass;


                await deleteClass(
                    classId
                );

            }

        }
    );

}


/* =========================================================
   EDIT CLASS
========================================================= */

async function editClass(
    classId
) {

    const classItem =
        classes.find(
            item =>
                item.id ===
                classId
        );


    if (!classItem) {

        return;

    }


    const newClassName =
        prompt(
            "Enter class name:",
            classItem.className || ""
        );


    if (
        newClassName === null
    ) {

        return;

    }


    const cleanName =
        newClassName.trim();


    if (!cleanName) {

        alert(
            "Class name cannot be empty."
        );

        return;

    }


    const duplicate =
        classes.find(
            item =>
                item.id !== classId &&
                String(
                    item.className || ""
                ).toLowerCase() ===
                cleanName.toLowerCase()
        );


    if (duplicate) {

        alert(
            `${cleanName} already exists.`
        );

        return;

    }


    const currentTeacher =
        classItem.formMasterId ||
        "";


    const teacherOptions =
        teachers
            .map(
                teacher =>
                    `${teacher.id}::${getTeacherName(
                        teacher
                    )}`
            )
            .join("\n");


    let selectedTeacher =
        currentTeacher;


    if (teachers.length) {

        const teacherMessage =
            `Enter Form Master ID.\n\nLeave blank for no Form Master.\n\nAvailable:\n${teachers
                .map(
                    teacher =>
                        `${teacher.id} - ${getTeacherName(
                            teacher
                        )}`
                )
                .join("\n")}`;


        const response =
            prompt(
                teacherMessage,
                currentTeacher
            );


        if (
            response === null
        ) {

            return;

        }


        selectedTeacher =
            response.trim();

    }


    if (
        selectedTeacher &&
        !teachers.some(
            teacher =>
                teacher.id ===
                selectedTeacher
        )
    ) {

        alert(
            "The selected Form Master was not found."
        );

        return;

    }


    const teacher =
        teachers.find(
            item =>
                item.id ===
                selectedTeacher
        );


    try {

        await updateDoc(
            doc(
                db,
                "classes",
                classId
            ),
            {

                className:
                    cleanName,

                grade:
                    getGradeNumber(
                        cleanName
                    ),

                formMasterId:
                    selectedTeacher ||
                    null,

                formMasterName:
                    teacher
                        ? getTeacherName(
                            teacher
                        )
                        : "",

                updatedAt:
                    serverTimestamp()

            }
        );


        /*
           Keep students' className
           synchronized.
        */

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
                    classId
                )

            );


        const studentsSnapshot =
            await getDocs(
                studentsQuery
            );


        for (
            const studentDocument
            of studentsSnapshot.docs
        ) {

            await updateDoc(
                doc(
                    db,
                    "students",
                    studentDocument.id
                ),
                {

                    className:
                        cleanName,

                    updatedAt:
                        serverTimestamp()

                }
            );

        }


        if (
            selectedClass &&
            selectedClass.id ===
            classId
        ) {

            selectedClass.className =
                cleanName;

            selectedClass.formMasterId =
                selectedTeacher || null;

            selectedClass.formMasterName =
                teacher
                    ? getTeacherName(
                        teacher
                    )
                    : "";

            selectedClass.grade =
                getGradeNumber(
                    cleanName
                );

            selectedClassTitle.textContent =
                cleanName;

            selectedClassTeacher.textContent =
                `Form Master: ${
                    teacher
                        ? getTeacherName(
                            teacher
                        )
                        : "No Form Master assigned"
                }`;

        }


        await loadClasses();


        renderClasses();

        updateStatistics();


        if (
            selectedClass &&
            selectedClass.id ===
            classId
        ) {

            await loadStudents();

            renderStudents();

        }


        alert(
            `${cleanName} updated successfully.`
        );

    }

    catch (error) {

        console.error(
            "❌ Edit class error:",
            error
        );


        alert(
            error.message ||
            "Unable to update class."
        );

    }

}


/* =========================================================
   SELECT CLASS
========================================================= */

async function selectClass(
    classItem
) {

    selectedClass =
        classItem;


    studentSearchTerm =
        "";


    if (studentSearch) {

        studentSearch.value =
            "";

    }


    renderClasses();


    if (selectedClassTitle) {

        selectedClassTitle.textContent =
            classItem.className;

    }


    const teacherName =
        classItem.formMasterName ||
        getTeacherNameById(
            classItem.formMasterId
        ) ||
        "No Form Master assigned";


    if (selectedClassTeacher) {

        selectedClassTeacher.textContent =
            `Form Master: ${teacherName}`;

    }


    await loadStudents();


    renderStudents();

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

            selectedStudents.push({

                id:
                    studentDocument.id,

                ...studentDocument.data()

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
        "👨‍🎓 Students:",
        selectedStudents.length
    );

}


/* =========================================================
   ADD STUDENT
========================================================= */

if (studentForm) {

    studentForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (!selectedClass) {

                alert(
                    "Please select a class first."
                );

                return;

            }


            const studentId =
                String(
                    studentIdInput?.value ||
                    ""
                ).trim();


            const fullName =
                String(
                    studentNameInput?.value ||
                    ""
                ).trim();


            if (
                !studentId ||
                !fullName
            ) {

                alert(
                    "Please enter the Student ID and full name."
                );

                return;

            }


            setButtonLoading(
                addStudentButton,
                "Adding..."
            );


            try {

                const studentsRef =
                    collection(
                        db,
                        "students"
                    );


                const duplicateQuery =
                    query(

                        studentsRef,

                        where(
                            "organizationId",
                            "==",
                            currentOrganization.id
                        ),

                        where(
                            "studentId",
                            "==",
                            studentId
                        )

                    );


                const duplicateSnapshot =
                    await getDocs(
                        duplicateQuery
                    );


                if (
                    !duplicateSnapshot.empty
                ) {

                    throw new Error(
                        "This Student ID already exists in this organization."
                    );

                }


                const studentData = {

                    organizationId:
                        currentOrganization.id,

                    classId:
                        selectedClass.id,

                    className:
                        selectedClass.className,

                    studentId:
                        studentId,

                    fullName:
                        fullName,

                    status:
                        "active",

                    createdAt:
                        serverTimestamp(),

                    updatedAt:
                        serverTimestamp(),

                    createdBy:
                        currentUser.uid

                };


                const newStudent =
                    await addDoc(
                        studentsRef,
                        studentData
                    );


                console.log(
                    "✅ Student added:",
                    newStudent.id
                );


                studentForm.reset();


                await loadStudents();


                updateSelectedClassStudentCount();

                renderStudents();


                await loadClasses();

                renderClasses();

                updateStatistics();


                alert(
                    `${fullName} added to ${selectedClass.className}.`
                );

            }

            catch (error) {

                console.error(
                    "❌ Add student error:",
                    error
                );


                alert(
                    error.message ||
                    "Unable to add student."
                );

            }

            finally {

                resetButton(
                    addStudentButton,
                    "+ Add Student"
                );

            }

        }
    );

}


/* =========================================================
   STUDENT SEARCH
========================================================= */

if (studentSearch) {

    studentSearch.addEventListener(
        "input",
        () => {

            studentSearchTerm =
                String(
                    studentSearch.value ||
                    ""
                ).trim()
                .toLowerCase();


            renderStudents();

        }
    );

}


/* =========================================================
   GET FILTERED STUDENTS
========================================================= */

function getFilteredStudents() {

    if (!studentSearchTerm) {

        return selectedStudents;

    }


    return selectedStudents.filter(
        student => {

            const name =
                String(
                    student.fullName ||
                    ""
                ).toLowerCase();


            const id =
                String(
                    student.studentId ||
                    ""
                ).toLowerCase();


            return (
                name.includes(
                    studentSearchTerm
                ) ||
                id.includes(
                    studentSearchTerm
                )
            );

        }
    );

}


/* =========================================================
   RENDER STUDENTS
========================================================= */

function renderStudents() {

    if (!studentList) {

        return;

    }


    if (!selectedClass) {

        studentList.innerHTML = `

            <div class="empty">
                Select a class to view students.
            </div>

        `;


        if (studentCount) {

            studentCount.textContent =
                "0 Students";

        }


        return;

    }


    const filteredStudents =
        getFilteredStudents();


    if (studentCount) {

        if (studentSearchTerm) {

            studentCount.textContent =
                `${filteredStudents.length} of ${selectedStudents.length} Students`;

        }

        else {

            studentCount.textContent =
                `${selectedStudents.length} Student${
                    selectedStudents.length === 1
                        ? ""
                        : "s"
                }`;

        }

    }


    if (!filteredStudents.length) {

        studentList.innerHTML = `

            <div class="empty">

                ${
                    studentSearchTerm
                        ? "No students match your search."
                        : `No students have been added to ${escapeHtml(
                            selectedClass.className
                        )} yet.`
                }

            </div>

        `;

        return;

    }


    studentList.innerHTML =
        "";


    filteredStudents.forEach(
        (student, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "student-row";


            const status =
                String(
                    student.status ||
                    "active"
                ).toLowerCase();


            const statusText =
                status === "inactive"
                    ? "Inactive"
                    : "Active";


            row.innerHTML = `

                <div class="student-number">
                    ${index + 1}
                </div>


                <div>

                    <div class="student-name">

                        ${escapeHtml(
                            student.fullName ||
                            "Unnamed Student"
                        )}

                    </div>


                    <div class="student-status ${status === "inactive" ? "inactive" : "active"}">

                        ${statusText}

                    </div>

                </div>


                <div class="student-id">

                    ${escapeHtml(
                        student.studentId ||
                        ""
                    )}

                </div>


                <div class="student-actions">

                    <button
                        type="button"
                        class="small-button"
                        data-edit-student="${escapeHtml(
                            student.id
                        )}"
                    >
                        Edit
                    </button>


                    <button
                        type="button"
                        class="small-button"
                        data-toggle-student="${escapeHtml(
                            student.id
                        )}"
                    >
                        ${
                            status === "inactive"
                                ? "Activate"
                                : "Deactivate"
                        }
                    </button>


                    <button
                        type="button"
                        class="remove-student"
                        data-remove-student="${escapeHtml(
                            student.id
                        )}"
                    >
                        Remove
                    </button>

                </div>

            `;


            studentList.appendChild(
                row
            );

        }
    );

}


/* =========================================================
   STUDENT BUTTON EVENTS
========================================================= */

if (studentList) {

    studentList.addEventListener(
        "click",
        async event => {

            const editButton =
                event.target.closest(
                    "[data-edit-student]"
                );


            const toggleButton =
                event.target.closest(
                    "[data-toggle-student]"
                );


            const removeButton =
                event.target.closest(
                    "[data-remove-student]"
                );


            if (editButton) {

                await editStudent(
                    editButton.dataset
                        .editStudent
                );

                return;

            }


            if (toggleButton) {

                await toggleStudentStatus(
                    toggleButton.dataset
                        .toggleStudent
                );

                return;

            }


            if (removeButton) {

                await removeStudent(
                    removeButton.dataset
                        .removeStudent,
                    removeButton
                );

            }

        }
    );

}


/* =========================================================
   EDIT STUDENT
========================================================= */

async function editStudent(
    studentDocumentId
) {

    const student =
        selectedStudents.find(
            item =>
                item.id ===
                studentDocumentId
        );


    if (!student) {

        return;

    }


    const newName =
        prompt(
            "Enter student's full name:",
            student.fullName || ""
        );


    if (newName === null) {

        return;

    }


    const cleanName =
        newName.trim();


    if (!cleanName) {

        alert(
            "Student name cannot be empty."
        );

        return;

    }


    const newStudentId =
        prompt(
            "Enter Student ID:",
            student.studentId || ""
        );


    if (newStudentId === null) {

        return;

    }


    const cleanStudentId =
        newStudentId.trim();


    if (!cleanStudentId) {

        alert(
            "Student ID cannot be empty."
        );

        return;

    }


    try {

        /*
           Check duplicate ID if ID changed.
        */

        if (
            cleanStudentId !==
            String(
                student.studentId ||
                ""
            )
        ) {

            const studentsRef =
                collection(
                    db,
                    "students"
                );


            const duplicateQuery =
                query(

                    studentsRef,

                    where(
                        "organizationId",
                        "==",
                        currentOrganization.id
                    ),

                    where(
                        "studentId",
                        "==",
                        cleanStudentId
                    )

                );


            const duplicateSnapshot =
                await getDocs(
                    duplicateQuery
                );


            const duplicate =
                duplicateSnapshot.docs.find(
                    document =>
                        document.id !==
                        studentDocumentId
                );


            if (duplicate) {

                alert(
                    "This Student ID already exists in this organization."
                );

                return;

            }

        }


        await updateDoc(
            doc(
                db,
                "students",
                studentDocumentId
            ),
            {

                fullName:
                    cleanName,

                studentId:
                    cleanStudentId,

                updatedAt:
                    serverTimestamp()

            }
        );


        await loadStudents();

        renderStudents();


        await loadClasses();

        renderClasses();

        updateStatistics();


        alert(
            "Student updated successfully."
        );

    }

    catch (error) {

        console.error(
            "❌ Edit student error:",
            error
        );


        alert(
            error.message ||
            "Unable to update student."
        );

    }

}


/* =========================================================
   TOGGLE STUDENT STATUS
========================================================= */

async function toggleStudentStatus(
    studentDocumentId
) {

    const student =
        selectedStudents.find(
            item =>
                item.id ===
                studentDocumentId
        );


    if (!student) {

        return;

    }


    const currentStatus =
        String(
            student.status ||
            "active"
        ).toLowerCase();


    const newStatus =
        currentStatus ===
        "inactive"
            ? "active"
            : "inactive";


    const actionText =
        newStatus ===
        "active"
            ? "activate"
            : "deactivate";


    const confirmed =
        confirm(
            `Are you sure you want to ${actionText} ${student.fullName}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        await updateDoc(
            doc(
                db,
                "students",
                studentDocumentId
            ),
            {

                status:
                    newStatus,

                updatedAt:
                    serverTimestamp()

            }
        );


        await loadStudents();

        renderStudents();


        alert(
            `${student.fullName} is now ${newStatus}.`
        );

    }

    catch (error) {

        console.error(
            "❌ Student status error:",
            error
        );


        alert(
            error.message ||
            "Unable to change student status."
        );

    }

}


/* =========================================================
   REMOVE STUDENT
========================================================= */

async function removeStudent(
    studentDocumentId,
    button
) {

    const student =
        selectedStudents.find(
            item =>
                item.id ===
                studentDocumentId
        );


    if (!student) {

        return;

    }


    const confirmed =
        confirm(
            `Remove ${student.fullName} from ${selectedClass.className}?`
        );


    if (!confirmed) {

        return;

    }


    if (button) {

        button.disabled =
            true;

    }


    try {

        await deleteDoc(
            doc(
                db,
                "students",
                studentDocumentId
            )
        );


        console.log(
            "✅ Student removed:",
            studentDocumentId
        );


        await loadStudents();


        updateSelectedClassStudentCount();


        renderStudents();


        await loadClasses();

        renderClasses();

        updateStatistics();


    }

    catch (error) {

        console.error(
            "❌ Remove student error:",
            error
        );


        alert(
            error.message ||
            "Unable to remove student."
        );


        if (button) {

            button.disabled =
                false;

        }

    }

}


/* =========================================================
   DELETE CLASS
========================================================= */

async function deleteClass(
    classId
) {

    const classItem =
        classes.find(
            item =>
                item.id ===
                classId
        );


    if (!classItem) {

        return;

    }


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
                classId
            )

        );


    const studentsSnapshot =
        await getDocs(
            studentsQuery
        );


    if (
        studentsSnapshot.size > 0
    ) {

        alert(
            `${classItem.className} has ${studentsSnapshot.size} student(s). Remove the students before deleting the class.`
        );

        return;

    }


    const confirmed =
        confirm(
            `Delete ${classItem.className}?`
        );


    if (!confirmed) {

        return;

    }


    try {

        await deleteDoc(
            doc(
                db,
                "classes",
                classId
            )
        );


        console.log(
            "✅ Class deleted:",
            classId
        );


        if (
            selectedClass &&
            selectedClass.id ===
            classId
        ) {

            selectedClass =
                null;

            selectedStudents =
                [];

            studentSearchTerm =
                "";


            if (selectedClassTitle) {

                selectedClassTitle.textContent =
                    "Select a Class";

            }


            if (selectedClassTeacher) {

                selectedClassTeacher.textContent =
                    "Choose a class above to manage students.";

            }


            if (studentSearch) {

                studentSearch.value =
                    "";

            }


            renderStudents();

        }


        await loadClasses();

        renderClasses();

        updateStatistics();


        alert(
            `${classItem.className} deleted successfully.`
        );

    }

    catch (error) {

        console.error(
            "❌ Delete class error:",
            error
        );


        alert(
            error.message ||
            "Unable to delete class."
        );

    }

}


/* =========================================================
   UPDATE SELECTED CLASS COUNT
========================================================= */

function updateSelectedClassStudentCount() {

    if (!selectedClass) {

        return;

    }


    selectedClass.studentCount =
        selectedStudents.length;


    const classItem =
        classes.find(
            item =>
                item.id ===
                selectedClass.id
        );


    if (classItem) {

        classItem.studentCount =
            selectedStudents.length;

    }

}


/* =========================================================
   UPDATE STATISTICS
========================================================= */

function updateStatistics() {

    const classCount =
        classes.length;


    const studentCountTotal =
        classes.reduce(
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


    const teacherCount =
        classes.filter(
            item =>
                item.formMasterId
        ).length;


    if (totalClasses) {

        totalClasses.textContent =
            classCount;

    }


    if (totalStudents) {

        totalStudents.textContent =
            studentCountTotal;

    }


    if (assignedTeachers) {

        assignedTeachers.textContent =
            teacherCount;

    }

}


/* =========================================================
   GET TEACHER NAME
========================================================= */

function getTeacherName(
    teacher
) {

    return (

        teacher.fullName ||

        teacher.name ||

        teacher.staffName ||

        teacher.employeeName ||

        teacher.email ||

        "Teacher"

    );

}


/* =========================================================
   FIND TEACHER NAME
========================================================= */

function getTeacherNameById(
    teacherId
) {

    if (!teacherId) {

        return "";

    }


    const teacher =
        teachers.find(
            item =>
                item.id ===
                teacherId
        );


    if (!teacher) {

        return "";

    }


    return getTeacherName(
        teacher
    );

}


/* =========================================================
   GRADE NUMBER
========================================================= */

function getGradeNumber(
    className
) {

    const match =
        String(
            className || ""
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
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    text
) {

    if (!button) {

        return;

    }


    button.disabled =
        true;


    button.dataset.originalText =
        button.textContent;


    button.textContent =
        text;

}


/* =========================================================
   RESET BUTTON
========================================================= */

function resetButton(
    button,
    fallbackText
) {

    if (!button) {

        return;

    }


    button.disabled =
        false;


    button.textContent =
        button.dataset.originalText ||
        fallbackText;


    delete button.dataset.originalText;

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
        "❌ Virello Classes Error:",
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
    "✅ Virello classes.js ready."
);
