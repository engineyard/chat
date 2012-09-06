
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , CookieStore = require('cookie-sessions')
  , asset = require('connect-assets');

var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'less');
  app.set('view engine', 'jade');
  app.set('session-secret', "70b9d42bb72c6048f37118353cdbdd11")
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(CookieStore({ secret: app.set('session-secret') }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(asset());
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Websockets

var sockjs = require('sockjs');
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var sockjs_chat = sockjs.createServer(sockjs_opts);
var chat = require('./routes/chat').create();

sockjs_chat.on('connection', function(conn) {
  chat.addChatter(conn);
  conn.on('close', function() {
    chat.removeChatter(conn.id);
  });
  conn.on('data', function(message) {
    chat.receiveMessage(conn.id, message);
  })
});

// Routes

sockjs_chat.installHandlers(app, {prefix: '/echo'});

app.get('/', routes.index);

app.listen((process.env.PORT || 3000), function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
