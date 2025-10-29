import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Switch,
} from 'react-native';
import { showAlert } from '../../utils/alerts';
import { Feather as Icon } from '@expo/vector-icons';
import { StripeProvider } from '@stripe/stripe-react-native';
import { useSubscription } from '../../hooks/useSubscription';
import { PlanCard } from '../../components/subscription/PlanCard';
import { PlanComparison } from '../../components/subscription/PlanComparison';
import { PaymentMethodCard } from '../../components/subscription/PaymentMethodCard';
import { AddPaymentMethodModal } from '../../components/subscription/AddPaymentMethodModal';
import { InvoiceList } from '../../components/subscription/InvoiceList';
import { UsageProgressBar } from '../../components/subscription/UsageProgressBar';
import { CancellationModal } from '../../components/subscription/CancellationModal';
import { ScreenErrorBoundary } from '../../components/ErrorBoundary';
import { ENV } from '../../config/env';

type TabType = 'plans' | 'billing' | 'usage' | 'invoices';

function SubscriptionScreenInner() {
  const {
    subscription,
    plans,
    paymentMethods,
    invoices,
    usageMetrics,
    isLoading,
    isRefreshing,
    upgradePlan,
    cancelSubscription,
    addPaymentMethod,
    removePaymentMethod,
    refreshAll,
  } = useSubscription();

  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const currentTier = subscription?.tier || 'free';
  const currentPlan = plans.find((p) => p.tier === currentTier);

  // =========================================================================
  // HANDLERS
  // =========================================================================

  const handleSelectPlan = async (planId: string) => {
    if (planId === currentTier) return;

    // Downgrade to free
    if (planId === 'free') {
      showAlert.confirm(
        'Downgrade to Free',
        'Are you sure you want to downgrade? You\'ll lose access to premium features.',
        () => setShowCancelModal(true)
      );
      return;
    }

    // Upgrade or change plan
    const result = await upgradePlan(planId, billingCycle);
    if (result.success) {
      refreshAll();
    }
  };

  const handleAddPaymentMethod = async (paymentMethodId: string) => {
    const result = await addPaymentMethod(paymentMethodId);
    if (result.success) {
      refreshAll();
    }
  };

  const handleRemovePaymentMethod = (pmId: string) => {
    showAlert.confirm(
      'Remove Payment Method',
      'Are you sure you want to remove this payment method?',
      async () => {
        await removePaymentMethod(pmId);
        refreshAll();
      }
    );
  };

  const handleCancelSubscription = async (reason: string, immediately: boolean) => {
    await cancelSubscription(reason, immediately);
    refreshAll();
  };

  // =========================================================================
  // RENDER TABS
  // =========================================================================

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'plans' && styles.activeTab]}
        onPress={() => setActiveTab('plans')}
      >
        <Icon
          name="grid"
          size={20}
          color={activeTab === 'plans' ? '#FFA8D2' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'plans' && styles.activeTabText]}>
          Plans
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'billing' && styles.activeTab]}
        onPress={() => setActiveTab('billing')}
      >
        <Icon
          name="credit-card"
          size={20}
          color={activeTab === 'billing' ? '#FFA8D2' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'billing' && styles.activeTabText]}>
          Billing
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'usage' && styles.activeTab]}
        onPress={() => setActiveTab('usage')}
      >
        <Icon
          name="bar-chart"
          size={20}
          color={activeTab === 'usage' ? '#FFA8D2' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'usage' && styles.activeTabText]}>
          Usage
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
        onPress={() => setActiveTab('invoices')}
      >
        <Icon
          name="file-text"
          size={20}
          color={activeTab === 'invoices' ? '#FFA8D2' : '#666'}
        />
        <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
          Invoices
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlansTab = () => (
    <View style={styles.tabContent}>
      {/* Current Plan Badge */}
      <View style={styles.currentPlanBadge}>
        <View style={styles.badgeContent}>
          <View style={[styles.planDot, { backgroundColor: currentPlan?.color }]} />
          <View style={styles.badgeText}>
            <Text style={styles.badgeTitle}>Current Plan</Text>
            <Text style={styles.badgePlan}>{currentPlan?.name}</Text>
          </View>
        </View>
        {subscription?.status && (
          <View style={[styles.statusBadge, { backgroundColor: '#4CAF5020' }]}>
            <Text style={[styles.statusText, { color: '#4CAF50' }]}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
            </Text>
          </View>
        )}
      </View>

      {/* Billing Cycle Toggle */}
      <View style={styles.billingToggle}>
        <Text style={[styles.cycleText, billingCycle === 'monthly' && styles.activeCycleText]}>
          Monthly
        </Text>
        <Switch
          value={billingCycle === 'yearly'}
          onValueChange={(value) => setBillingCycle(value ? 'yearly' : 'monthly')}
          trackColor={{ false: '#E0E0E0', true: '#FFA8D2' }}
          thumbColor="#fff"
        />
        <Text style={[styles.cycleText, billingCycle === 'yearly' && styles.activeCycleText]}>
          Yearly
        </Text>
        {billingCycle === 'yearly' && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>Save 20%</Text>
          </View>
        )}
      </View>

      {/* Compare Plans Button */}
      <TouchableOpacity
        style={styles.compareButton}
        onPress={() => setShowComparison(!showComparison)}
      >
        <Icon name="list" size={16} color="#FFA8D2" />
        <Text style={styles.compareText}>
          {showComparison ? 'Hide' : 'Compare'} Plans
        </Text>
      </TouchableOpacity>

      {/* Plan Comparison */}
      {showComparison && (
        <View style={styles.comparisonContainer}>
          <PlanComparison plans={plans} />
        </View>
      )}

      {/* Plan Cards */}
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          billingCycle={billingCycle}
          isCurrentPlan={plan.tier === currentTier}
          onSelect={() => handleSelectPlan(plan.id)}
          disabled={isLoading}
        />
      ))}
    </View>
  );

  const renderBillingTab = () => (
    <View style={styles.tabContent}>
      {/* Subscription Details */}
      {subscription && subscription.tier !== 'free' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Next Billing Date</Text>
              <Text style={styles.detailValue}>
                {new Date(subscription.current_period_end).toLocaleDateString()}
              </Text>
            </View>
            {subscription.cancel_at_period_end && (
              <View style={styles.cancelNotice}>
                <Icon name="alert-circle" size={16} color="#FF9800" />
                <Text style={styles.cancelNoticeText}>
                  Subscription will cancel on{' '}
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Payment Methods */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Payment Methods</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowPaymentModal(true)}
          >
            <Icon name="plus" size={16} color="#FFA8D2" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="credit-card" size={48} color="#E0E0E0" />
            <Text style={styles.emptyText}>No payment methods</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowPaymentModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          paymentMethods.map((pm) => (
            <PaymentMethodCard
              key={pm.id}
              paymentMethod={pm}
              onRemove={() => handleRemovePaymentMethod(pm.stripe_payment_method_id)}
            />
          ))
        )}
      </View>

      {/* Cancel Subscription */}
      {subscription && subscription.tier !== 'free' && !subscription.cancel_at_period_end && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setShowCancelModal(true)}
          >
            <Icon name="x-circle" size={16} color="#fff" />
            <Text style={styles.dangerButtonText}>Cancel Subscription</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderUsageTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Month Usage</Text>

        {usageMetrics ? (
          <>
            <UsageProgressBar
              label="Food Photos"
              current={usageMetrics.food_photos_count}
              limit={usageMetrics.food_photos_limit}
              color="#FFA8D2"
            />

            <UsageProgressBar
              label="AI Messages"
              current={usageMetrics.ai_messages_count}
              limit={usageMetrics.ai_messages_limit}
              color="#4CAF50"
            />

            <UsageProgressBar
              label="Meal Plans"
              current={usageMetrics.meal_plans_count}
              unit="plans"
              color="#FF9800"
            />

            {usageMetrics.phone_coaching_sessions !== undefined && (
              <UsageProgressBar
                label="Phone Coaching"
                current={usageMetrics.phone_coaching_sessions}
                limit={usageMetrics.phone_coaching_limit}
                unit="sessions"
                color="#9C27B0"
              />
            )}

            <View style={styles.statsCard}>
              <Text style={styles.statsLabel}>Analytics Points</Text>
              <Text style={styles.statsValue}>{usageMetrics.analytics_points}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.loadingText}>Loading usage data...</Text>
        )}

        {currentTier === 'free' && (
          <View style={styles.upgradePrompt}>
            <Icon name="trending-up" size={20} color="#FFA8D2" />
            <Text style={styles.upgradeText}>
              Upgrade to Premium for unlimited usage
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => setActiveTab('plans')}
            >
              <Text style={styles.upgradeButtonText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  const renderInvoicesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing History</Text>
        <InvoiceList invoices={invoices} onRefresh={refreshAll} refreshing={isRefreshing} />
      </View>
    </View>
  );

  // =========================================================================
  // MAIN RENDER
  // =========================================================================

  return (
    <StripeProvider publishableKey={ENV.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Subscription</Text>
          <Text style={styles.headerSubtitle}>Manage your MindFork plan and billing</Text>
        </View>

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshAll} />}
        >
          {activeTab === 'plans' && renderPlansTab()}
          {activeTab === 'billing' && renderBillingTab()}
          {activeTab === 'usage' && renderUsageTab()}
          {activeTab === 'invoices' && renderInvoicesTab()}
        </ScrollView>

        {/* Modals */}
        <AddPaymentMethodModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handleAddPaymentMethod}
        />

        <CancellationModal
          visible={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleCancelSubscription}
          planName={currentPlan?.name || 'Premium'}
          nextBillingDate={subscription?.current_period_end}
        />
      </View>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFA8D2',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FFA8D2',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#FFA8D2',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  tabContent: {
    padding: 16,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  badgeText: {},
  badgeTitle: {
    fontSize: 12,
    color: '#999',
  },
  badgePlan: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  cycleText: {
    fontSize: 14,
    color: '#999',
  },
  activeCycleText: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#4CAF5020',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFA8D2',
    backgroundColor: '#FFA8D210',
    marginBottom: 16,
    gap: 8,
  },
  compareText: {
    fontSize: 14,
    color: '#FFA8D2',
    fontWeight: '500',
  },
  comparisonContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    color: '#FFA8D2',
    fontWeight: '500',
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  cancelNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF980020',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  cancelNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#FF9800',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#FFA8D2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFA8D2',
  },
  upgradePrompt: {
    backgroundColor: '#FFA8D220',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  upgradeText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#FFA8D2',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

// Wrap with error boundary for production safety
export function SubscriptionScreen() {
  return (
    <ScreenErrorBoundary screenName="Subscription">
      <SubscriptionScreenInner />
    </ScreenErrorBoundary>
  );
}
