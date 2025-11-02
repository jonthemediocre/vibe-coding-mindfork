import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Image,
  Alert,
  StyleSheet,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, CameraViewRef } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { useTheme } from '../app-components/components/ThemeProvider';

interface PhotoCaptureModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCapture: (photoUri: string) => void;
}

export const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  visible,
  onClose,
  onPhotoCapture,
}) => {
  const { theme } = useTheme();
  const [facing, setFacing] = useState<CameraType>('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraViewRef>(null);

  const handleFlipCamera = () => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo && 'uri' in photo && photo.uri) {
        onPhotoCapture(photo.uri);
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.permissionContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="camera-outline" size={80} color={theme.colors.primary} />
          <Text className="text-xl font-bold text-center mt-6 mb-4">
            Camera Permission Required
          </Text>
          <Text className="text-center mb-8 px-8 text-gray-600 dark:text-gray-400">
            We need access to your camera to take your photo for the welcome image.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            <Text className="text-white font-semibold text-lg">Grant Permission</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text className="text-gray-600 dark:text-gray-400 font-semibold">Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* Overlay UI */}
          <View style={styles.overlay}>
            {/* Top Bar */}
            <View style={styles.topBar}>
              <Pressable onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={32} color="white" />
              </Pressable>
              <View style={styles.spacer} />
              <Pressable onPress={handleFlipCamera} style={styles.iconButton}>
                <Ionicons name="camera-reverse" size={32} color="white" />
              </Pressable>
            </View>

            {/* Center Guide */}
            <View style={styles.centerGuide}>
              <View style={styles.guideBorder} />
              <Text className="text-white text-center mt-4 text-lg font-semibold">
                Position your face in the circle
              </Text>
            </View>

            {/* Bottom Controls */}
            <View style={styles.bottomBar}>
              <Pressable
                onPress={handleTakePhoto}
                disabled={isCapturing}
                style={styles.captureButton}
              >
                {isCapturing ? (
                  <ActivityIndicator size="large" color="white" />
                ) : (
                  <View style={styles.captureButtonInner} />
                )}
              </Pressable>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacer: {
    flex: 1,
  },
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideBorder: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    borderColor: 'white',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bottomBar: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  cancelButton: {
    paddingVertical: 16,
  },
});
