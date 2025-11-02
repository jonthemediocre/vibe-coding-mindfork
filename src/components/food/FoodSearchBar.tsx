import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Text, Card, useThemeColors } from '../../ui';
import { useFoodSearch } from '../../hooks/useFoodSearch';
import type { UnifiedFood } from '../../types/food';

interface FoodSearchBarProps {
  placeholder?: string;
  onFoodSelected: (food: UnifiedFood) => void;
  autoFocus?: boolean;
}

export const FoodSearchBar: React.FC<FoodSearchBarProps> = ({
  placeholder = 'Search foods...',
  onFoodSelected,
  autoFocus = false,
}) => {
  const colors = useThemeColors();
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { results, isSearching, error, search, clearResults } = useFoodSearch();

  const handleQueryChange = (text: string) => {
    setQuery(text);
    search(text);
    setShowResults(text.length >= 2);
  };

  const handleFoodSelect = (food: UnifiedFood) => {
    onFoodSelected(food);
    setQuery('');
    setShowResults(false);
    clearResults();
    Keyboard.dismiss();
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    clearResults();
    Keyboard.dismiss();
  };

  const handleSubmitEditing = () => {
    Keyboard.dismiss();
  };

  const renderFoodItem = ({ item }: { item: UnifiedFood }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => handleFoodSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultContent}>
        <Text variant="bodyLarge" numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text variant="bodySmall" color={colors.textSecondary} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        <View style={styles.nutritionRow}>
          <Text variant="caption" color={colors.textSecondary}>
            {Math.round(item.calories_per_serving)} cal
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {' • '}
          </Text>
          <Text variant="caption" color={colors.textSecondary}>
            {item.serving_size} {item.serving_unit}
          </Text>
          {item.protein_g > 0 && (
            <>
              <Text variant="caption" color={colors.textSecondary}>
                {' • '}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                {Math.round(item.protein_g)}g protein
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Text variant="body" style={styles.searchIcon}>
          🔍
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={handleQueryChange}
          onSubmitEditing={handleSubmitEditing}
          returnKeyType="search"
          blurOnSubmit={false}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
        {query.length > 0 && !isSearching && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
            accessibilityRole="button"
          >
            <Text variant="body">✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showResults && (
        <Card elevation={2} style={styles.resultsContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text variant="body" color={colors.error} align="center">
                {error}
              </Text>
            </View>
          )}

          {!error && results.length === 0 && !isSearching && (
            <View style={styles.emptyContainer}>
              <Text variant="body" color={colors.textSecondary} align="center">
                No foods found. Try a different search term.
              </Text>
            </View>
          )}

          {results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(item, index) => `${item.id || item.name}-${index}`}
              renderItem={renderFoodItem}
              style={styles.resultsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              maxToRenderPerBatch={10}
              initialNumToRender={10}
            />
          )}
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  resultsContainer: {
    maxHeight: 300,
    marginTop: 4,
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultContent: {
    flex: 1,
  },
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorContainer: {
    padding: 16,
  },
  emptyContainer: {
    padding: 24,
  },
});
