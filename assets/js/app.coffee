#= require vendor/jquery
#= require vendor/underscore
#= require vendor/backbone
#= require vendor/handlebars
#= require vendor/bootstrap


window.sock = new SockJS("/echo")
window.message = (obj) ->
  sock.send JSON.stringify(obj)


sock.onopen = ->
  console.log("open");

sock.onmessage = (e) ->
  data = JSON.parse e.data
  if data.message
    chat.message(data.message)
  if data.chatters
    chat.chatters(data.chatters)
  if data.username
    chat.username(data.username)


sock.onclose = ->
  console.log("close");


chat = {
  me: '',
  isMe: (name) -> this.me == name
  chatters: (names) ->
    list = $('#chatmembers-list')
    list.html('')
    for index, name of names
      if this.isMe(name)
        list.append $("<li><i class='icon-user'></i> #{name} (you!)</li>")
      else
        list.append $("<li><i class='icon-user'></i> #{name}</li>")

  message: (msg) ->
    user = $("<div class='span2 name'>#{msg.username}</div>")
    text = $("<div class='span5 chat-text'>#{msg.content}</div>")
    row = $("<div class='row'></div>")
    row.addClass('highlight') if this.isMe msg.username
    row.append(user)
    row.append(text)
    row.hide()

    chatbox = $('#chatbox')
    chatboxWrapper = $('.chat-transcript-wrapper')

    chatbox.append(row.fadeIn())
    chatboxWrapper.animate({ scrollTop: chatboxWrapper.height()}, 1000);


    console.log("#{msg.username} says: #{msg.content}")
  username: (username) ->
    console.log "setting username #{username}"
    this.me = username

  setUsername: (username) ->
    message({username: username})

  sendMessage: (msg) ->
    message({message: msg})
}

$ ->
  $signIn = $('#sign-in-modal')
  $signInField = $('#username')
  $message = $("#message-box")
  $messageField = $message.find('.new-chat')

  $signIn.modal(backdrop: 'static', keyboard: false)
  $signInField.focus()

  $signIn.on 'submit', ->
    username = $signInField.val()
    chat.setUsername(username)
    $signIn.modal('hide')
    $messageField.focus()
    false

  $message.on 'submit', ->
    msg = $messageField.val()
    $messageField.val('')
    $messageField.focus()
    chat.sendMessage(msg)
    false
