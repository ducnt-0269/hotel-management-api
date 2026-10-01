import { CommandFactory } from 'nest-commander';

import { CliModule } from './cli.module.js';

// Entry point for commands run by hand: `npm run cli -- --help` lists them.
await CommandFactory.run(CliModule, {
  logger: ['warn', 'error'],
  // nest-commander only prints a command's error by default, which leaves the
  // exit code at 0; a failed run must be visible to whatever launched it.
  serviceErrorHandler: (error) => {
    console.error(error);
    process.exitCode = 1;
  },
});

// The mail worker (MailerQueueModule) opens its own BullMQ connection and never
// closes it on shutdown, so the process has to be ended here. A mail this
// process's worker had picked up but not yet sent is left stalled on Redis;
// BullMQ hands it back to the app's worker, which sends it.
process.exit();
