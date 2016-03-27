var express = require('express');
var router = express.Router();

var wsSensors = require('../../ws-sensors.js');

// index
router.get('/', function(req, res, next) {
  res.render('index', { sensorData: wsSensors.getSensorData() });
});

// our micro-API endpoint for AJAX
router.get('/get_sensor_data', function(req, res, next) {
  res.send({ sensorData: wsSensors.getSensorData() });
});

module.exports = router;
