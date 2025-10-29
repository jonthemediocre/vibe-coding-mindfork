import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Screen, Card, Text, Button, useThemeColors } from "../../ui";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { showAlert } from "../../utils/alerts";

interface Scenario {
  id: string;
  emoji: string;
  name: string;
  description: string;
  trigger_event: string;
  context_data?: Record<string, any>;
}

const SCENARIOS: Scenario[] = [
  {
    id: '1',
    emoji: '🌙',
    name: 'Late Meal Warning',
    description: 'Coach warns about eating late',
    trigger_event: 'late_meal',
    context_data: { meal_time: '23:30', calories: 800 }
  },
  {
    id: '2',
    emoji: '🍪',
    name: 'Snack Craving',
    description: 'Resist unhealthy snacking',
    trigger_event: 'snack_craving',
    context_data: { craving_type: 'cookies' }
  },
  {
    id: '3',
    emoji: '🚶',
    name: 'Low Activity',
    description: 'Motivate to move more',
    trigger_event: 'steps_low',
    context_data: { steps: 2000, goal: 10000 }
  },
  {
    id: '4',
    emoji: '🎉',
    name: 'Goal Achieved',
    description: 'Celebrate hitting goals',
    trigger_event: 'goal_achieved',
    context_data: { streak_days: 7 }
  },
  {
    id: '5',
    emoji: '📝',
    name: 'Missed Logging',
    description: 'Reminder to log food',
    trigger_event: 'logging_missed',
    context_data: { hours_since_last: 8 }
  },
  {
    id: '6',
    emoji: '🔥',
    name: 'Overeating Roast',
    description: 'Roast for overeating',
    trigger_event: 'overeating',
    context_data: { calories: 3000, goal_calories: 2000 }
  },
  {
    id: '7',
    emoji: '🍕',
    name: 'Junk Food Roast',
    description: 'Roast for junk food',
    trigger_event: 'junk_food',
    context_data: { calories: 1200, items: ['pizza', 'ice cream'] }
  },
  {
    id: '8',
    emoji: '✅',
    name: 'Daily Check-in',
    description: 'Daily progress check',
    trigger_event: 'check_in',
    context_data: {}
  }
];

type Channel = 'in_app' | 'sms' | 'call';

export const ScenarioTestScreen: React.FC = () => {
  const colors = useThemeColors();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<Channel>('in_app');

  const triggerScenario = async (scenario: Scenario) => {
    if (!user?.id || !session?.access_token) {
      showAlert.error('Error', 'You must be logged in');
      return;
    }

    setLoading(scenario.id);

    try {
      const { data: { functions } } = await supabase
        .functions
        .invoke('coach-messaging/generate', {
          body: {
            user_id: user.id,
            trigger_event: scenario.trigger_event,
            context_data: scenario.context_data,
            preferred_channel: selectedChannel,
            force_send: true // Bypass consent for testing
          }
        });

      if (functions?.success) {
        const channelNames = {
          'in_app': 'In-App Message',
          'sms': 'SMS',
          'call': 'Voice Call'
        };

        showAlert.success(
          'Success! 🎉',
          `${channelNames[selectedChannel]} triggered!\n\n${
            functions.message?.why_statement || ''
          }`
        );
      } else {
        throw new Error(functions?.reason || 'Failed to trigger scenario');
      }

    } catch (error) {
      console.error('Scenario trigger error:', error);
      showAlert.error(
        'Error',
        error instanceof Error ? error.message : 'Failed to trigger scenario'
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Card elevation={2} style={styles.headerCard}>
          <Text variant="titleLarge" style={styles.title}>
            🤖 Test Coach Scenarios
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Trigger different coaching messages to test your coach's personality
          </Text>
        </Card>

        {/* Channel Selector */}
        <Card elevation={2} style={styles.channelCard}>
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Delivery Channel
          </Text>
          <View style={styles.channelRow}>
            <Button
              title="📱 In-App"
              variant={selectedChannel === 'in_app' ? 'primary' : 'outline'}
              onPress={() => setSelectedChannel('in_app')}
              containerStyle={styles.channelButton}
            />
            <Button
              title="💬 SMS"
              variant={selectedChannel === 'sms' ? 'primary' : 'outline'}
              onPress={() => setSelectedChannel('sms')}
              containerStyle={styles.channelButton}
            />
            <Button
              title="📞 Call"
              variant={selectedChannel === 'call' ? 'primary' : 'outline'}
              onPress={() => setSelectedChannel('call')}
              containerStyle={styles.channelButton}
            />
          </View>
        </Card>

        {/* Scenarios */}
        <Text variant="titleSmall" style={styles.scenariosHeader}>
          Available Scenarios
        </Text>

        {SCENARIOS.map((scenario) => (
          <Card
            key={scenario.id}
            elevation={1}
            style={[
              styles.scenarioCard,
              { backgroundColor: colors.surface }
            ]}
          >
            <View style={styles.scenarioHeader}>
              <Text variant="titleLarge" style={styles.emoji}>
                {scenario.emoji}
              </Text>
              <View style={styles.scenarioInfo}>
                <Text variant="titleSmall">{scenario.name}</Text>
                <Text variant="bodySmall" color={colors.textSecondary}>
                  {scenario.description}
                </Text>
              </View>
            </View>

            <Button
              title={loading === scenario.id ? "Sending..." : "Trigger"}
              variant="primary"
              size="small"
              onPress={() => triggerScenario(scenario)}
              disabled={loading !== null}
              containerStyle={styles.triggerButton}
            />
          </Card>
        ))}

        <Card elevation={1} style={styles.tipCard}>
          <Text variant="titleSmall">💡 Tip</Text>
          <Text variant="bodySmall" color={colors.textSecondary}>
            Voice calls require phone number setup. Go to Settings → Phone Number to configure.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  channelCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  channelButton: {
    flex: 1,
    marginBottom: 0,
  },
  scenariosHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scenarioCard: {
    marginBottom: 12,
    padding: 16,
  },
  scenarioHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  scenarioInfo: {
    flex: 1,
  },
  triggerButton: {
    marginBottom: 0,
  },
  tipCard: {
    marginTop: 8,
    marginBottom: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
});
