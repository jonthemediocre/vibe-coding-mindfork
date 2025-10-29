import React from 'react';
import { ScrollView, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text, useThemeColors } from '../../ui';
import type { CoachCategory } from '../../types/marketplace';

interface CategoryFilterProps {
  categories: CoachCategory[];
  selectedCategory?: string;
  onSelectCategory: (categoryId?: string) => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const colors = useThemeColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        style={[
          styles.chip,
          {
            backgroundColor: !selectedCategory ? colors.primary : colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={() => onSelectCategory(undefined)}
        activeOpacity={0.7}
      >
        <Text
          variant="bodySmall"
          color={!selectedCategory ? '#FFF' : colors.text}
          style={styles.chipText}
        >
          All
        </Text>
      </TouchableOpacity>

      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? colors.primary : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelectCategory(category.id)}
            activeOpacity={0.7}
          >
            {category.icon && (
              <Text variant="bodySmall" style={styles.icon}>
                {category.icon}
              </Text>
            )}
            <Text
              variant="bodySmall"
              color={isSelected ? '#FFF' : colors.text}
              style={styles.chipText}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 4,
  },
  chipText: {
    fontWeight: '500',
  },
});
