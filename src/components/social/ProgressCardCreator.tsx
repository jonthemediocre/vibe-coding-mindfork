/**
 * ProgressCardCreator - Component for creating shareable progress cards
 *
 * Features:
 * - Multiple card templates
 * - Real-time data integration
 * - Beautiful, shareable design
 */

import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFoodTracking } from '../../hooks/useFoodTracking';
import { useGoals } from '../../hooks/useGoals';
import { useFastingTimer } from '../../hooks/useFastingTimer';
import { useAuth } from '../../contexts/AuthContext';
import { useProgressCard, type CardTemplate as CardTemplateType } from '../../hooks/useProgressCard';
import CardTemplateComponent from './CardTemplate';
import ShareButton from './ShareButton';

export const ProgressCardCreator: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const colors = theme.colors;

  const { dailyStats, isLoading: statsLoading } = useFoodTracking();
  const { activeGoals, totalProgress, isLoading: goalsLoading } = useGoals();
  const { activeSession, elapsedHours, isLoading: fastingLoading } = useFastingTimer();

  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplateType>('simple');
  const cardRef = useRef(null);

  const { isGenerating, error, generateImage, clearError } = useProgressCard();

  const isLoading = statsLoading || goalsLoading || fastingLoading;

  const templates: { id: CardTemplateType; label: string; icon: string }[] = [
    { id: 'simple', label: 'Simple', icon: 'card-outline' },
    { id: 'detailed', label: 'Detailed', icon: 'analytics-outline' },
    { id: 'motivational', label: 'Motivational', icon: 'trophy-outline' },
  ];

  const handleShare = async () => {
    const imageUri = await generateImage(cardRef, selectedTemplate);
    if (imageUri) {
      // ShareButton component will handle the actual sharing
      return imageUri;
    }
  };

  const cardData = {
    dailyStats,
    goals: activeGoals,
    activeGoals,
    totalProgress,
    fastingSession: activeSession,
    elapsedHours,
    userName: user?.name || user?.email?.split('@')[0] || 'MindFork User',
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading your progress...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Template Selector */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Choose Template
        </Text>
        <View style={styles.templateSelector}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={[
                styles.templateButton,
                {
                  backgroundColor: selectedTemplate === template.id ? colors.primary : colors.surface,
                  borderColor: selectedTemplate === template.id ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedTemplate(template.id)}
            >
              <Ionicons
                name={template.icon as any}
                size={24}
                color={selectedTemplate === template.id ? colors.onPrimary : colors.text}
              />
              <Text
                style={[
                  styles.templateLabel,
                  {
                    color: selectedTemplate === template.id ? colors.onPrimary : colors.text,
                  },
                ]}
              >
                {template.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Card Preview */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Preview
        </Text>
        <View style={styles.cardPreviewContainer}>
          <View ref={cardRef} collapsable={false}>
            <CardTemplateComponent template={selectedTemplate} data={cardData} />
          </View>
        </View>
      </View>

      {/* Error Display */}
      {error && (
        <View style={[styles.errorContainer, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="alert-circle" size={20} color="#DC2626" />
          <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
          <TouchableOpacity onPress={clearError}>
            <Ionicons name="close" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* Share Button */}
      <View style={styles.shareSection}>
        <ShareButton
          onGenerateImage={handleShare}
          isGenerating={isGenerating}
          cardData={cardData}
        />
      </View>

      {/* Data Summary */}
      <View style={[styles.dataSummary, { backgroundColor: colors.surface }]}>
        <Text style={[styles.dataSummaryTitle, { color: colors.text }]}>
          Your Progress Today
        </Text>
        <View style={styles.statRow}>
          <Ionicons name="flame-outline" size={20} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {dailyStats?.total_calories || 0} calories
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="trophy-outline" size={20} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {activeGoals.length} active goals
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="timer-outline" size={20} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {activeSession ? `${Math.floor(elapsedHours)}h fasting` : 'No active fast'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  templateSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  templateButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  templateLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  cardPreviewContainer: {
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  shareSection: {
    marginBottom: 24,
  },
  dataSummary: {
    padding: 16,
    borderRadius: 12,
  },
  dataSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
  },
});

export default ProgressCardCreator;
