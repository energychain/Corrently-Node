
var init = require("./init.js");
init(function() {
  var service=require("./service.js");
  service(function() {
    console.log("INIT Completed");
  });
});
