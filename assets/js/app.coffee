#= require vendor/jquery
#= require vendor/underscore
#= require vendor/backbone
#= require vendor/handlebars
#= require vendor/bootstrap


window.message = (obj) ->
  sock.send JSON.stringify(obj)

connectFailures = 0
chatConnect = ->
  window.sock = new SockJS("/chat")

  sock.onopen = ->
    connectFailures = 1

  sock.onmessage = (e) ->
    data = JSON.parse e.data
    if data.message
      chat.message(data.message)
    if data.chatters
      chat.chatters(data.chatters)
    if data.username
      chat.username(data.username)

  sock.onclose = ->
    setTimeout(chatConnect, 1000 * connectFailures)
    connectFailures += 1

chatConnect()

chat = {
  me: '',
  isMe: (name) -> this.me == name
  chatters: (names) ->
    list = $('#chatmembers-list')
    list.html('')
    for index, name of names
      rowHtml = $("<li><i class='icon-user'></i><span class='name'></span></li>")
      rowHtml.find('.name').html(' '+name)
      list.append rowHtml

  message: (msg) ->
    user = $("<div class='span2 span-mini name'></div>").html(msg.username)
    text = $("<div class='span5 span-maxi chat-text'></div>").html(msg.content)
    row = $("<div class='row'></div>")
    row.addClass('highlight') if this.isMe msg.username
    row.append(user)
    row.append(text)
    row.hide()

    chatbox = $('#chatbox')
    chatboxWrapper = $('.chat-transcript-wrapper')

    chatbox.append(row.fadeIn())
    chatboxWrapper.animate({ scrollTop: chatbox.height()}, 1000);


    console.log("#{msg.username} says: #{msg.content}")
  username: (username) ->
    console.log "setting username #{username}"
    this.me = username

  setUsername: (username) ->
    message({username: username})

  sendMessage: (msg) ->
    message({message: msg, username: chat.me})
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

  $messageField.on 'keydown', (event) ->
    if event.keyCode == 13 && not event.ctrlKey
      $message.submit()
      false

  # chat window sizing because css is an asshole
  chatsize = ->
    headerHeight = $('#header').height();
    footerHeight = $('#footer').height();
    console.log headerHeight;
    console.log footerHeight;
    $('.chatwindow').css('height', ($(window).height() - (headerHeight + footerHeight)) + 'px');
    chatWindowHeight = $('.chatwindow').height();
    chatEntryHeight = $('.chat-entry').height();
    $('.chat-transcript-wrapper').css('height', (chatWindowHeight - chatEntryHeight) + 'px');
    return

  chatsize()
  $(window).resize(chatsize)
  return
