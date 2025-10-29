/**
 * MealTemplateModal - Save/load meal templates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Feather as Icon } from '@expo/vector-icons';
import { useTheme } from '../../app-components/components/ThemeProvider';
import { useAuth } from '../../contexts/AuthContext';
import { MealPlanningService, type MealTemplate } from '../../services/MealPlanningService';
import { logger } from '../../utils/logger';
import { showAlert } from '../../utils/alerts';

interface MealTemplateModalProps {
  visible: boolean;
  mode: 'save' | 'load';
  currentMeals?: MealTemplate['meals'];
  onClose: () => void;
  onTemplateLoad?: (template: MealTemplate) => void;
}

export const MealTemplateModal: React.FC<MealTemplateModalProps> = ({
  visible,
  mode,
  currentMeals = [],
  onClose,
  onTemplateLoad,
}) => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { user } = useAuth();

  const [templates, setTemplates] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (visible && mode === 'load' && user?.id) {
      fetchTemplates();
    }
  }, [visible, mode, user?.id]);

  const fetchTemplates = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await MealPlanningService.getMealTemplates(user.id);
      if (error) {
        logger.error('Error fetching templates', new Error(error));
        showAlert.error('Error', 'Failed to load templates');
        return;
      }
      setTemplates(data || []);
    } catch (err) {
      logger.error('Error in fetchTemplates', err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!user?.id) return;
    if (!templateName.trim()) {
      showAlert.error('Error', 'Please enter a template name');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await MealPlanningService.saveMealTemplate(
        user.id,
        templateName,
        currentMeals,
        templateDescription
      );

      if (error) {
        showAlert.error('Error', error);
        return;
      }

      showAlert.success('Success', 'Template saved successfully');
      setTemplateName('');
      setTemplateDescription('');
      onClose();
    } catch (err) {
      logger.error('Error saving template', err as Error);
      showAlert.error('Error', 'Failed to save template');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadTemplate = (template: MealTemplate) => {
    onTemplateLoad?.(template);
    onClose();
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await MealPlanningService.deleteTemplate(user.id, templateId);
      if (error) {
        showAlert.error('Error', error);
        return;
      }
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      showAlert.success('Success', 'Template deleted');
    } catch (err) {
      logger.error('Error deleting template', err as Error);
      showAlert.error('Error', 'Failed to delete template');
    }
  };

  const renderTemplateItem = ({ item }: { item: MealTemplate }) => (
    <View style={[styles.templateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.templateContent}
        onPress={() => handleLoadTemplate(item)}
      >
        <View style={styles.templateInfo}>
          <Text style={[styles.templateName, { color: colors.text }]}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={[styles.templateDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <Text style={[styles.templateMealCount, { color: colors.textSecondary }]}>
            {item.meals.length} meal{item.meals.length > 1 ? 's' : ''}
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteTemplate(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="trash-2" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {mode === 'save' ? 'Save Template' : 'Load Template'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="x" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {mode === 'save' ? (
            // Save Mode
            <View style={styles.content}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Template name"
                placeholderTextColor={colors.textSecondary}
                value={templateName}
                onChangeText={setTemplateName}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }
                ]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textSecondary}
                value={templateDescription}
                onChangeText={setTemplateDescription}
                multiline
                numberOfLines={3}
              />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                This template will include {currentMeals.length} meal{currentMeals.length > 1 ? 's' : ''}
              </Text>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveTemplate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Template</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            // Load Mode
            <View style={styles.content}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                </View>
              ) : templates.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="inbox" size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No templates saved yet
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={templates}
                  renderItem={renderTemplateItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.listContainer}
                  showsVerticalScrollIndicator={false}
                />
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 20,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 20,
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  templateContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  templateMealCount: {
    fontSize: 12,
  },
  deleteButton: {
    marginLeft: 12,
    padding: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
  },
});
