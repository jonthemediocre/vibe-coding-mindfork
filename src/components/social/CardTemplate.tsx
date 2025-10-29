/**
 * CardTemplate - Reusable card template component
 *
 * Renders different card styles based on selected template
 */

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { CardTemplate as CardTemplateType, ProgressCardData } from '../../hooks/useProgressCard';

interface CardTemplateProps {
  template: CardTemplateType;
  data: ProgressCardData;
}

const CardTemplate: React.FC<CardTemplateProps> = ({ template, data }) => {
  const { dailyStats, activeGoals, totalProgress, fastingSession, elapsedHours, userName } = data;

  const renderSimpleCard = () => (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.logoText}>MindFork</Text>
        <Ionicons name="share-social" size={24} color="#fff" />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>My Progress</Text>
        <Text style={styles.userName}>{userName}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#FFD93D" />
            <Text style={styles.statValue}>{dailyStats?.total_calories || 0}</Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trophy" size={32} color="#FFD93D" />
            <Text style={styles.statValue}>{totalProgress}%</Text>
            <Text style={styles.statLabel}>Goals</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="timer" size={32} color="#FFD93D" />
            <Text style={styles.statValue}>{Math.floor(elapsedHours)}h</Text>
            <Text style={styles.statLabel}>Fasting</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
    </LinearGradient>
  );

  const renderDetailedCard = () => (
    <LinearGradient
      colors={['#4ECDC4', '#556270']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.logoText}>MindFork</Text>
        <Ionicons name="analytics" size={24} color="#fff" />
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>Daily Summary</Text>
        <Text style={styles.userName}>{userName}</Text>

        <View style={styles.detailedStats}>
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="flame" size={20} color="#FFD93D" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Calories</Text>
              <Text style={styles.detailValue}>{dailyStats?.total_calories || 0} kcal</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="nutrition" size={20} color="#FFD93D" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Macros</Text>
              <Text style={styles.detailValue}>
                P: {dailyStats?.total_protein || 0}g | C: {dailyStats?.total_carbs || 0}g | F: {dailyStats?.total_fat || 0}g
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="trophy" size={20} color="#FFD93D" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Active Goals</Text>
              <Text style={styles.detailValue}>
                {activeGoals.length} goals - {totalProgress}% complete
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="timer" size={20} color="#FFD93D" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Fasting</Text>
              <Text style={styles.detailValue}>
                {fastingSession
                  ? `${Math.floor(elapsedHours)}h ${Math.round((elapsedHours % 1) * 60)}m`
                  : 'No active fast'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.footerText}>
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
    </LinearGradient>
  );

  const renderMotivationalCard = () => {
    const motivationalMessages = [
      "Keep crushing it! 💪",
      "You're unstoppable! 🔥",
      "Amazing progress! 🌟",
      "Stay strong! 💯",
      "You've got this! 🚀",
    ];
    const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];

    return (
      <LinearGradient
        colors={['#FF6B6B', '#FFD93D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.logoText}>MindFork</Text>
          <Ionicons name="star" size={24} color="#fff" />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.motivationalContent}>
            <Ionicons name="trophy" size={64} color="#FFD93D" />
            <Text style={styles.motivationalTitle}>{randomMessage}</Text>
            <Text style={styles.userName}>{userName}</Text>

            <View style={styles.achievementBox}>
              <Text style={styles.achievementText}>
                {totalProgress >= 75
                  ? "Crushing your goals!"
                  : totalProgress >= 50
                  ? "Halfway there!"
                  : "Every step counts!"}
              </Text>

              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${totalProgress}%` }]} />
              </View>

              <Text style={styles.progressText}>{totalProgress}% Complete</Text>
            </View>

            <View style={styles.miniStats}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{dailyStats?.total_calories || 0}</Text>
                <Text style={styles.miniStatLabel}>cal</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{activeGoals.length}</Text>
                <Text style={styles.miniStatLabel}>goals</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{Math.floor(elapsedHours)}</Text>
                <Text style={styles.miniStatLabel}>hrs</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerText}>
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </Text>
        </View>
      </LinearGradient>
    );
  };

  switch (template) {
    case 'simple':
      return renderSimpleCard();
    case 'detailed':
      return renderDetailedCard();
    case 'motivational':
      return renderMotivationalCard();
    default:
      return renderSimpleCard();
  }
};

const styles = StyleSheet.create({
  card: {
    width: 340,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  detailedStats: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  motivationalContent: {
    alignItems: 'center',
  },
  motivationalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 8,
  },
  achievementBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  achievementText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  miniStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%',
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 4,
  },
  cardFooter: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  footerText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
});

export default CardTemplate;
