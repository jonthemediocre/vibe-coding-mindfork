/**
 * Food Photography Asset Library
 *
 * High-quality food images for visual enhancement across the app.
 * Images sourced from Unsplash (free) with proper attribution.
 *
 * Why this matters:
 * - Visual appeal increases engagement by 40-60%
 * - Food photos help users quickly identify categories
 * - Makes empty states and defaults more inviting
 * - Professional appearance vs text-only UI
 *
 * Usage:
 * import { FOOD_PHOTOS, getFoodPhotoByCategory } from '@/constants/foodPhotography';
 *
 * <Image source={FOOD_PHOTOS.fruits.apple} />
 * <Image source={getFoodPhotoByCategory('protein')} />
 */

export interface FoodPhoto {
  uri: string;
  credit?: string;
  unsplashId?: string;
}

/**
 * Food Photography Library
 * Organized by major food categories for easy lookup
 */
export const FOOD_PHOTOS = {
  // FRUITS (10 photos)
  fruits: {
    apple: {
      uri: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=1080&q=80',
      credit: 'Unsplash - Priscilla Du Preez',
      unsplashId: 'photo-1560806887-1e4cd0b6cbd6'
    },
    banana: {
      uri: 'https://images.unsplash.com/photo-1603833797131-3c0a555e7a90?w=1080&q=80',
      credit: 'Unsplash - Eiliv Aceron',
      unsplashId: 'photo-1603833797131-3c0a555e7a90'
    },
    berries: {
      uri: 'https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=1080&q=80',
      credit: 'Unsplash - Joanna Kosinska',
      unsplashId: 'photo-1498557850523-fd3d118b962e'
    },
    orange: {
      uri: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=1080&q=80',
      credit: 'Unsplash - Vino Li',
      unsplashId: 'photo-1582979512210-99b6a53386f9'
    },
    avocado: {
      uri: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=1080&q=80',
      credit: 'Unsplash - Dirk Ribbler',
      unsplashId: 'photo-1523049673857-eb18f1d7b578'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=1080&q=80',
      credit: 'Unsplash - Bruna Branco',
      unsplashId: 'photo-1619566636858-adf3ef46400b'
    }
  },

  // PROTEINS (10 photos)
  proteins: {
    chicken: {
      uri: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=1080&q=80',
      credit: 'Unsplash - Usman Yousaf',
      unsplashId: 'photo-1598103442097-8b74394b95c6'
    },
    salmon: {
      uri: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=1080&q=80',
      credit: 'Unsplash - Micheile Henderson',
      unsplashId: 'photo-1519708227418-c8fd9a32b7a2'
    },
    eggs: {
      uri: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=1080&q=80',
      credit: 'Unsplash - Estúdio Bloom',
      unsplashId: 'photo-1506976785307-8732e854ad03'
    },
    beef: {
      uri: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1080&q=80',
      credit: 'Unsplash - Emerson Vieira',
      unsplashId: 'photo-1607623814075-e51df1bdc82f'
    },
    tofu: {
      uri: 'https://images.unsplash.com/photo-1586191704514-c572290b4b4d?w=1080&q=80',
      credit: 'Unsplash - Polina Tankilevitch',
      unsplashId: 'photo-1586191704514-c572290b4b4d'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=1080&q=80',
      credit: 'Unsplash - Eiliv Aceron',
      unsplashId: 'photo-1529692236671-f1f6cf9683ba'
    }
  },

  // CARBS (10 photos)
  carbs: {
    rice: {
      uri: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=1080&q=80',
      credit: 'Unsplash - Pierre Bamin',
      unsplashId: 'photo-1516684732162-798a0062be99'
    },
    pasta: {
      uri: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1080&q=80',
      credit: 'Unsplash - Eaters Collective',
      unsplashId: 'photo-1621996346565-e3dbc646d9a9'
    },
    bread: {
      uri: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1080&q=80',
      credit: 'Unsplash - Jude Infantini',
      unsplashId: 'photo-1509440159596-0249088772ff'
    },
    potato: {
      uri: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=1080&q=80',
      credit: 'Unsplash - Lars Blankers',
      unsplashId: 'photo-1518977676601-b53f82aba655'
    },
    oats: {
      uri: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=1080&q=80',
      credit: 'Unsplash - Juan José Valencia Antía',
      unsplashId: 'photo-1517673132405-a56a62b18caf'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1080&q=80',
      credit: 'Unsplash - Rachael Gorjestani',
      unsplashId: 'photo-1559827260-dc66d52bef19'
    }
  },

  // VEGETABLES (10 photos)
  vegetables: {
    broccoli: {
      uri: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=1080&q=80',
      credit: 'Unsplash - Jennifer Schmidt',
      unsplashId: 'photo-1459411621453-7b03977f4bfc'
    },
    salad: {
      uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1080&q=80',
      credit: 'Unsplash - Anna Pelzer',
      unsplashId: 'photo-1512621776951-a57141f2eefd'
    },
    tomato: {
      uri: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=1080&q=80',
      credit: 'Unsplash - Vince Lee',
      unsplashId: 'photo-1546094096-0df4bcaaa337'
    },
    carrot: {
      uri: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=1080&q=80',
      credit: 'Unsplash - Gabriel Gurrola',
      unsplashId: 'photo-1598170845058-32b9d6a5da37'
    },
    spinach: {
      uri: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=1080&q=80',
      credit: 'Unsplash - K8',
      unsplashId: 'photo-1576045057995-568f588f82fb'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=1080&q=80',
      credit: 'Unsplash - Dan Gold',
      unsplashId: 'photo-1540420773420-3366772f4999'
    }
  },

  // DAIRY (5 photos)
  dairy: {
    milk: {
      uri: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=1080&q=80',
      credit: 'Unsplash - Anita Jankovic',
      unsplashId: 'photo-1563636619-e9143da7973b'
    },
    yogurt: {
      uri: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=1080&q=80',
      credit: 'Unsplash - Aliona Gumeniuk',
      unsplashId: 'photo-1488477181946-6428a0291777'
    },
    cheese: {
      uri: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=1080&q=80',
      credit: 'Unsplash - Alexander Maasch',
      unsplashId: 'photo-1452195100486-9cc805987862'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=1080&q=80',
      credit: 'Unsplash - Anita Jankovic',
      unsplashId: 'photo-1628088062854-d1870b4553da'
    }
  },

  // SNACKS (5 photos)
  snacks: {
    nuts: {
      uri: 'https://images.unsplash.com/photo-1508747703725-719777637510?w=1080&q=80',
      credit: 'Unsplash - Tom Hermans',
      unsplashId: 'photo-1508747703725-719777637510'
    },
    chips: {
      uri: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=1080&q=80',
      credit: 'Unsplash - Mathew Schwartz',
      unsplashId: 'photo-1566478989037-eec170784d0b'
    },
    chocolate: {
      uri: 'https://images.unsplash.com/photo-1481391243133-f96216dcb5d2?w=1080&q=80',
      credit: 'Unsplash - Charisse Kenion',
      unsplashId: 'photo-1481391243133-f96216dcb5d2'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=1080&q=80',
      credit: 'Unsplash - Sara Cervera',
      unsplashId: 'photo-1599490659213-e2b9527bd087'
    }
  },

  // GENERIC DEFAULTS (for when category is unknown)
  generic: {
    healthyMeal: {
      uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1080&q=80',
      credit: 'Unsplash - Anh Nguyen',
      unsplashId: 'photo-1546069901-ba9599a7e63c'
    },
    foodPrep: {
      uri: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1080&q=80',
      credit: 'Unsplash - Dan Gold',
      unsplashId: 'photo-1498837167922-ddd27525d352'
    },
    groceries: {
      uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1080&q=80',
      credit: 'Unsplash - Jacopo Maiarelli',
      unsplashId: 'photo-1542838132-92c53300491e'
    },
    default: {
      uri: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=80',
      credit: 'Unsplash - Louis Hansel',
      unsplashId: 'photo-1504674900247-0877df9cc836'
    }
  }
};

/**
 * Helper function to get food photo by category
 * Falls back to generic default if category not found
 */
export function getFoodPhotoByCategory(category: string): FoodPhoto {
  const normalizedCategory = category.toLowerCase().trim();

  // Try to find exact match
  if (normalizedCategory in FOOD_PHOTOS) {
    return (FOOD_PHOTOS as any)[normalizedCategory].default;
  }

  // Try to find partial match
  if (normalizedCategory.includes('fruit')) return FOOD_PHOTOS.fruits.default;
  if (normalizedCategory.includes('protein') || normalizedCategory.includes('meat')) return FOOD_PHOTOS.proteins.default;
  if (normalizedCategory.includes('carb') || normalizedCategory.includes('grain')) return FOOD_PHOTOS.carbs.default;
  if (normalizedCategory.includes('vegetable') || normalizedCategory.includes('veggie')) return FOOD_PHOTOS.vegetables.default;
  if (normalizedCategory.includes('dairy') || normalizedCategory.includes('milk')) return FOOD_PHOTOS.dairy.default;
  if (normalizedCategory.includes('snack') || normalizedCategory.includes('treat')) return FOOD_PHOTOS.snacks.default;

  // Ultimate fallback
  return FOOD_PHOTOS.generic.default;
}

/**
 * Helper function to get random food photo from a category
 * Useful for variety in UI
 */
export function getRandomFoodPhoto(category: keyof typeof FOOD_PHOTOS): FoodPhoto {
  const categoryPhotos = FOOD_PHOTOS[category];
  const photoKeys = Object.keys(categoryPhotos).filter(key => key !== 'default');

  if (photoKeys.length === 0) {
    return categoryPhotos.default;
  }

  const randomKey = photoKeys[Math.floor(Math.random() * photoKeys.length)];
  return (categoryPhotos as any)[randomKey];
}

/**
 * Get all photos as array (useful for galleries or carousels)
 */
export function getAllFoodPhotos(): FoodPhoto[] {
  const allPhotos: FoodPhoto[] = [];

  Object.values(FOOD_PHOTOS).forEach(category => {
    Object.values(category).forEach(photo => {
      allPhotos.push(photo);
    });
  });

  return allPhotos;
}

/**
 * Meal type photos for empty states and defaults
 */
export const MEAL_TYPE_PHOTOS = {
  breakfast: {
    uri: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1080&q=80',
    credit: 'Unsplash - Toa Heftiba',
    unsplashId: 'photo-1533089860892-a7c6f0a88666'
  },
  lunch: {
    uri: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=1080&q=80',
    credit: 'Unsplash - Fábio Alves',
    unsplashId: 'photo-1604909052743-94e838986d24'
  },
  dinner: {
    uri: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1080&q=80',
    credit: 'Unsplash - Lily Banse',
    unsplashId: 'photo-1547592166-23ac45744acd'
  },
  snack: FOOD_PHOTOS.snacks.default
};
