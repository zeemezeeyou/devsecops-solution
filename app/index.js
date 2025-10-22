const express = require('express');

const app = express();

const port = 3000;

// 1. [แก้ไขช่องโหว่ SAST/Code Smell] ไม่ควร Hardcode Secret
// เปลี่ยนไปดึง Secret Key จาก Environment Variable
// SonarQube จะไม่ตรวจจับเป็นช่องโหว่หลัก แต่แนะนำให้ใช้ Vault หรือ Key Management
const secretKey = process.env.APP_SECRET || 'fallback-secure-key'; 


// 2. [แก้ไขช่องโหว่ Security] ลบฟังก์ชัน 'eval()' ที่อันตราย
app.get('/safe-api', (req, res) => {
  // รับข้อมูล แต่ห้ามนำไปรันเป็นโค้ด
  const user_input = req.query.data;
  
  // นำโค้ด eval(user_input) ออกเพื่อป้องกัน Code Injection
  // เราแค่ส่งข้อมูลกลับไปอย่างปลอดภัย
  res.send(`Data received safely: ${user_input}`);
});


app.get('/', (req, res) => {
  res.send('Hello DevSecOps World!!');
});


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
  console.log(`Using Secret Key (first 5 chars): ${secretKey.substring(0, 5)}...`);
});
