import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking } from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import type { Invoice } from '../../services/SubscriptionService';

interface InvoiceListProps {
  invoices: Invoice[];
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function InvoiceList({ invoices, onRefresh, refreshing = false }: InvoiceListProps) {
  const handleDownload = async (invoice: Invoice) => {
    if (invoice.pdf_url) {
      try {
        await Linking.openURL(invoice.pdf_url);
      } catch (err) {
        console.error('Failed to open invoice PDF:', err);
      }
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const date = new Date(item.invoice_date);
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const getStatusColor = () => {
      switch (item.status) {
        case 'paid':
          return '#4CAF50';
        case 'open':
          return '#FF9800';
        case 'void':
        case 'uncollectible':
          return '#F44336';
        default:
          return '#999';
      }
    };

    const getStatusIcon = () => {
      switch (item.status) {
        case 'paid':
          return 'check-circle';
        case 'open':
          return 'clock';
        case 'void':
        case 'uncollectible':
          return 'x-circle';
        default:
          return 'help-circle';
      }
    };

    return (
      <View style={styles.invoiceCard}>
        <View style={styles.invoiceContent}>
          {/* Date & Status */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.invoiceDate}>{formattedDate}</Text>
            <View style={styles.statusBadge}>
              <Icon
                name={getStatusIcon()}
                size={12}
                color={getStatusColor()}
                style={styles.statusIcon}
              />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Amount */}
          <Text style={styles.amount}>
            ${item.amount_paid.toFixed(2)}{' '}
            <Text style={styles.currency}>{item.currency.toUpperCase()}</Text>
          </Text>

          {/* Invoice ID */}
          <Text style={styles.invoiceId}>Invoice #{item.stripe_invoice_id.slice(-8)}</Text>
        </View>

        {/* Download Button */}
        {item.pdf_url && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => handleDownload(item)}
          >
            <Icon name="download" size={20} color="#FFA8D2" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (invoices.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="file-text" size={48} color="#E0E0E0" />
        <Text style={styles.emptyText}>No invoices yet</Text>
        <Text style={styles.emptySubtext}>Your billing history will appear here</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={invoices}
      renderItem={renderInvoice}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      onRefresh={onRefresh}
      refreshing={refreshing}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  invoiceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  invoiceContent: {
    flex: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceDate: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  statusIcon: {
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  currency: {
    fontSize: 16,
    color: '#666',
  },
  invoiceId: {
    fontSize: 12,
    color: '#999',
  },
  downloadButton: {
    padding: 8,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});
