#!/usr/bin/env node
/**
 * Food Analysis Testing Framework
 *
 * Tests the AI food analysis service against a dataset of known foods
 * and provides accuracy metrics
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
const OPENROUTER_KEY = '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';
const DATASET_FILE = path.join(__dirname, 'food-dataset.json');
const OUTPUT_DIR = path.join(__dirname, 'test-food-images');
const RESULTS_FILE = path.join(__dirname, 'test-results.json');

if (!fs.existsSync(DATASET_FILE)) {
  console.error('❌ Dataset not found. Run: node download-food-dataset.js');
  process.exit(1);
}

// Import OpenAI configured for OpenRouter
const OpenAI = require('openai');
const openai = new OpenAI({
  apiKey: OPENROUTER_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://mindfork.app',
    'X-Title': 'MindFork Food Analysis Testing',
  },
});

/**
 * Convert image file to base64
 */
function imageToBase64(filepath) {
  const buffer = fs.readFileSync(filepath);
  return buffer.toString('base64');
}

/**
 * Analyze food image with OpenAI Vision (Multi-Stage)
 */
async function analyzeFoodImage(imagePath) {
  try {
    const base64Image = imageToBase64(imagePath);

    // STAGE 1: Identify all items
    const itemsResponse = await openai.chat.completions.create({
      model: 'openai/gpt-4o-2024-11-20',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Look at this food image and list ALL distinct DISHES you can see. Use DISH NAMES (as they appear on a menu), NOT ingredient names.

IMPORTANT RULES:
- Use dish names like "hamburger", "garden salad", "chicken breast" - NOT ingredient names like "bun", "lettuce", "meat"
- "Salad" is a dish; "lettuce" is an ingredient
- "Hamburger" is a dish; "bun" and "patty" are ingredients
- "Pasta" is a dish; "noodles" and "sauce" are ingredients
- The primary_item should be the MAIN DISH, not the largest ingredient

Return ONLY valid JSON in this format:
{
  "items": ["dish1", "dish2"],
  "primary_item": "the main dish name"
}

CORRECT Examples:
- Burger with fries: {"items": ["hamburger", "french fries"], "primary_item": "hamburger"}
- Salad with toppings: {"items": ["garden salad"], "primary_item": "garden salad"}
- Plain rice: {"items": ["white rice"], "primary_item": "white rice"}
- Steak with sides: {"items": ["beef steak", "french fries", "vegetables"], "primary_item": "beef steak"}

WRONG Examples (do NOT do this):
- {"items": ["bun", "patty", "lettuce"], "primary_item": "bun"} ✗ Use "hamburger"
- {"items": ["lettuce", "tomato"], "primary_item": "lettuce"} ✗ Use "garden salad"
- {"items": ["noodles", "sauce"], "primary_item": "noodles"} ✗ Use "pasta"`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
    });

    const itemsContent = itemsResponse.choices[0]?.message?.content;
    if (!itemsContent) {
      throw new Error('No response from Stage 1');
    }

    const itemsMatch = itemsContent.match(/\{[\s\S]*\}/);
    if (!itemsMatch) {
      throw new Error('No JSON found in Stage 1 response');
    }

    const itemsResult = JSON.parse(itemsMatch[0]);
    const primaryItem = itemsResult.primary_item || itemsResult.items[0];
    const hasMultipleItems = itemsResult.items.length > 1;

    // STAGE 2: Analyze ONLY the primary item
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-2024-11-20',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `In this image, you identified these items: ${itemsResult.items.join(', ')}.

Now analyze ONLY the "${primaryItem}" and completely IGNORE all other items.

CRITICAL INSTRUCTIONS:
- Estimate calories for ONLY the ${primaryItem}
- Do NOT include any other items in your calorie calculation
- Assume the ${primaryItem} is PLAIN/UNSEASONED unless obviously prepared
- Use TYPICAL RESTAURANT PORTIONS unless the image clearly shows otherwise
- If this is cooked food (like rice, pasta, meat), estimate the COOKED portion size

TYPICAL PORTIONS FOR COMMON FOODS:
- Garden salad: 2 cups mixed greens (~50-80 cal)
- Hamburger: 1 beef patty + bun (~300-400 cal)
- Pizza: 1 large slice (~250-300 cal)
- Chicken breast: 4-6 oz cooked (~165-250 cal)
- Steak: 6-8 oz cooked (~250-350 cal)
- Rice: 1 cup cooked (~200 cal)
- Pasta: 1 cup cooked (~200 cal)
- Eggs: 2 large eggs (~140-160 cal)
- Avocado: 1 whole avocado (~240 cal) or 1/2 avocado (~120 cal)

Return ONLY valid JSON in this exact format:
{
  "name": "${primaryItem}",
  "serving_size": "realistic serving size for just the ${primaryItem} (use typical portions above)",
  "calories": number (ONLY for the ${primaryItem}, use typical portions guide),
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "confidence_score": number (0.0 to 1.0)
}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    return JSON.parse(jsonMatch[0]);

  } catch (error) {
    console.error(`Error analyzing image: ${error.message}`);
    return null;
  }
}

/**
 * Calculate accuracy metrics
 */
function calculateAccuracy(actual, expected) {
  const metrics = {
    nameMatch: false,
    calorieError: 0,
    proteinError: 0,
    carbsError: 0,
    fatError: 0,
    calorieAccuracy: 0,
    proteinAccuracy: 0,
    carbsAccuracy: 0,
    fatAccuracy: 0,
  };

  // Name matching (fuzzy - contains or vice versa)
  const actualName = actual.name.toLowerCase();
  const expectedName = expected.name.toLowerCase();
  metrics.nameMatch = actualName.includes(expectedName) || expectedName.includes(actualName);

  // Calorie accuracy (within ±20% is good)
  metrics.calorieError = Math.abs(actual.calories - expected.calories);
  metrics.calorieAccuracy = 1 - Math.min(metrics.calorieError / expected.calories, 1);

  // Protein accuracy
  if (expected.protein > 0) {
    metrics.proteinError = Math.abs(actual.protein_g - expected.protein);
    metrics.proteinAccuracy = 1 - Math.min(metrics.proteinError / expected.protein, 1);
  }

  // Carbs accuracy
  if (expected.carbs > 0) {
    metrics.carbsError = Math.abs(actual.carbs_g - expected.carbs);
    metrics.carbsAccuracy = 1 - Math.min(metrics.carbsError / expected.carbs, 1);
  }

  // Fat accuracy
  if (expected.fat > 0) {
    metrics.fatError = Math.abs(actual.fat_g - expected.fat);
    metrics.fatAccuracy = 1 - Math.min(metrics.fatError / expected.fat, 1);
  }

  return metrics;
}

/**
 * Run tests on entire dataset
 */
async function runTests() {
  console.log('🧪 Testing Food Analysis Service\n');

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const results = [];

  for (const item of dataset) {
    if (!item.downloaded) {
      console.log(`⏭️  Skipping ${item.name} (not downloaded)\n`);
      continue;
    }

    console.log(`📸 Testing: ${item.name}`);
    console.log(`   Expected: ${item.expected.name} - ${item.expected.calories} cal`);

    const startTime = Date.now();
    const analysis = await analyzeFoodImage(item.filepath);
    const duration = Date.now() - startTime;

    if (!analysis) {
      console.log(`   ❌ Analysis failed\n`);
      results.push({
        ...item,
        actual: null,
        success: false,
        duration,
      });
      continue;
    }

    const metrics = calculateAccuracy(analysis, item.expected);

    console.log(`   Actual: ${analysis.name} - ${analysis.calories} cal`);
    console.log(`   Name Match: ${metrics.nameMatch ? '✓' : '✗'}`);
    console.log(`   Calorie Accuracy: ${(metrics.calorieAccuracy * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${(analysis.confidence_score * 100).toFixed(0)}%`);
    console.log(`   Duration: ${duration}ms\n`);

    results.push({
      ...item,
      actual: analysis,
      metrics,
      success: true,
      duration,
    });

    // Delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Calculate overall statistics
  const successful = results.filter(r => r.success);
  const stats = {
    totalTests: results.length,
    successful: successful.length,
    failed: results.length - successful.length,
    avgNameMatch: successful.filter(r => r.metrics.nameMatch).length / successful.length,
    avgCalorieAccuracy: successful.reduce((sum, r) => sum + r.metrics.calorieAccuracy, 0) / successful.length,
    avgProteinAccuracy: successful.reduce((sum, r) => sum + r.metrics.proteinAccuracy, 0) / successful.length,
    avgCarbsAccuracy: successful.reduce((sum, r) => sum + r.metrics.carbsAccuracy, 0) / successful.length,
    avgFatAccuracy: successful.reduce((sum, r) => sum + r.metrics.fatAccuracy, 0) / successful.length,
    avgConfidence: successful.reduce((sum, r) => sum + r.actual.confidence_score, 0) / successful.length,
    avgDuration: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
  };

  // Save results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ results, stats }, null, 2));

  // Print summary
  console.log('═══════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════\n');

  console.log(`Total Tests:     ${stats.totalTests}`);
  console.log(`Successful:      ${stats.successful} ✓`);
  console.log(`Failed:          ${stats.failed} ✗\n`);

  console.log('ACCURACY METRICS:');
  console.log(`Name Match:      ${(stats.avgNameMatch * 100).toFixed(1)}%`);
  console.log(`Calorie Acc:     ${(stats.avgCalorieAccuracy * 100).toFixed(1)}%`);
  console.log(`Protein Acc:     ${(stats.avgProteinAccuracy * 100).toFixed(1)}%`);
  console.log(`Carbs Acc:       ${(stats.avgCarbsAccuracy * 100).toFixed(1)}%`);
  console.log(`Fat Acc:         ${(stats.avgFatAccuracy * 100).toFixed(1)}%\n`);

  console.log('PERFORMANCE:');
  console.log(`Avg Confidence:  ${(stats.avgConfidence * 100).toFixed(0)}%`);
  console.log(`Avg Duration:    ${stats.avgDuration.toFixed(0)}ms\n`);

  console.log(`Results saved to: ${RESULTS_FILE}\n`);

  // Identify problem cases
  const poorResults = successful.filter(r => r.metrics.calorieAccuracy < 0.7);
  if (poorResults.length > 0) {
    console.log('⚠️  POOR ACCURACY CASES:\n');
    poorResults.forEach(r => {
      console.log(`   ${r.name}:`);
      console.log(`      Expected: ${r.expected.calories} cal`);
      console.log(`      Got: ${r.actual.calories} cal`);
      console.log(`      Error: ${r.metrics.calorieError} cal (${(r.metrics.calorieAccuracy * 100).toFixed(1)}%)\n`);
    });
  }

  // Success criteria
  console.log('✅ SUCCESS CRITERIA:');
  console.log(`   Name Match Rate:      ${stats.avgNameMatch >= 0.8 ? '✓' : '✗'} ${stats.avgNameMatch >= 0.8 ? 'PASS' : 'FAIL'} (target: 80%)`);
  console.log(`   Calorie Accuracy:     ${stats.avgCalorieAccuracy >= 0.7 ? '✓' : '✗'} ${stats.avgCalorieAccuracy >= 0.7 ? 'PASS' : 'FAIL'} (target: 70%)`);
  console.log(`   Avg Confidence:       ${stats.avgConfidence >= 0.75 ? '✓' : '✗'} ${stats.avgConfidence >= 0.75 ? 'PASS' : 'FAIL'} (target: 75%)\n`);
}

// Run tests
runTests().catch(console.error);
