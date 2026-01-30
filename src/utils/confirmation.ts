import * as readline from 'readline';
import { logger } from './logger.js';

export async function confirmAction(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      const confirmed = answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
      logger.info({ confirmed }, 'User confirmation');
      resolve(confirmed);
    });
  });
}
