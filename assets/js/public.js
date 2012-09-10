//= require vendor/jquery.js
//= require vendor/bootstrap

var socket = io.connect('/');

socket.on('add', function (socketID, username) {
  Chat.addUser(socketID, username);
});

socket.on('remove', function (socketID) {
  Chat.removeUser(socketID);
});

socket.on('msg', function(username, msg){
  Chat.receiveMessage(username, msg);
});

socket.on('ready', function(){
  if (console) {
    console.log('connected and logged in');
  }
});

var Chat = {

  me: null

, setup: function(){
    this.$users = $('#chatmembers-list');
    this.$chatbox = $('#chatbox');
    this.$chatboxWrapper = $('.chat-transcript-wrapper');
  }

, setUsername: function(username){
    this.me = username;
    socket.emit('username', username);
  }

, sendMessage: function(msg){
    socket.emit('msg', username, msg);
  }

, receiveMessage: function(username, msg){
    user = $("<div class='span2 span-mini name'></div>").html(username)
    text = $("<div class='span5 span-maxi chat-text'></div>").html(msg)
    row = $("<div class='row'></div>")
    if (this.isMe(username)) {
      row.addClass('highlight')
    }
    row.append(user)
    row.append(text)
    row.hide()

    this.$chatbox.append(row.fadeIn());
    this.$chatboxWrapper.animate({ scrollTop: this.$chatbox.height()}, 1000);
  }

, isMe: function(username){
    return (username == this.me);
  }

, addUser: function(socketID, username){
    var alreadyListed;
    this.$users.find('span.name').each(function(index, element){
      existingID = $(element).attr('data-socketid');
      if (socketID === existingID) {
        alreadyListed = $(element);
        return false; // already listed
      }
    });

    if (alreadyListed) {
      alreadyListed.text(' ' + username);
       return false;
    }

    var rowHtml = $("<li><i class='icon-user'></i><span class='name'></span></li>");
    var nameHtml = rowHtml.find('.name')
    nameHtml.html(' ' + username)
    nameHtml.attr('data-socketid', socketID);
    this.$users.append(rowHtml);
  }

, removeUser: function(socketID){
    this.$users.find('span.name').each(function(index, element){
      $nameEl = $(element);
      existingID = $nameEl.attr('data-socketid');;
      if (socketID === existingID) {
        $nameEl.closest('li').remove();
      }
    });

  }

};

$(function(){

  Chat.setup();

  $message = $("#message-box");
  $messageField = $message.find('.new-chat');

  $signIn = $('#sign-in-modal');
  $signInField = $('#username');
  $signIn.modal({backdrop: 'static', keyboard: false});
  $signInField.focus();

  $signIn.on('submit', function(){
    username = $signInField.val();
    Chat.setUsername(username);
    $signIn.modal('hide');
    $messageField.focus();
    return false;
  });

  $message.on('submit', function(){
    msg = $messageField.val();
    $messageField.val('');
    $messageField.focus();
    Chat.sendMessage(msg);
    Chat.receiveMessage(Chat.me, msg);
    return false;
  });

  $messageField.on('keydown', function(event){
    if (event.keyCode == 13) {
      $message.submit();
      return false;
    }
  });

  function chatsize () {
    headerHeight = $('#header').height();
    footerHeight = $('#footer').height();
    $('.chatwindow').css('height', ($(window).height() - (headerHeight + footerHeight)) + 'px');
    chatWindowHeight = $('.chatwindow').height();
    chatEntryHeight = $('.chat-entry').height();
    $('.chat-transcript-wrapper').css('height', (chatWindowHeight - chatEntryHeight) + 'px');
  }

  chatsize();
  $(window).resize(chatsize)
});
