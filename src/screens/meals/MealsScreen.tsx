import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";
import { MEAL_TYPE_PHOTOS, FOOD_PHOTOS } from "../../constants/foodPhotography";

const MEAL_SECTIONS = [
  {
    title: "Breakfast ideas",
    image: MEAL_TYPE_PHOTOS.breakfast,
    items: [
      { name: "Egg white scramble with spinach", photo: FOOD_PHOTOS.proteins.eggs },
      { name: "Protein smoothie with berries", photo: FOOD_PHOTOS.fruits.berries },
      { name: "Greek yogurt parfait", photo: FOOD_PHOTOS.dairy.yogurt },
    ],
  },
  {
    title: "Lunch favorites",
    image: MEAL_TYPE_PHOTOS.lunch,
    items: [
      { name: "Salmon grain bowl", photo: FOOD_PHOTOS.proteins.salmon },
      { name: "Turkey wrap with veggies", photo: FOOD_PHOTOS.proteins.chicken },
      { name: "Lentil power salad", photo: FOOD_PHOTOS.vegetables.salad },
    ],
  },
  {
    title: "Dinner inspiration",
    image: MEAL_TYPE_PHOTOS.dinner,
    items: [
      { name: "Chicken fajita lettuce cups", photo: FOOD_PHOTOS.proteins.chicken },
      { name: "Tofu stir-fry with quinoa", photo: FOOD_PHOTOS.proteins.tofu },
      { name: "Miso-glazed cod with greens", photo: FOOD_PHOTOS.proteins.salmon },
    ],
  },
];

export const MealsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <Text variant="headingSmall" style={styles.heading}>
        Meal planning
      </Text>
      <Text variant="body" color={colors.textSecondary} style={styles.intro}>
        Balanced plates keep energy stable. Choose one item from each section or generate a smart meal.
      </Text>

      {MEAL_SECTIONS.map(section => (
        <Card key={section.title} elevation={1} padding="lg" style={styles.sectionCard}>
          {/* Hero image for meal type */}
          <Image
            source={{ uri: section.image.uri }}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityLabel={section.title}
          />

          <Text variant="titleSmall" style={styles.sectionTitle}>
            {section.title}
          </Text>

          {section.items.map(item => (
            <View key={item.name} style={styles.listRow}>
              {/* Small food photo thumbnail */}
              <Image
                source={{ uri: item.photo.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
              <Text variant="body" style={styles.itemText}>{item.name}</Text>
            </View>
          ))}
          <Button title="Save to plan" variant="outline" containerStyle={styles.saveButton} />
        </Card>
      ))}

      <Card elevation={2}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Need a new idea?
        </Text>
        <Text variant="body" color={colors.textSecondary}>
          Tap below to generate a meal based on your macros and preferences.
        </Text>
        <Button title="Generate smart meal" variant="primary" containerStyle={styles.generateButton} />
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
    heading: {
      marginBottom: 8,
    },
    intro: {
      marginBottom: 16,
    },
    sectionCard: {
      marginBottom: 16,
      overflow: "hidden",
    },
    heroImage: {
      width: "100%",
      height: 160,
      borderRadius: 12,
      marginBottom: 16,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    thumbnail: {
      width: 48,
      height: 48,
      borderRadius: 8,
      marginRight: 12,
    },
    itemText: {
      flex: 1,
    },
    bullet: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 10,
    },
    saveButton: {
      marginTop: 12,
    },
    generateButton: {
      marginTop: 16,
    },
  });

export default MealsScreen;
