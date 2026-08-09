// ============================================================
// ATTENDANCE SCANNER — Google Apps Script Backend
// ============================================================
// SETUP: See SETUP_GUIDE.md for step-by-step instructions.
//
// This script does three things:
//   1. Receives a QR scan from the tablet scanner page
//   2. Looks up the student in your "Students" sheet (optional — see below)
//   3. Updates the "Attendance" sheet — one row per student, with a
//      Check In / Check Out column pair per day. Both the sheet and
//      each day's columns are created automatically the first time
//      they're needed — nothing to pre-build.
//
// YOU DON'T NEED TO PRE-BUILD ANY TABS. A blank spreadsheet works —
// "Attendance" is created automatically the first time someone scans.
//
// "Students" is OPTIONAL. If you add a tab named exactly "Students",
// every scan is checked against it — matches get their grade filled
// in, and scans that don't match anything on the list still get a
// row, but flagged (⚠) so you can catch typos or roster gaps.
// If there's no "Students" tab at all, every scan is just accepted
// as-is with no roster check.
//
// "Students" tab columns, if you use one (Row 1 is the header row):
//   A: Student Name   (must match exactly what is encoded in the QR code)
//   B: Grade          (optional — can leave blank)
//   C: School         (optional — can leave blank)
// ============================================================

// ---- CONFIGURATION -----------------------------------------
// The name of the school to embed in QR codes (must match what
// you use in the QR Generator page). Matching against QR codes is
// case-insensitive, so it's safe to fix typos/capitalization here
// without needing to reprint any already-issued QR codes.
var SCHOOL_NAME = "My School";

// Separator used between student name and school name in the QR code.
// Default: pipe character |
// Example QR value: "Jane Smith|My School"
// Do NOT change this after you have already printed QR codes.
var QR_SEPARATOR = "|";

// Name of the auto-generated per-student attendance sheet.
var MATRIX_SHEET_NAME = "Attendance";
// ---- END CONFIGURATION ------------------------------------


// ------------------------------------------------------------
// doGet / doPost: Called when the scanner page sends a scan result.
// ------------------------------------------------------------
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
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

  // Reject QR codes from a different school. Case-insensitive so that
  // older QR codes printed with different capitalization still work.
  if (scannedSchool !== "" && scannedSchool.toLowerCase() !== SCHOOL_NAME.toLowerCase()) {
    return jsonResponse({
      status: "error",
      message: "QR code is for a different school: " + scannedSchool
    });
  }

  // Multiple scans can arrive at nearly the same instant (two tablets, or a
  // student double-tapping) — serialize the read/write so two scans never
  // both try to create the same day's columns or the same student's row.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (lockErr) {
    return jsonResponse({ status: "error", message: "Server busy — please try scanning again." });
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // "Students" is optional. If it's missing, there's no roster to check
    // against, so every scan is treated as valid rather than flagged.
    var studentsSheet = ss.getSheetByName("Students");
    var rosterConfigured = !!studentsSheet;
    var foundRow = null;

    if (rosterConfigured) {
      var studentData = studentsSheet.getDataRange().getValues();
      // Row 0 is the header — start from row 1
      for (var i = 1; i < studentData.length; i++) {
        var nameInSheet = String(studentData[i][0]).trim();
        if (nameInSheet.toLowerCase() === studentName.toLowerCase()) {
          foundRow = studentData[i];
          break;
        }
      }
    }

    var now = new Date();
    var tz = Session.getScriptTimeZone();
    var timestamp = Utilities.formatDate(now, tz, "yyyy-MM-dd HH:mm:ss");

    // With no roster configured, treat every scan as valid — there's
    // nothing to be "off" from, so nothing gets flagged.
    var isKnown = !rosterConfigured || !!foundRow;

    if (isKnown) {
      var nameToUse = foundRow ? String(foundRow[0]) : studentName;
      var grade  = foundRow && foundRow[1] !== undefined ? String(foundRow[1]).trim() : "";
      var school = foundRow && foundRow[2] !== undefined ? String(foundRow[2]).trim() : SCHOOL_NAME;

      recordAttendanceMatrix_(ss, nameToUse, false, now, tz);

      return jsonResponse({
        status: "ok",
        studentName: nameToUse,
        grade: grade,
        school: school,
        timestamp: timestamp
      });

    } else {
      // Roster exists but this name isn't on it — still gets a row, but flagged
      recordAttendanceMatrix_(ss, studentName, true, now, tz);

      return jsonResponse({
        status: "unknown",
        studentName: studentName,
        message: "Student not found in Students sheet. Scan logged anyway."
      });
    }
  } finally {
    lock.releaseLock();
  }
}


// ------------------------------------------------------------
// recordAttendanceMatrix_: Updates the one-row-per-student,
// two-columns-per-day "Attendance" sheet.
//   - First scan of the day for a student → Check In column.
//   - Every scan after that → overwrites Check Out (last scan wins).
//   - Students not on the roster still get a row, flagged, so
//     staff can spot and fix roster gaps.
// ------------------------------------------------------------
function recordAttendanceMatrix_(ss, studentName, isUnknown, now, tz) {
  var sheet = getOrCreateMatrixSheet_(ss);
  var dateStr = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  var timeStr = Utilities.formatDate(now, tz, "HH:mm");

  var cols = getOrCreateDayColumns_(sheet, dateStr);
  var displayName = isUnknown ? studentName + " ⚠ (not on roster)" : studentName;
  var row = getOrCreateStudentRow_(sheet, displayName, studentName, isUnknown);

  var checkinCell = sheet.getRange(row, cols.checkinCol);
  if (checkinCell.getValue() === "") {
    checkinCell.setValue(timeStr);
  } else {
    sheet.getRange(row, cols.checkoutCol).setValue(timeStr);
  }
}

function getOrCreateMatrixSheet_(ss) {
  var sheet = ss.getSheetByName(MATRIX_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(MATRIX_SHEET_NAME);
    sheet.getRange(1, 1, 2, 1)
      .merge()
      .setValue("Student Name")
      .setFontWeight("bold")
      .setVerticalAlignment("middle");
    sheet.setFrozenRows(2);
    sheet.setFrozenColumns(1);
    sheet.setColumnWidth(1, 200);
  }
  return sheet;
}

// Finds the Check In / Check Out column pair for a given date,
// creating a new pair at the end of the sheet if today hasn't been seen yet.
function getOrCreateDayColumns_(sheet, dateStr) {
  var lastCol = sheet.getLastColumn();

  if (lastCol >= 2) {
    var headerRow = sheet.getRange(1, 2, 1, lastCol - 1).getValues()[0];
    for (var i = 0; i < headerRow.length; i++) {
      if (String(headerRow[i]) === dateStr) {
        var existingCol = i + 2;
        return { checkinCol: existingCol, checkoutCol: existingCol + 1 };
      }
    }
  }

  var newCol = Math.max(lastCol + 1, 2);
  sheet.getRange(1, newCol, 1, 2)
    .merge()
    .setValue(dateStr)
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#f3f3f3");
  sheet.getRange(2, newCol, 1, 2)
    .setValues([["Check In", "Check Out"]])
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setBackground("#f3f3f3");
  sheet.setColumnWidth(newCol, 90);
  sheet.setColumnWidth(newCol + 1, 90);

  return { checkinCol: newCol, checkoutCol: newCol + 1 };
}

// Finds a student's row by name (ignoring the "not on roster" flag suffix).
function scanForStudentRow_(sheet, matchKey) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return null;

  var names = sheet.getRange(3, 1, lastRow - 2, 1).getValues();
  for (var i = 0; i < names.length; i++) {
    var cleaned = String(names[i][0]).replace(/\s*⚠.*$/, "").trim();
    if (cleaned.toLowerCase() === matchKey.toLowerCase()) return 3 + i;
  }
  return null;
}

// Finds the student's row, or creates one and re-sorts the roster
// alphabetically. If a previously-unknown student is now on the roster,
// their flag is cleared automatically.
function getOrCreateStudentRow_(sheet, displayName, matchKey, isUnknown) {
  var row = scanForStudentRow_(sheet, matchKey);

  if (row) {
    if (!isUnknown) {
      var current = String(sheet.getRange(row, 1).getValue());
      if (current !== displayName) {
        sheet.getRange(row, 1).setValue(displayName).setBackground(null).setFontColor(null);
      }
    }
    return row;
  }

  var newRow = Math.max(sheet.getLastRow() + 1, 3);
  var nameCell = sheet.getRange(newRow, 1).setValue(displayName);
  if (isUnknown) {
    nameCell.setBackground("#fff2b2").setFontColor("#7a5c00");
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(3, 1, newRow - 2, lastCol).sort({ column: 1, ascending: true });

  return scanForStudentRow_(sheet, matchKey);
}


// ------------------------------------------------------------
// jsonResponse: Wraps a JS object as a JSON HTTP response.
// ------------------------------------------------------------
function jsonResponse(obj) {
  var json = JSON.stringify(obj);
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}
