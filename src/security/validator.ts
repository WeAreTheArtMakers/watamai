import { sandbox } from './sandbox.js';
import { logger } from '../utils/logger.js';

/**
 * Güvenli dosya okuma wrapper
 */
export async function safeReadFile(filePath: string): Promise<string | null> {
  if (!sandbox.canRead(filePath)) {
    logger.error(`🚫 Access denied: Cannot read ${filePath}`);
    throw new Error(`Access denied: Cannot read ${filePath}`);
  }

  try {
    const fs = await import('fs/promises');
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to read file');
    return null;
  }
}

/**
 * Güvenli dosya yazma wrapper
 */
export async function safeWriteFile(filePath: string, content: string): Promise<boolean> {
  if (!sandbox.canWrite(filePath)) {
    logger.error(`🚫 Access denied: Cannot write ${filePath}`);
    throw new Error(`Access denied: Cannot write ${filePath}`);
  }

  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
    return true;
  } catch (error) {
    logger.error({ error, filePath }, 'Failed to write file');
    return false;
  }
}

/**
 * Güvenli komut çalıştırma wrapper
 */
export function safeExecuteCommand(command: string): boolean {
  if (!sandbox.canExecute(command)) {
    logger.error(`🚫 Access denied: Cannot execute ${command}`);
    throw new Error(`Access denied: Cannot execute ${command}`);
  }

  logger.info(`✅ Command allowed: ${command}`);
  return true;
}

/**
 * Güvenli network erişim wrapper
 */
export function safeNetworkAccess(url: string): boolean {
  if (!sandbox.canAccessNetwork(url)) {
    logger.error(`🚫 Access denied: Cannot access ${url}`);
    throw new Error(`Access denied: Cannot access ${url}`);
  }

  logger.info(`✅ Network access allowed: ${url}`);
  return true;
}

/**
 * Güvenlik durumu raporu
 */
export function getSecurityReport(): {
  status: ReturnType<typeof sandbox.getStatus>;
  violations: ReturnType<typeof sandbox.getViolations>;
  recommendations: string[];
} {
  const status = sandbox.getStatus();
  const violations = sandbox.getViolations();

  const recommendations: string[] = [];

  if (!status.enabled) {
    recommendations.push('⚠️ Sandbox disabled - enable for production');
  }

  if (violations.length > 0) {
    recommendations.push(`⚠️ ${violations.length} security violations detected`);
  }

  if (violations.length > 10) {
    recommendations.push('🚨 Too many violations - review bot behavior');
  }

  return {
    status,
    violations,
    recommendations,
  };
}
