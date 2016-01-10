Description
===========

This repo contains code and assets for a wireless weather station project
based on Intel(r) Edison (base module) and Arduino/Genuino 101 (wireless
sensor modules).

The project is yet work-in-progress, with the end-goal of having
the following features supported:

#### Base module (Edison)
- [x] Getting data from sensor modules through BLE
- [x] Displaying sensor data through a user interface (web)
- [ ] Cloud upload for long-term preservation and analytics
- [ ] Displaying weather forecast from the Internet aside the sensor data
- [ ] Getting data from locally-attached sensors
  - [ ] Barometric pressure sensor (BMP180)
  - [ ] Temperature sensor (DHT-22/AM2302)
  - [ ] Humidity sensor (DHT-22/AM2302)

Making AM2302 work with Edison on Arduino expansion board may be tricky, so we'll see.

#### Sensor module (Arduino 101)
- [x] Temperature sensor (DHT-22/AM2302)
- [x] Humidity sensor (DHT-22/AM2302)
- [ ] Battery-powered
- [x] Exposing data through Bluetooth LE
- [ ] Configurability through Bluetooth LE

While I started it just for myself to create a network of sensors at home,
I believe this is a nice example demonstrating various features and aspects
of both Edison and Arduino/Genuino 101, so I'm sharing it with a wider audience.

Base module code
================

Base module code is written in JavaScript and is intended to be run on
Node.js on Edison. `package.json` file contains all dependency data, so just
run `npm install` in the `ws-base-module` directory and then start the data
acquisition process and web interface by running `node main.js`.

By default the web interface will be available at `http://<IP of your Edison>:3000`

Sensor module code
==================

This is a standard Arduino sketch. You'll need to install one of the two DHT
sensor libraries, see header of the sketch for details.

Bill of materials
=================

- Intel(r) Edison with a Kit for Arduino (base module) - 1 pc
  - Generally speaking, a mini-breakout board would work too, but you need to
    take care of voltage level translations for directly attached sensors,
    which may be tricky.
- Arduino/Genuino 101 (sensor module) - 1 or more (depending on your needs)
- DHT-22/AM2302 sensor - 1 per sensor module + 1 for the base module
- BMP180 sensor - 1 pc (attached to base module)

