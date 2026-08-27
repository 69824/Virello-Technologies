/* =========================================================
   VIRELLO TECHNOLOGIES
   ATTENDANCE ALERT SYSTEM

   FILE:
   js/attendance-alerts.js

   PURPOSE:
   Create attendance alerts for linked parents.

   FIRESTORE COLLECTION:
   attendanceAlerts

   FLOW:

   FORM MASTER
        ↓
   ATTENDANCE SAVED
        ↓
   STUDENT FOUND
        ↓
   PARENT LINK FOUND
        ↓
   attendanceAlerts
        ↓
   PARENT DASHBOARD

   IMPORTANT:
   This version supports parent links using:

   1. Student Firestore document ID
   2. Student ID / student number
   3. Direct parent information stored on student
========================================================= */


import {
    collection,
    addDoc,
    serverTimestamp,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


import {
    db
} from "./firebase-config.js";


/* =========================================================
   CREATE ATTENDANCE ALERT
========================================================= */

export async function createAttendanceAlert(
    attendanceData
) {

    try {

        /* =====================================================
           VALIDATE INPUT
        ===================================================== */

        if (!attendanceData) {

            return {
                success: false,
                alertsCreated: 0,
                error: "Attendance data missing."
            };

        }


        /* =====================================================
           BASIC ATTENDANCE INFORMATION
        ===================================================== */

        const organizationId =
            attendanceData.organizationId ||
            "";


        const studentDocumentId =
            attendanceData.studentDocumentId ||
            attendanceData.studentFirestoreId ||
            attendanceData.studentId ||
            "";


        const studentId =
            attendanceData.studentId ||
            attendanceData.studentNumber ||
            "";


        const studentNumber =
            attendanceData.studentNumber ||
            attendanceData.studentId ||
            "";


        const studentName =
            attendanceData.studentName ||
            "Student";


        const className =
            attendanceData.className ||
            attendanceData.grade ||
            "Class";


        const attendanceDate =
            attendanceData.date ||
            new Date()
                .toISOString()
                .split("T")[0];


        const status =
            String(
                attendanceData.status ||
                ""
            )
                .trim()
                .toLowerCase();


        /* =====================================================
           VALIDATION
        ===================================================== */

        if (!organizationId) {

            console.warn(
                "⚠️ Alert skipped: missing organization ID."
            );

            return {
                success: false,
                alertsCreated: 0,
                error: "Missing organization ID."
            };

        }


        if (!status) {

            console.warn(
                "⚠️ Alert skipped: missing attendance status."
            );

            return {
                success: false,
                alertsCreated: 0,
                error: "Missing attendance status."
            };

        }


        if (!studentDocumentId && !studentId) {

            console.warn(
                "⚠️ Alert skipped: missing student identifier."
            );

            return {
                success: false,
                alertsCreated: 0,
                error: "Missing student ID."
            };

        }


        /* =====================================================
           FIND STUDENT
        ===================================================== */

        const studentsRef =
            collection(
                db,
                "students"
            );


        let studentDocument = null;


        /* =====================================================
           METHOD 1
           FIND BY FIRESTORE DOCUMENT ID

           We first load organization students and compare
           the Firestore document ID.
        ===================================================== */

        try {

            const organizationStudentsQuery =
                query(
                    studentsRef,

                    where(
                        "organizationId",
                        "==",
                        organizationId
                    )
                );


            const organizationStudentsSnapshot =
                await getDocs(
                    organizationStudentsQuery
                );


            const matchingStudent =
                organizationStudentsSnapshot.docs.find(
                    studentDoc => {

                        return (
                            studentDoc.id ===
                            studentDocumentId
                        );

                    }
                );


            if (matchingStudent) {

                studentDocument =
                    matchingStudent;

            }

        }

        catch (error) {

            console.warn(
                "⚠️ Student document ID lookup failed:",
                error
            );

        }


        /* =====================================================
           METHOD 2
           FIND BY studentId FIELD
        ===================================================== */

        if (!studentDocument && studentId) {

            try {

                const studentQuery =
                    query(

                        studentsRef,

                        where(
                            "organizationId",
                            "==",
                            organizationId
                        ),

                        where(
                            "studentId",
                            "==",
                            studentId
                        )

                    );


                const snapshot =
                    await getDocs(
                        studentQuery
                    );


                if (!snapshot.empty) {

                    studentDocument =
                        snapshot.docs[0];

                }

            }

            catch (error) {

                console.warn(
                    "⚠️ studentId lookup failed:",
                    error
                );

            }

        }


        /* =====================================================
           METHOD 3
           FIND BY studentNumber FIELD
        ===================================================== */

        if (
            !studentDocument &&
            studentNumber
        ) {

            try {

                const studentNumberQuery =
                    query(

                        studentsRef,

                        where(
                            "organizationId",
                            "==",
                            organizationId
                        ),

                        where(
                            "studentNumber",
                            "==",
                            studentNumber
                        )

                    );


                const snapshot =
                    await getDocs(
                        studentNumberQuery
                    );


                if (!snapshot.empty) {

                    studentDocument =
                        snapshot.docs[0];

                }

            }

            catch (error) {

                console.warn(
                    "⚠️ studentNumber lookup failed:",
                    error
                );

            }

        }


        /* =====================================================
           STUDENT NOT FOUND
        ===================================================== */

        if (!studentDocument) {

            console.warn(
                "⚠️ Student not found for attendance alert:",
                {
                    studentDocumentId,
                    studentId,
                    studentNumber,
                    organizationId
                }
            );


            return {
                success: false,
                alertsCreated: 0,
                error: "Student not found."
            };

        }


        const studentData =
            studentDocument.data();


        console.log(
            "✅ Student found for attendance alert:",
            {
                id:
                    studentDocument.id,

                studentId:
                    studentData.studentId,

                studentName:
                    studentData.fullName ||
                    studentName
            }
        );


        /* =====================================================
           PARENT ACCOUNTS
        ===================================================== */

        let parentAccounts = [];


        /* =====================================================
           METHOD 1
           DIRECT PARENT INFORMATION ON STUDENT
        ===================================================== */

        const directParentUid =
            studentData.parentUid ||
            studentData.parentUserId ||
            "";


        const directParentId =
            studentData.parentId ||
            "";


        const directParentEmail =
            studentData.parentEmail ||
            "";


        const directParentName =
            studentData.parentName ||
            "Parent";


        if (
            directParentUid ||
            directParentId ||
            directParentEmail
        ) {

            parentAccounts.push({

                parentUid:
                    directParentUid,

                parentId:
                    directParentId,

                parentEmail:
                    directParentEmail,

                parentName:
                    directParentName

            });

        }


        /* =====================================================
           METHOD 2
           parentStudentLinks

           IMPORTANT:

           We search using BOTH:

           student Firestore document ID

           AND

           studentId field

           AND

           studentNumber field
        ===================================================== */

        try {

            const linksRef =
                collection(
                    db,
                    "parentStudentLinks"
                );


            /*
               Search using student document ID.
            */

            if (studentDocument.id) {

                try {

                    const linksByDocumentIdQuery =
                        query(

                            linksRef,

                            where(
                                "organizationId",
                                "==",
                                organizationId
                            ),

                            where(
                                "studentId",
                                "==",
                                studentDocument.id
                            )

                        );


                    const linksSnapshot =
                        await getDocs(
                            linksByDocumentIdQuery
                        );


                    linksSnapshot.forEach(
                        linkDocument => {

                            addParentFromLink(
                                parentAccounts,
                                linkDocument.data()
                            );

                        }
                    );

                }

                catch (error) {

                    console.warn(
                        "⚠️ Parent link document-ID lookup failed:",
                        error
                    );

                }

            }


            /*
               Search using the student's studentId.
            */

            if (
                studentData.studentId &&
                studentData.studentId !==
                studentDocument.id
            ) {

                try {

                    const linksByStudentIdQuery =
                        query(

                            linksRef,

                            where(
                                "organizationId",
                                "==",
                                organizationId
                            ),

                            where(
                                "studentId",
                                "==",
                                studentData.studentId
                            )

                        );


                    const linksSnapshot =
                        await getDocs(
                            linksByStudentIdQuery
                        );


                    linksSnapshot.forEach(
                        linkDocument => {

                            addParentFromLink(
                                parentAccounts,
                                linkDocument.data()
                            );

                        }
                    );

                }

                catch (error) {

                    console.warn(
                        "⚠️ Parent link studentId lookup failed:",
                        error
                    );

                }

            }


            /*
               Search using studentNumber.
            */

            if (
                studentData.studentNumber &&
                studentData.studentNumber !==
                studentDocument.id &&
                studentData.studentNumber !==
                studentData.studentId
            ) {

                try {

                    const linksByStudentNumberQuery =
                        query(

                            linksRef,

                            where(
                                "organizationId",
                                "==",
                                organizationId
                            ),

                            where(
                                "studentNumber",
                                "==",
                                studentData.studentNumber
                            )

                        );


                    const linksSnapshot =
                        await getDocs(
                            linksByStudentNumberQuery
                        );


                    linksSnapshot.forEach(
                        linkDocument => {

                            addParentFromLink(
                                parentAccounts,
                                linkDocument.data()
                            );

                        }
                    );

                }

                catch (error) {

                    console.warn(
                        "⚠️ Parent link studentNumber lookup failed:",
                        error
                    );

                }

            }

        }

        catch (error) {

            console.warn(
                "⚠️ Parent link lookup failed:",
                error
            );

        }


        /* =====================================================
           REMOVE DUPLICATE PARENTS
        ===================================================== */

        const uniqueParents =
            [];


        const parentKeys =
            new Set();


        parentAccounts.forEach(
            parent => {

                const key =
                    parent.parentUid ||
                    parent.parentId ||
                    parent.parentEmail ||
                    "";


                if (!key) {
                    return;
                }


                if (
                    parentKeys.has(key)
                ) {
                    return;
                }


                parentKeys.add(key);


                uniqueParents.push(
                    parent
                );

            }
        );


        /* =====================================================
           NO PARENT LINKED
        ===================================================== */

        if (!uniqueParents.length) {

            console.log(
                "ℹ️ No parent linked to:",
                studentName
            );


            return {

                success:
                    true,

                alertsCreated:
                    0,

                message:
                    "No parent account is linked to this student."

            };

        }


        console.log(
            "👨‍👩‍👧 Parent accounts found:",
            uniqueParents.length
        );


        /* =====================================================
           BUILD ALERT
        ===================================================== */

        let alertType =
            "";


        let title =
            "";


        let message =
            "";


        let icon =
            "";


        if (
            status === "present" ||
            status === "p"
        ) {

            alertType =
                "present";


            title =
                "ATTENDANCE CONFIRMED";


            icon =
                "🟢";


            message =
                `Your child ${studentName}, ${className}, was marked Present today.`;

        }


        else if (
            status === "late" ||
            status === "l"
        ) {

            alertType =
                "late";


            title =
                "LATE ARRIVAL";


            icon =
                "🟡";


            message =
                `Your child ${studentName}, ${className}, arrived at school and was marked Late today.`;

        }


        else if (
            status === "absent" ||
            status === "a"
        ) {

            alertType =
                "absent";


            title =
                "ABSENCE ALERT";


            icon =
                "🔴";


            message =
                `Your child ${studentName}, ${className}, has been marked Absent today.`;

        }


        else {

            return {

                success:
                    true,

                alertsCreated:
                    0,

                message:
                    "No alert required for this status."

            };

        }


        /* =====================================================
           CREATE ALERT FOR EACH PARENT
        ===================================================== */

        let alertsCreated =
            0;


        for (
            const parent
            of uniqueParents
        ) {

            const alertData = {

                /* =========================
                   PARENT
                ========================= */

                parentUid:
                    parent.parentUid ||
                    "",


                parentId:
                    parent.parentId ||
                    "",


                parentEmail:
                    parent.parentEmail ||
                    "",


                parentName:
                    parent.parentName ||
                    "Parent",


                /* =========================
                   STUDENT
                ========================= */

                studentDocumentId:
                    studentDocument.id,


                studentId:
                    studentData.studentId ||
                    studentId ||
                    "",


                studentNumber:
                    studentData.studentNumber ||
                    studentNumber ||
                    "",


                studentName:
                    studentData.fullName ||
                    studentName,


                classId:
                    studentData.classId ||
                    selectedClassIdFromAttendance(
                        attendanceData
                    ),


                className:
                    className,


                /* =========================
                   ORGANIZATION
                ========================= */

                organizationId:
                    organizationId,


                /* =========================
                   ATTENDANCE
                ========================= */

                attendanceId:
                    attendanceData.attendanceId ||
                    attendanceData.id ||
                    "",


                attendanceDate:
                    attendanceDate,


                attendanceStatus:
                    status,


                /* =========================
                   ALERT
                ========================= */

                type:
                    alertType,


                icon:
                    icon,


                title:
                    title,


                message:
                    message,


                /* =========================
                   PARENT DASHBOARD
                ========================= */

                read:
                    false,


                createdAt:
                    serverTimestamp()

            };


            const alertReference =
                await addDoc(

                    collection(
                        db,
                        "attendanceAlerts"
                    ),

                    alertData

                );


            alertsCreated++;


            console.log(
                "🔔 Parent attendance alert created:",
                {
                    alertId:
                        alertReference.id,

                    parent:
                        parent.parentUid ||
                        parent.parentEmail,

                    student:
                        studentName,

                    status:
                        status
                }
            );

        }


        /* =====================================================
           SUCCESS
        ===================================================== */

        return {

            success:
                true,

            alertsCreated:
                alertsCreated,

            type:
                alertType

        };

    }

    catch (error) {

        console.error(
            "❌ Attendance alert creation failed:",
            error
        );


        return {

            success:
                false,

            alertsCreated:
                0,

            error:
                error.message ||
                error

        };

    }

}


/* =========================================================
   ADD PARENT FROM LINK
========================================================= */

function addParentFromLink(
    parentAccounts,
    link
) {

    if (!link) {
        return;
    }


    const parentUid =
        link.parentUid ||
        link.parentUserId ||
        link.parentUid ||
        link.uid ||
        "";


    const parentId =
        link.parentId ||
        "";


    const parentEmail =
        link.parentEmail ||
        link.email ||
        "";


    const parentName =
        link.parentName ||
        link.parentFullName ||
        link.fullName ||
        "Parent";


    if (
        !parentUid &&
        !parentId &&
        !parentEmail
    ) {

        return;

    }


    parentAccounts.push({

        parentUid:
            parentUid,

        parentId:
            parentId,

        parentEmail:
            parentEmail,

        parentName:
            parentName

    });

}


/* =========================================================
   GET CLASS ID FROM ATTENDANCE
========================================================= */

function selectedClassIdFromAttendance(
    attendanceData
) {

    return (
        attendanceData?.classId ||
        ""
    );

}


/* =========================================================
   FINAL
========================================================= */

console.log(
    "✅ Virello attendance-alerts.js loaded successfully."
);
