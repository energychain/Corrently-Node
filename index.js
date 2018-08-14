#!/usr/bin/env node

var service=require("./service.js");
service(function() {
  console.log("INIT Completed");
});
