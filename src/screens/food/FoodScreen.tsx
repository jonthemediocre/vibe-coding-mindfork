import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { useFoodTracking } from "../../hooks";
import { useAuth } from "../../contexts/AuthContext";
import { AIFoodScanService } from "../../services/AIFoodScanService";
import { FoodClassificationService } from "../../services/FoodClassificationService";
import { ColorCodedFoodCard, ColorDistributionBar } from "../../components/food/ColorCodedFoodCard";
import type { CreateFoodEntryInput } from "../../types/models";

const QUICK_ADD_ITEMS: CreateFoodEntryInput[] = [
  { name: "Protein shake", serving: "1 bottle", calories: 190, protein: 25, carbs: 10, fat: 3 },
  { name: "Veggie salad", serving: "1 bowl", calories: 240, protein: 8, carbs: 30, fat: 12 },
  { name: "Greek yogurt", serving: "1 cup", calories: 130, protein: 15, carbs: 12, fat: 4 },
];

export const FoodScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const {
    entries,
    dailyStats,
    isLoading,
    error,
    addFoodEntry,
    deleteFoodEntry,
    clearError,
  } = useFoodTracking();

  const [addingQuickItem, setAddingQuickItem] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleQuickAdd = async (item: CreateFoodEntryInput) => {
    setAddingQuickItem(item.name);
    const success = await addFoodEntry(item);
    setAddingQuickItem(null);

    if (!success && error) {
      Alert.alert("Error", error);
      clearError();
    }
  };

  const handleScanFood = async () => {
    setIsScanning(true);
    try {
      const foodData = await AIFoodScanService.scanFood();

      if (foodData) {
        const success = await addFoodEntry(foodData);
        if (success) {
          Alert.alert("Success", `Added ${foodData.name} - ${foodData.calories} kcal`);
        } else if (error) {
          Alert.alert("Error", error);
          clearError();
        }
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleDelete = async (entryId: string) => {
    Alert.alert(
      "Delete Entry",
      "Are you sure you want to delete this food entry?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await deleteFoodEntry(entryId);
            if (!success && error) {
              Alert.alert("Error", error);
              clearError();
            }
          },
        },
      ]
    );
  };

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
        Food tracking
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
        <Text variant="titleSmall">Today&apos;s total</Text>
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
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          Stay between 1,900 – 2,100 kcal for your goal.
        </Text>
      </Card>

      <View>
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Quick add
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
        <Text variant="titleSmall" style={styles.sectionTitle}>
          Recent entries ({entries.length})
        </Text>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="body" color={colors.textSecondary} align="center">
              No food entries yet today.{"\n"}Add your first meal above!
            </Text>
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <ColorCodedFoodCard
                name={item.name}
                serving={item.serving}
                calories={item.calories}
                protein={item.protein || 0}
                carbs={item.carbs || 0}
                fat={item.fat || 0}
                dietColor={item.diet_color || "neutral"}
                mealType={item.meal_type}
                onPress={() => handleDelete(item.id)}
                showColorLabel={true}
              />
            )}
          />
        )}
        <Button
          title="📸 Scan Food with AI"
          variant="primary"
          onPress={handleScanFood}
          loading={isScanning}
          containerStyle={styles.scanButton}
        />
      </Card>
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
      justifyContent: "center",
      alignItems: "center",
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
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 12,
    },
    macroItem: {
      alignItems: "center",
    },
    sectionTitle: {
      marginBottom: 8,
    },
    quickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginHorizontal: -4,
    },
    quickButton: {
      marginHorizontal: 4,
      marginBottom: 8,
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: "rgba(0,0,0,0.08)",
      marginVertical: 12,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    entryRight: {
      alignItems: "flex-end",
    },
    scanButton: {
      marginTop: 16,
    },
    emptyState: {
      paddingVertical: 32,
    },
    errorButton: {
      marginTop: 8,
    },
  });

export default FoodScreen;

