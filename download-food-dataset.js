#!/usr/bin/env node
/**
 * Food Image Dataset Downloader
 *
 * Downloads a curated dataset of food images with known nutritional values
 * for testing and tuning the AI food analysis service
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Public food image dataset URLs (free, no authentication required)
const FOOD_DATASET = [
  {
    name: 'apple',
    url: 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800',
    expected: { name: 'Apple', calories: 95, protein: 0.5, carbs: 25, fat: 0.3, serving: '1 medium (182g)' }
  },
  {
    name: 'banana',
    url: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=800',
    expected: { name: 'Banana', calories: 105, protein: 1.3, carbs: 27, fat: 0.4, serving: '1 medium (118g)' }
  },
  {
    name: 'broccoli',
    url: 'https://images.unsplash.com/photo-1628773822990-202a81777304?w=800',
    expected: { name: 'Broccoli', calories: 55, protein: 3.7, carbs: 11, fat: 0.6, serving: '1 cup (156g)' }
  },
  {
    name: 'chicken_breast',
    url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=800',
    expected: { name: 'Chicken Breast', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving: '100g' }
  },
  {
    name: 'eggs',
    url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800',
    expected: { name: 'Eggs', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving: '2 large eggs' }
  },
  {
    name: 'salmon',
    url: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=800',
    expected: { name: 'Salmon', calories: 206, protein: 22, carbs: 0, fat: 13, serving: '100g' }
  },
  {
    name: 'rice',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800',
    expected: { name: 'White Rice', calories: 205, protein: 4.2, carbs: 45, fat: 0.4, serving: '1 cup cooked (158g)' }
  },
  {
    name: 'avocado',
    url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800',
    expected: { name: 'Avocado', calories: 240, protein: 3, carbs: 13, fat: 22, serving: '1 medium (150g)' }
  },
  {
    name: 'pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    expected: { name: 'Pizza', calories: 285, protein: 12, carbs: 36, fat: 10, serving: '1 slice (107g)' }
  },
  {
    name: 'burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    expected: { name: 'Hamburger', calories: 354, protein: 16, carbs: 30, fat: 19, serving: '1 burger (110g)' }
  },
  {
    name: 'salad',
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
    expected: { name: 'Garden Salad', calories: 50, protein: 3, carbs: 8, fat: 1, serving: '1 cup (100g)' }
  },
  {
    name: 'orange',
    url: 'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=800',
    expected: { name: 'Orange', calories: 62, protein: 1.2, carbs: 15, fat: 0.2, serving: '1 medium (131g)' }
  },
  {
    name: 'steak',
    url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
    expected: { name: 'Beef Steak', calories: 271, protein: 26, carbs: 0, fat: 19, serving: '100g' }
  },
  {
    name: 'pasta',
    url: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
    expected: { name: 'Pasta', calories: 221, protein: 8, carbs: 43, fat: 1.3, serving: '1 cup cooked (140g)' }
  },
  {
    name: 'yogurt',
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800',
    expected: { name: 'Greek Yogurt', calories: 100, protein: 17, carbs: 6, fat: 0.7, serving: '170g container' }
  }
];

const OUTPUT_DIR = path.join(__dirname, 'test-food-images');
const DATASET_FILE = path.join(__dirname, 'food-dataset.json');

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Download image from URL
 */
function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const filepath = path.join(OUTPUT_DIR, filename);

    console.log(`  Downloading ${filename}...`);

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadImage(response.headers.location, filename)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filepath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`  ✓ Downloaded: ${filename}`);
        resolve(filepath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(filepath, () => reject(err));
      });

    }).on('error', reject);
  });
}

/**
 * Main download function
 */
async function downloadDataset() {
  console.log('🍽️  Downloading food image dataset...\n');
  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  const dataset = [];

  for (let i = 0; i < FOOD_DATASET.length; i++) {
    const item = FOOD_DATASET[i];
    const filename = `${i + 1}_${item.name}.jpg`;

    try {
      const filepath = await downloadImage(item.url, filename);

      dataset.push({
        id: i + 1,
        name: item.name,
        filename,
        filepath,
        expected: item.expected,
        downloaded: true
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`  ✗ Failed to download ${item.name}:`, error.message);

      dataset.push({
        id: i + 1,
        name: item.name,
        filename,
        expected: item.expected,
        downloaded: false,
        error: error.message
      });
    }
  }

  // Save dataset metadata
  fs.writeFileSync(DATASET_FILE, JSON.stringify(dataset, null, 2));

  console.log(`\n✅ Dataset download complete!`);
  console.log(`   Downloaded: ${dataset.filter(d => d.downloaded).length}/${dataset.length} images`);
  console.log(`   Metadata saved to: ${DATASET_FILE}`);
  console.log(`\n🧪 Run 'node test-food-analysis.js' to test the AI service\n`);
}

// Run download
downloadDataset().catch(console.error);
