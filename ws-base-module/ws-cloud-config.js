// Add ThingSpeak channel write keys here. Channel should be created per weather
// station sensor module (+one for local sensors)
var channelWriteKeys = {};
channelWriteKeys['BaseModule::LocalSensors'] = 'INSERT_KEY_HERE';

// Misc ThingSpeak options and constants
// Thingspeak's minimum interval is 15 seconds
var TSPEAK_MIN_UPLOAD_INTERVAL = 15000;
// TS REST API endpoint we'll connect to
var CLOUD_API_ENDPOINT = 'https://api.thingspeak.com/update';

module.exports = {
    channelWriteKeys: channelWriteKeys,
    TSPEAK_MIN_UPLOAD_INTERVAL: TSPEAK_MIN_UPLOAD_INTERVAL,
    CLOUD_API_ENDPOINT: CLOUD_API_ENDPOINT
}
