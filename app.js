
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express.createServer()
  , CookieStore = require('cookie-sessions')
  , asset = require('connect-assets')
  , io = require('socket.io').listen(app)
  , RedisStore = require('socket.io/lib/stores/redis')
  , redis = require('redis')
  , redisHost = (process.env.DB_HOST || 'localhost')
  , redisPort = (process.env.DB_PORT || '6379')
  , pub = redis.createClient(redisPort, redisHost)
  , sub = redis.createClient(redisPort, redisHost)
  , redisClient = redis.createClient(redisPort, redisHost)
  , fs = require('fs')
  , chat = require('./chat');

if ( fs.existsSync('../../shared/no-websockets.txt') ) {
  io.configure(function () {
    io.set("transports", ["xhr-polling"]);
    io.set("polling duration", 10);
  });
}

io.set('store', new RedisStore({
  redisPub : pub
, redisSub : sub
, redisClient : redisClient
}));

module.exports = app

// Configuration of express

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'less');
  app.set('view engine', 'jade');
    app.set('session-secret', "70b9d42bb72c6048f37118353cdbdd11")
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(CookieStore({ secret: app.set('session-secret') }));
  app.use(express.static(__dirname + '/public'));
  app.use(asset({buildDir: 'public'}));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Websockets

io.on('connection', function(socket) {
  socket.on('connect', function(){
    // chat.addUser(socket)
  });
  socket.on('disconnect', function(){
    chat.removeUser(socket);
  });
  socket.on('username', function(name){
    chat.addUser(io, socket, name);
  });
  socket.on('msg', function(name, msg){
    chat.sendMessage(socket, name, msg)
  });
});

// Routes

app.get('/', function(req, res){
  res.render('index', { title: 'Node.js Chat' })
});

// Bind to port

app.listen((process.env.PORT || 3000), function(){
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
