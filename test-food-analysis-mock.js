#!/usr/bin/env node
/* global __dirname */
/**
 * Mock Food Analysis Testing - Simulates AI responses for testing
 */

const fs = require('fs');
const path = require('path');

const DATASET_FILE = path.join(__dirname, 'food-dataset.json');
const RESULTS_FILE = path.join(__dirname, 'mock-test-results.json');

if (!fs.existsSync(DATASET_FILE)) {
  console.error('❌ Dataset not found');
  process.exit(1);
}

function mockAnalyzeFoodImage(item) {
  const { expected } = item;
  const calorieVariance = 0.85 + Math.random() * 0.3;
  const macroVariance = 0.9 + Math.random() * 0.2;
  const nameCorrect = Math.random() > 0.1;

  return {
    name: nameCorrect ? expected.name : `Similar to ${expected.name}`,
    serving_size: expected.serving,
    calories: Math.round(expected.calories * calorieVariance),
    protein_g: Math.round((expected.protein || 0) * macroVariance * 10) / 10,
    carbs_g: Math.round((expected.carbs || 0) * macroVariance * 10) / 10,
    fat_g: Math.round((expected.fat || 0) * macroVariance * 10) / 10,
    fiber_g: 2 + Math.random() * 3,
    confidence_score: 0.75 + Math.random() * 0.2,
  };
}

function calculateAccuracy(actual, expected) {
  const metrics = {
    nameMatch: false,
    calorieError: 0,
    calorieAccuracy: 0,
    proteinAccuracy: 0,
    carbsAccuracy: 0,
    fatAccuracy: 0,
  };

  const actualName = actual.name.toLowerCase();
  const expectedName = expected.name.toLowerCase();
  metrics.nameMatch = actualName.includes(expectedName) || expectedName.includes(actualName);

  metrics.calorieError = Math.abs(actual.calories - expected.calories);
  metrics.calorieAccuracy = 1 - Math.min(metrics.calorieError / expected.calories, 1);

  if (expected.protein > 0) {
    metrics.proteinAccuracy = 1 - Math.min(Math.abs(actual.protein_g - expected.protein) / expected.protein, 1);
  }
  if (expected.carbs > 0) {
    metrics.carbsAccuracy = 1 - Math.min(Math.abs(actual.carbs_g - expected.carbs) / expected.carbs, 1);
  }
  if (expected.fat > 0) {
    metrics.fatAccuracy = 1 - Math.min(Math.abs(actual.fat_g - expected.fat) / expected.fat, 1);
  }

  return metrics;
}

async function runMockTests() {
  console.log('🧪 Running MOCK Food Analysis Tests\\n');
  console.log('⚠️  Using simulated AI responses\\n');

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const results = [];

  for (const item of dataset) {
    if (!item.downloaded) continue;

    console.log(`📸 Testing: ${item.name}`);
    console.log(`   Expected: ${item.expected.name} - ${item.expected.calories} cal`);

    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const analysis = mockAnalyzeFoodImage(item);
    const duration = Date.now() - startTime;
    const metrics = calculateAccuracy(analysis, item.expected);

    console.log(`   Actual: ${analysis.name} - ${analysis.calories} cal`);
    console.log(`   Name Match: ${metrics.nameMatch ? '✓' : '✗'}`);
    console.log(`   Calorie Accuracy: ${(metrics.calorieAccuracy * 100).toFixed(1)}%`);
    console.log(`   Confidence: ${(analysis.confidence_score * 100).toFixed(0)}%\\n`);

    results.push({ ...item, actual: analysis, metrics, success: true, duration, mock: true });
  }

  const successful = results.filter(r => r.success);
  const stats = {
    totalTests: results.length,
    successful: successful.length,
    avgNameMatch: successful.filter(r => r.metrics.nameMatch).length / successful.length,
    avgCalorieAccuracy: successful.reduce((sum, r) => sum + r.metrics.calorieAccuracy, 0) / successful.length,
    avgProteinAccuracy: successful.reduce((sum, r) => sum + r.metrics.proteinAccuracy, 0) / successful.length,
    avgCarbsAccuracy: successful.reduce((sum, r) => sum + r.metrics.carbsAccuracy, 0) / successful.length,
    avgFatAccuracy: successful.reduce((sum, r) => sum + r.metrics.fatAccuracy, 0) / successful.length,
    avgConfidence: successful.reduce((sum, r) => sum + r.actual.confidence_score, 0) / successful.length,
    avgDuration: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
  };

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ results, stats, mock: true }, null, 2));

  console.log('═══════════════════════════════════════════');
  console.log('📊 MOCK TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════\\n');
  console.log(`Total Tests:     ${stats.totalTests}`);
  console.log(`Successful:      ${stats.successful} ✓\\n`);
  console.log('ACCURACY METRICS:');
  console.log(`Name Match:      ${(stats.avgNameMatch * 100).toFixed(1)}%`);
  console.log(`Calorie Acc:     ${(stats.avgCalorieAccuracy * 100).toFixed(1)}%`);
  console.log(`Protein Acc:     ${(stats.avgProteinAccuracy * 100).toFixed(1)}%`);
  console.log(`Carbs Acc:       ${(stats.avgCarbsAccuracy * 100).toFixed(1)}%`);
  console.log(`Fat Acc:         ${(stats.avgFatAccuracy * 100).toFixed(1)}%\\n`);
  console.log('PERFORMANCE:');
  console.log(`Avg Confidence:  ${(stats.avgConfidence * 100).toFixed(0)}%`);
  console.log(`Avg Duration:    ${stats.avgDuration.toFixed(0)}ms\\n`);
  console.log(`Results saved to: ${RESULTS_FILE}\\n`);
  console.log('✅ SUCCESS CRITERIA:');
  console.log(`   Name Match Rate:      ${stats.avgNameMatch >= 0.8 ? '✓ PASS' : '✗ FAIL'} (target: 80%)`);
  console.log(`   Calorie Accuracy:     ${stats.avgCalorieAccuracy >= 0.7 ? '✓ PASS' : '✗ FAIL'} (target: 70%)`);
  console.log(`   Avg Confidence:       ${stats.avgConfidence >= 0.75 ? '✓ PASS' : '✗ FAIL'} (target: 75%)\\n`);
  console.log('⚠️  Note: These are MOCK results for demonstration');
  console.log('📱 Test with real photos in the app for actual accuracy\\n');
}

runMockTests().catch(console.error);
