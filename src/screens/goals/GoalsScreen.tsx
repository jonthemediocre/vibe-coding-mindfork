/**
 * GoalsScreen - Main goals and progress tracking screen
 *
 * Features:
 * - Active goals with progress bars
 * - Create new goal button
 * - Status indicators (on-track, behind, ahead, completed)
 * - Achievements display
 * - Completed goals archive
 * - Milestone tracking
 * - Pull-to-refresh
 * - Real-time updates
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from '../../ui';
import { useGoals } from '../../hooks/useGoals';
import { CreateGoalModal } from './CreateGoalModal';
import type { Goal, CreateGoalInput } from '../../types/models';

const GOAL_ICONS: Record<string, string> = {
  weight: '⚖️',
  calories: '🔥',
  protein: '💪',
  carbs: '🍞',
  fat: '🥑',
  water: '💧',
  exercise: '🏃',
  sleep: '😴',
  streak: '🔥',
  custom: '🎯',
};

const GOAL_COLORS: Record<string, string> = {
  weight: '#FFA8D2',
  calories: '#FF9800',
  protein: '#4CAF50',
  carbs: '#FFEB3B',
  fat: '#FFC107',
  water: '#2196F3',
  exercise: '#9C27B0',
  sleep: '#673AB7',
  streak: '#FF5722',
  custom: '#607D8B',
};

export const GoalsScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const {
    activeGoals,
    completedGoals,
    achievements,
    isLoading,
    totalProgress,
    createGoal,
    updateGoal,
    deleteGoal,
    fetchGoals,
    refreshAchievements,
  } = useGoals();

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'achievements' | 'completed'>('active');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchGoals(), refreshAchievements()]);
    } catch (err) {
      console.error('[GoalsScreen] Failed to refresh goals:', err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchGoals, refreshAchievements]);

  const handleCreateGoal = async (goalInput: CreateGoalInput) => {
    try {
      const success = await createGoal(goalInput);
      if (success) {
        setIsCreateModalVisible(false);
      }
    } catch (err) {
      console.error('[GoalsScreen] Failed to create goal:', err);
    }
  };

  const handleDeleteGoal = (goalId: string, goalTitle: string) => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${goalTitle}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGoal(goalId),
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'ahead':
        return '#4CAF50';
      case 'on_track':
        return colors.primary;
      case 'behind':
        return colors.warning;
      case 'paused':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'ahead':
        return 'Ahead of Schedule';
      case 'on_track':
        return 'On Track';
      case 'behind':
        return 'Needs Attention';
      case 'paused':
        return 'Paused';
      default:
        return status;
    }
  };

  const renderGoalCard = (goal: Goal) => {
    const goalColor = GOAL_COLORS[goal.type] || colors.primary;
    const statusColor = getStatusColor(goal.status);

    return (
      <Card key={goal.id} elevation={2} style={styles.goalCard}>
        {/* Header */}
        <View style={styles.goalHeader}>
          <View style={styles.goalHeaderLeft}>
            <View
              style={[
                styles.goalIcon,
                { backgroundColor: `${goalColor}20`, borderColor: `${goalColor}40` },
              ]}
            >
              <Text style={styles.goalIconText}>{GOAL_ICONS[goal.type] || '🎯'}</Text>
            </View>
            <View style={styles.goalHeaderText}>
              <Text variant="titleSmall">{goal.title}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {goal.category}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteGoal(goal.id, goal.title)}
            style={styles.deleteButton}
          >
            <Text variant="body" color={colors.error}>
              🗑️
            </Text>
          </TouchableOpacity>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.valuesRow}>
            <View style={styles.valueItem}>
              <Text variant="headingSmall">{goal.current_value}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                Current
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text variant="headingSmall" style={{ color: goalColor }}>
                {goal.target_value}
              </Text>
              <Text variant="caption" color={colors.textSecondary}>
                Target
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text variant="body">{goal.unit}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                Unit
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarLabels}>
              <Text variant="caption" color={colors.textSecondary}>
                Progress
              </Text>
              <Text variant="caption" style={{ color: statusColor }}>
                {goal.progress}%
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: `${goalColor}20` }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(goal.progress, 100)}%`,
                    backgroundColor: goalColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* Status Badge */}
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${statusColor}20`,
                  borderColor: `${statusColor}40`,
                },
              ]}
            >
              <Text variant="caption" style={{ color: statusColor }}>
                {getStatusLabel(goal.status)}
              </Text>
            </View>
            {goal.target_date && (
              <Text variant="caption" color={colors.textSecondary}>
                Due: {new Date(goal.target_date).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Milestones */}
          {goal.milestones && goal.milestones.length > 0 && (
            <View style={styles.milestonesRow}>
              <Text variant="caption" color={colors.textSecondary}>
                Milestones:
              </Text>
              <View style={styles.milestoneDots}>
                {goal.milestones.map((milestone, index) => (
                  <View
                    key={milestone.id || index}
                    style={[
                      styles.milestoneDot,
                      {
                        backgroundColor: milestone.achieved
                          ? colors.success
                          : colors.textSecondary,
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderAchievementCard = (achievement: typeof achievements[0], index: number) => {
    return (
      <Card key={achievement.id || index} style={styles.achievementCard}>
        <View style={styles.achievementContent}>
          <View
            style={[
              styles.achievementIcon,
              {
                backgroundColor: `${achievement.color}20`,
                borderColor: `${achievement.color}40`,
              },
            ]}
          >
            <Text style={styles.achievementIconText}>{achievement.icon || '🏆'}</Text>
          </View>
          <View style={styles.achievementText}>
            <Text variant="titleSmall">{achievement.title}</Text>
            <Text variant="body" color={colors.textSecondary} style={{ marginTop: 4 }}>
              {achievement.description}
            </Text>
            <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 8 }}>
              Earned on {new Date(achievement.earned_date).toLocaleDateString()}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = (type: 'goals' | 'achievements' | 'completed') => {
    const messages = {
      goals: {
        icon: '🎯',
        title: 'No Active Goals',
        description: 'Create your first goal to start tracking your progress!',
      },
      achievements: {
        icon: '🏆',
        title: 'No Achievements Yet',
        description: 'Complete goals to unlock achievements!',
      },
      completed: {
        icon: '✅',
        title: 'No Completed Goals',
        description: 'Keep working on your current goals!',
      },
    };

    const message = messages[type];

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>{message.icon}</Text>
        <Text variant="titleSmall" style={{ marginTop: 16 }}>
          {message.title}
        </Text>
        <Text variant="body" color={colors.textSecondary} style={{ marginTop: 8 }}>
          {message.description}
        </Text>
        {type === 'goals' && (
          <Button
            title="Create Goal"
            variant="primary"
            onPress={() => setIsCreateModalVisible(true)}
            containerStyle={styles.emptyButton}
          />
        )}
      </View>
    );
  };

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text variant="headingSmall">Goals & Progress</Text>
          <Text variant="body" color={colors.textSecondary}>
            Track your health and nutrition goals
          </Text>
        </View>
        <Button
          title="+"
          variant="primary"
          size="small"
          onPress={() => setIsCreateModalVisible(true)}
          containerStyle={styles.createButton}
        />
      </View>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <Card style={styles.statCard}>
          <Text variant="headingMedium">{activeGoals.length}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Active Goals
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="headingMedium">{totalProgress}%</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Avg Progress
          </Text>
        </Card>
        <Card style={styles.statCard}>
          <Text variant="headingMedium">{achievements.length}</Text>
          <Text variant="caption" color={colors.textSecondary}>
            Achievements
          </Text>
        </Card>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text
            variant="body"
            style={{
              color: activeTab === 'active' ? colors.primary : colors.textSecondary,
            }}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => setActiveTab('achievements')}
        >
          <Text
            variant="body"
            style={{
              color: activeTab === 'achievements' ? colors.primary : colors.textSecondary,
            }}
          >
            Achievements
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text
            variant="body"
            style={{
              color: activeTab === 'completed' ? colors.primary : colors.textSecondary,
            }}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'active' && (
          <>
            {activeGoals.length === 0
              ? renderEmptyState('goals')
              : activeGoals.map(renderGoalCard)}
          </>
        )}

        {activeTab === 'achievements' && (
          <>
            {achievements.length === 0
              ? renderEmptyState('achievements')
              : achievements.map(renderAchievementCard)}
          </>
        )}

        {activeTab === 'completed' && (
          <>
            {completedGoals.length === 0
              ? renderEmptyState('completed')
              : completedGoals.map(renderGoalCard)}
          </>
        )}
      </ScrollView>

      {/* Create Goal Modal */}
      <CreateGoalModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        onSubmit={handleCreateGoal}
      />
    </Screen>
  );
};

const createStyles = () =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 16,
    },
    createButton: {
      minWidth: 50,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 16,
      gap: 8,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 8,
    },
    activeTab: {
      backgroundColor: 'rgba(255, 168, 210, 0.1)',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    goalCard: {
      marginBottom: 16,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    goalHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    goalIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    goalIconText: {
      fontSize: 24,
    },
    goalHeaderText: {
      flex: 1,
    },
    deleteButton: {
      padding: 8,
    },
    progressSection: {
      gap: 12,
    },
    valuesRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 12,
    },
    valueItem: {
      alignItems: 'center',
    },
    progressBarContainer: {
      gap: 8,
    },
    progressBarLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    progressBar: {
      height: 8,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      borderWidth: 1,
    },
    milestonesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    milestoneDots: {
      flexDirection: 'row',
      gap: 6,
    },
    milestoneDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    achievementCard: {
      marginBottom: 16,
    },
    achievementContent: {
      flexDirection: 'row',
      gap: 12,
    },
    achievementIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    achievementIconText: {
      fontSize: 28,
    },
    achievementText: {
      flex: 1,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyIcon: {
      fontSize: 64,
    },
    emptyButton: {
      marginTop: 24,
      minWidth: 200,
    },
  });

export default GoalsScreen;
