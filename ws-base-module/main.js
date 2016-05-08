var webui = require("./web-ui/bin/www");
var cloud = require("./ws-cloud-upload.js");

console.log("Starting main app for Edison Weather Station");

process.on('SIGINT', function() {
    console.log("Caught interrupt signal, exiting");
    process.exit();
});

