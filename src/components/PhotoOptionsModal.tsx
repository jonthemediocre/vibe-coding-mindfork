import React from 'react';
import { View, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui';
import { useTheme } from '../app-components/components/ThemeProvider';

interface PhotoOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
  onSkip: () => void;
}

export const PhotoOptionsModal: React.FC<PhotoOptionsModalProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onUploadPhoto,
  onSkip,
}) => {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View
            style={[styles.modal, { backgroundColor: theme.colors.background }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text className="text-2xl font-bold text-center mb-2">
                Add Your Photo 📸
              </Text>
              <Text className="text-center text-gray-600 dark:text-gray-400 mb-6">
                Choose how you would like to create your welcome image
              </Text>
            </View>

            {/* Options */}
            <View style={styles.options}>
              {/* Take Photo */}
              <Pressable
                onPress={onTakePhoto}
                style={[styles.option, { borderColor: theme.colors.border }]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text className="text-lg font-semibold mb-1">
                    Take a Selfie
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Use your camera to take a photo now
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </Pressable>

              {/* Upload Photo */}
              <Pressable
                onPress={onUploadPhoto}
                style={[styles.option, { borderColor: theme.colors.border }]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.primary + '20' },
                  ]}
                >
                  <Ionicons
                    name="images"
                    size={32}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text className="text-lg font-semibold mb-1">
                    Choose from Gallery
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Pick an existing photo from your device
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </Pressable>

              {/* Skip with Anonymous */}
              <Pressable
                onPress={onSkip}
                style={[styles.option, { borderColor: theme.colors.border }]}
              >
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={32}
                    color={theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.optionText}>
                  <Text className="text-lg font-semibold mb-1">
                    Stay Anonymous
                  </Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    Create a fun anonymous welcome image
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={24}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            </View>

            {/* Close Button */}
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text className="text-center text-gray-500 dark:text-gray-500 font-medium">
                Maybe Later
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    marginBottom: 8,
  },
  options: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 16,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
});
