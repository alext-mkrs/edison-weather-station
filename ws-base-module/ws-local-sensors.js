// BMP180 module from UPM lib
var upm_bmpx8x = require('jsupm_bmpx8x');

// Array (object/associative) of sensor data items
// 'LocalSensors':
//   moduleName: 'BaseModule::LocalSensors',
//   sensors:
//     [0] - ambient temperature
//     [1] - atmospheric pressure
// Sensor entry format: { name: 'Temperature', value: '22.33', units: 'degrees C' }
// TODO: devise better way than hard-assigning indexes (must work with Jade iteration)
var wsSensorData = [];

// get sensor data every this many milliseconds
var DATA_ACQUISITION_INTERVAL = 10000;
var SENSOR_I2C_BUS_NUM = 0;

var pressureSensor = new upm_bmpx8x.BMPX8X(SENSOR_I2C_BUS_NUM, upm_bmpx8x.ADDR);

setInterval(function() {
    var pressure = Math.round(pressureSensor.getPressure() / 100);
    var temperature = (pressureSensor.getTemperature()).toFixed(1);

    //debug only
    console.log('Local sensors: pressure = ' + pressure +
                ' hPa, temperature = ' + temperature +
                ' degrees C');

    // construct outgoing data array, as this is a unique case, we hadrcode names
    wsSensorData['LocalSensors'] = {
        moduleName: 'BaseModule::LocalSensors',
        sensors: [
            { name: 'Temperature', value: temperature, units: 'degrees C' },
            { name: 'Atmospheric pressure', value: pressure, units: 'hPa' }
        ]
    }

}, DATA_ACQUISITION_INTERVAL);

module.exports = {
    getLocalSensorData: function() { return wsSensorData; }
}