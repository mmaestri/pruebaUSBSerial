var express = require('express');

var path = require('path');
var logger = require('morgan');

var routes = require('./routes/index');
var command = require('./routes/command');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'bower_components')));
app.use(express.static(path.join(__dirname, 'node_modules')));

app.use('/', routes);
app.use('/command', command);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});



var Parse = require('parse').Parse;
Parse.initialize("iHBoW7NiugHfz1TBYimBbCuVgaNLiu2ojq8uqIBH", "F3oYWOs8MGa6Ct5osHiLleyxUt1WFi6FdKeuaY2k");
var RecordObject = Parse.Object.extend("RecordObject");


var socket_app = require('express')();
var server = require('http').Server(socket_app);
var io = require('socket.io')(server);
server.listen(3001);

var _ = require('lodash');
var sPort = require("serialport");
var SerialPort = sPort.SerialPort;

var portAddress = process.platform === 'darwin' ? "/dev/tty.wchusbserial1410" : "COM3";

var serialPort = new SerialPort(portAddress, {
  baudrate: 115200,
  parser: sPort.parsers.readline("\n")
}, false);

function SerialDispatcher(serialPort) {
  function ConnHandler() {
    this.sockets = {};
    this.selectedSocket = null;
    this.addSocket = function(socket) {
      this.sockets[socket.id] = socket;
    };
    this.removeSocket = function(id) {
      delete this.sockets[id];
    };
    this.broadcast = function(event) {
      _.each(this.sockets, function(socket) {
        socket.emit(event.type, event.data);
      });
    };
    this.emit = function(event) {
      this.selectedSocket.emit(event.type, event.data);
    }
  }
  function init() {
    serialPort.on('data', function(data) {
      var _data;
      if(data.indexOf(';') >= 0) {
        data = {
          type: 'data',
          data: {
            message: 'Datos obtenidos',
            data: _.chain(data.split(';'))
                .remove(function (item) {
                  return item.length !== 0;
                })
                .map(function (item) {
                  return parseInt(item)
                })
                .value()
          }
        };
        /*sDispatcher.connHandler.emit({
          type: 'data',
          data: {
            message: 'Datos obtenidos',
            data: _.chain(data.split(';'))
                .remove(function (item) {
                  return item.length !== 0;
                })
                .map(function (item) {
                  return parseInt(item)
                })
                .value()
          }
        });*/
      } else {
        _data = {
          type: 'data',
          data: {
            message: data
          }
        };
        /*
        sDispatcher.connHandler.emit({
          type: 'data',
          data: {
            message: data
          }
        });
        */
      }
      recordObject.save(_data).then(function(object) {
        console.log(_data);
        sDispatcher.connHandler.emit(_data);
      });
    });
  }
  var _self = this;
  this.connHandler = new ConnHandler();
  this.requests = [];
  this.addRequest = function(socket, request) {
    _self.requests.push({socket: socket, request: request });
  };
  this.wakeUp = function() {
    if(_self.requests.length) {
      _self.processQueue();
    }
  };
  this.processRequest = function(requestItem) {
    serialPort.open(function (error) {
      var command = requestItem.request.command,
          value = requestItem.request.params ? requestItem.request.params: '';
      if ( error ) {
        console.log('failed to open: '+ error);
      } else {
        _self.connHandler.selectedSocket = requestItem.socket;
        serialPort.write(command + value + "\n");
      }
    });
  };
  this.processQueue = function() {
    while(_self.requests.length > 0) {
      _self.processRequest(_self.requests.pop())
    }
  };
  this.destroy = function() {
    serialPort.close();
  };
  init();
}

var sDispatcher = new SerialDispatcher(serialPort);

io.on('connection', function (socket) {

  sDispatcher.connHandler.addSocket(socket);

  socket.on('request', function (request) {
    sDispatcher.addRequest(socket, request);
    sDispatcher.wakeUp();
  });

  socket.on('disconnect', function () {
    sDispatcher.connHandler.removeSocket(socket.id);
  });
});

module.exports = app;
