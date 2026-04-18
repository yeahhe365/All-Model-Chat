import { loadConfig } from './config.js';
import { createServer } from './createServer.js';

const config = loadConfig();
const server = createServer(config);

server.listen(config.port, '0.0.0.0', () => {
  console.log(`API server listening on port ${config.port}`);
});
