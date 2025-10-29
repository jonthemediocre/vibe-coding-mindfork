/**
 * Food Tracking Integration Test
 * Tests the complete food logging flow from UI to database
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { FoodScreen } from '../../screens/food/FoodScreen';
import { supabase } from '../../lib/supabase';
import { foodEntryFactory } from '../factories';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
  useRoute: () => ({ params: {} }),
}));

describe('Food Tracking Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log food and update daily stats', async () => {
    // Arrange: Mock user authenticated
    const mockFoodEntries = [foodEntryFactory()];
    
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: mockFoodEntries, error: null }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

    // Act: Render food screen
    const { getByText, getByTestId, queryByText } = render(
      <NavigationContainer>
        <FoodScreen />
      </NavigationContainer>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(queryByText(/loading/i)).toBeNull();
    });

    // Assert: Food entries are displayed
    await waitFor(() => {
      expect(getByText('Chicken Breast')).toBeTruthy();
      expect(getByText(/165/)).toBeTruthy(); // Calories
    });

    // Verify database queries
    expect(supabase.from).toHaveBeenCalledWith('food_entries');
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', expect.any(String));
  });

  it('should add new food entry via manual input', async () => {
    // Arrange: Empty food list initially
    const mockInsertBuilder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: foodEntryFactory({ name: 'Apple', calories: 95 }),
        error: null,
      }),
    };

    const mockSelectBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(mockSelectBuilder) // Initial load
      .mockReturnValueOnce(mockInsertBuilder); // Insert new entry

    // Act: Render and add food
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <FoodScreen />
      </NavigationContainer>
    );

    // Click add food button
    const addButton = getByText(/add food/i);
    fireEvent.press(addButton);

    // Fill in food details
    const nameInput = getByTestId('food-name-input');
    const caloriesInput = getByTestId('calories-input');
    
    fireEvent.changeText(nameInput, 'Apple');
    fireEvent.changeText(caloriesInput, '95');

    // Save food entry
    const saveButton = getByText(/save/i);
    fireEvent.press(saveButton);

    // Assert: Food is saved and displayed
    await waitFor(() => {
      expect(mockInsertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Apple',
          calories: 95,
        })
      );
    });
  });

  it('should calculate and display daily nutrition totals', async () => {
    // Arrange: Multiple food entries
    const mockEntries = [
      foodEntryFactory({ calories: 300, protein: 25, carbs: 30, fat: 10 }),
      foodEntryFactory({ calories: 500, protein: 30, carbs: 50, fat: 20 }),
      foodEntryFactory({ calories: 400, protein: 20, carbs: 40, fat: 15 }),
    ];

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: mockEntries, error: null }),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

    // Act: Render food screen
    const { getByText } = render(
      <NavigationContainer>
        <FoodScreen />
      </NavigationContainer>
    );

    // Assert: Daily totals are calculated correctly
    await waitFor(() => {
      expect(getByText(/1200/)).toBeTruthy(); // Total calories
      expect(getByText(/75.*protein/i)).toBeTruthy(); // Total protein (75g)
    });
  });

  it('should handle food entry deletion', async () => {
    // Arrange: Food list with one entry
    const mockEntry = foodEntryFactory({ id: 'food-to-delete' });
    
    const mockSelectBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: [mockEntry], error: null }),
    };

    const mockDeleteBuilder = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: null }),
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce(mockSelectBuilder)
      .mockReturnValueOnce(mockDeleteBuilder);

    // Act: Render and delete food
    const { getByText, getByTestId } = render(
      <NavigationContainer>
        <FoodScreen />
      </NavigationContainer>
    );

    await waitFor(() => {
      expect(getByText('Chicken Breast')).toBeTruthy();
    });

    // Find and press delete button
    const deleteButton = getByTestId(`delete-food-${mockEntry.id}`);
    fireEvent.press(deleteButton);

    // Confirm deletion
    const confirmButton = getByText(/confirm/i);
    fireEvent.press(confirmButton);

    // Assert: Food is deleted
    await waitFor(() => {
      expect(mockDeleteBuilder.delete).toHaveBeenCalled();
      expect(mockDeleteBuilder.eq).toHaveBeenCalledWith('id', 'food-to-delete');
    });
  });

  it('should handle network errors gracefully', async () => {
    // Arrange: Network error
    const mockError = { message: 'Network request failed' };
    
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockRejectedValue(mockError),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

    // Act: Render food screen
    const { getByText } = render(
      <NavigationContainer>
        <FoodScreen />
      </NavigationContainer>
    );

    // Assert: Error message is displayed
    await waitFor(() => {
      expect(getByText(/network.*failed/i)).toBeTruthy();
    });
  });
});
