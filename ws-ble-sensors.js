var noble = require('noble');
var wsSensorModules = [];

var esServiceUuid = '181a';
var tempCharacteristicUuid = '2a6e';
var humCharacteristicUuid = '2a6f';
var sensorModuleNamePattern = 'WsSensorModule';

function startBleScan() {
    if (noble.state === 'poweredOn') {
        console.log("Starting BLE scan");
        noble.startScanning([esServiceUuid], false);
    } 
    else {
        console.log("Cannot start scanning - Noble state is not poweredOn");
        noble.stopScanning();
    }
}

function processTempSensorData(data, isNotification) {
    var temperature = null;
    var message = "";

    if (data) {
        temperature = data.readInt16LE(0) / 100;
    }
    else {
        console.log("processTempSensorData(): data is null");
    }

    if (isNotification) {
        message = "Temperature received by notification from module " + this.peripheral.id + ": ";
    }
    else {    
        message = "Temperature initial value from module " + this.peripheral.id + ": ";
    }
    
    wsSensorModules[this.peripheral.id].temperature = temperature;
    console.log(message + wsSensorModules[this.peripheral.id].temperature.toString());
}

function processHumSensorData(data, isNotification) {
    var humidity = null;
    var message = "";
    
    if (data) {
        humidity = data.readUInt16LE(0) / 100;
    }
    else {
        console.log("processHumSensorData(): data is null");
    }

    if (isNotification) {
        message = "Humidity received by notification from module " + this.peripheral.id + ": ";
    }
    else {
        message = "Humidity initial value from module " + this.peripheral.id + ": ";
    }

    wsSensorModules[this.peripheral.id].humidity = humidity;
    console.log(message + wsSensorModules[this.peripheral.id].humidity.toString());
}

function processCharacteristics(error, characteristics) {
    var tempCharacteristic = null;
    var humCharacteristic = null;

    if (error) {
        this.peripheral.disconnect();
        throw error;
    }

    characteristics.forEach(function(characteristic) {
        var characteristicInfo = ' ' + characteristic.uuid;
        if (characteristic.name) {
            characteristicInfo += ' (' + characteristic.name + ')';
        }
        console.log('\t' + characteristicInfo);
        if (characteristic.uuid == tempCharacteristicUuid) {
            tempCharacteristic = characteristic;
        }
        else if (characteristic.uuid == humCharacteristicUuid) {
            humCharacteristic = characteristic;
        }
    });

    // If all characteristics found & name matches the pattern - we have "our" module
    if (tempCharacteristic && humCharacteristic && this.peripheral.advertisement.localName.indexOf(sensorModuleNamePattern) != -1) {
        console.log("Our sensor module found");
        if (!wsSensorModules[this.peripheral.id]) {
            console.log("Adding peripheral " + this.peripheral.id + ":" + this.peripheral.advertisement.localName + " to the list");
            wsSensorModules[this.peripheral.id] = { peripheral: this.peripheral };
        }
        else {
            console.log("Peripheral " + this.peripheral.id + ":" + this.peripheral.advertisement.localName + " is already in the list");
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
        console.log("Looks like this is not our sensor module, skipping");
    }
}

noble.on('stateChange', function(state) {
    console.log("noble state change detected to: " + state);
    startBleScan();
});

// debug only
noble.on('scanStart', function() { console.log("BLE scan started"); });
noble.on('scanStop', function() { console.log("BLE scan stopped"); });


noble.on('discover', function processPeripheral(peripheral) {
    console.log('Peripheral with ID ' + peripheral.id + ' found');
    
    var advertisement = peripheral.advertisement;
    var localName = advertisement.localName;
    var serviceUuids = advertisement.serviceUuids;

    if (localName) {
        console.log('Local Name = ' + localName);
    }

    if (localName) {
        console.log('Service UUIDs = ' + serviceUuids);
    }

    peripheral.on('disconnect', function() {
        console.log("Peripheral disconnect event");
        // remove the peripheral from the list to start off clean
        if (wsSensorModules[peripheral.id]) {
            delete wsSensorModules[peripheral.id];
        }
    });

    peripheral.on('connect', function() {
        console.log("Peripheral connect event");
    });
    
    if (!wsSensorModules[peripheral.id]) { 
        // without this connection might not be established properly
        noble.stopScanning();
        peripheral.connect(function(error) {
            // start scanning to discover other modules
            startBleScan();
            if (error) {
                peripheral.disconnect();
                throw error;
            }

            peripheral.discoverServices([esServiceUuid], function(error, services) {
                if (error) {
                    peripheral.disconnect();
                    throw error;
                }

                services.forEach(function(service) {
                    var serviceInfo = service.uuid;

                    console.log("Discovered services and characteristics:");
                    if (service.name) {
                        serviceInfo += ' (' + service.name + ')';
                    }
                    console.log(serviceInfo);
               
                    service.discoverCharacteristics([], processCharacteristics.bind({peripheral:peripheral}));
                });
            });
        });
    }
    else {
        console.log("Peripheral " + peripheral.id + " is already connected, skipping");
    }
});

module.exports = {
    getBleSensorModules: function() { return wsSensorModules; }
}
