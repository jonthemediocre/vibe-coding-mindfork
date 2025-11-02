import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, Text, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../../ui';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search coaches...',
  onSearch,
  debounceMs = 300,
  autoFocus = false,
}) => {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={[styles.input, { color: colors.text }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={() => setQuery('')} style={styles.clearButton}>
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: '#999',
  },
});
