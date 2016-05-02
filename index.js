// Copyright (c) 2016 Clarence Ho (clarenceho at gmail dot com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

var fs = require("fs");
var url = require("url");
var queryString = require("querystring");
var https = require("https");
var express = require("express");
var session = require('express-session');
var u2fserver = require("node-u2flib-server");

// SSL keys for https connection
var privateKey  = fs.readFileSync("sslcert/private-key.pem", "utf8");
var certificate = fs.readFileSync("sslcert/server.pem", "utf8");
var credentials = { key: privateKey, cert: certificate };

var app = express();
app.use(session({secret: 'abcde', resave: true, saveUninitialized: true}));
// setup static contents and template
app.use("/js", express.static("js"));
app.use("/css", express.static("css"));
app.set("view engine", "pug");

const HOSTNAME = "localhost";
const PORT_NUM = 4430;
const APP_ID = "https://" + HOSTNAME + ":" + PORT_NUM;
const BEGIN_ENROLL_ADDR = "/beginEnroll";
const FINISH_ENROLL_ADDR = "/finishEnroll";
const BEGIN_AUTHEN_ADDR = "/beginAuthen";
const FINISH_AUTHEN_ADDR = "/finishAuthen";

app.get(BEGIN_ENROLL_ADDR, function(req, res) {
  var challenge = u2fserver.startRegistration(APP_ID);
  req.session.challenge = challenge;

  res.setHeader('Content-Type', 'application/json');
  res.send(challenge);
});

app.get(FINISH_ENROLL_ADDR, function(req, res) {
  var challenge = req.session.challenge;
  var theUrl = url.parse(req.url);
  var deviceResponse = queryString.parse(theUrl.query);

  console.log("The challenge saved is: %s", JSON.stringify(challenge, null, "\t"));
  console.log("The received device response is: %s", JSON.stringify(deviceResponse, null, "\t"));
  console.log("Parse the device response to finish the registration...");

  var registration = {};
  var returnCode = 0;
  try {
    registration = u2fserver.finishRegistration(challenge, deviceResponse);
    console.log("Registration data: %s", JSON.stringify(registration, null, "\t"));

    // In real life, the registration info should be persisted.
    // Here we just store it in session
    req.session.challenge = null;
    if (!req.session.registration) {
      req.session.registration = [];
    }
    req.session.registration.push(registration);
    console.log("Updated session: ", req.session.registration);

  } catch (err) {
    console.log("Problem with registration: " + err);
    returnCode = err;
  }

  // In real life there is no need to send the registration data back to client.
  // We do it here just so that it can be printed out on the browser
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ code: returnCode, registration: registration }));

});

app.get(BEGIN_AUTHEN_ADDR, function(req, res) {

  // In real life the RP initiate the authentiate request after initial login
  console.log("Goging to authenticate client of this keyHandle: ", req.query);

  // Get the token registration data from session.  In real life,
  // the data is probably persisted in database during registration
  var devReg = req.session.registration.filter(function (reg) {
    return reg.keyHandle == req.query.keyHandle;
  });

  var startAuthen = u2fserver.startAuthentication(APP_ID, devReg[0]);
  req.session.startAuthen = startAuthen;
  req.session.devReg = devReg[0];

  res.setHeader('Content-Type', 'application/json');
  res.send(startAuthen);
});

app.get(FINISH_AUTHEN_ADDR, function(req, res) {
  var startAuthen = req.session.startAuthen;
  var devReg = req.session.devReg;
  var theUrl = url.parse(req.url);
  var deviceResponse = queryString.parse(theUrl.query);

  console.log("The authentication data saved is: %s", JSON.stringify(startAuthen, null, "\t"));
  console.log("The received device response is: %s", JSON.stringify(deviceResponse, null, "\t"));
  console.log("Validate the response...");

  var authentication = {};
  var returnCode = 0;
  try {
    authentication = u2fserver.finishAuthentication(
      startAuthen,
      deviceResponse,
      devReg);
    console.log("Authentication result: %s", JSON.stringify(authentication, null, "\t"));

    req.session.startAuthen = null;
    req.session.devReg = null;


  } catch (err) {
    console.log("Problem with authentication: " + err);
    returnCode = err;
  }

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ code: returnCode, authentication: authentication }));

});

app.get("/demo", function(req, res) {
  res.render(
    "demo",
    {
      BEGIN_ENROLL_ADDR_KEY: BEGIN_ENROLL_ADDR,
      FINISH_ENROLL_ADDR_KEY: FINISH_ENROLL_ADDR,
      BEGIN_AUTHEN_ADDR_KEY: BEGIN_AUTHEN_ADDR,
      FINISH_AUTHEN_ADDR_KEY: FINISH_AUTHEN_ADDR,
    }
  );
});

app.get("/loop", function(req, res) {
  res.render(
    "loop"
  );
});


var server = https
  .createServer(credentials, app)
  .listen(PORT_NUM, HOSTNAME, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log("U2F demo app started at http://%s:%s", host, port);
});
