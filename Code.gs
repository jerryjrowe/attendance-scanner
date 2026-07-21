// ============================================================
// ATTENDANCE SCANNER — Google Apps Script Backend
// ============================================================
// SETUP: See SETUP_GUIDE.md for step-by-step instructions.
//
// This script does three things:
//   1. Receives a QR scan from the tablet scanner page
//   2. Looks up the student in your "Students" sheet
//   3. Appends a timestamped attendance record to your "Attendance" sheet
//
// YOUR SHEET MUST HAVE TWO TABS:
//   Tab named exactly:  Students
//   Tab named exactly:  Attendance
//
// "Students" tab columns (Row 1 is the header row):
//   A: Student Name   (must match exactly what is encoded in the QR code)
//   B: Grade          (optional — can leave blank)
//   C: School         (optional — can leave blank)
//
// "Attendance" tab columns (created automatically if empty):
//   A: Timestamp   B: Student Name   C: Grade   D: School   E: Raw QR Value
// ============================================================

// ---- CONFIGURATION -----------------------------------------
// The name of the school to embed in QR codes (must match what
// you use in the QR Generator page exactly, including spaces).
var SCHOOL_NAME = "My School";

// Separator used between student name and school name in the QR code.
// Default: pipe character |
// Example QR value: "Jane Smith|My School"
// Do NOT change this after you have already printed QR codes.
var QR_SEPARATOR = "|";
// ---- END CONFIGURATION ------------------------------------


// ------------------------------------------------------------
// doGet: Called when the scanner page sends a scan result.
// ------------------------------------------------------------
function doGet(e) {
  // Allow requests from any origin (needed for GitHub Pages → Apps Script)
  var output = handleRequest(e);
  return output;
}

function doPost(e) {
  var output = handleRequest(e);
  return output;
}

function handleRequest(e) {
  try {
    var params = e.parameter;
    var action = params.action;

    if (action === "scan") {
      return handleScan(params.qrValue);
    }

    if (action === "ping") {
      return jsonResponse({ status: "ok", message: "Backend is connected." });
    }

    return jsonResponse({ status: "error", message: "Unknown action: " + action });

  } catch (err) {
    return jsonResponse({ status: "error", message: "Server error: " + err.toString() });
  }
}


// ------------------------------------------------------------
// handleScan: Core logic — look up student, write attendance.
// ------------------------------------------------------------
function handleScan(rawQrValue) {
  if (!rawQrValue || rawQrValue.trim() === "") {
    return jsonResponse({ status: "error", message: "Empty QR value received." });
  }

  var qrValue = rawQrValue.trim();

  // Parse the QR value: "Student Name|School Name"
  var parts = qrValue.split(QR_SEPARATOR);
  var studentName = parts[0].trim();
  var scannedSchool = parts.length > 1 ? parts[1].trim() : "";

  // Optional: reject QR codes from a different school
  if (scannedSchool !== "" && scannedSchool !== SCHOOL_NAME) {
    return jsonResponse({
      status: "error",
      message: "QR code is for a different school: " + scannedSchool
    });
  }

  // Look up the student in the Students sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var studentsSheet = ss.getSheetByName("Students");
  if (!studentsSheet) {
    return jsonResponse({ status: "error", message: "No sheet named 'Students' found." });
  }

  var studentData = studentsSheet.getDataRange().getValues();
  var foundRow = null;

  // Row 0 is the header — start from row 1
  for (var i = 1; i < studentData.length; i++) {
    var nameInSheet = String(studentData[i][0]).trim();
    if (nameInSheet.toLowerCase() === studentName.toLowerCase()) {
      foundRow = studentData[i];
      break;
    }
  }

  // Build the attendance record
  var now = new Date();
  var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  var dateOnly  = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

  var attendanceSheet = ss.getSheetByName("Attendance");
  if (!attendanceSheet) {
    // Create it if it doesn't exist yet
    attendanceSheet = ss.insertSheet("Attendance");
    attendanceSheet.appendRow(["Timestamp", "Date", "Student Name", "Grade", "School", "Raw QR Value"]);
  }

  // Make sure the header row exists if the sheet exists but is empty
  if (attendanceSheet.getLastRow() === 0) {
    attendanceSheet.appendRow(["Timestamp", "Date", "Student Name", "Grade", "School", "Raw QR Value"]);
  }

  if (foundRow) {
    var grade  = foundRow[1] !== undefined ? String(foundRow[1]).trim() : "";
    var school = foundRow[2] !== undefined ? String(foundRow[2]).trim() : SCHOOL_NAME;

    attendanceSheet.appendRow([timestamp, dateOnly, foundRow[0], grade, school, qrValue]);

    return jsonResponse({
      status: "ok",
      studentName: String(foundRow[0]),
      grade: grade,
      school: school,
      timestamp: timestamp
    });

  } else {
    // Student not found in the list — still log it, but flag it as unknown
    attendanceSheet.appendRow([timestamp, dateOnly, studentName, "UNKNOWN", scannedSchool || SCHOOL_NAME, qrValue]);

    return jsonResponse({
      status: "unknown",
      studentName: studentName,
      message: "Student not found in Students sheet. Scan logged anyway."
    });
  }
}


// ------------------------------------------------------------
// jsonResponse: Wraps a JS object as a JSON HTTP response.
// The callback parameter enables JSONP for cross-origin calls.
// ------------------------------------------------------------
function jsonResponse(obj) {
  var json = JSON.stringify(obj);
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
