const express = require('express');
const mysql = require('promise-mysql');
const cors = require('express-cors');

var corsOptions = {
  origin: true,
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
}


// Express middleware
const bodyParser = require('body-parser');
const morgan = require('morgan');
const checkLoginToken = require('./lib/check-login-token.js');

// Data loader
const middlewhereDataLoader = require('./lib/middlewhere.js');

// Controllers
const authController = require('./controllers/auth.js');
const projectsController = require('./controllers/projects.js');
const tasksController = require('./controllers/tasks.js');


// Database / data loader initialization
const connection = mysql.createPool({
  user: 'root',
  password: '',
  database: 'middlewhere'
});

const dataLoader = new middlewhereDataLoader(connection);


// Express initialization
const app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});


app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(checkLoginToken(dataLoader));


// app.use(cors({
//   allowedOrigins: [
//     'http://localhost:3000','https://23ab8953.ngrok.io'
//   ],
// }));


app.use('/auth', authController(dataLoader));
app.use('/projects', projectsController(dataLoader));
app.use('/tasks', tasksController(dataLoader));

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  if (process.env.C9_HOSTNAME) {
    console.log(`Web server is listening on https://${process.env.C9_HOSTNAME}`);
  } else {
    console.log(`Web server is listening on http://localhost:${port}`);
  }
});
