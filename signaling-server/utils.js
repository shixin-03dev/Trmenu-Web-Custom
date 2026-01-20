
const WebSocket = require('ws')

const topics = new Map()

const send = (conn, message) => {
  if (conn.readyState !== WebSocket.OPEN) {
    conn.close()
  }
  try {
    conn.send(JSON.stringify(message))
  } catch (e) {
    conn.close()
  }
}

const onMessage = (conn, message) => {
  if (message.type === 'publish') {
    let topic = topics.get(message.topic)
    if (topic === undefined) {
      topic = new Set()
      topics.set(message.topic, topic)
    }
    topic.add(conn)
    conn.topics.add(message.topic)
    topic.forEach(receiver => {
      if (receiver !== conn) {
        send(receiver, message)
      }
    })
  } else if (message.type === 'subscribe') {
      // In y-webrtc signaling, subscribe/unsubscribe isn't strictly defined like pubsub but let's handle basic forwarding
      // Actually y-webrtc signaling server logic is:
      // Client A sends { type: 'publish', topic: 'room-name', data: ... }
      // Server broadcasts to all other clients in 'room-name'
      //
      // However, standard y-webrtc signaling implementation is slightly different. 
      // It expects the server to just broadcast messages to everyone in the same topic.
      // The client sends: { type: 'publish', topic: '...', data: ... }
      // The server broadcasts this to all connected clients that subscribed to this topic.
      //
      // Wait, let's look at the official y-webrtc signaling implementation reference.
      // It is essentially a pub/sub.
      // When a client connects, it doesn't explicitly "subscribe".
      // But y-webrtc client sends { type: 'subscribe', topics: ['topic-name'] } ? 
      // No, y-webrtc uses a simpler protocol usually.
      
      // Let's implement the standard minimal signaling logic used by y-webrtc-signaling
      // Reference: https://github.com/yjs/y-webrtc/blob/master/bin/server.js
      
      // The simplified logic in the official repo:
      // message = JSON.parse(message)
      // if (message && message.type && message.topics) { ... }
  }
}

const setupWSConnection = (conn) => {
  conn.topics = new Set()
  conn.on('message', (message) => {
    message = JSON.parse(message)
    if (message && message.type && !conn.closed) {
        switch (message.type) {
            case 'subscribe':
                /** @type {Array<string>} */ (message.topics || []).forEach(topicName => {
                    if (typeof topicName === 'string') {
                        // add conn to topic
                        let topic = topics.get(topicName)
                        if (topic === undefined) {
                            topic = new Set()
                            topics.set(topicName, topic)
                        }
                        topic.add(conn)
                        // add topic to conn
                        conn.topics.add(topicName)
                    }
                })
                break
            case 'unsubscribe':
                /** @type {Array<string>} */ (message.topics || []).forEach(topicName => {
                    const subs = topics.get(topicName)
                    if (subs) {
                        subs.delete(conn)
                    }
                })
                break
            case 'publish':
                if (message.topic) {
                    const receivers = topics.get(message.topic)
                    if (receivers) {
                        receivers.forEach(receiver => {
                            if (receiver !== conn) send(receiver, message)
                        })
                    }
                }
                break
            case 'ping':
                send(conn, { type: 'pong' })
        }
    }
  })
  conn.on('close', () => {
    conn.topics.forEach(topicName => {
      const subs = topics.get(topicName)
      if (subs) {
        subs.delete(conn)
        if (subs.size === 0) {
          topics.delete(topicName)
        }
      }
    })
    conn.topics = null
  })
}

module.exports = {
  setupWSConnection
}
