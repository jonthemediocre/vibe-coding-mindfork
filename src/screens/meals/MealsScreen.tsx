import React from "react";
import { View, StyleSheet } from "react-native";
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from "../../ui";

const MEAL_SECTIONS = [
  {
    title: "Breakfast ideas",
    items: [
      "Egg white scramble with spinach",
      "Protein smoothie with berries",
      "Greek yogurt parfait",
    ],
  },
  {
    title: "Lunch favorites",
    items: [
      "Salmon grain bowl",
      "Turkey wrap with veggies",
      "Lentil power salad",
    ],
  },
  {
    title: "Dinner inspiration",
    items: [
      "Chicken fajita lettuce cups",
      "Tofu stir-fry with quinoa",
      "Miso-glazed cod with greens",
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
          <Text variant="titleSmall" style={styles.sectionTitle}>
            {section.title}
          </Text>
          {section.items.map(item => (
            <View key={item} style={styles.listRow}>
              <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
              <Text variant="body">{item}</Text>
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
    },
    sectionTitle: {
      marginBottom: 12,
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
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
