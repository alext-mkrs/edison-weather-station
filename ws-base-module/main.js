var webui = require("./web-ui/bin/www");

console.log("Starting main app");

process.on('SIGINT', function() {
    console.log("Caught interrupt signal, exiting");
    process.exit();
});

