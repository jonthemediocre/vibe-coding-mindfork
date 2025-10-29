import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, ActivityIndicator, Alert } from 'react-native';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import { Text, Button, useThemeColors } from '../../ui';
import { FoodService } from '../../services/FoodService';
import type { UnifiedFood } from '../../types/food';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onFoodScanned: (food: UnifiedFood) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onFoodScanned,
}) => {
  const colors = useThemeColors();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    if (visible) {
      requestPermission();
    }
  }, [visible]);

  const requestPermission = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: BarCodeScannerResult) => {
    if (scanned || isLookingUp) return;

    setScanned(true);
    setIsLookingUp(true);

    try {
      const response = await FoodService.getFoodByBarcode(data);

      if (response.error || !response.data) {
        Alert.alert(
          'Not Found',
          'No nutrition information found for this barcode. Try searching manually.',
          [
            {
              text: 'OK',
              onPress: () => {
                setScanned(false);
                setIsLookingUp(false);
              },
            },
            {
              text: 'Close Scanner',
              onPress: onClose,
            },
          ]
        );
        return;
      }

      onFoodScanned(response.data);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to lookup barcode. Please try again.');
      setScanned(false);
    } finally {
      setIsLookingUp(false);
    }
  };

  if (!visible) return null;

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.messageText}>
            Requesting camera permission...
          </Text>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <Text variant="headingSmall" style={styles.messageText}>
            Camera Permission Required
          </Text>
          <Text variant="body" style={styles.messageText}>
            Please grant camera permission to scan barcodes
          </Text>
          <Button title="Close" onPress={onClose} containerStyle={styles.closeButton} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barCodeTypes={[
            BarCodeScanner.Constants.BarCodeType.ean13,
            BarCodeScanner.Constants.BarCodeType.ean8,
            BarCodeScanner.Constants.BarCodeType.upc_a,
            BarCodeScanner.Constants.BarCodeType.upc_e,
          ]}
        />

        {/* Scanning overlay */}
        <View style={styles.overlay}>
          <View style={styles.topOverlay} />
          <View style={styles.middleRow}>
            <View style={styles.sideOverlay} />
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
              <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
            </View>
            <View style={styles.sideOverlay} />
          </View>
          <View style={styles.bottomOverlay}>
            <Text variant="body" style={styles.instructionText}>
              {isLookingUp ? 'Looking up barcode...' : 'Align barcode within the frame'}
            </Text>
            {isLookingUp && (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 12 }} />
            )}
          </View>
        </View>

        {/* Close button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Cancel"
            variant="outline"
            onPress={onClose}
            containerStyle={styles.cancelButton}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  middleRow: {
    flexDirection: 'row',
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  scanArea: {
    width: 280,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  instructionText: {
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  messageText: {
    textAlign: 'center',
    marginVertical: 12,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    marginTop: 20,
  },
});
