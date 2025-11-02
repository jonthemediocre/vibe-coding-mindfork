import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from '../../ui';
import { useFoodTracking } from '../../hooks';
import { AIFoodScanService } from '../../services/AIFoodScanService';
import { FoodService } from '../../services/FoodService';
import { BarcodeScannerModal } from '../../components/food/BarcodeScanner';
import { FoodSearchBar } from '../../components/food/FoodSearchBar';
import { EmptyRecentFoodsState, EmptyFavoritesState } from '../../components/EmptyState';
import type { CreateFoodEntryInput } from '../../types/models';
import type { UnifiedFood, FavoriteFood, RecentFood } from '../../types/food';
import { useAuth } from '../../contexts/AuthContext';
import { showAlert } from '../../utils/alerts';

type TabType = 'camera' | 'search' | 'recent' | 'favorites';

const QUICK_ADD_ITEMS: CreateFoodEntryInput[] = [
  { name: 'Protein shake', serving: '1 bottle', calories: 190, protein: 25, carbs: 10, fat: 3 },
  { name: 'Veggie salad', serving: '1 bowl', calories: 240, protein: 8, carbs: 30, fat: 12 },
  { name: 'Greek yogurt', serving: '1 cup', calories: 130, protein: 15, carbs: 12, fat: 4 },
];

export const FoodScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();
  const {
    entries,
    dailyStats,
    isLoading,
    error,
    addFoodEntry,
    deleteFoodEntry,
    refreshEntries,
    clearError,
  } = useFoodTracking();

  const [activeTab, setActiveTab] = useState<TabType>('camera');
  const [addingQuickItem, setAddingQuickItem] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [recentFoods, setRecentFoods] = useState<RecentFood[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<FavoriteFood[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  useEffect(() => {
    if (activeTab === 'recent') {
      loadRecentFoods();
    } else if (activeTab === 'favorites') {
      loadFavoriteFoods();
    }
  }, [activeTab]);

  const loadRecentFoods = async () => {
    setLoadingRecent(true);
    try {
      const response = await FoodService.getRecentFoods(20);
      if (response.data) {
        setRecentFoods(response.data);
      }
    } catch (error) {
      console.error('Error loading recent foods:', error);
    } finally {
      setLoadingRecent(false);
    }
  };

  const loadFavoriteFoods = async () => {
    if (!user?.id) return;

    setLoadingFavorites(true);
    try {
      const response = await FoodService.getFavoriteFoods(user.id);
      if (response.data) {
        setFavoriteFoods(response.data);
      }
    } catch (error) {
      console.error('Error loading favorite foods:', error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const handleQuickAdd = async (item: CreateFoodEntryInput) => {
    setAddingQuickItem(item.name);
    const success = await addFoodEntry(item);
    setAddingQuickItem(null);

    if (success) {
      await FoodService.addToRecentFoods(item);
    } else if (error) {
      showAlert.error('Error', error);
      clearError();
    }
  };

  const handleScanFood = async () => {
    setIsScanning(true);
    try {
      const foodData = await AIFoodScanService.scanFoodImage();

      if (foodData) {
        const success = await addFoodEntry(foodData);
        if (success) {
          await FoodService.addToRecentFoods(foodData);
          showAlert.success('Success', `Added ${foodData.name} - ${foodData.calories} kcal`);
        } else if (error) {
          showAlert.error('Error', error);
          clearError();
        }
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleBarcodeScanned = (food: UnifiedFood) => {
    const foodEntry: CreateFoodEntryInput = {
      name: food.name,
      serving: `${food.serving_size} ${food.serving_unit}`,
      calories: Math.round(food.calories_per_serving),
      protein: Math.round(food.protein_g),
      carbs: Math.round(food.carbs_g),
      fat: Math.round(food.fat_g),
      fiber: Math.round(food.fiber_g),
    };

    showAlert.confirm(
      'Add Food',
      `${food.name}\n${foodEntry.calories} cal | P: ${foodEntry.protein}g | C: ${foodEntry.carbs}g | F: ${foodEntry.fat}g`,
      async () => {
        const success = await addFoodEntry(foodEntry);
        if (success) {
          await FoodService.addToRecentFoods(foodEntry);
          showAlert.success('Success', `Added ${foodEntry.name}`);
        }
      }
    );
  };

  const handleFoodSearchSelected = (food: UnifiedFood) => {
    const foodEntry: CreateFoodEntryInput = {
      name: food.name,
      serving: `${food.serving_size} ${food.serving_unit}`,
      calories: Math.round(food.calories_per_serving),
      protein: Math.round(food.protein_g),
      carbs: Math.round(food.carbs_g),
      fat: Math.round(food.fat_g),
      fiber: Math.round(food.fiber_g),
    };

    showAlert.confirm(
      'Add Food',
      `${food.name}${food.brand ? ` (${food.brand})` : ''}\n${foodEntry.calories} cal | P: ${foodEntry.protein}g | C: ${foodEntry.carbs}g | F: ${foodEntry.fat}g`,
      async () => {
        const success = await addFoodEntry(foodEntry);
        if (success) {
          await FoodService.addToRecentFoods(foodEntry);
          showAlert.success('Success', `Added ${foodEntry.name}`);
        }
      }
    );
  };

  const handleAddRecentFood = async (food: RecentFood) => {
    const foodEntry: CreateFoodEntryInput = {
      name: food.food_name,
      serving: `${food.serving_size} ${food.serving_unit}`,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    };

    const success = await addFoodEntry(foodEntry);
    if (success) {
      await FoodService.addToRecentFoods(foodEntry);
      showAlert.success('Success', `Added ${foodEntry.name}`);
    }
  };

  const handleAddFavoriteFood = async (food: FavoriteFood) => {
    const foodEntry: CreateFoodEntryInput = {
      name: food.food_name,
      serving: `${food.serving_size} ${food.serving_unit}`,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    };

    const success = await addFoodEntry(foodEntry);
    if (success) {
      await FoodService.addToRecentFoods(foodEntry);
      showAlert.success('Success', `Added ${foodEntry.name}`);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string) => {
    if (!user?.id) return;

    showAlert.confirm(
      'Remove Favorite',
      'Remove this food from favorites?',
      async () => {
        await FoodService.removeFromFavorites(user.id, favoriteId);
        loadFavoriteFoods();
      }
    );
  };

  const handleDelete = async (entryId: string) => {
    showAlert.confirm(
      'Delete Entry',
      'Are you sure you want to delete this food entry?',
      async () => {
        const success = await deleteFoodEntry(entryId);
        if (!success && error) {
          showAlert.error('Error', error);
          clearError();
        }
      }
    );
  };

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && { ...styles.activeTab, borderBottomColor: colors.primary },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text variant="body" style={{ marginRight: 4 }}>
        {icon}
      </Text>
      <Text
        variant="bodyLarge"
        color={activeTab === tab ? colors.primary : colors.textSecondary}
        style={activeTab === tab && styles.activeTabText}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading && !entries.length) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.loadingText}>
            Loading your food entries...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <Text variant="headingSmall" style={styles.heading}>
        Food Tracking
      </Text>

      {error && (
        <Card elevation={1} style={{ backgroundColor: colors.error, marginBottom: 12 }}>
          <Text variant="body" color="#FFF">
            {error}
          </Text>
          <Button
            title="Dismiss"
            variant="ghost"
            size="small"
            onPress={clearError}
            containerStyle={styles.errorButton}
          />
        </Card>
      )}

      <Card elevation={2}>
        <Text variant="titleSmall">Today&apos;s Total</Text>
        <Text variant="headingSmall" style={styles.totalText}>
          {dailyStats?.total_calories || 0} kcal
        </Text>
        <View style={styles.macroRow}>
          <View style={styles.macroItem}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Protein
            </Text>
            <Text variant="body">{Math.round(dailyStats?.total_protein || 0)}g</Text>
          </View>
          <View style={styles.macroItem}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Carbs
            </Text>
            <Text variant="body">{Math.round(dailyStats?.total_carbs || 0)}g</Text>
          </View>
          <View style={styles.macroItem}>
            <Text variant="bodySmall" color={colors.textSecondary}>
              Fat
            </Text>
            <Text variant="body">{Math.round(dailyStats?.total_fat || 0)}g</Text>
          </View>
        </View>
      </Card>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton('camera', 'Camera', '📸')}
        {renderTabButton('search', 'Search', '🔍')}
        {renderTabButton('recent', 'Recent', '🕐')}
        {renderTabButton('favorites', 'Favorites', '⭐')}
      </View>

      {/* Tab Content */}
      {activeTab === 'camera' && (
        <View>
          <View>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Quick Add
            </Text>
            <View style={styles.quickRow}>
              {QUICK_ADD_ITEMS.map((item) => (
                <Button
                  key={item.name}
                  title={item.name}
                  size="small"
                  variant="outline"
                  onPress={() => handleQuickAdd(item)}
                  loading={addingQuickItem === item.name}
                  containerStyle={styles.quickButton}
                />
              ))}
            </View>
          </View>

          <Card elevation={1}>
            <Button
              title="📸 Scan Food with AI"
              variant="primary"
              onPress={handleScanFood}
              loading={isScanning}
              containerStyle={styles.scanButton}
            />
            <Button
              title="📱 Scan Barcode"
              variant="outline"
              onPress={() => setShowBarcodeScanner(true)}
              containerStyle={styles.scanButton}
            />
          </Card>
        </View>
      )}

      {activeTab === 'search' && (
        <View>
          <FoodSearchBar onFoodSelected={handleFoodSearchSelected} autoFocus />
        </View>
      )}

      {activeTab === 'recent' && (
        <Card elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Recent Foods
          </Text>
          {loadingRecent ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : recentFoods.length === 0 ? (
            <EmptyRecentFoodsState />
          ) : (
            <FlatList
              data={recentFoods}
              keyExtractor={(item, index) => `${item.food_name}-${index}`}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => handleAddRecentFood(item)}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyLarge">{item.food_name}</Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {item.serving_size} {item.serving_unit}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </Text>
                  </View>
                  <View style={styles.entryRight}>
                    <Text variant="bodyLarge">{item.calories} kcal</Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      Logged {item.frequency}x
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </Card>
      )}

      {activeTab === 'favorites' && (
        <Card elevation={1}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Favorite Foods
          </Text>
          {loadingFavorites ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : favoriteFoods.length === 0 ? (
            <EmptyFavoritesState />
          ) : (
            <FlatList
              data={favoriteFoods}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => handleAddFavoriteFood(item)}
                  >
                    <Text variant="bodyLarge">{item.food_name}</Text>
                    <Text variant="bodySmall" color={colors.textSecondary}>
                      {item.serving_size} {item.serving_unit}
                    </Text>
                    <Text variant="caption" color={colors.textSecondary}>
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.entryRight}>
                    <Text variant="bodyLarge">{item.calories} kcal</Text>
                    <Button
                      title="⭐ Remove"
                      size="small"
                      variant="ghost"
                      onPress={() => handleRemoveFavorite(item.id)}
                    />
                  </View>
                </View>
              )}
            />
          )}
        </Card>
      )}

      {/* Recent Entries */}
      <Card elevation={1} style={{ marginTop: 16 }}>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Today&apos;s Entries ({entries.length})
        </Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="body" color={colors.textSecondary} align="center">
              No food entries yet today.{'\n'}Add your first meal above!
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyLarge">{item.name}</Text>
                  <Text variant="bodySmall" color={colors.textSecondary}>
                    {item.serving}
                  </Text>
                  {item.protein && (
                    <Text variant="caption" color={colors.textSecondary}>
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </Text>
                  )}
                </View>
                <View style={styles.entryRight}>
                  <Text variant="bodyLarge">{item.calories} kcal</Text>
                  <Button
                    title="Delete"
                    size="small"
                    variant="ghost"
                    onPress={() => handleDelete(item.id)}
                  />
                </View>
              </View>
            )}
          />
        )}
      </Card>

      <BarcodeScannerModal
        visible={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onFoodScanned={handleBarcodeScanned}
      />
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
    },
    heading: {
      marginBottom: 16,
    },
    totalText: {
      marginVertical: 8,
    },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    macroItem: {
      alignItems: 'center',
    },
    tabsContainer: {
      flexDirection: 'row',
      marginTop: 16,
      marginBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomWidth: 2,
    },
    activeTabText: {
      fontWeight: '600',
    },
    sectionTitle: {
      marginBottom: 8,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -4,
    },
    quickButton: {
      marginHorizontal: 4,
      marginBottom: 8,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: 'rgba(0,0,0,0.08)',
      marginVertical: 12,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    entryRight: {
      alignItems: 'flex-end',
    },
    scanButton: {
      marginTop: 12,
    },
    emptyState: {
      paddingVertical: 32,
    },
    errorButton: {
      marginTop: 8,
    },
  });

export default FoodScreen;
