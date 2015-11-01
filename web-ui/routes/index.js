var express = require('express');
var router = express.Router();

var bleSensors = require("../../ws-ble-sensors.js");

// initial router
router.get('/', function(req, res, next) {
  var sensorModulesAssoc = bleSensors.getBleSensorModules();
  var sensorModules = [];

  // creating another array is ugly, but I can't find a way to iterate over assoc array in Jade
  for (var sensorModule in sensorModulesAssoc) {
    if (sensorModulesAssoc.hasOwnProperty(sensorModule)) {
      sensorModules.push(sensorModulesAssoc[sensorModule]);
    }
  }

  res.render('index', { title: 'Weather station information', sensorModules: sensorModules });
});

module.exports = router;
