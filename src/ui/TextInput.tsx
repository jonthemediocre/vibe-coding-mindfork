import React from 'react';
import { StyleSheet, TextInput as RNTextInput, View, TextInputProps as RNTextInputProps } from 'react-native';
import { Text } from './Text';
import { useThemeColors } from './useThemedStyles';

export interface TextInputProps extends RNTextInputProps {
  label?: string;
  error?: string;
  containerStyle?: any;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  error,
  containerStyle,
  style,
  ...props
}) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="caption" style={styles.label}>
          {label}
        </Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          {
            borderColor: error ? colors.error : colors.border,
            color: colors.text,
            backgroundColor: colors.surface,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
      {error && (
        <Text variant="caption" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  error: {
    marginTop: 4,
  },
});
