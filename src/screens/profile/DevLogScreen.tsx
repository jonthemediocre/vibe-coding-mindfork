/**
 * Development Log Viewer
 * Shows local device logs for debugging
 */

import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Share } from 'react-native';
import { Text, Button } from '../../ui';
import { deviceLogger } from '../../services/DeviceLogger';

export function DevLogScreen() {
  const [logs, setLogs] = useState<string>('Loading logs...');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadLogs = async () => {
    setIsRefreshing(true);
    try {
      const logsText = await deviceLogger.getLogsAsText();
      setLogs(logsText || 'No logs available');
    } catch (error) {
      setLogs(`Error loading logs: ${(error as Error).message}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleShare = async () => {
    try {
      const fileUri = await deviceLogger.shareLogs();
      await Share.share({
        title: 'MindFork Debug Logs',
        message: logs,
      });
    } catch (error) {
      console.error('Error sharing logs:', error);
    }
  };

  const handleClear = async () => {
    await deviceLogger.clearLogs();
    setLogs('Logs cleared');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Device Logs</Text>
        <View style={styles.buttons}>
          <Button
            title={isRefreshing ? 'Refreshing...' : 'Refresh'}
            onPress={loadLogs}
            disabled={isRefreshing}
          />
          <Button
            title="Share"
            onPress={handleShare}
          />
          <Button
            title="Clear"
            onPress={handleClear}
            variant="outline"
          />
        </View>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logText}>{logs}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  logContainer: {
    flex: 1,
    padding: 16,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#0f0',
    lineHeight: 18,
  },
});
