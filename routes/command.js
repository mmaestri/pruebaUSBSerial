var express = require('express');
var router = express.Router();

var _ = require('lodash');
var sPort = require("serialport");
var SerialPort = sPort.SerialPort;

var portAddress = process.platform === 'darwin' ? "/dev/tty.wchusbserial1410" : "COM3";

var serialPort = new SerialPort(portAddress, {
  baudrate: 115200,
  parser: sPort.parsers.readline("\n")
}, false);


function handler(req, res, next) {
  serialPort.on('data', function(data) {
    serialPort.close();
    if(data.indexOf(';') >= 0) {
      res.jsonp({
        message: 'Datos obtenidos',
        data: _.chain(data.split(';'))
            .remove(function(item) { return item.length !== 0; })
            .map(function(item) { return parseInt(item)})
            .value()
      });
    } else {
      res.jsonp({
        message: data
      });
    }
  });

  serialPort.open(function (error) {
    var command = req.params.command,
        value = req.params.value ? req.params.value : '';
    if ( error ) {
      console.log('failed to open: '+ error);
    } else {
      serialPort.write(command + value + "\n");
    }
  });
}

router.get('/:command', handler);
router.get('/:command/:value', handler);

module.exports = router;
