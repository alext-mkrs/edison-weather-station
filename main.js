var blesensors = require("./ws-ble-sensors.js");
var webui = require("./web-ui/bin/www");

console.log("Starting main app");

setInterval(function() { console.log(blesensors.getBleSensorModules()) }, 5000);
