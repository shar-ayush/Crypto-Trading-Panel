const c = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// HH:MM:SS.mmm
const ts = () => new Date().toISOString().substring(11, 23);

// Pad tag to 12 chars so columns line up
const tag = (t) => `[${t}]`.padEnd(14);

const logger = {
  info: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.cyan}${c.bright}${tag(t)}${c.reset} ${msg}`),
  success: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.green}${c.bright}${tag(t)}${c.reset} ${c.green}${msg}${c.reset}`),
  warn: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.yellow}${c.bright}${tag(t)}${c.reset} ${c.yellow}${msg}${c.reset}`),
  error: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.red}${c.bright}${tag(t)}${c.reset} ${c.red}${msg}${c.reset}`),
  data: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.magenta}${c.bright}${tag(t)}${c.reset} ${msg}`),
  trade: (t, msg) => console.log(`${c.dim}${ts()}${c.reset} ${c.blue}${c.bright}${tag(t)}${c.reset} ${c.blue}${msg}${c.reset}`),
};

module.exports = logger;