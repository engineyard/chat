
/*
 * chat websocket application
 */

var chat = exports;



var chatters = {}; // keyed by connection id

var last_guest_id = 0;

var broadcast = function(message) {
  var broadcaster = function() {
    console.log(message)
    var payload = JSON.stringify(message);
    for(var id in chatters) {
      chatters[id].connection.write(payload);
    }
  }
  process.nextTick(broadcaster);
}

var send = function(connection, message) {
  var sender = function() {
    var payload = JSON.stringify(message);
    connection.write(payload)
  };
  process.nextTick(sender);
}

chat.add_chatter = function(connection) {
  var new_chatter = {
    name: 'Guest ' + last_guest_id++,
    connection: connection,
    send: function(msg) { send(this.connection, msg); },
  };
  chatters[connection.id] = new_chatter;
  new_chatter.send({username: new_chatter.name});
  chat.refresh_chatters();
}


chat.refresh_chatters = function() {
  var chatter_names = []
  for(var id in chatters) {
    chatter_names.push(chatters[id].name);
  }

  broadcast({chatters: chatter_names});
}

chat.receive_message = function(id, message) {
  if(typeof chatters[id] === 'undefined') { return; }
  var msg = JSON.parse(message);
  var username = null;
  if(msg.username != null) {
    username = msg.username;
    chatters[id].name = username;
    chatters[id].send({username: username});
    chat.refresh_chatters();
  } else {
    username = chatters[id].name;
  }
  if(msg.message != null) {
    broadcast({message: {username: username, content: msg.message}})
  }
}

chat.remove_chatter = function(id) {
  delete chatters[id];
  chat.refresh_chatters();
}