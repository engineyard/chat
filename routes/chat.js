
/*
 * chat websocket application
 */

var redisLib = require('redis'),
  publisher = redisLib.createClient(),
  subscriber = redisLib.createClient(),
  redis = redisLib.createClient()

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
      newChatter.send({username: newChatter.name});
      Chat.refreshChatters();
    })
  },

  refreshChatters: function() {
    ChatTracker.all(function(err, allChatters){
      var chatterNames = [];
      for(var id in allChatters) {
        chatterNames.push(allChatters[id]);
      }

      CrossServer.enqueue({chatters: chatterNames});
    });
  },

  receiveMessage: function(id, message) {
    if(typeof Chat.clientConnections[id] === 'undefined') { return; }
    var msg = JSON.parse(message);
    var username = null;
    if(msg.username != null) {
      username = msg.username;
      Chat.clientConnections[id].name = username;
      Chat.clientConnections[id].send({username: username});
      ChatTracker.add(id, username);
      Chat.refreshChatters();
    } else {
      username = Chat.clientConnections[id].name;
    }
    if(msg.message != null) {
      CrossServer.enqueue({message: {username: username, content: msg.message}})
    }
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
  }

};

var ClientServices = {

  broadcast: function(payload) {
    var connections = Chat.clientConnections;
    var broadcaster = function() {
      console.log(process.pid, "Broadcasting to connected clients", payload)
      for(var id in connections) {
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
