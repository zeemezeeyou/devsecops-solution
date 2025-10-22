const express = require('express');
const app = express();
const port = 3000;

// [ช่องโหว่ SAST/Code Smell]
var secretKey = 'my-insecure-key'; 

// [ช่องโหว่ Security (Insecure Function)]
app.get('/unsafe-api', (req, res) => {
  const user_input = req.query.data;
  eval(user_input); // <-- SonarQube จะตรวจจับ
  res.send(`Data received: ${user_input}`);
});

app.get('/', (req, res) => {
  res.send('Hello DevSecOps World!!');
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});