/**
 * Device Logger with Server Sync
 * Logs to local device storage and optionally syncs to server
 * Useful for debugging production issues
 */

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  deviceInfo?: {
    platform: string;
    version: string;
  };
}

class DeviceLogger {
  private logDir: string;
  private maxLogSize = 5 * 1024 * 1024; // 5MB max
  private syncQueue: LogEntry[] = [];
  private isSyncing = false;

  constructor() {
    this.logDir = `${FileSystem.documentDirectory}logs/`;
    this.initializeLogDirectory();
  }

  private async initializeLogDirectory() {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.logDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.logDir, { intermediates: true });
      }
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  private getLogFileName(): string {
    const today = new Date().toISOString().split('T')[0];
    return `${this.logDir}mindfork-${today}.log`;
  }

  private async rotateLogsIfNeeded() {
    try {
      const logFile = this.getLogFileName();
      const fileInfo = await FileSystem.getInfoAsync(logFile);

      if (fileInfo.exists && 'size' in fileInfo && fileInfo.size && fileInfo.size > this.maxLogSize) {
        // Rotate: rename current log to .old
        const oldFile = logFile.replace('.log', '.old.log');
        await FileSystem.deleteAsync(oldFile, { idempotent: true });
        await FileSystem.moveAsync({ from: logFile, to: oldFile });
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error);
    }
  }

  async log(
    level: LogEntry['level'],
    category: string,
    message: string,
    data?: any,
    syncToServer = true
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      deviceInfo: {
        platform: Platform.OS,
        version: typeof Platform.Version === 'number' ? Platform.Version.toString() : String(Platform.Version),
      },
    };

    // Write to local file
    await this.writeToFile(entry);

    // Add to sync queue if requested
    if (syncToServer) {
      this.syncQueue.push(entry);
      this.syncToServer(); // Fire and forget
    }

    // Also log to console for development
    const consoleMethod = level === 'error' ? console.error :
                         level === 'warn' ? console.warn :
                         console.log;
    consoleMethod(`[${category}] ${message}`, data);
  }

  private async writeToFile(entry: LogEntry) {
    try {
      await this.rotateLogsIfNeeded();
      const logFile = this.getLogFileName();
      const logLine = JSON.stringify(entry) + '\n';

      // Note: expo-file-system doesn't have append option, read and write
      const existing = await FileSystem.readAsStringAsync(logFile).catch(() => '');
      await FileSystem.writeAsStringAsync(logFile, existing + logLine, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  private async syncToServer() {
    if (this.isSyncing || this.syncQueue.length === 0) {
      return;
    }

    this.isSyncing = true;

    try {
      const logsToSync = [...this.syncQueue];
      this.syncQueue = [];

      // Send logs to Supabase (create a simple logs table)
      const logs = logsToSync.map((entry) => ({
        timestamp: entry.timestamp,
        level: entry.level,
        category: entry.category,
        message: entry.message,
        data: entry.data,
        device_info: entry.deviceInfo,
      }));

      const { error } = await (supabase.from('app_logs').insert(logs as any) as unknown as Promise<{ error: any }>);

      if (error) {
        // Put logs back in queue if sync failed
        this.syncQueue = [...logsToSync, ...this.syncQueue];
        console.error('Failed to sync logs to server:', error);
      }
    } catch (error) {
      console.error('Error syncing logs:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async info(category: string, message: string, data?: any) {
    return this.log('info', category, message, data);
  }

  async warn(category: string, message: string, data?: any) {
    return this.log('warn', category, message, data);
  }

  async error(category: string, message: string, data?: any) {
    return this.log('error', category, message, data, true); // Always sync errors
  }

  async debug(category: string, message: string, data?: any) {
    return this.log('debug', category, message, data, false); // Don't sync debug logs
  }

  /**
   * Get all logs from the current day
   */
  async getLogs(): Promise<LogEntry[]> {
    try {
      const logFile = this.getLogFileName();
      const fileInfo = await FileSystem.getInfoAsync(logFile);

      if (!fileInfo.exists) {
        return [];
      }

      const content = await FileSystem.readAsStringAsync(logFile);
      const lines = content.trim().split('\n').filter(Boolean);

      return lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      }).filter(Boolean) as LogEntry[];
    } catch (error) {
      console.error('Failed to read logs:', error);
      return [];
    }
  }

  /**
   * Get logs as formatted text for sharing
   */
  async getLogsAsText(): Promise<string> {
    const logs = await this.getLogs();
    return logs
      .map(
        (log) =>
          `[${log.timestamp}] ${log.level.toUpperCase()} [${log.category}] ${log.message}` +
          (log.data ? `\n  Data: ${JSON.stringify(log.data, null, 2)}` : '')
      )
      .join('\n\n');
  }

  /**
   * Share logs (via email, etc)
   */
  async shareLogs(): Promise<string> {
    const logFile = this.getLogFileName();
    const fileInfo = await FileSystem.getInfoAsync(logFile);

    if (!fileInfo.exists) {
      throw new Error('No logs available');
    }

    // Return file URI for sharing
    return logFile;
  }

  /**
   * Clear all local logs
   */
  async clearLogs() {
    try {
      const files = await FileSystem.readDirectoryAsync(this.logDir);
      await Promise.all(
        files.map((file) =>
          FileSystem.deleteAsync(`${this.logDir}${file}`, { idempotent: true })
        )
      );
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }
}

export const deviceLogger = new DeviceLogger();
