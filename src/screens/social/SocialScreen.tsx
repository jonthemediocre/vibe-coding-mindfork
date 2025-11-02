/**
 * SocialScreen - Main social sharing screen
 *
 * Features:
 * - Progress card creator
 * - Wisdom card creator
 * - Multiple sharing platforms
 * - Real-time data integration
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import ProgressCardCreator from '../../components/social/ProgressCardCreator';
import WisdomCardCreator from '../../components/social/WisdomCardCreator';
import { getCoachById } from '../../data/coachProfiles';

type TabType = 'progress' | 'wisdom';

export function SocialScreen() {
  const { theme } = useTheme();
  const colors = theme.colors;
  const [activeTab, setActiveTab] = useState<TabType>('progress');

  // Wisdom quotes from our official coaches with PNG images
  const wisdomQuotes = [
    {
      message: "Remember, progress isn't always linear. Every small step forward counts, even on the tough days.",
      coachName: 'Synapse',
      coachId: 'synapse',
      gradientColors: ['#FF9A9E', '#FAD0C4'],
    },
    {
      message: "You're not here to be perfect. You're here to be better than yesterday. Let's crush it!",
      coachName: 'Vetra',
      coachId: 'vetra',
      gradientColors: ['#FF6B6B', '#FFD93D'],
    },
    {
      message: "Data shows your consistency is improving. That's the real metric of success. Keep going!",
      coachName: 'Verdant',
      coachId: 'verdant',
      gradientColors: ['#4ECDC4', '#556270'],
    },
    {
      message: "Discipline equals freedom. Every choice you make today is building the future you deserve.",
      coachName: 'Veloura',
      coachId: 'veloura',
      gradientColors: ['#667eea', '#764ba2'],
    },
    {
      message: "Think you can't do it? That's exactly when you need to prove yourself wrong. Challenge accepted!",
      coachName: 'Maya',
      coachId: 'maya-rival',
      gradientColors: ['#f093fb', '#f5576c'],
    },
  ];

  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState(0);
  const currentQuote = wisdomQuotes[selectedQuoteIndex];

  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'progress', label: 'Progress Card', icon: 'bar-chart' },
    { id: 'wisdom', label: 'Coach Wisdom', icon: 'chatbox-ellipses' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Social Sharing
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Share your journey with the world
          </Text>
        </View>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
          <Ionicons name="share-social" size={28} color={colors.onPrimary} />
        </View>
      </View>

      {/* Tab Selector */}
      <View style={[styles.tabContainer, { backgroundColor: colors.surface }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && [styles.activeTab, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={activeTab === tab.id ? colors.onPrimary : colors.text}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.id ? colors.onPrimary : colors.text },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'progress' ? (
          <View>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Create a beautiful card with your health progress and share it on social media!
              </Text>
            </View>
            <ProgressCardCreator />
          </View>
        ) : (
          <View>
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="information-circle" size={24} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                Share inspiring wisdom from your AI coaches. Tap the arrows to browse different quotes!
              </Text>
            </View>

            {/* Quote Navigation */}
            <View style={styles.quoteNavigation}>
              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedQuoteIndex((prev) => (prev > 0 ? prev - 1 : wisdomQuotes.length - 1))}
              >
                <Ionicons name="chevron-back" size={24} color={colors.primary} />
              </TouchableOpacity>

              <Text style={[styles.quoteCounter, { color: colors.textSecondary }]}>
                {selectedQuoteIndex + 1} of {wisdomQuotes.length}
              </Text>

              <TouchableOpacity
                style={[styles.navButton, { backgroundColor: colors.surface }]}
                onPress={() => setSelectedQuoteIndex((prev) => (prev < wisdomQuotes.length - 1 ? prev + 1 : 0))}
              >
                <Ionicons name="chevron-forward" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <WisdomCardCreator
              coachMessage={currentQuote.message}
              coachName={currentQuote.coachName}
              coachImageSource={getCoachById(currentQuote.coachId)?.imageUrl}
              gradientColors={currentQuote.gradientColors as unknown as readonly [string, string, ...string[]]}
            />

            {/* Tips */}
            <View style={[styles.tipsCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.tipsTitle, { color: colors.text }]}>
                💡 Sharing Tips
              </Text>
              <View style={styles.tipsList}>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    Your actual coach messages can be shared too (coming soon)
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    Quote cards work great on Instagram Stories
                  </Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                    Tag @mindfork to inspire others!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  quoteNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteCounter: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
