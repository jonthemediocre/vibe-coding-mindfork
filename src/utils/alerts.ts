import { Alert } from 'react-native';

export const showAlert = {
  permission: (feature: string, message: string) =>
    Alert.alert(`${feature} Permission`, message, [{ text: 'OK' }]),

  error: (title: string, message: string) =>
    Alert.alert(title, message, [{ text: 'OK' }]),

  confirm: (title: string, message: string, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'OK', onPress: onConfirm }
    ]),

  success: (title: string, message: string) =>
    Alert.alert(title, message, [{ text: 'OK' }]),

  auth: (message: string) =>
    Alert.alert('Authentication', message, [{ text: 'OK' }])
};
