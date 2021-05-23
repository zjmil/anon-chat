#! /usr/bin/env node

const path = require('path')
const express = require('express')
const WebSocket = require('ws')
const http = require('http')

// http
const app = express()
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname + '/index.html'))
})

app.get('/rooms/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname + '/room.html'))
})


const server = http.createServer(app)

const messages = {}

// websocket
const wss = new WebSocket.Server({server})
wss.on('connection', (conn) => {
  conn.on('message', (data) => {
    var message = JSON.parse(data)
    switch (message.type) {
      case "message":
        addNewMessage(message.room, message.user, message.text)
        // intentional fallthrough
      case "refresh":
        conn.send(JSON.stringify(
          {
            type: "refresh",
            messages: getRoomMessages(message.room)
          }
        ))
        conn.send(JSON.stringify({type: "refresh", messages: messages[message.room] || []}))
        break
      default:
        console.error("Unknown message type", message)
    }
  })
})

function addNewMessage(room, user, text) {
  if (!messages.hasOwnProperty(room)) {
    messages[room] = []
  }
  messages[room].push({text, user, ts: new Date()})
}

function getRoomMessages(room) {
  return messages[room] || []
}

function cleanUpMessages() {
  // var msgTtl = 15 * 60 * 1000 // 15 mins
  var msgTtl = 30  * 1000 // 30 secs
  var maxMsgAge = new Date(new Date().getTime() - msgTtl)
  for (room in messages) {
    messages[room] = messages[room].filter(msg => (
      msg.ts > maxMsgAge
    ))
  }
}

setInterval(cleanUpMessages, 30 * 1000)

const port = 5000
server.listen(port, () => {
  console.log(`Listening on: http://localhost:${port}`)
})
