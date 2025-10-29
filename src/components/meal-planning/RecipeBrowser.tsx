/**
 * RecipeBrowser - Browse recipes with search and filters
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { MealPlanningService, type Recipe, type RecipeFilter } from '../../services/MealPlanningService';
import { logger } from '../../utils/logger';

interface RecipeBrowserProps {
  onRecipeSelect: (recipe: Recipe) => void;
  onClose: () => void;
}

export const RecipeBrowser: React.FC<RecipeBrowserProps> = ({
  onRecipeSelect,
  onClose,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<RecipeFilter>({});
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

  // Fetch recipes
  useEffect(() => {
    fetchRecipes();
  }, [filters]);

  const fetchRecipes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await MealPlanningService.getRecipes(filters, 50);
      if (error) {
        logger.error('Error fetching recipes', new Error(error));
        return;
      }
      setRecipes(data || []);
    } catch (err) {
      logger.error('Error in fetchRecipes', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
  };

  const handleDifficultyFilter = (difficulty: 'easy' | 'medium' | 'hard') => {
    if (selectedDifficulty === difficulty) {
      setSelectedDifficulty(null);
      setFilters(prev => {
        const { difficulty_level, ...rest } = prev;
        return rest;
      });
    } else {
      setSelectedDifficulty(difficulty);
      setFilters(prev => ({ ...prev, difficulty_level: difficulty }));
    }
  };

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={[styles.recipeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => onRecipeSelect(item)}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.recipeImage} />
      ) : (
        <View style={[styles.recipePlaceholder, { backgroundColor: colors.background }]}>
          <Icon name="image" size={32} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.recipeInfo}>
        <Text style={[styles.recipeName, { color: colors.text }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.recipeDescription, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.description || 'No description'}
        </Text>
        <View style={styles.recipeStats}>
          {item.difficulty_level && (
            <View style={styles.statBadge}>
              <Icon name="star" size={12} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.difficulty_level}
              </Text>
            </View>
          )}
          {item.prep_time_minutes && (
            <View style={styles.statBadge}>
              <Icon name="clock" size={12} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.prep_time_minutes}min
              </Text>
            </View>
          )}
          {item.calories_per_serving && (
            <View style={styles.statBadge}>
              <Icon name="zap" size={12} color={colors.primary} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {item.calories_per_serving}cal
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Browse Recipes</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="x" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search recipes..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
      </View>

      {/* Difficulty Filters */}
      <View style={styles.filters}>
        {(['easy', 'medium', 'hard'] as const).map(difficulty => (
          <TouchableOpacity
            key={difficulty}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedDifficulty === difficulty ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleDifficultyFilter(difficulty)}
          >
            <Text
              style={[
                styles.filterText,
                { color: selectedDifficulty === difficulty ? '#FFFFFF' : colors.text },
              ]}
            >
              {difficulty}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recipes List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="inbox" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No recipes found
          </Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          renderItem={renderRecipeItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  listContainer: {
    paddingBottom: 20,
  },
  recipeCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipePlaceholder: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
  },
  recipeDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  recipeStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
