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
   - Create Grade 1 - Grade 9
   - Assign Form Master
   - Load classes
   - Select class
   - Add students
   - Remove students
   - Display class statistics
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


/* =========================================================
   DOM
========================================================= */

const loadingScreen =
    document.getElementById(
        "loadingScreen"
    );


const errorScreen =
    document.getElementById(
        "errorScreen"
    );


const errorMessage =
    document.getElementById(
        "errorMessage"
    );


const adminName =
    document.getElementById(
        "adminName"
    );


const organizationName =
    document.getElementById(
        "organizationName"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const classForm =
    document.getElementById(
        "classForm"
    );


const classNameInput =
    document.getElementById(
        "className"
    );


const formMasterInput =
    document.getElementById(
        "formMaster"
    );


const createClassButton =
    document.getElementById(
        "createClassButton"
    );


const classList =
    document.getElementById(
        "classList"
    );


const totalClasses =
    document.getElementById(
        "totalClasses"
    );


const totalStudents =
    document.getElementById(
        "totalStudents"
    );


const assignedTeachers =
    document.getElementById(
        "assignedTeachers"
    );


const selectedClassTitle =
    document.getElementById(
        "selectedClassTitle"
    );


const selectedClassTeacher =
    document.getElementById(
        "selectedClassTeacher"
    );


const studentCount =
    document.getElementById(
        "studentCount"
    );


const studentForm =
    document.getElementById(
        "studentForm"
    );


const studentIdInput =
    document.getElementById(
        "studentIdInput"
    );


const studentNameInput =
    document.getElementById(
        "studentNameInput"
    );


const addStudentButton =
    document.getElementById(
        "addStudentButton"
    );


const studentList =
    document.getElementById(
        "studentList"
    );


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


                currentUser =
                    user;


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


        /*
           Load number of students
           from students collection.
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


    /*
       Sort Grade 1 -> Grade 9
    */

    classes.sort(
        (a, b) =>
            getGradeNumber(a.className) -
            getGradeNumber(b.className)
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
                classNameInput?.value;


            const formMasterId =
                formMasterInput?.value ||
                "";


            if (!className) {

                alert(
                    "Please select a class."
                );

                return;

            }


            /*
               Prevent duplicate classes.
            */

            const existing =
                classes.find(
                    item =>
                        String(
                            item.className
                        ).toLowerCase() ===
                        String(
                            className
                        ).toLowerCase()
                );


            if (existing) {

                alert(
                    `${className} already exists.`
                );

                return;

            }


            if (createClassButton) {

                createClassButton.disabled =
                    true;

                createClassButton.textContent =
                    "Creating...";

            }


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


                alert(
                    `${className} created successfully.`
                );


                classForm.reset();


                await loadClasses();


                renderClasses();


                updateStatistics();


                /*
                   Automatically select
                   the newly created class.
                */

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

                if (createClassButton) {

                    createClassButton.disabled =
                        false;

                    createClassButton.textContent =
                        "+ Create Class";

                }

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
                        ${classItem.studentCount}
                        Students
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
   SELECT CLASS
========================================================= */

async function selectClass(
    classItem
) {

    selectedClass =
        classItem;


    renderClasses();


    selectedClassTitle.textContent =
        classItem.className;


    const teacherName =
        classItem.formMasterName ||
        getTeacherNameById(
            classItem.formMasterId
        ) ||
        "No Form Master assigned";


    selectedClassTeacher.textContent =
        `Form Master: ${teacherName}`;


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
                    studentIdInput.value ||
                    ""
                ).trim();


            const fullName =
                String(
                    studentNameInput.value ||
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


            if (addStudentButton) {

                addStudentButton.disabled =
                    true;

                addStudentButton.textContent =
                    "Adding...";

            }


            try {

                /*
                   Prevent duplicate Student ID
                   inside the organization.
                */

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

                if (addStudentButton) {

                    addStudentButton.disabled =
                        false;

                    addStudentButton.textContent =
                        "+ Add Student";

                }

            }

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


        studentCount.textContent =
            "0 Students";


        return;

    }


    studentCount.textContent =
        `${selectedStudents.length} Student${
            selectedStudents.length === 1
                ? ""
                : "s"
        }`;


    if (!selectedStudents.length) {

        studentList.innerHTML = `

            <div class="empty">
                No students have been added to
                ${escapeHtml(
                    selectedClass.className
                )}
                yet.
            </div>

        `;

        return;

    }


    studentList.innerHTML =
        "";


    selectedStudents.forEach(
        (student, index) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "student-row";


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

                </div>


                <div class="student-id">
                    ${escapeHtml(
                        student.studentId ||
                        ""
                    )}
                </div>


                <div>

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
   REMOVE STUDENT
========================================================= */

if (studentList) {

    studentList.addEventListener(
        "click",
        async event => {

            const button =
                event.target.closest(
                    "[data-remove-student]"
                );


            if (!button) {

                return;

            }


            const studentId =
                button.dataset
                    .removeStudent;


            const student =
                selectedStudents.find(
                    item =>
                        item.id ===
                        studentId
                );


            if (!student) {

                return;

            }


            const confirmed =
                confirm(
                    `Remove ${
                        student.fullName
                    } from ${
                        selectedClass.className
                    }?`
                );


            if (!confirmed) {

                return;

            }


            button.disabled =
                true;


            try {

                await deleteDoc(
                    doc(
                        db,
                        "students",
                        studentId
                    )
                );


                console.log(
                    "✅ Student removed:",
                    studentId
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


                button.disabled =
                    false;

            }

        }
    );

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


    /*
       Check whether class has students.
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


            selectedClassTitle.textContent =
                "Select a Class";


            selectedClassTeacher.textContent =
                "Choose a class above to manage students.";


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


    const studentCount =
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
            studentCount;

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
