/* =========================================================
   VIRELLO TECHNOLOGIES
   ATTENDANCE ALERT SYSTEM
   FILE: js/attendance-alerts.js

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

        if (!attendanceData) {
            return {
                success: false,
                error: "Attendance data missing."
            };
        }


        /* =====================================================
           BASIC ATTENDANCE INFORMATION
        ===================================================== */

        const studentDocumentId =
            attendanceData.studentDocumentId ||
            attendanceData.studentId ||
            "";

        const studentId =
            attendanceData.studentId ||
            attendanceData.studentNumber ||
            "";

        const studentName =
            attendanceData.studentName ||
            "Student";

        const className =
            attendanceData.className ||
            attendanceData.grade ||
            "Class";

        const organizationId =
            attendanceData.organizationId ||
            "";

        const status =
            String(
                attendanceData.status || ""
            )
                .trim()
                .toLowerCase();

        const attendanceDate =
            attendanceData.date ||
            new Date()
                .toISOString()
                .split("T")[0];


        /* =====================================================
           VALIDATION
        ===================================================== */

        if (!studentDocumentId) {

            console.warn(
                "⚠️ Alert skipped: missing student document ID."
            );

            return {
                success: false,
                error: "Missing student ID."
            };

        }


        if (!organizationId) {

            console.warn(
                "⚠️ Alert skipped: missing organization ID."
            );

            return {
                success: false,
                error: "Missing organization ID."
            };

        }


        if (!status) {

            console.warn(
                "⚠️ Alert skipped: missing attendance status."
            );

            return {
                success: false,
                error: "Missing attendance status."
            };

        }


        /* =====================================================
           FIND STUDENT
           
           First search using Firestore document ID.
           Then fallback to studentId field.
        ===================================================== */

        const studentsRef =
            collection(
                db,
                "students"
            );

        let studentSnapshot = null;


        /*
           Search by student document ID
           when available.
        */

        try {

            const documentQuery =
                query(
                    studentsRef,
                    where(
                        "organizationId",
                        "==",
                        organizationId
                    )
                );

            const organizationStudents =
                await getDocs(
                    documentQuery
                );

            const matchingStudent =
                organizationStudents.docs.find(
                    studentDocument =>
                        studentDocument.id ===
                        studentDocumentId
                );

            if (matchingStudent) {

                studentSnapshot = [
                    matchingStudent
                ];

            }

        }

        catch (error) {

            console.warn(
                "⚠️ Student document search failed:",
                error
            );

        }


        /*
           Fallback to studentId field.
        */

        if (
            !studentSnapshot ||
            !studentSnapshot.length
        ) {

            if (studentId) {

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

                const result =
                    await getDocs(
                        studentQuery
                    );

                studentSnapshot =
                    result.docs;

            }

        }


        if (
            !studentSnapshot ||
            !studentSnapshot.length
        ) {

            console.warn(
                "⚠️ Student not found for attendance alert:",
                studentDocumentId
            );

            return {
                success: false,
                error: "Student not found."
            };

        }


        const studentDocument =
            studentSnapshot[0];

        const studentData =
            studentDocument.data();


        /* =====================================================
           PARENT LINK INFORMATION
           
           Support both:
           
           1. parentUid directly on student
           2. parentStudentLinks collection
        ===================================================== */

        let parentAccounts = [];


        /* =====================================================
           METHOD 1
           PARENT INFORMATION ON STUDENT
        ===================================================== */

        const directParentUid =
            studentData.parentUid ||
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
           parentStudentLinks COLLECTION
        ===================================================== */

        try {

            const linksRef =
                collection(
                    db,
                    "parentStudentLinks"
                );

            const linksQuery =
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
                        studentDocumentId
                    )

                );


            const linksSnapshot =
                await getDocs(
                    linksQuery
                );


            linksSnapshot.forEach(
                linkDocument => {

                    const link =
                        linkDocument.data();


                    const parentUid =
                        link.parentUid ||
                        link.parentId ||
                        link.uid ||
                        "";


                    const parentId =
                        link.parentId ||
                        "";


                    const parentEmail =
                        link.parentEmail ||
                        "";


                    const parentName =
                        link.parentName ||
                        "Parent";


                    if (
                        parentUid ||
                        parentId ||
                        parentEmail
                    ) {

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

                }
            );

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


                if (
                    !key ||
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
           NO PARENT
        ===================================================== */

        if (
            !uniqueParents.length
        ) {

            console.log(
                "ℹ️ No parent linked to:",
                studentName
            );

            return {

                success: true,

                alertsCreated: 0,

                message:
                    "No parent account is linked to this student."

            };

        }


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

                success: true,

                alertsCreated: 0,

                message:
                    "No alert required for this status."

            };

        }


        /* =====================================================
           CREATE ALERT FOR EVERY PARENT
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
                    parent.parentUid || "",

                parentId:
                    parent.parentId || "",

                parentEmail:
                    parent.parentEmail || "",

                parentName:
                    parent.parentName || "Parent",


                /* =========================
                   STUDENT
                ========================= */

                studentDocumentId:
                    studentDocument.id,

                studentId:
                    studentId,

                studentName:
                    studentName,

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
                alertReference.id,
                parent.parentUid ||
                parent.parentEmail,
                studentName,
                status
            );

        }


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

            error:
                error

        };

    }

}


/* =========================================================
   FINAL
========================================================= */

console.log(
    "✅ Virello attendance-alerts.js loaded."
);
