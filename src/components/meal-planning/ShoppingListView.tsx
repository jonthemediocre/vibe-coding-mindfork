/**
 * ShoppingListView - Generated shopping list with checkboxes
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { MealPlanningService, type ShoppingListItem } from '../../services/MealPlanningService';
import { logger } from '../../utils/logger';
import { showAlert } from '../../utils/alerts';

interface ShoppingListViewProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

export const ShoppingListView: React.FC<ShoppingListViewProps> = ({
  visible,
  startDate,
  endDate,
  onClose,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();

  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible && user?.id) {
      generateShoppingList();
    }
  }, [visible, startDate, endDate, user?.id]);

  const generateShoppingList = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await MealPlanningService.generateShoppingList(
        user.id,
        startDate,
        endDate
      );

      if (error) {
        showAlert.error('Error', error);
        logger.error('Error generating shopping list', new Error(error));
        return;
      }

      setShoppingList(data || []);
    } catch (err) {
      logger.error('Error in generateShoppingList', err as Error);
      showAlert.error('Error', 'Failed to generate shopping list');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleItem = async (ingredientName: string) => {
    if (!user?.id) return;

    const item = shoppingList.find(i => i.ingredient_name === ingredientName);
    if (!item) return;

    // Optimistic update
    setShoppingList(prev =>
      prev.map(i =>
        i.ingredient_name === ingredientName
          ? { ...i, checked: !i.checked }
          : i
      )
    );

    // Update in AsyncStorage
    await MealPlanningService.updateShoppingListItem(
      user.id,
      ingredientName,
      !item.checked
    );
  };

  const handleClearCompleted = () => {
    setShoppingList(prev => prev.filter(item => !item.checked));
  };

  const renderListItem = ({ item }: { item: ShoppingListItem }) => (
    <TouchableOpacity
      style={[
        styles.listItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: item.checked ? 0.5 : 1,
        },
      ]}
      onPress={() => handleToggleItem(item.ingredient_name)}
    >
      <View style={styles.itemLeft}>
        <View
          style={[
            styles.checkbox,
            {
              backgroundColor: item.checked ? colors.primary : 'transparent',
              borderColor: item.checked ? colors.primary : colors.border,
            },
          ]}
        >
          {item.checked && <Icon name="check" size={16} color="#FFFFFF" />}
        </View>
        <View style={styles.itemInfo}>
          <Text
            style={[
              styles.itemName,
              {
                color: colors.text,
                textDecorationLine: item.checked ? 'line-through' : 'none',
              },
            ]}
          >
            {item.ingredient_name}
          </Text>
          <Text style={[styles.itemQuantity, { color: colors.textSecondary }]}>
            {item.total_quantity} {item.unit}
          </Text>
          {item.recipes.length > 0 && (
            <Text style={[styles.itemRecipes, { color: colors.textSecondary }]} numberOfLines={1}>
              Used in: {item.recipes.join(', ')}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const checkedCount = shoppingList.filter(item => item.checked).length;
  const totalCount = shoppingList.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Shopping List</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {checkedCount} of {totalCount} items checked
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          {totalCount > 0 && (
            <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
              <View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: colors.primary,
                    width: `${(checkedCount / totalCount) * 100}%`,
                  },
                ]}
              />
            </View>
          )}

          {/* Shopping List */}
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating shopping list...
              </Text>
            </View>
          ) : shoppingList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="shopping-cart" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No items in shopping list
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add recipes to your meal plan to generate a shopping list
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={shoppingList}
                renderItem={renderListItem}
                keyExtractor={item => item.ingredient_name}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
              />

              {/* Actions */}
              {checkedCount > 0 && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={handleClearCompleted}
                  >
                    <Icon name="trash-2" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Clear Completed ({checkedCount})</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  progressContainer: {
    height: 4,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemRecipes: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    padding: 16,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
