
/*
 * chat websocket application
 */

var redis_host = (process.env.DB_HOST || 'localhost'),
  redisLib = require('redis'),
  publisher = redisLib.createClient(null, redis_host),
  subscriber = redisLib.createClient(null, redis_host),
  redis = redisLib.createClient(null, redis_host),
  sanitizer = require('sanitizer'),
  async = require('async');

var Chat = {

  clientConnections: {},

  create: function(){
    CrossServer.listen();
    return this;
  },

  addChatter: function(connection) {
    var id = connection.id;

    ChatTracker.nextGuestName(function(err, guestName){
      console.log(process.pid, "New chatter", id, guestName);
      var newChatter = {
        connection: connection,
        name: guestName,
        send: function(msg) { ClientServices.send(connection, msg); },
      };
      Chat.clientConnections[id] = newChatter;
      ChatTracker.add(id, newChatter.name);
      Chat.refreshChatters();
    })
  },

  refreshChatters: function() {
    ChatTracker.all(function(err, allChatters){
      var chatterIds = [];
      var chatterNames = [];
      for(var id in allChatters) {
        chatterIds.push(id);
      }

      async.filter(chatterIds, ChatTracker.isRecent, function(seenIds){
        for(var seenIdIndex in seenIds) {
          chatterNames.push(allChatters[seenIds[seenIdIndex]]);
        }

        CrossServer.enqueue({chatters: chatterNames});
      });
    });
  },

  receiveMessage: function(id, message) {
    ChatTracker.justSaw(id);
    if(typeof Chat.clientConnections[id] === 'undefined') { return; }
    var msg = JSON.parse(message),
      cleanUsername = null,
      cleanMessage = null;

    if(msg.username != null) {
      cleanUsername = sanitizer.escape(msg.username);
      Chat.clientConnections[id].name = cleanUsername;
      Chat.clientConnections[id].send({username: cleanUsername});
      ChatTracker.add(id, cleanUsername);
    } else {
      cleanUsername = Chat.clientConnections[id].name;
    }

    if(msg.message != null) {
      cleanMessage = sanitizer.escape(msg.message);
      if(cleanMessage == '') return;
      if(cleanMessage == '/clear'){
        redis.keys('seen-*', function(err, results){
          redis.del(results);
        });
        return;
      }
      CrossServer.enqueue({message: {username: cleanUsername, content: cleanMessage}});
    }

    Chat.refreshChatters();
  },

  removeChatter: function(id) {
    delete Chat.clientConnections[id];
    ChatTracker.remove(id);
    Chat.refreshChatters();
  }

};

var ChatTracker = {

  add: function(id, name){
    redis.hset('chatters', id, name);
  },

  remove: function(id){
    redis.hdel('chatters', id)
  },

  all: function(callback){
    redis.hgetall('chatters', callback);
  },

  nextGuestName: function(callback){
    redis.incr("chatter-count", function(err, nextGuestId){
      callback(err, "Guest " + nextGuestId);
    });
  },

  justSaw: function(id){
    redis.set('seen-' + id, true, function(err, result){
      redis.expire('seen-' + id, 60);
    });
  },

  isRecent: function(id, callback){
    redis.ttl('seen-' + id, function(err, result) {
      if(err != null) {
        callback(false);
      } else if(result != null && result > 0) {
        callback(true);
      } else {
        callback(false);
      }
    });
  }

};

var ClientServices = {

  broadcast: function(payload) {
    var connections = Chat.clientConnections;
    var broadcaster = function() {
      console.log(process.pid, "Broadcasting to connected clients", payload)
      for(var id in connections) {
        ChatTracker.justSaw(id);
        connections[id].connection.write(payload);
      }
    }
    process.nextTick(broadcaster);
  },

  send: function(connection, message) {
    var sender = function() {
      var payload = JSON.stringify(message);
      connection.write(payload)
    };
    process.nextTick(sender);
  }

};

var CrossServer = {

  enqueue: function(data){
    var payload = JSON.stringify(data);
    publisher.publish("chat", payload);
  },

  listen: function(){
    subscriber.subscribe("chat")
    subscriber.on('message', function(channel, payload){
      ClientServices.broadcast(payload);
    });
  }

};

module.exports = Chat;
