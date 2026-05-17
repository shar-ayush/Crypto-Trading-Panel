const WebSocket = require('ws');
const config = require('./config');
const logger = require('./logger');
const dataStore = require('./dataStore');

const clients = new Map();
let idCounter = 0;

function addClient(ws) {
  const id = ++idCounter;

  clients.set(id, {
    ws,
    subscriptions: new Set(['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT']),
    isAlive: true,
  });

  logger.success('BROADCASTER', `Client #${id} connected  |  Total clients: ${clients.size}`);

  ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'].forEach((sym) => {
    safeSend(ws, dataStore.getSnapshot(sym));
  });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleClientMessage(id, msg);
    } catch {
      logger.warn('BROADCASTER', `Client #${id} sent invalid JSON — ignored`);
    }
  });

  ws.on('pong', () => {
    const client = clients.get(id);
    if (client) client.isAlive = true;
  });
  ws.on('close', (code) => {
    clients.delete(id);
    logger.warn('BROADCASTER', `Client #${id} disconnected (${code})  |  Total: ${clients.size}`);
  });

  ws.on('error', (err) => {
    logger.error('BROADCASTER', `Client #${id} error: ${err.message}`);
    clients.delete(id);
  });

  return id;
}

//  Handle a message sent by the client 
//   Supported messages:
//     { type: 'subscribe',   symbol: 'BTCUSDT' }
//     { type: 'unsubscribe', symbol: 'ETHUSDT' }
//     { type: 'ping' }
function handleClientMessage(id, msg) {
  const client = clients.get(id);
  if (!client) return;

  switch (msg.type) {

    case 'subscribe': {
      const sym = (msg.symbol || '').toUpperCase();
      if (!sym) break;
      client.subscriptions.add(sym);
      safeSend(client.ws, dataStore.getSnapshot(sym));
      logger.info('BROADCASTER', `Client #${id} subscribed to ${sym}`);
      break;
    }

    case 'unsubscribe': {
      const sym = (msg.symbol || '').toUpperCase();
      client.subscriptions.delete(sym);
      logger.info('BROADCASTER', `Client #${id} unsubscribed from ${sym}`);
      break;
    }

    case 'ping':
      safeSend(client.ws, { type: 'pong', timestamp: Date.now() });
      break;

    default:
      logger.warn('BROADCASTER', `Client #${id} sent unknown message type: ${msg.type}`);
  }
}

//  Broadcast to all clients subscribed to data.symbol 
function broadcast(data) {
  if (!data || !data.symbol) return;
  const sym = data.symbol;

  clients.forEach((client) => {
    if (
      client.ws.readyState === WebSocket.OPEN &&
      client.subscriptions.has(sym)
    ) {
      safeSend(client.ws, data);
    }
  });
}

//  Broadcast to ALL clients regardless of subscriptions 
function broadcastAll(data) {
  if (!data) return;

  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      safeSend(client.ws, data);
    }
  });
}

function safeSend(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (e) {
  }
}

function startHeartbeat() {
  setInterval(() => {
    clients.forEach((client, id) => {
      if (!client.isAlive) {
        logger.warn('BROADCASTER', `Client #${id} missed heartbeat — terminating`);
        client.ws.terminate();
        clients.delete(id);
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });
  }, config.CLIENT.HEARTBEAT_INTERVAL);

  logger.info('BROADCASTER', `Heartbeat started (interval: ${config.CLIENT.HEARTBEAT_INTERVAL / 1000}s)`);
}

function getStats() {
  return {
    connectedClients: clients.size,
    clientIds: Array.from(clients.keys()),
  };
}

module.exports = { addClient, broadcast, broadcastAll, startHeartbeat, getStats };