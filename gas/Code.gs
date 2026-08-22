/**
 * Backend สำหรับแอปบันทึกเงินครอบครัว
 * วิธีติดตั้ง: เปิด Google Sheet ของคุณ > Extensions > Apps Script
 * แล้ววางโค้ดนี้ทับไฟล์ Code.gs ที่มีอยู่ (ให้ script ผูกกับสไปรดชีทนี้โดยตรง)
 * จากนั้นแก้ค่า SECRET ด้านล่างเป็นรหัสของคุณเอง แล้ว Deploy > New deployment
 * ประเภท Web app, Execute as: Me, Who has access: Anyone
 * คัดลอก URL ที่ได้ไปใส่ใน config.js (GAS_URL) และ APP_SECRET ให้ตรงกับ SECRET นี้
 */

const SECRET = "changeme"; // เปลี่ยนเป็นรหัสลับของคุณเอง ต้องตรงกับ APP_SECRET ใน config.js
const HEADERS = ["Timestamp", "วันที่", "หมวดหมู่", "จำนวนเงิน", "บันทึกเพิ่มเติม"];

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (!checkAuth(params.token)) {
    return jsonOutput({ status: "error", message: "Unauthorized" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = {};
  ss.getSheets().forEach(sheet => {
    const name = sheet.getName();
    if (name.startsWith("_")) return; // ข้ามชีทที่ขึ้นต้นด้วย _ (เผื่อใช้เก็บ config อื่นๆ)
    data[name] = readSheet(sheet);
  });

  return jsonOutput({ status: "success", data: data });
}

function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput({ status: "error", message: "ข้อมูลไม่ถูกต้อง" });
  }

  if (!checkAuth(body.token)) {
    return jsonOutput({ status: "error", message: "Unauthorized" });
  }
  if (!body.fund || typeof body.amount === "undefined") {
    return jsonOutput({ status: "error", message: "ข้อมูลไม่ครบถ้วน" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, body.fund);
  sheet.appendRow([
    new Date(),
    body.date || Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"),
    body.fund,
    Number(body.amount) || 0,
    body.note || ""
  ]);

  return jsonOutput({ status: "success" });
}

function checkAuth(token) {
  return String(token) === String(SECRET);
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
  return sheet;
}

function readSheet(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const rows = values.slice(1).filter(r => r[0] !== "" && r[0] !== null);
  return rows.map(r => ({
    timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
    date: r[1] instanceof Date ? Utilities.formatDate(r[1], "GMT+7", "yyyy-MM-dd") : String(r[1]),
    category: r[2],
    amount: Number(r[3]) || 0,
    note: r[4] || ""
  }));
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
