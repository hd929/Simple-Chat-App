import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'
import logger from './utils/logger.js'

// Load environment variables
dotenv.config()

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = http.createServer(app)
const io = new Server(server)

// Serve static files
app.use(express.static(join(__dirname, 'public')))

// Store connected users
const connectedUsers = new Map()

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('New client connected', { socketId: socket.id })

  // Handle user joining
  socket.on('user-join', (username) => {
    connectedUsers.set(socket.id, username)
    logger.info('User joined', { username, socketId: socket.id })

    // Broadcast user joined message
    io.emit('user-joined', { username })

    // Update users count
    io.emit('users-update', connectedUsers.size)
  })

  // Handle chat messages
  socket.on('on-chat', (data) => {
    const username = connectedUsers.get(socket.id)
    if (!username) {
      logger.warn('Message received from unidentified user', { socketId: socket.id })
      return
    }

    if (!data.message || typeof data.message !== 'string') {
      logger.warn('Invalid message format', { socketId: socket.id })
      return
    }

    const messageData = {
      username,
      message: data.message.trim(),
      timestamp: new Date().toISOString()
    }

    logger.info('Chat message received', { username, messageLength: data.message.length })
    io.emit('user-chat', messageData)
  })

  // Handle disconnection
  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id)
    if (username) {
      logger.info('User disconnected', { username, socketId: socket.id })
      io.emit('user-left', { username })
      connectedUsers.delete(socket.id)
      io.emit('users-update', connectedUsers.size)
    }
  })

  // Handle errors
  socket.on('error', (error) => {
    logger.error('Socket error', { error: error.message, socketId: socket.id })
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error', { error: err.message })
  res.status(500).send('Internal Server Error')
})

// Start server
const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`)
})
