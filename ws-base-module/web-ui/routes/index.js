var express = require('express');
var router = express.Router();

var bleSensors = require('../../ws-ble-sensors.js');
var localSensors = require('../../ws-local-sensors.js');

// Utility function to get sensor data array from data acquisition module
function getSensorData() {
  var bleSensorDataAssoc = bleSensors.getBleSensorData();
  var localSensorDataAssoc = localSensors.getLocalSensorData();
  var sensorData = [];

  // creating another array is ugly, but there seems to be no way of iterating over assoc array in Jade
  // first, let's add data from BLE sensors
  for (var sensorDataItem in bleSensorDataAssoc) {
    if (bleSensorDataAssoc.hasOwnProperty(sensorDataItem)) {
      sensorData.push(bleSensorDataAssoc[sensorDataItem]);
    }
  }

  // next, the local ones
  for (sensorDataItem in localSensorDataAssoc) {
    if (localSensorDataAssoc.hasOwnProperty(sensorDataItem)) {
      sensorData.push(localSensorDataAssoc[sensorDataItem]);
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
