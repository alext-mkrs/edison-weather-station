// BMP180 module from UPM lib
var upm_bmpx8x = require('jsupm_bmpx8x');
var upm_htu21d = require('jsupm_htu21d');

// Array (object/associative) of sensor data items
// 'LocalSensors':
//   moduleName: 'BaseModule::LocalSensors',
//   sensors:
//     [0] - ambient temperature from BMP180 sensor
//     [1] - atmospheric pressure from BMP180 sensor
//     [2] - ambient temperature from HTU21D sensor
//     [3] - compensated relative humidity from HTU21D sensor
// Sensor entry format: { name: 'Temperature', value: '22.33', units: 'degrees C' }
// TODO: devise better way than hard-assigning indexes (must work with Jade iteration)
var wsSensorData = [];

// get sensor data every this many milliseconds
var DATA_ACQUISITION_INTERVAL = 10000;
var SENSOR_I2C_BUS_NUM = 0;
var HTU21D_DO_SAMPLE_DATA_FLAG = 1;
var HTU21D_DONT_SAMPLE_DATA_FLAG = 1;

var pressureSensor = new upm_bmpx8x.BMPX8X(SENSOR_I2C_BUS_NUM, upm_bmpx8x.ADDR);
var humiditySensor = new upm_htu21d.HTU21D(SENSOR_I2C_BUS_NUM, upm_htu21d.HTU21D_I2C_ADDRESS);

setInterval(function() {
    // Pressure accuracy for BMP180 is -4 to +2 hPa, so no sense to keep decimals
    var pressure_bmp180 = Math.round(pressureSensor.getPressure() / 100).toString();
    // Temperature accuracy for BMP180 is +-2 degrees C, so no sense to keep decimals
    var temperature_bmp180 = Math.round(pressureSensor.getTemperature()).toString();

    // Humidity accuracy for HTU21D is +-2 %RH, so no sense to keep decimals
    var humidity_compensated_htu21d = Math.round(humiditySensor.getCompRH(HTU21D_DO_SAMPLE_DATA_FLAG)).toString();
    // Temperature accuracy for HTU21D is +-0.3 degrees C, so let's keep one decimal
    var temperature_htu21d = ((Math.round(humiditySensor.getTemperature(HTU21D_DONT_SAMPLE_DATA_FLAG) * 10)) / 10).toString();

    //debug only
    if (process.env.NODE_ENV == 'development') {
        console.log('Local sensors:' +
                    ' pressure (BMP180) = ' + pressure_bmp180 +
                    ' hPa,' +
                    ' temp. (BMP180) = ' + temperature_bmp180 +
                    ' deg. C,' +
                    ' comp. humidity (HTU21D) = ' + humidity_compensated_htu21d +
                    ' %, ' +
                    ' temp. (HTU21D) = ' + temperature_htu21d +
                    ' deg. C');
    }

    // construct outgoing data array, as this is a base module, we hardcode module name
    wsSensorData['LocalSensors'] = {
        moduleName: 'BaseModule::LocalSensors',
        sensors: [
            { name: 'Temperature BMP180', value: temperature_bmp180, units: 'degrees C' },
            { name: 'Atmospheric pressure', value: pressure_bmp180, units: 'hPa' },
            { name: 'Temperature HTU21D', value: temperature_htu21d, units: 'degrees C' },
            { name: 'Compensated humidity', value: humidity_compensated_htu21d, units: '%' }
        ]
    }

}, DATA_ACQUISITION_INTERVAL);

module.exports = {
    getLocalSensorData: function() { return wsSensorData; }
}
