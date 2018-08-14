#!/usr/bin/env node

var startStopDaemon = require('start-stop-daemon');

startStopDaemon({}, function() {

  var service=require("./service.js");
  service(function() {
    console.log("INIT Completed");
  });
  
});
