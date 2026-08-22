const CONFIG = {
  appName: "บันทึกเงินครอบครัว",

  // วาง URL ของ Google Apps Script Web App ที่ deploy แล้วตรงนี้
  // (ดูวิธีทำใน README.md หัวข้อ "ตั้งค่า Google Apps Script")
  GAS_URL: "https://script.google.com/macros/s/AKfycbxSrz3LoI98rSQ1Yfooi4pJwgUebYDpaGJxp8plQ9E4jqg-3naOzQjmU0KYXy1wx8qmqQ/exec",

  // ต้องตรงกับ SECRET ที่ตั้งไว้ในไฟล์ gas/Code.gs
  // กันไม่ให้คนอื่นที่ไม่รู้รหัสยิงข้อมูลเข้าชีทของเราได้
  APP_SECRET: "0001",

  // รายชื่อกองทุน/ชีท ต้องตรงกับชื่อแท็บในกูเกิลชีทเป๊ะๆ
  // เพิ่ม/ลบ/แก้ไขได้ตามต้องการ ระบบจะสร้างชีทใหม่ให้อัตโนมัติถ้ายังไม่มี
  funds: [
    { id: "ค่าเทอมลูก", name: "ค่าเทอมลูก", icon: "fa-graduation-cap" },
    { id: "เงินเก็บ", name: "เงินเก็บ", icon: "fa-piggy-bank" }
  ]
};
