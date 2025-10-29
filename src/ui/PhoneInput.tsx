/**
 * PhoneInput Component
 * Reusable phone number input with formatting and validation
 */

import React, { useState } from 'react';
import { TextInput, View, StyleSheet, Text as RNText } from 'react-native';
import { Text } from './Text';
import { useThemeColors } from './useThemedStyles';

export interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function PhoneInput({
  value,
  onChangeText,
  placeholder = '+1 (555) 123-4567',
  error,
  disabled = false,
  autoFocus = false,
}: PhoneInputProps) {
  const colors = useThemeColors();
  const [isFocused, setIsFocused] = useState(false);

  const formatPhoneNumber = (text: string): string => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');

    // Format as +1 (XXX) XXX-XXXX
    if (cleaned.length === 0) return '';
    if (cleaned.length <= 1) return `+${cleaned}`;
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1)}`;
    if (cleaned.length <= 7) return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4)}`;
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 11)}`;
  };

  const handleChangeText = (text: string) => {
    const formatted = formatPhoneNumber(text);
    onChangeText(formatted);
  };

  const isValidPhoneNumber = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    // Valid if 11 digits (1 + 10 digit US number)
    return cleaned.length === 11 && cleaned[0] === '1';
  };

  const showError = error && !isFocused;
  const isValid = isValidPhoneNumber(value);

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: showError ? colors.error : isFocused ? colors.primary : colors.border,
            color: colors.text,
          },
          disabled && styles.disabled,
        ]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType="phone-pad"
        maxLength={18} // +1 (XXX) XXX-XXXX = 18 chars
        editable={!disabled}
        autoFocus={autoFocus}
        autoComplete="tel"
        textContentType="telephoneNumber"
      />

      {showError && (
        <Text variant="bodySmall" color={colors.error} style={styles.errorText}>
          {error}
        </Text>
      )}

      {!showError && value && !isValid && (
        <Text variant="bodySmall" color={colors.warning} style={styles.hintText}>
          Enter full 10-digit US number
        </Text>
      )}

      {isValid && (
        <Text variant="bodySmall" color={colors.success} style={styles.successText}>
          ✓ Valid phone number
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  input: {
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
  hintText: {
    marginTop: 4,
    marginLeft: 4,
  },
  successText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
