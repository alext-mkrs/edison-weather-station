General
=======

This repo contains code and assets for a wireless weather station project
based on Intel(r) Edison (Base module) and Arduino/Genuino 101 (wireless
Sensor modules).

The project was done (see [Instructables post](http://www.instructables.com/id/Edison-and-ArduinoGenuino-101-Wireless-Weather-Sta/) for assemby instructions),
with the end-goal of having the following features supported:

#### Base module (Edison)
- [x] Getting data from sensor modules through BLE
- [x] Displaying sensor data through a user interface (web) - for short-term analysis and observation
- [x] Cloud upload for long-term preservation and analytics (ThingSpeak)
- [ ] ~~Displaying weather forecast from the Internet aside the sensor data~~ - dropped this one as it turned out I don't need it.
- [x] Getting data from locally-attached sensors
  - [x] Barometric pressure + temperature sensor (BMP180)
  - [x] Humidity + temperature sensor (HTU21D)

Making AM2302 work with Edison on Arduino expansion board was not possible/easy,
so I resorted to a pair of I2C sensors to cover necessary measurements.

#### Sensor module (Arduino/Genuino 101)
- [x] Temperature sensor (DHT-22/AM2302)
- [x] Humidity sensor (DHT-22/AM2302)
- [x] Battery-powered - per [my measurements](http://alextgalileo.altervista.org/blog/edison-wireless-weather-station-now-has-local-sensors/) it's not feasible to run *all* my modules off of the battery, but I'll do that with at least one, which is located in a place without wall socket nearby
- [x] Exposing data through Bluetooth LE
- [ ] ~~Configurability through Bluetooth LE~~ - I decided to drop this as well, as it turned out I don't really need such a feature. Pull requests are welcome :smiley:

KISS and DRY principles were the guiding light all the time as well :smiley:

While I started it just for myself to create a network of sensors at home,
I believe this is a nice example demonstrating various features and aspects
of both Edison and Arduino/Genuino 101, so I'm sharing it with a wider audience.

How it all works
================

There are two main code pieces: for Base and Sensor modules.

The latter is a usual
[Ardunio sketch](./ws-sensor-module/ws-sensor-module.ino), which uses only one additional library - DHT.
Its main role is to expose data acquired from the AM2303/DHT-22 sensor through standard BLE
[Environmental Sensing](https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.environmental_sensing.xml) service.

It's important to mention that the code does not try to acquire data unless there's a BLE connection.
This is done to consume less energy - if there's no connection, no one is going to see the data anyway.

The Base module code is a JavaScript/Node.js application, which includes several components:

1. [Module for data acquisition from Sensor modules through BLE](./ws-base-module/ws-ble-sensors.js). Upon start it runs a BLE scan and tries to find namely our Sensor modules (based on advertised name and BLE services present, see code for details). When a module is found, we subscribe for data change notifications (so no polling is done). After initial discovery it runs a scan every 30 seconds for 5 seconds to pick up any module set changes. Module disconnects or reconnects are handled automatically. The module uses great [Noble library](https://github.com/sandeepmistry/noble) for BLE functionality;
1. [Module for data acquisition from local sensors](./ws-base-module/ws-local-sensors.js), which is implemented using standard polling technique - every 10 seconds we acquire data from sensors. This module uses awesome [UPM](https://github.com/intel-iot-devkit/upm) and [mraa](http://mraa.io) libraries for sensor interaction, which makes it very easy to acquire data even though the underlying sensor protocols are not that simple at all;
1. Both BLE and local sensor code modules expose the acquired data through a method each, and for convenience both are wrapped into a single [sensor data acquisition module](./ws-base-module/ws-sensors.js);
1. Then there's a [web UI](./ws-base-module/web-ui) based on a standard Node.js Express module and a template app it generates. The UI is kept very simple and generic and uses AJAX approach with client-side code using [Chart.js](http://chartjs.org/) and [jQuery](http://jquery.org/) libraries for data display. Upon loading into a browser, AJAX code starts polling our web server for data every 5 seconds and displays current sensor data items in a text form and as animated charts (one per sensor). Charts/text items are automatically added/deleted if a sensor module connects/disconnects. I initially wanted to create a dedicated Android app for this, but then it turned out in Chrome/Firefox the data is perfectly readable, so I ditched this;
1. Finally there's a [cloud data upload module](./ws-base-module/ws-cloud-upload.js) (I used [ThingSpeak](https://thingspeak.com/), see [my blog post](http://alextgalileo.altervista.org/blog/edison-weather-station-cloud-upload-implemented/) for reasoning) and a [config file](./ws-base-module/ws-cloud-config.js). I don't use any additional ThingSpeak connection libraries (there's one in NPM), but as we just upload data to pre-configured channels on ThingSpeak, plain Express is good enough (remember KISS?). In a nutshell - create one ThingSpeak channel per sensor module and one field per sensor data item. Naming and ordering must be the same as the one you see in web interface. See [Step 5](http://www.instructables.com/id/Edison-and-ArduinoGenuino-101-Wireless-Weather-Sta/step5/Create-necessary-ThingSpeak-configuration/) of my Instructables post for more details.


Running Base module code
========================

Base module code is written in JavaScript and is intended to be run on
Node.js on Edison. `package.json` file contains all dependency data, so just
run `npm install` in the `ws-base-module` directory and then start the data
acquisition process and web interface by running `node main.js`. I haven't tested
the very latest versions of all dependencies, but at least Edison image from Release 2.1 +
mraa 0.9.0 + UPM 0.4.1 + Noble 1.2.0 work fine.

**Note** that if you've upgraded your Node.js to a non-default one (e.g. 0.12.7
from my package repo), you'll need to manually build UPM modules for sensors.
NPM will handle rebuilding of the mraa one, but UPM does not yet have
this capability. Ask in their bugtracker (or me) if in doubt.

By default the web interface will be available at `http://<IP of your Edison>:3000`

`ws-base-module` dir also contains a working Systemd service description file,
`edison-weather-station.service`, to start weather station process automatically.

Copy it to `/lib/systemd/system` and then run `systemctl enable edison-weather-station`.
The file assumes that you'll put the clone of this git repo
to `/home/root/edison-weather-station` on your board, correct paths inside
if that's not the case.

To enable debug output, set `NODE_ENV` environment variable to `development` before
starting `main.js`.

**Note** that more than three sensor modules would force you to switch to 5GHz Wi-Fi for
the base module. At least that was the case for me. With four modules Wi-Fi was breaking
every now and then (both incoming and outgoing connections). My guess is interference
between BT and 2.4GHz Wi-Fi, maybe due to the fact that both use the same band and standard
built-in interference avoidance techniques do not work well with more than three modules connected.

Running Sensor module code
==========================

This is a standard Arduino sketch, which is uploaded using standard Arduino IDE.
Make sure to install "Intel Curie" board package through Board manager before doing that.

You'll need to install [one of the two DHT sensor libraries](./ws-sensor-module/ws-sensor-module.ino#L3-L9)
and set the [module name](./ws-sensor-module/ws-sensor-module.ino#L26-L32), see header of the sketch for details.

To enable debug mode, set [DEBUG define](./ws-sensor-module/ws-sensor-module.ino#L14) to 1.

Bill of materials
=================

- Intel(r) Edison with a Kit for Arduino (Base module) - 1 pc
  - Generally speaking, a mini-breakout board would work too, but you need to
    take care of I2C voltage level translations for directly attached sensors.
- Arduino/Genuino 101 (Sensor module) - 1 or more (depending on your needs)
- DHT-22/AM2302 sensor - 1 per sensor module
- BMP180 sensor (I used generic GY-68 module) - 1 pc (attached to Base module)
- HTU21D sensor (I used SparkFun module) - 1 pc (attached to Base module)
- Enclosures for both Sensor and Base modules

