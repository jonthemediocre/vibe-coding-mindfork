/**
 * CalendarView - Week calendar with swipe navigation
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DAY_WIDTH = (SCREEN_WIDTH - 40) / 7; // 40px for padding

interface CalendarViewProps {
  startDate: string; // ISO date string (YYYY-MM-DD)
  selectedDate: string;
  onDateSelect: (date: string) => void;
  onWeekChange?: (direction: 'prev' | 'next') => void;
  macroSummaries?: Map<string, { planned_calories: number; target_calories?: number }>;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  startDate,
  selectedDate,
  onDateSelect,
  onWeekChange,
  macroSummaries,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const scrollViewRef = useRef<ScrollView>(null);

  // Generate array of 7 dates starting from startDate
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatDate = (date: Date) => {
    return date.getDate().toString();
  };

  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Week Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onWeekChange?.('prev')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.weekLabel, { color: colors.text }]}>
          {dates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
          {dates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onWeekChange?.('next')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="chevron-right" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Days of Week */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContainer}
      >
        {dates.map((date, index) => {
          const dateStr = getDateString(date);
          const isSelected = dateStr === selectedDate;
          const isTodayDate = isToday(date);
          const macros = macroSummaries?.get(dateStr);
          const hasMeals = macros && macros.planned_calories > 0;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCard,
                {
                  backgroundColor: isSelected ? colors.primary : colors.background,
                  borderColor: isTodayDate ? colors.primary : colors.border,
                },
              ]}
              onPress={() => onDateSelect(dateStr)}
            >
              <Text
                style={[
                  styles.dayLabel,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                {formatDay(date)}
              </Text>
              <Text
                style={[
                  styles.dateLabel,
                  { color: isSelected ? '#FFFFFF' : colors.text },
                ]}
              >
                {formatDate(date)}
              </Text>
              {hasMeals && (
                <View style={[styles.indicator, { backgroundColor: isSelected ? '#FFFFFF' : colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 4,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  daysContainer: {
    gap: 8,
  },
  dayCard: {
    width: DAY_WIDTH,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});
