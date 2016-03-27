/* This module contains very simple abstraction layer for all sensor types
   we have (BLE and local)
*/

var WsSensors = function() {};

// Utility function to get sensor data array from all data acquisition modules
WsSensors.prototype.getSensorData = function() {
  var bleSensors = require('./ws-ble-sensors.js');
  var localSensors = require('./ws-local-sensors.js');

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
};

module.exports = new WsSensors();
