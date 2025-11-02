import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Screen, Card, Text, Button, useThemeColors, useThemedStyles } from '../../ui';
import { useCoachMarketplace } from '../../hooks/useCoachMarketplace';
import { useAuth } from '../../contexts/AuthContext';
import { CoachCard } from '../../components/marketplace/CoachCard';
import { CategoryFilter } from '../../components/marketplace/CategoryFilter';
import { SearchBar } from '../../components/marketplace/SearchBar';
import { CoachDetailsModal } from '../../components/marketplace/CoachDetailsModal';
import { PurchaseModal } from '../../components/marketplace/PurchaseModal';
import { RatingModal } from '../../components/marketplace/RatingModal';
import { TrialBanner } from '../../components/marketplace/TrialBanner';
import type { Coach } from '../../types/marketplace';

type TabType = 'browse' | 'my-coaches';

export const CoachMarketplaceScreen: React.FC = () => {
  const colors = useThemeColors();
  const styles = useThemedStyles(createStyles);
  const { user } = useAuth();

  const {
    coaches,
    categories,
    purchasedCoaches,
    isLoading,
    error,
    filters,
    sort,
    searchCoaches,
    purchaseCoach,
    startTrial,
    cancelTrial,
    rateCoach,
    updateFilters,
    updateSort,
    clearFilters,
    clearError,
    refreshAll,
  } = useCoachMarketplace();

  const [activeTab, setActiveTab] = useState<TabType>('browse');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [coachToRate, setCoachToRate] = useState<Coach | null>(null);

  // Handle search with debouncing (handled by SearchBar component)
  const handleSearch = useCallback(
    (query: string) => {
      if (query.trim()) {
        searchCoaches(query);
      } else {
        refreshAll();
      }
    },
    [searchCoaches, refreshAll]
  );

  // Handle category filter
  const handleCategoryFilter = useCallback(
    (categoryId?: string) => {
      updateFilters({ ...filters, category: categoryId });
    },
    [filters, updateFilters]
  );

  // Handle coach card press - show details
  const handleCoachPress = useCallback((coach: Coach) => {
    setSelectedCoach(coach);
    setShowDetailsModal(true);
  }, []);

  // Handle purchase initiation
  const handlePurchaseClick = useCallback((coach: Coach) => {
    setSelectedCoach(coach);
    setShowPurchaseModal(true);
  }, []);

  // Handle purchase completion
  const handlePurchase = useCallback(
    async (coachId: string, withTrial: boolean) => {
      if (!user?.id) {
        Alert.alert('Error', 'Please sign in to purchase coaches');
        return;
      }

      try {
        const success = await purchaseCoach({
          coach_id: coachId,
          purchase_type: withTrial ? 'trial' : 'monthly',
          with_trial: withTrial,
        });

        if (success) {
          Alert.alert(
            'Success!',
            withTrial
              ? 'Your free trial has started. Enjoy your new coach!'
              : 'Coach purchased successfully!'
          );
          setShowPurchaseModal(false);
        } else if (error) {
          Alert.alert('Purchase Failed', error);
          clearError();
        }
      } catch (err) {
        console.error('[CoachMarketplaceScreen] Failed to purchase coach:', err);
        Alert.alert('Error', 'Failed to complete purchase. Please try again.');
      }
    },
    [user, purchaseCoach, error, clearError]
  );

  // Handle trial cancellation
  const handleCancelTrial = useCallback(
    async (coach: Coach) => {
      Alert.alert(
        'Cancel Trial',
        `Are you sure you want to cancel your trial for ${coach.name}? You'll lose access immediately.`,
        [
          { text: 'Keep Trial', style: 'cancel' },
          {
            text: 'Cancel Trial',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await cancelTrial(coach.id);
                if (success) {
                  Alert.alert('Trial Cancelled', 'Your trial has been cancelled.');
                } else if (error) {
                  Alert.alert('Error', error);
                  clearError();
                }
              } catch (err) {
                console.error('[CoachMarketplaceScreen] Failed to cancel trial:', err);
                Alert.alert('Error', 'Failed to cancel trial. Please try again.');
              }
            },
          },
        ]
      );
    },
    [cancelTrial, error, clearError]
  );

  // Handle trial conversion
  const handleConvertTrial = useCallback(
    async (coach: Coach) => {
      Alert.alert(
        'Convert to Paid',
        `Convert your trial for ${coach.name} to a paid subscription?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Convert',
            onPress: async () => {
              try {
                const success = await purchaseCoach({
                  coach_id: coach.id,
                  purchase_type: 'monthly',
                  with_trial: false,
                });
                if (success) {
                  Alert.alert('Success', 'Trial converted to paid subscription!');
                }
              } catch (err) {
                console.error('[CoachMarketplaceScreen] Failed to convert trial:', err);
                Alert.alert('Error', 'Failed to convert trial. Please try again.');
              }
            },
          },
        ]
      );
    },
    [purchaseCoach]
  );

  // Handle rating submission
  const handleRateCoach = useCallback((coach: Coach) => {
    setCoachToRate(coach);
    setShowRatingModal(true);
  }, []);

  const handleSubmitRating = useCallback(
    async (rating: number, title?: string, reviewText?: string) => {
      if (!coachToRate) return;

      try {
        const success = await rateCoach({
          coach_id: coachToRate.id,
          rating,
          title,
          review_text: reviewText,
        });

        if (success) {
          Alert.alert('Thank You!', 'Your review has been submitted.');
          setShowRatingModal(false);
          setCoachToRate(null);
        } else if (error) {
          Alert.alert('Error', error);
          clearError();
        }
      } catch (err) {
        console.error('[CoachMarketplaceScreen] Failed to submit rating:', err);
        Alert.alert('Error', 'Failed to submit review. Please try again.');
      }
    },
    [coachToRate, rateCoach, error, clearError]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (sortBy: string) => {
      updateSort({ sort_by: sortBy as any, sort_order: 'desc' });
    },
    [updateSort]
  );

  // Render tab button
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

  // Render sort buttons
  const renderSortButtons = () => (
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={[
          styles.sortButton,
          {
            backgroundColor: sort.sort_by === 'rating' ? colors.primary : colors.surface,
          },
        ]}
        onPress={() => handleSortChange('rating')}
      >
        <Text
          variant="bodySmall"
          color={sort.sort_by === 'rating' ? '#FFF' : colors.text}
        >
          ⭐ Top Rated
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.sortButton,
          {
            backgroundColor: sort.sort_by === 'downloads' ? colors.primary : colors.surface,
          },
        ]}
        onPress={() => handleSortChange('downloads')}
      >
        <Text
          variant="bodySmall"
          color={sort.sort_by === 'downloads' ? '#FFF' : colors.text}
        >
          🔥 Popular
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.sortButton,
          {
            backgroundColor: sort.sort_by === 'newest' ? colors.primary : colors.surface,
          },
        ]}
        onPress={() => handleSortChange('newest')}
      >
        <Text
          variant="bodySmall"
          color={sort.sort_by === 'newest' ? '#FFF' : colors.text}
        >
          ✨ New
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Render featured coaches section
  const renderFeaturedSection = () => {
    const featuredCoaches = coaches.filter((c) => c.is_featured);
    if (featuredCoaches.length === 0) return null;

    return (
      <View style={styles.featuredSection}>
        <Text variant="titleLarge" style={styles.sectionTitle}>
          ✨ Featured Coaches
        </Text>
        <FlatList
          data={featuredCoaches}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CoachCard coach={item} onPress={() => handleCoachPress(item)} />
          )}
          scrollEnabled={false}
        />
      </View>
    );
  };

  // Render trial banners for purchased coaches
  const renderTrialBanners = () => {
    const trialCoaches = purchasedCoaches.filter((c) => c.is_trial);
    if (trialCoaches.length === 0) return null;

    return (
      <View style={styles.trialSection}>
        {trialCoaches.map((coach) => (
          <TrialBanner
            key={coach.id}
            coach={coach}
            onCancel={() => handleCancelTrial(coach)}
            onConvert={() => handleConvertTrial(coach)}
          />
        ))}
      </View>
    );
  };

  if (isLoading && coaches.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="body" style={styles.loadingText}>
            Loading marketplace...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <Text variant="headingSmall" style={styles.heading}>
        Coach Marketplace
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

      {/* Trial Banners */}
      {renderTrialBanners()}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton('browse', 'Browse', '🏪')}
        {renderTabButton('my-coaches', 'My Coaches', '⭐')}
      </View>

      {/* Browse Tab */}
      {activeTab === 'browse' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <SearchBar onSearch={handleSearch} />
          </View>

          {/* Category Filter */}
          <CategoryFilter
            categories={categories}
            selectedCategory={filters.category}
            onSelectCategory={handleCategoryFilter}
          />

          {/* Sort Options */}
          {renderSortButtons()}

          {/* Featured Coaches */}
          {renderFeaturedSection()}

          {/* All Coaches */}
          <View style={styles.allCoachesSection}>
            <View style={styles.sectionHeader}>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                All Coaches ({coaches.length})
              </Text>
              {(filters.category || filters.search) && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text variant="bodySmall" color={colors.primary}>
                    Clear Filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {coaches.length === 0 ? (
              <Card elevation={1} style={styles.emptyState}>
                <Text variant="body" color={colors.textSecondary} align="center">
                  No coaches found.{'\n'}Try adjusting your filters.
                </Text>
              </Card>
            ) : (
              <FlatList
                data={coaches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <CoachCard coach={item} onPress={() => handleCoachPress(item)} />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        </>
      )}

      {/* My Coaches Tab */}
      {activeTab === 'my-coaches' && (
        <View style={styles.myCoachesSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            My Coaches ({purchasedCoaches.length})
          </Text>

          {purchasedCoaches.length === 0 ? (
            <Card elevation={1} style={styles.emptyState}>
              <Text variant="headingSmall" align="center" style={{ marginBottom: 8 }}>
                📦
              </Text>
              <Text variant="body" color={colors.textSecondary} align="center">
                You haven't purchased any coaches yet.
              </Text>
              <Button
                title="Browse Coaches"
                variant="primary"
                size="medium"
                onPress={() => setActiveTab('browse')}
                containerStyle={styles.browseButton}
              />
            </Card>
          ) : (
            <>
              <FlatList
                data={purchasedCoaches}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View>
                    <CoachCard coach={item} onPress={() => handleCoachPress(item)} />
                    <Button
                      title="Rate Coach"
                      variant="outline"
                      size="small"
                      onPress={() => handleRateCoach(item)}
                      containerStyle={styles.rateButton}
                    />
                  </View>
                )}
                scrollEnabled={false}
              />
            </>
          )}
        </View>
      )}

      {/* Modals */}
      <CoachDetailsModal
        visible={showDetailsModal}
        coachId={selectedCoach?.id || null}
        userId={user?.id}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedCoach(null);
        }}
        onPurchase={handlePurchaseClick}
      />

      <PurchaseModal
        visible={showPurchaseModal}
        coach={selectedCoach}
        onClose={() => {
          setShowPurchaseModal(false);
          setSelectedCoach(null);
        }}
        onPurchase={handlePurchase}
      />

      <RatingModal
        visible={showRatingModal}
        coachName={coachToRate?.name || ''}
        onClose={() => {
          setShowRatingModal(false);
          setCoachToRate(null);
        }}
        onSubmit={handleSubmitRating}
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
    errorButton: {
      marginTop: 8,
    },
    trialSection: {
      marginBottom: 16,
    },
    tabsContainer: {
      flexDirection: 'row',
      marginBottom: 16,
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
    searchContainer: {
      marginBottom: 12,
    },
    sortContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginVertical: 12,
      gap: 8,
    },
    sortButton: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.1)',
    },
    featuredSection: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    allCoachesSection: {
      marginTop: 8,
    },
    myCoachesSection: {
      marginTop: 8,
    },
    emptyState: {
      paddingVertical: 48,
      paddingHorizontal: 24,
    },
    browseButton: {
      marginTop: 16,
    },
    rateButton: {
      marginTop: -8,
      marginBottom: 12,
    },
  });

export default CoachMarketplaceScreen;
