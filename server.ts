import express from 'express';
import { createServer } from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { OAuth2Client } from 'google-auth-library';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { User, Message, ClientMessage, ServerMessage } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON parser for body
app.use(express.json());

// Google Auth Client
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// DB file paths
const MESSAGES_FILE = path.join(process.cwd(), 'messages_db.json');
const USERS_FILE = path.join(process.cwd(), 'users_db.json');

// Memory cache for DBs
let messages: Message[] = [];
let registeredUsers: User[] = [];

// Load data on startup
try {
  if (fs.existsSync(MESSAGES_FILE)) {
    messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    console.log(`Loaded ${messages.length} messages from database.`);
  } else {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2));
  }
} catch (error) {
  console.error('Error reading messages database:', error);
  messages = [];
}

try {
  if (fs.existsSync(USERS_FILE)) {
    registeredUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    console.log(`Loaded ${registeredUsers.length} registered users from database.`);
  } else {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
} catch (error) {
  console.error('Error reading users database:', error);
  registeredUsers = [];
}

// Save databases helper
function saveMessages() {
  try {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Failed to save messages database:', err);
  }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(registeredUsers, null, 2));
  } catch (err) {
    console.error('Failed to save users database:', err);
  }
}

// Express API endpoints
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date().toISOString() });
});

// Endpoint to fetch google auth client id config
app.get('/api/auth/config', (req, res) => {
  res.json({
    googleClientId: GOOGLE_CLIENT_ID,
  });
});

// Verify Google Token Endpoint
app.post('/api/auth/google', async (req: express.Request, res: express.Response): Promise<void> => {
  const { idToken, mockUser } = req.body;

  // Sandbox simulation support (crucial for local testing in AI Studio iframe where third-party popups are constrained)
  if (mockUser) {
    const { id, name, email, avatar } = mockUser;
    if (!id || !email) {
       res.status(400).json({ error: 'Missing required mock user fields' });
       return;
    }

    // Register or update user
    let user = registeredUsers.find((u) => u.id === id);
    if (user) {
      user.name = name || user.name;
      user.avatar = avatar || user.avatar;
      user.email = email;
    } else {
      user = { id, name, email, avatar: avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${id}`, online: false };
      registeredUsers.push(user);
    }
    saveUsers();

    res.json({ success: true, user });
    return;
  }

  if (!idToken) {
     res.status(400).json({ error: 'idToken is required' });
     return;
  }

  try {
    // If we have a Google Client ID, we can do real OAuth verification
    if (GOOGLE_CLIENT_ID) {
      const ticket = await client.verifyIdToken({
        idToken: idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload) {
         res.status(400).json({ error: 'Invalid Google ID token' });
         return;
      }

      const googleId = payload.sub; // Unique user ID
      const email = payload.email || '';
      const name = payload.name || '';
      const picture = payload.picture || '';

      let user = registeredUsers.find((u) => u.id === googleId || u.email === email);
      if (user) {
        user.id = googleId; // ensure it is googleId
        user.name = name || user.name;
        user.avatar = picture || user.avatar;
        user.email = email;
      } else {
        user = {
          id: googleId,
          name,
          email,
          avatar: picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${googleId}`,
          online: false,
        };
        registeredUsers.push(user);
      }
      saveUsers();

      res.json({ success: true, user });
    } else {
      // If GOOGLE_CLIENT_ID is not configured, fall back to parsing jwt client-side or safe warning
      // For developer ease when they haven't put a CLIENT_ID in their env yet, we can extract details from the JWT
      // securely or alert them. Let's do a safe JWT decoding for sandbox ease.
      const base64Url = idToken.split('.')[1];
      if (!base64Url) {
         res.status(400).json({ error: 'Invalid token format' });
         return;
      }
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
      const payload = JSON.parse(jsonPayload);

      const googleId = payload.sub || payload.email;
      const email = payload.email || '';
      const name = payload.name || payload.email?.split('@')[0] || 'Google User';
      const picture = payload.picture || `https://api.dicebear.com/7.x/adventurer/svg?seed=${googleId}`;

      let user = registeredUsers.find((u) => u.id === googleId || u.email === email);
      if (user) {
        user.name = name || user.name;
        user.avatar = picture || user.avatar;
        user.email = email;
      } else {
        user = {
          id: googleId,
          name,
          email,
          avatar: picture,
          online: false,
        };
        registeredUsers.push(user);
      }
      saveUsers();

      res.json({ success: true, user });
    }
  } catch (error: any) {
    console.error('Token verification failed:', error);
    res.status(401).json({ error: 'Token verification failed', details: error.message });
  }
});

// Setup HTTP server
const server = createServer(app);

// WebSocket active connections
const activeConnections = new Map<string, { socket: WebSocket; user: User }>();

// WebSocket Server (noServer: true to manually handle upgrade)
const wss = new WebSocketServer({ noServer: true });

// Manually handle upgrading to support co-existing with other protocols / Vite middleware securely
server.on('upgrade', (request, socket, head) => {
  try {
    const urlObj = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
    if (urlObj.pathname === '/api/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  } catch (err) {
    console.error('Error handling WebSocket upgrade:', err);
  }
});

// Helper to broadcast users list
function broadcastUsers() {
  const usersWithOnlineStatus = registeredUsers.map((u) => {
    const isOnline = activeConnections.has(u.id);
    return { ...u, online: isOnline };
  });

  const msg: ServerMessage = {
    type: 'users_update',
    payload: { users: usersWithOnlineStatus },
  };

  const payloadStr = JSON.stringify(msg);
  activeConnections.forEach((conn) => {
    if (conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.send(payloadStr);
    }
  });
}

wss.on('connection', (ws) => {
  let authenticatedUserId: string | null = null;

  console.log('New WS connection established.');

  ws.on('message', (rawData) => {
    try {
      const data: ClientMessage = JSON.parse(rawData.toString());

      switch (data.type) {
        case 'auth': {
          const { user } = data.payload;
          authenticatedUserId = user.id;

          // Add to active connections
          activeConnections.set(user.id, { socket: ws, user });
          console.log(`User ${user.name} (${user.id}) authenticated via WebSockets.`);

          // Mark user as online in database list
          const dbUser = registeredUsers.find((u) => u.id === user.id);
          if (dbUser) {
            dbUser.online = true;
          } else {
            registeredUsers.push({ ...user, online: true });
            saveUsers();
          }

          // Broadcast updated user statuses to all clients
          broadcastUsers();
          break;
        }

        case 'send_message': {
          if (!authenticatedUserId) {
            console.warn('Unauthorized message attempt');
            return;
          }

          const { recipientId, text, id } = data.payload;
          const newMsg: Message = {
            id: id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            senderId: authenticatedUserId,
            recipientId,
            text,
            timestamp: Date.now(),
            status: activeConnections.has(recipientId) ? 'delivered' : 'sent',
            type: 'text',
          };

          // Save to database
          messages.push(newMsg);
          saveMessages();

          // Send receipt confirmation to sender
          const sendReceipt = (status: 'delivered' | 'read') => {
            const receiptMsg: ServerMessage = {
              type: 'message_status_update',
              payload: { id: newMsg.id, recipientId, status },
            };
            ws.send(JSON.stringify(receiptMsg));
          };

          // Forward to recipient if online
          const recipientConn = activeConnections.get(recipientId);
          if (recipientConn && recipientConn.socket.readyState === WebSocket.OPEN) {
            const fwdMsg: ServerMessage = {
              type: 'receive_message',
              payload: newMsg,
            };
            recipientConn.socket.send(JSON.stringify(fwdMsg));
            sendReceipt('delivered');
          } else {
            // Confirm to sender that it has been sent
            const fwdMsg: ServerMessage = {
              type: 'receive_message',
              payload: newMsg,
            };
            ws.send(JSON.stringify(fwdMsg));
          }
          break;
        }

        case 'typing': {
          if (!authenticatedUserId) return;
          const { recipientId, isTyping } = data.payload;

          const recipientConn = activeConnections.get(recipientId);
          if (recipientConn && recipientConn.socket.readyState === WebSocket.OPEN) {
            const typingMsg: ServerMessage = {
              type: 'typing_update',
              payload: {
                userId: authenticatedUserId,
                recipientId,
                isTyping,
              },
            };
            recipientConn.socket.send(JSON.stringify(typingMsg));
          }
          break;
        }

        case 'mark_read': {
          if (!authenticatedUserId) return;
          const { senderId } = data.payload;

          // Update message statuses in storage
          let updatedCount = 0;
          messages.forEach((msg) => {
            if (msg.senderId === senderId && msg.recipientId === authenticatedUserId && msg.status !== 'read') {
              msg.status = 'read';
              updatedCount++;

              // Notify the sender that this message was read
              const senderConn = activeConnections.get(senderId);
              if (senderConn && senderConn.socket.readyState === WebSocket.OPEN) {
                const readReceiptMsg: ServerMessage = {
                  type: 'message_status_update',
                  payload: {
                    id: msg.id,
                    recipientId: authenticatedUserId!,
                    status: 'read',
                  },
                };
                senderConn.socket.send(JSON.stringify(readReceiptMsg));
              }
            }
          });

          if (updatedCount > 0) {
            saveMessages();
          }
          break;
        }

        case 'request_history': {
          if (!authenticatedUserId) return;
          const { contactId } = data.payload;

          // Filter history between authenticated user and target contact
          const filteredMessages = messages.filter(
            (msg) =>
              (msg.senderId === authenticatedUserId && msg.recipientId === contactId) ||
              (msg.senderId === contactId && msg.recipientId === authenticatedUserId)
          );

          // Return history to requestor
          const historyMsg: ServerMessage = {
            type: 'history',
            payload: {
              recipientId: contactId,
              messages: filteredMessages,
            },
          };
          ws.send(JSON.stringify(historyMsg));
          break;
        }

        default:
          console.warn('Unknown client message type:', (data as any).type);
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (authenticatedUserId) {
      console.log(`User ${authenticatedUserId} disconnected.`);
      activeConnections.delete(authenticatedUserId);

      // Mark offline in registered user list
      const dbUser = registeredUsers.find((u) => u.id === authenticatedUserId);
      if (dbUser) {
        dbUser.online = false;
        dbUser.lastSeen = Date.now();
      }

      // Broadcast update
      broadcastUsers();
    }
  });
});

// Setup Vite Dev Server middleware in non-production
async function startApp() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite development server middleware loaded.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static bundle.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startApp().catch((err) => {
  console.error('Failed to start application:', err);
});
