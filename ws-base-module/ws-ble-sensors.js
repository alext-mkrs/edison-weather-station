var noble = require('noble');
// Array of sensor data items
// [0] - ambient temperature
// [1] - humidity
// TODO: devise better way than hard-assigning indexes (must work with Jade iteration)
// Entry format: { name: "Temperature", value: 22.33, units: "degrees C" }
var wsSensorData = [];

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

    message = this.peripheral.advertisement.localName +
              "::" +
              this.peripheral.id +
              ": ";

    if (isNotification) {
        message = "Temperature received by notification from module " +
                  message;
    }
    else {    
        message = "Temperature initial value from module " +
                  message;
    }
    
    wsSensorData[this.peripheral.id].sensors[0] = { name: "Temperature", value: temperature, units: "degrees C" }
    console.log(message + wsSensorData[this.peripheral.id].sensors[0].value.toString());
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

    message = this.peripheral.advertisement.localName +
              "::" +
              this.peripheral.id +
              ": ";

    if (isNotification) {
        message = "Humidity received by notification from module " +
                  message;
    }
    else {
        message = "Humidity initial value from module " +
                  message;
    }

    wsSensorData[this.peripheral.id].sensors[1] = { name: "Humidity", value: humidity, units: "%" }
    console.log(message + wsSensorData[this.peripheral.id].sensors[1].value.toString());
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
        if (!wsSensorData[this.peripheral.id]) {
            console.log("Adding peripheral " + this.peripheral.advertisement.localName + "::" + this.peripheral.id + " to the list");
            wsSensorData[this.peripheral.id] = { moduleName: this.peripheral.advertisement.localName + "::" + this.peripheral.id,
                                                 sensors: []
                                               };
        }
        else {
            console.log("Peripheral " + this.peripheral.advertisement.localName + "::" + this.peripheral.id + " is already in the list");
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
        console.log("Peripheral disconnect event: " +
                    peripheral.advertisement.localName +
                    "::" +
                    peripheral.id);
        // remove the peripheral from the list to start off clean
        if (wsSensorData[peripheral.id]) {
            delete wsSensorData[peripheral.id];
        }
    });

    peripheral.on('connect', function() {
        console.log("Peripheral connect event");
    });
    
    if (!wsSensorData[peripheral.id]) {
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

                    console.log("Discovered services and characteristics for " +
                                localName +
                                "::" +
                                peripheral.id +
                                ":");
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
        console.log("Peripheral " + localName + "::" + peripheral.id + " is already connected, skipping");
    }
});

module.exports = {
    getBleSensorData: function() { return wsSensorData; }
}
