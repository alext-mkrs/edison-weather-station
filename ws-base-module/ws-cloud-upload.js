/* This piece uploads data to ThingSpeak.
   Precondition: Channel/field structure was created in TS, one channel per module,
   sensor items will be converted to fields sequentially, in the same order as they
   are listed in <weather_station_url>/get_sensor_data output
*/

var request = require('request');
var wsSensors = require('./ws-sensors.js');
// Our cloud connection settings
var cloudConfig = require('./ws-cloud-config.js');

setInterval(function() {
    if (process.env.NODE_ENV == 'development') {
        console.log('...posting to ThingSpeak...');
    }

    // Get sensor data
    var sensorData = wsSensors.getSensorData();
 
    // Debug only
    if (process.env.NODE_ENV == 'development') {
        console.log('sensorData:');
        console.dir(sensorData);
    }

    // Prepare data for our cloud. channelName is surplus for now.
    // [channelName: 'name', writeKey: 'key', data: {field1: 'value' <...>, created_at: 'timestamp'}]
    var sensorDataForTspeak = [];
    var currDateTime = new Date();
    // Iterate over sensor modules
    for (var i = 0; i < sensorData.length; i++) {
        var sensorModule = sensorData[i];

        // Debug only
        if (process.env.NODE_ENV == 'development') {
            console.log('sensorModule:');
            console.dir(sensorModule);
        }

        var sensorModuleName = sensorModule['moduleName'];
        if (cloudConfig.channelWriteKeys[sensorModuleName]) {
            var fieldCounter = 1;
            // This is our set of sensor data converted to ThingSpeak format
            var sensorDataSet = {};
            // Iterate over sensor data entries
            for (var j = 0; j < sensorModule['sensors'].length; j++) {
                var sensorDataItem = sensorModule['sensors'][j];

                // Debug only
                if (process.env.NODE_ENV == 'development') {
                    console.log('sensorDataItem:');
                    console.dir(sensorDataItem);
                }

                // Prepare field name
                var fieldName = 'field' + fieldCounter;
                // Set field value
                sensorDataSet[fieldName] = sensorDataItem['value'];
                fieldCounter++;
            }
            sensorDataSet['created_at'] = currDateTime.toISOString();
            sensorDataForTspeak.push({'moduleName': sensorModuleName,
                                      'writeKey': cloudConfig.channelWriteKeys[sensorModuleName],
                                      'data': sensorDataSet});
        } else {
            console.log('ThingSpeak API write key is not defined for module "'
                        + sensorModuleName
                        + '", skipping its data');
        }
    }

    // Debug only
    if (process.env.NODE_ENV == 'development') {
        console.log('Data to send:');
        console.dir(sensorDataForTspeak);
    }

    // Send data. Each module has its own channel.
    for (var i = 0; i < sensorDataForTspeak.length; i++) {
        if (process.env.NODE_ENV == 'development') {
            console.log('Posting data for ' + sensorDataForTspeak[i]['moduleName']);
        }
        // Post the update
        request.post({
            url: cloudConfig.CLOUD_API_ENDPOINT,
            form: sensorDataForTspeak[i]['data'],
            headers: {
                'X-THINGSPEAKAPIKEY': sensorDataForTspeak[i]['writeKey']
            }
        }, function(err, response, body) {
            if(!err && (body > 0)) {
                if (process.env.NODE_ENV == 'development') {
                    console.log('Posted data to ' + cloudConfig.CLOUD_API_ENDPOINT + ' successfully');
                }
            } else {
                console.log('Posting data to ' + cloudConfig.CLOUD_API_ENDPOINT + ' failed');
                if (process.env.NODE_ENV == 'development') {
                    console.dir(response);
                }
            }
        });
    }

}, cloudConfig.TSPEAK_MIN_UPLOAD_INTERVAL * 2);
