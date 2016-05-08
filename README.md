Description
===========

This repo contains code and assets for a wireless weather station project
based on Intel(r) Edison (base module) and Arduino/Genuino 101 (wireless
sensor modules).

The project is mostly done, with the end-goal of having
the following features supported:

#### Base module (Edison)
- [x] Getting data from sensor modules through BLE
- [x] Displaying sensor data through a user interface (web)
- [x] Cloud upload for long-term preservation and analytics (ThingSpeak)
- [ ] Displaying weather forecast from the Internet aside the sensor data
- [x] Getting data from locally-attached sensors
  - [x] Barometric pressure + temperature sensor (BMP180)
  - [x] Humidity + temperature sensor (HTU21D)

Making AM2302 work with Edison on Arduino expansion board was not possible,
so I resorted to a pair of I2C sensors to cover necessary measurements.

#### Sensor module (Arduino 101)
- [x] Temperature sensor (DHT-22/AM2302)
- [x] Humidity sensor (DHT-22/AM2302)
- [x] Battery-powered - per [my measurements](http://alextgalileo.altervista.org/blog/edison-wireless-weather-station-now-has-local-sensors/) it's not feasible to run all my modules off of the battery, but I'll do that with at least one, which is located in a place without wall socket nearby
- [x] Exposing data through Bluetooth LE
- [ ] ~~Configurability through Bluetooth LE~~ - I decided to drop this as it turned out I don't really need such a feature. Pull requests are welcome :smiley:

While I started it just for myself to create a network of sensors at home,
I believe this is a nice example demonstrating various features and aspects
of both Edison and Arduino/Genuino 101, so I'm sharing it with a wider audience.

Note that more than three sensor modules would force you to switch to 5GHz Wi-Fi for
the base module. At least that was the case for me. With four modules Wi-Fi was breaking
every now and then (both incoming and outgoing connections). My guess is interference
between BT and 2.4GHz Wi-Fi, maybe due to the fact that both use the same band and standard
built-in techniques do not work well with more than three modules connected.

Base module code
================

Base module code is written in JavaScript and is intended to be run on
Node.js on Edison. `package.json` file contains all dependency data, so just
run `npm install` in the `ws-base-module` directory and then start the data
acquisition process and web interface by running `node main.js`.

By default the web interface will be available at `http://<IP of your Edison>:3000`

`ws-base-module` dir contains a working Systemd service description file,
`edison-weather-station.service`, to start weather station process automatically.

Copy it to `/lib/systemd/system` and then run `systemctl enable edison-weather-station`.
The file assumes that you'll put the clone of this git repo
to `/home/root/edison-weather-station` on your board, correct paths inside
if that's not the case.

To enable debug output, set `NODE_ENV` environment variable to `development`.

Sensor module code
==================

This is a standard Arduino sketch. You'll need to install one of the two DHT
sensor libraries and set the module name, see header of the sketch for details.

Bill of materials
=================

- Intel(r) Edison with a Kit for Arduino (base module) - 1 pc
  - Generally speaking, a mini-breakout board would work too, but you need to
    take care of I2C voltage level translations for directly attached sensors.
- Arduino/Genuino 101 (sensor module) - 1 or more (depending on your needs)
- DHT-22/AM2302 sensor - 1 per sensor module
- BMP180 sensor - 1 pc (attached to base module)
- HTU21D sensor - 1 pc (attached to base module)

