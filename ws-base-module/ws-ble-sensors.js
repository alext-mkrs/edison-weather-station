var noble = require('noble');
// Array (object/associative) of sensor data items
// <BLE peripheral ID ("MAC")>:
//   moduleName: <BLE local name>::<BLE peripheral ID ("MAC")>
//   sensors:
//     [0] - ambient temperature
//     [1] - humidity
// Sensor entry format: { name: 'Temperature', value: 22.33, units: 'degrees C' }
// TODO: devise better way than hard-assigning indexes (must work with Jade iteration)
var wsSensorData = [];

var esServiceUuid = '181a';
var tempCharacteristicUuid = '2a6e';
var humCharacteristicUuid = '2a6f';
// This must be synchronized with the sensor module sketch
var sensorModuleNamePattern = 'WsSensorModule';

// We'll start BLE scan for new devices every these many milliseconds
var BLE_SCAN_START_INTERVAL = 30000;
// We'll *stop* BLE scan for new devices every these many milliseconds
// Combined with the *START* one this will provide a window of opportunity for
// new modules to get picked up without continuously scanning.
var BLE_SCAN_STOP_INTERVAL = 35000;


function startBleScan() {
    if (noble.state === 'poweredOn') {
        if (process.env.NODE_ENV == 'development') {
            console.log('Starting BLE scan');
        }
        noble.startScanning([esServiceUuid], false);
    }
    else {
        console.log('Cannot start scanning - Noble state is not poweredOn');
        noble.stopScanning();
    }
}

function processTempSensorData(data, isNotification) {
    var temperature = null;
    var message = '';

    if (data) {
        temperature = (data.readInt16LE(0) / 100).toFixed(1);
    }
    else {
        console.log('processTempSensorData(): data is null');
    }

    message = this.peripheral.advertisement.localName +
              '::' +
              this.peripheral.id +
              ': ';

    if (isNotification) {
        message = 'Temperature received by notification from module ' +
                  message;
    }
    else {
        message = 'Temperature initial value from module ' +
                  message;
    }

    wsSensorData[this.peripheral.id].sensors[0] = { name: 'Temperature', value: temperature, units: 'degrees C' }
    if (process.env.NODE_ENV == 'development') {
        console.log(message + wsSensorData[this.peripheral.id].sensors[0].value);
    }
}

function processHumSensorData(data, isNotification) {
    var humidity = null;
    var message = '';

    if (data) {
        humidity = (data.readUInt16LE(0) / 100).toString();
    }
    else {
        console.log('processHumSensorData(): data is null');
    }

    message = this.peripheral.advertisement.localName +
              '::' +
              this.peripheral.id +
              ': ';

    if (isNotification) {
        message = 'Humidity received by notification from module ' +
                  message;
    }
    else {
        message = 'Humidity initial value from module ' +
                  message;
    }

    wsSensorData[this.peripheral.id].sensors[1] = { name: 'Humidity', value: humidity, units: '%' }
    if (process.env.NODE_ENV == 'development') {
        console.log(message + wsSensorData[this.peripheral.id].sensors[1].value);
    }
}

function processCharacteristics(error, characteristics) {
    var tempCharacteristic = null;
    var humCharacteristic = null;

    if (error) {
        this.peripheral.disconnect();
        console.error("An error occurred during disconnect: ", error);
    }

    characteristics.forEach(function(characteristic) {
        var characteristicInfo = ' ' + characteristic.uuid;
        if (characteristic.name) {
            characteristicInfo += ' (' + characteristic.name + ')';
        }
        if (process.env.NODE_ENV == 'development') {
            console.log('\t' + characteristicInfo);
        }
        if (characteristic.uuid == tempCharacteristicUuid) {
            tempCharacteristic = characteristic;
        }
        else if (characteristic.uuid == humCharacteristicUuid) {
            humCharacteristic = characteristic;
        }
    });

    // If all characteristics found & name matches the pattern - we have "our" module
    if (tempCharacteristic && humCharacteristic && this.peripheral.advertisement.localName.indexOf(sensorModuleNamePattern) != -1) {
        if (process.env.NODE_ENV == 'development') {
            console.log('Our sensor module found');
        }
        if (!wsSensorData[this.peripheral.id]) {
            console.log('Adding peripheral ' + this.peripheral.advertisement.localName + '::' + this.peripheral.id + ' to the list');
            wsSensorData[this.peripheral.id] = { moduleName: this.peripheral.advertisement.localName + '::' + this.peripheral.id,
                                                 sensors: []
                                               };
        }
        else {
            console.log('Peripheral ' + this.peripheral.advertisement.localName + '::' + this.peripheral.id + ' is already in the list');
        }

        // setup read/notification callbacks.
        tempCharacteristic.on('data', processTempSensorData.bind({ peripheral: this.peripheral }));
        humCharacteristic.on('data', processHumSensorData.bind({ peripheral: this.peripheral }));
        // read sensor data values
        tempCharacteristic.read(function(error, data) { if (error) throw error; });
        humCharacteristic.read(function(error, data) { if (error) throw error; });
        // subscribe to notifications.
        // precondition: all characteristics we use must support notifications.
        tempCharacteristic.notify(true, function(error) { if (error) throw error; });
        humCharacteristic.notify(true, function(error) { if (error) throw error; });
    }
    else {
        if (process.env.NODE_ENV == 'development') {
            console.log('Looks like this is not our sensor module, skipping');
        }
    }
}

noble.on('stateChange', function(state) {
    console.log('noble state change detected to: ' + state);
    startBleScan();
});

// debug only
if (process.env.NODE_ENV == 'development') {
    noble.on('scanStart', function() { console.log('BLE scan started'); });
    noble.on('scanStop', function() { console.log('BLE scan stopped'); });
}

noble.on('discover', function processPeripheral(peripheral) {
    if (process.env.NODE_ENV == 'development') {
        console.log('Peripheral with ID ' + peripheral.id + ' found');
    }

    var advertisement = peripheral.advertisement;
    var localName = advertisement.localName;
    var serviceUuids = advertisement.serviceUuids;

    if (process.env.NODE_ENV == 'development') {
        if (localName) {
            console.log('Local Name = ' + localName);
        }

        if (serviceUuids) {
            console.log('Service UUIDs = ' + serviceUuids);
        }
    }

    peripheral.on('disconnect', function() {
        console.log('Peripheral disconnect event: ' +
                    peripheral.advertisement.localName +
                    '::' +
                    peripheral.id);
        // remove the peripheral from the list to start off clean
        if (wsSensorData[peripheral.id]) {
            delete wsSensorData[peripheral.id];
        }
    });

    if (process.env.NODE_ENV == 'development') {
        peripheral.on('connect', function() {
            console.log('Peripheral connect event');
        });
    }

    if (!wsSensorData[peripheral.id]) {
        // without this connection might not be established properly
        noble.stopScanning();
        peripheral.connect(function(error) {
            if (error) {
                peripheral.disconnect();
                console.error("An error occurred during connection: ", error);
            }

            peripheral.discoverServices([esServiceUuid], function(error, services) {
                if (error) {
                    peripheral.disconnect();
                    console.error("An error occurred during service discovery: ", error);
                }

                services.forEach(function(service) {
                    var serviceInfo = service.uuid;

                    console.log('Discovered services and characteristics for ' +
                                localName +
                                '::' +
                                peripheral.id +
                                ':');
                    if (service.name) {
                        serviceInfo += ' (' + service.name + ')';
                    }
                    console.log(serviceInfo);

                    service.discoverCharacteristics([], processCharacteristics.bind({ peripheral: peripheral }));
                });
            });
        });
    }
    else {
        console.log('Peripheral ' + localName + '::' + peripheral.id + ' is already connected, skipping');
    }
});

// This will scan for new modules every BLE_SCAN_START_INTERVAL ms.
setInterval(function() {
    if (process.env.NODE_ENV == 'development') {
        console.log('starting periodic BLE module scan...');
    }
    startBleScan();
}, BLE_SCAN_START_INTERVAL);

// And this will stop scanning, every BLE_SCAN_STOP_INTERVAL, so effective scanning
// window is (BLE_SCAN_STOP_INTERVAL - BLE_SCAN_START_INTERVAL) ms.
setInterval(function() {
        if (process.env.NODE_ENV == 'development') {
            console.log('stopping BLE module scan...');
        }
        noble.stopScanning();
}, BLE_SCAN_STOP_INTERVAL);

module.exports = {
    getBleSensorData: function() { return wsSensorData; }
}
