import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger.js';

interface SandboxConfig {
  security: {
    enabled: boolean;
    strictMode: boolean;
    isolatedWorkspace: boolean;
  };
  allowedPaths: {
    read: string[];
    write: string[];
    execute: string[];
  };
  blockedPaths: {
    paths: string[];
  };
  allowedCommands: {
    commands: string[];
    blockedCommands: string[];
  };
  networkAccess: {
    enabled: boolean;
    allowedDomains: string[];
    blockedDomains: string[];
    allowedPorts: number[];
  };
  resourceLimits: {
    maxMemoryMB: number;
    maxCPUPercent: number;
    maxFileSize: string;
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
}

export class Sandbox {
  private config: SandboxConfig;
  private workspaceRoot: string;
  private violations: Array<{ type: string; path: string; timestamp: Date }> = [];

  constructor(configPath?: string) {
    this.workspaceRoot = process.cwd();
    this.config = this.loadConfig(configPath);
    
    if (this.config.security.enabled) {
      logger.info('🔒 Sandbox mode enabled - güvenli çalışma ortamı aktif');
    }
  }

  private loadConfig(configPath?: string): SandboxConfig {
    const defaultPath = path.join(this.workspaceRoot, '.kiro/security/sandbox.json');
    const configFile = configPath || defaultPath;

    try {
      const data = fs.readFileSync(configFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.warn('Sandbox config not found, using defaults');
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): SandboxConfig {
    return {
      security: {
        enabled: true,
        strictMode: true,
        isolatedWorkspace: true,
      },
      allowedPaths: {
        read: ['src/**/*', 'docs/**/*', '.kiro/**/*'],
        write: ['logs/**/*', 'data/**/*'],
        execute: ['npm', 'node', 'tsx'],
      },
      blockedPaths: {
        paths: ['~/.ssh/**', '~/.aws/**', '../**'],
      },
      allowedCommands: {
        commands: ['npm run cli', 'npm test'],
        blockedCommands: ['rm -rf', 'sudo', 'curl', 'wget'],
      },
      networkAccess: {
        enabled: true,
        allowedDomains: ['moltbook.com', 'wearetheartmakers.com'],
        blockedDomains: ['*'],
        allowedPorts: [443, 80],
      },
      resourceLimits: {
        maxMemoryMB: 512,
        maxCPUPercent: 50,
        maxFileSize: '10MB',
        maxConcurrentRequests: 5,
        requestTimeout: 30000,
      },
    };
  }

  /**
   * Dosya okuma izni kontrolü
   */
  canRead(filePath: string): boolean {
    if (!this.config.security.enabled) return true;

    const normalizedPath = this.normalizePath(filePath);

    // Blocked paths kontrolü
    if (this.isBlocked(normalizedPath)) {
      this.logViolation('read', normalizedPath);
      return false;
    }

    // Workspace dışına çıkma kontrolü
    if (this.config.security.isolatedWorkspace && !this.isInWorkspace(normalizedPath)) {
      this.logViolation('read-outside-workspace', normalizedPath);
      return false;
    }

    // Allowed paths kontrolü
    if (this.matchesPattern(normalizedPath, this.config.allowedPaths.read)) {
      return true;
    }

    this.logViolation('read-not-allowed', normalizedPath);
    return false;
  }

  /**
   * Dosya yazma izni kontrolü
   */
  canWrite(filePath: string): boolean {
    if (!this.config.security.enabled) return true;

    const normalizedPath = this.normalizePath(filePath);

    // Blocked paths kontrolü
    if (this.isBlocked(normalizedPath)) {
      this.logViolation('write', normalizedPath);
      return false;
    }

    // Workspace dışına çıkma kontrolü
    if (this.config.security.isolatedWorkspace && !this.isInWorkspace(normalizedPath)) {
      this.logViolation('write-outside-workspace', normalizedPath);
      return false;
    }

    // Allowed paths kontrolü
    if (this.matchesPattern(normalizedPath, this.config.allowedPaths.write)) {
      return true;
    }

    this.logViolation('write-not-allowed', normalizedPath);
    return false;
  }

  /**
   * Komut çalıştırma izni kontrolü
   */
  canExecute(command: string): boolean {
    if (!this.config.security.enabled) return true;

    // Blocked commands kontrolü
    for (const blocked of this.config.allowedCommands.blockedCommands) {
      if (command.includes(blocked)) {
        this.logViolation('execute-blocked', command);
        return false;
      }
    }

    // Allowed commands kontrolü
    for (const allowed of this.config.allowedCommands.commands) {
      if (command.startsWith(allowed)) {
        return true;
      }
    }

    this.logViolation('execute-not-allowed', command);
    return false;
  }

  /**
   * Network erişim izni kontrolü
   */
  canAccessNetwork(url: string): boolean {
    if (!this.config.security.enabled) return true;
    if (!this.config.networkAccess.enabled) return false;

    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Allowed domains kontrolü
      for (const allowed of this.config.networkAccess.allowedDomains) {
        if (domain === allowed || domain.endsWith(`.${allowed}`)) {
          return true;
        }
      }

      this.logViolation('network-not-allowed', url);
      return false;
    } catch (error) {
      this.logViolation('network-invalid-url', url);
      return false;
    }
  }

  /**
   * Path normalizasyonu
   */
  private normalizePath(filePath: string): string {
    // ~ karakterini home directory ile değiştir
    if (filePath.startsWith('~')) {
      filePath = filePath.replace('~', process.env.HOME || '');
    }

    // Absolute path'e çevir
    if (!path.isAbsolute(filePath)) {
      filePath = path.join(this.workspaceRoot, filePath);
    }

    return path.normalize(filePath);
  }

  /**
   * Path'in workspace içinde olup olmadığını kontrol et
   */
  private isInWorkspace(filePath: string): boolean {
    const normalized = this.normalizePath(filePath);
    return normalized.startsWith(this.workspaceRoot);
  }

  /**
   * Path'in blocked listede olup olmadığını kontrol et
   */
  private isBlocked(filePath: string): boolean {
    for (const blocked of this.config.blockedPaths.paths) {
      if (this.matchesPattern(filePath, [blocked])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Glob pattern matching (basitleştirilmiş)
   */
  private matchesPattern(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      // Exact match
      if (filePath === this.normalizePath(pattern)) {
        return true;
      }
      
      // Wildcard match
      if (pattern.includes('*')) {
        const regex = this.globToRegex(pattern);
        if (regex.test(filePath)) {
          return true;
        }
      }
      
      // Directory prefix match (src/ matches src/config.ts)
      const normalizedPattern = this.normalizePath(pattern);
      if (pattern.endsWith('/') && filePath.startsWith(normalizedPattern)) {
        return true;
      }
      
      // Parent directory match (src matches src/config.ts)
      if (filePath.startsWith(normalizedPattern + path.sep)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Glob pattern'i regex'e çevir (geliştirilmiş)
   */
  private globToRegex(pattern: string): RegExp {
    const normalizedPattern = this.normalizePath(pattern);
    
    let regexStr = normalizedPattern
      .replace(/\\/g, '\\\\')
      .replace(/\./g, '\\.')
      .replace(/\*\*\//g, '(.*/)') // **/ -> any directories
      .replace(/\/\*\*/g, '(/.*)?') // /** -> any subdirectories
      .replace(/\*\*/g, '.*') // ** -> anything
      .replace(/\*/g, '[^/\\\\]*') // * -> anything except path separator
      .replace(/\?/g, '.');

    return new RegExp(`^${regexStr}$`);
  }

  /**
   * İhlal kaydı
   */
  private logViolation(type: string, path: string): void {
    const violation = {
      type,
      path,
      timestamp: new Date(),
    };

    this.violations.push(violation);

    logger.warn({
      violation,
      message: `🚨 Security violation: ${type}`,
    });

    // Alert on violation
    if (this.violations.length > 10) {
      logger.error('⚠️ Too many security violations! Bot may be compromised.');
    }
  }

  /**
   * İhlal istatistikleri
   */
  getViolations(): Array<{ type: string; path: string; timestamp: Date }> {
    return this.violations;
  }

  /**
   * Sandbox durumu
   */
  getStatus(): {
    enabled: boolean;
    strictMode: boolean;
    violations: number;
    workspaceRoot: string;
  } {
    return {
      enabled: this.config.security.enabled,
      strictMode: this.config.security.strictMode,
      violations: this.violations.length,
      workspaceRoot: this.workspaceRoot,
    };
  }
}

// Singleton instance
export const sandbox = new Sandbox();
