var sanitizer = require('sanitizer');

function isOk(text){
  return (text && text.length > 0);
}

function truncate(text, length){
  return text.substring(0, length);
}

function clean(text){
  return sanitizer.sanitize(text);
}

var Chat = {

  removeUser: function(socket){
    socket.broadcast.emit('remove', socket.id);
  }

, addUser: function(io, socket, name){
    name = clean(truncate(name, 36));

    if (! isOk(name)){
      return false;
    }

    socket.set('username', name, function(){
      socket.broadcast.emit('add', socket.id, name);
      io.sockets.clients().forEach(function(otherSocket){
        otherSocket.get('username', function(err, username){
          if (username) {
            socket.emit('add', otherSocket.id, username);
          }
        });
      });

      socket.emit('ready');
    })
  }

, sendMessage: function(socket, username, msg){
    if (isOk(username) && isOk(msg)){
      msg = clean(truncate(msg, 500));
      username = clean(truncate(username, 36));
      socket.broadcast.emit('msg', username, msg);
    }
  }

}

module.exports = Chat;
