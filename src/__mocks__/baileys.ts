// Mock for Baileys library to avoid ESM import issues in Jest
export const DisconnectReason = {
  connectionClosed: 428,
  connectionLost: 408,
  connectionReplaced: 440,
  timedOut: 408,
  loggedOut: 401,
  badSession: 500,
  restartRequired: 515,
};

export const useMultiFileAuthState = jest.fn().mockResolvedValue({
  state: {},
  saveCreds: jest.fn(),
});

export const fetchLatestBaileysVersion = jest.fn().mockResolvedValue({
  version: [2, 3000, 0],
  isLatest: true,
});

const mockSocket = {
  ev: {
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  },
  sendMessage: jest.fn().mockResolvedValue({}),
  end: jest.fn(),
  logout: jest.fn(),
  user: {
    id: '5511999999999@s.whatsapp.net',
    name: 'Test User',
  },
};

const makeWASocket = jest.fn().mockReturnValue(mockSocket);

export default makeWASocket;

export type WASocket = typeof mockSocket;
export type ConnectionState = {
  connection: 'close' | 'open' | 'connecting';
  lastDisconnect?: {
    error?: Error;
    date: Date;
  };
  qr?: string;
  receivedPendingNotifications?: boolean;
};
