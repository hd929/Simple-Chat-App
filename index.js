import express from 'express'
import http from 'http'
import { Server } from 'socket.io'

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/index.html')
})

io.on('connection', (socket) => {
  console.log('user connect')
  socket.on('on-chat', (data) => {
    io.emit('user-chat', data)
  })
})

server.listen(3000, () => {
  console.log('listening on port 3000')
})
