#include <CurieBLE.h>

// DHT library I used is https://github.com/markruys/arduino-DHT
// Change lines 145-147 in DHT.cpp to below, otherwise there will be garbage instead of actual values
//  word rawHumidity = 0;
//  word rawTemperature = 0;
//  word data = 0;
// Alternatively see this pull request I've submitted: https://github.com/markruys/arduino-DHT/pull/5
// Another lib checked to work is https://github.com/RobTillaart/Arduino/tree/master/libraries/DHTstable
#include "DHT.h"

// This will enable additional debug output and signal LED.
// Set to 1 to enable, 0 to disable.
#define DEBUG 1

// DHT sensor
DHT dht;
// DHT sensor's data pin
const int dhtPin = 2;

#if DEBUG
// Pin with a LED to indicate BLE connection
const int indicatorPin = 13;
#endif

// BLE name for our module - for now you need to manually set it for each module
// before uploading a sketch. Nothing should break if you don't do that, but
// it will be harder for you to distinguish modules in the UI.
// The format is "WsSensorModule<ANYTHING>", otherwise our base module won't accept it.
// <ANYTHING> should be numbers and/or letters, no special symbols allowed.
// TODO: make this runtime-configurable
const char *moduleName = "WsSensorModule1";

BLEPeripheral blePeripheral;

// Environment sensing service UUID
// https://developer.bluetooth.org/gatt/services/Pages/ServiceViewer.aspx?u=org.bluetooth.service.environmental_sensing.xml
#define SERVICE_UUID_ESS "181A"
// Temperature characteristic UUID
#define CHAR_UUID_TEMPERATURE "2A6E"
// Humidity characteristic UUID
#define CHAR_UUID_HUMIDITY "2A6F"

#if DEBUG
#define LOG_SERIAL Serial
#endif

BLEService esSvc(SERVICE_UUID_ESS);

// We want notifications to be supported
BLEShortCharacteristic tempChar(CHAR_UUID_TEMPERATURE,
                                BLERead | BLENotify);

BLEUnsignedShortCharacteristic humChar(CHAR_UUID_HUMIDITY,
                                       BLERead | BLENotify);

// These will keep track of temperature and humidity we expose through BLE service
int16_t oldTemp = 0;
uint16_t oldHum = 0;

// Setup our sensors using respective library initi subroutines
void setupSensors()
{
  dht.setup(dhtPin, DHT::AM2302);
}

// Get data from sensors, process and push to BLE characteristics
void updateSensorData()
{
  // We don't really need it to be very frequent, let's say every 10 seconds.
  // TODO: this must be exposed through BLE and configurable by user
  delay(dht.getMinimumSamplingPeriod()*5);

  float temperature = dht.getTemperature();
  float humidity = dht.getHumidity();
  // BLE ESS has float data with 0.01 precision stored as ints
  // Temperature accuracy for AM2302 is +-0.2 C, so let's keep decimals
  int16_t essTemp = temperature*100;
  // Humidity accuracy for AM2305 is +-2% to +- 5% RH,
  // so no sense in keeping decimals
  uint16_t essHum = round(humidity)*100;

  // Update BLE characteristics if values changed
  if (essTemp != oldTemp) {
    tempChar.setValue(essTemp);
    oldTemp = essTemp;
  }
  if (essHum != oldHum) {
    humChar.setValue(essHum);
    oldHum = essHum;
  }

#if DEBUG
  LOG_SERIAL.println("Status\tHumidity (%)\tTemperature (C)");
  LOG_SERIAL.print(dht.getStatusString());
  LOG_SERIAL.print("\t");
  LOG_SERIAL.print(essHum / 100);
  LOG_SERIAL.print("\t\t");
  LOG_SERIAL.println((float)essTemp / 100, 1);
#endif
}

void setup() {
#if DEBUG
  Serial.begin(9600);
  // This will indicate when central is connected. Remove to conserve energy.
  pinMode(indicatorPin, OUTPUT);
#endif

  setupSensors();

  // Set BLE name for the module
  blePeripheral.setLocalName(moduleName);
  // Add the service UUID
  blePeripheral.setAdvertisedServiceUuid(esSvc.uuid());
  // Add the BLE service
  blePeripheral.addAttribute(esSvc);
  // Add characteristics
  blePeripheral.addAttribute(tempChar);
  blePeripheral.addAttribute(humChar);
  // Set initial values
  tempChar.setValue(oldTemp);
  humChar.setValue(oldHum);

  /* Now activate the BLE device.  It will start continuously transmitting BLE
     advertising packets and will be visible to remote BLE central devices
     until it receives a new connection */
  blePeripheral.begin();

#if DEBUG
  LOG_SERIAL.println("Bluetooth device active, waiting for connections...");
#endif
}

void loop() {
  BLECentral central = blePeripheral.central();

  // If central has connected to us
  if (central) {

#if DEBUG
    Serial.print("Connected to central: ");
    // Print the central's MAC address:
    Serial.println(central.address());
    // Turn on the LED to indicate the connection:
    digitalWrite(indicatorPin, HIGH);
#endif

    // Update sensor data as long as central is connected
    while (central.connected()) {
      updateSensorData();
    }

#if DEBUG
    // When the central disconnects, turn off the LED:
    digitalWrite(indicatorPin, LOW);
    Serial.print("Disconnected from central: ");
    Serial.println(central.address());
#endif
  }
}
