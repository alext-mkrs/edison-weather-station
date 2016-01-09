var express = require('express');
var router = express.Router();

var bleSensors = require("../../ws-ble-sensors.js");

// Utility function to get sensor data array
function getSensorData() {
  var sensorDataAssoc = bleSensors.getBleSensorData();
  var sensorData = [];

  // creating another array is ugly, but there seems to be no way of iterating over assoc array in Jade
  for (var sensorDataItem in sensorDataAssoc) {
    if (sensorDataAssoc.hasOwnProperty(sensorDataItem)) {
      sensorData.push(sensorDataAssoc[sensorDataItem]);
    }
  }

  // let's sort this alphabetically using full module name string
  // to avoid having a different list each time (that's an assoc array/object)
  return sensorData.sort(function(a, b) {
      if (a.moduleName > b.moduleName) {
          return 1;
      }
      if (a.moduleName < b.moduleName) {
          return -1;
      }

      return 0;
  });
}

// index
router.get('/', function(req, res, next) {
  res.render('index', { sensorData: getSensorData() });
});

// our micro-API endpoint for AJAX
router.get('/get_sensor_data', function(req, res, next) {
  res.send({ data: getSensorData() });
});

module.exports = router;
