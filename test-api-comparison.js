#!/usr/bin/env node
/**
 * Multi-API Food Analysis Comparison Framework
 *
 * Tests multiple specialized food APIs against OpenRouter/GPT-4V
 * to identify best performer for production use
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const DATASET_FILE = path.join(__dirname, 'food-dataset.json');
const RESULTS_FILE = path.join(__dirname, 'api-comparison-results.json');

// API Configuration
const APIs = {
  openrouter: {
    name: 'OpenRouter (GPT-4V)',
    baseURL: 'https://openrouter.ai/api/v1',
    key: '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',
    costPerImage: 0.01,
    enabled: true,
  },
  logmeal: {
    name: 'LogMeal API',
    baseURL: 'https://api.logmeal.es',
    key: process.env.LOGMEAL_API_KEY || 'TRIAL_KEY_PLACEHOLDER',
    costPerImage: 0.02,
    enabled: !!process.env.LOGMEAL_API_KEY,
    trialLimit: 200,
  },
  edamam: {
    name: 'Edamam Vision API',
    baseURL: 'https://api.edamam.com',
    appId: process.env.EDAMAM_APP_ID || '',
    appKey: process.env.EDAMAM_APP_KEY || '',
    costPerImage: 0.028, // $14/500 = $0.028
    enabled: !!(process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY),
  },
  caloriemama: {
    name: 'Calorie Mama AI',
    baseURL: 'https://api.caloriemama.ai/api/v2',
    key: process.env.CALORIE_MAMA_KEY || '',
    costPerImage: 0.03, // Estimated
    enabled: !!process.env.CALORIE_MAMA_KEY,
  },
};

console.log('🔍 Multi-API Food Analysis Comparison Framework\\n');
console.log('APIs Configured:');
Object.entries(APIs).forEach(([id, api]) => {
  console.log(`  ${api.enabled ? '✅' : '⏸️ '} ${api.name} ${api.enabled ? '' : '(disabled - no key)'}`);
});
console.log('');

if (!fs.existsSync(DATASET_FILE)) {
  console.error('❌ Dataset not found. Run: node download-food-dataset.js');
  process.exit(1);
}

/**
 * Call OpenRouter API
 */
async function analyzeWithOpenRouter(imagePath) {
  const OpenAI = require('openai');
  const openai = new OpenAI({
    apiKey: APIs.openrouter.key,
    baseURL: APIs.openrouter.baseURL,
    defaultHeaders: {
      'HTTP-Referer': 'https://mindfork.app',
      'X-Title': 'MindFork API Testing',
    },
  });

  const base64Image = fs.readFileSync(imagePath, { encoding: 'base64' });

  try {
    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o-2024-11-20',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this food image. Return ONLY valid JSON:
{
  "name": "food name",
  "serving_size": "size",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "confidence_score": number
}`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    const jsonMatch = content.match(/\\{[\\s\\S]*\\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      success: true,
      name: parsed.name,
      calories: parsed.calories,
      protein_g: parsed.protein_g,
      carbs_g: parsed.carbs_g,
      fat_g: parsed.fat_g,
      confidence: parsed.confidence_score || 0.9,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Call LogMeal API (placeholder - requires actual implementation)
 */
async function analyzeWithLogMeal(imagePath) {
  // TODO: Implement actual LogMeal API call
  // This is a placeholder for trial testing
  console.log('  [LogMeal] API not yet implemented - sign up at logmeal.com/api');
  return {
    success: false,
    error: 'Not implemented - requires LogMeal API key',
    note: 'Sign up at logmeal.com/api for 200 free queries',
  };
}

/**
 * Call Edamam Vision API (placeholder)
 */
async function analyzeWithEdamam(imagePath) {
  // TODO: Implement actual Edamam API call
  console.log('  [Edamam] API not yet implemented - sign up at developer.edamam.com');
  return {
    success: false,
    error: 'Not implemented - requires Edamam credentials',
    note: 'Sign up at developer.edamam.com - $14/mo for 500 calls',
  };
}

/**
 * Call Calorie Mama API (placeholder)
 */
async function analyzeWithCalorieMama(imagePath) {
  // TODO: Implement actual Calorie Mama API call
  console.log('  [Calorie Mama] API not yet implemented - contact caloriemama.ai');
  return {
    success: false,
    error: 'Not implemented - requires Calorie Mama API key',
    note: 'Contact caloriemama.ai for API access',
  };
}

/**
 * Calculate accuracy metrics
 */
function calculateAccuracy(actual, expected) {
  if (!actual) return { calorieAccuracy: 0, nameMatch: false };

  const nameMatch =
    actual.name?.toLowerCase().includes(expected.name?.toLowerCase()) ||
    expected.name?.toLowerCase().includes(actual.name?.toLowerCase());

  const calorieError = Math.abs((actual.calories || 0) - expected.calories);
  const calorieAccuracy = 1 - Math.min(calorieError / expected.calories, 1);

  return {
    nameMatch,
    calorieError,
    calorieAccuracy,
  };
}

/**
 * Run comparison tests
 */
async function runComparison() {
  console.log('🧪 Starting API Comparison Tests\\n');

  const dataset = JSON.parse(fs.readFileSync(DATASET_FILE, 'utf8'));
  const results = {
    apis: {},
    summary: {},
    timestamp: new Date().toISOString(),
  };

  // Initialize API results
  Object.keys(APIs).forEach((apiId) => {
    if (APIs[apiId].enabled) {
      results.apis[apiId] = {
        name: APIs[apiId].name,
        results: [],
        stats: {},
      };
    }
  });

  // Test each food item
  for (const item of dataset.filter((d) => d.downloaded)) {
    console.log(`\\n📸 Testing: ${item.name}`);
    console.log(`   Expected: ${item.expected.name} - ${item.expected.calories} cal`);

    // Test with each API
    for (const [apiId, api] of Object.entries(APIs)) {
      if (!api.enabled) continue;

      console.log(`\\n  🔄 ${api.name}...`);
      const startTime = Date.now();

      let analysis;
      switch (apiId) {
        case 'openrouter':
          analysis = await analyzeWithOpenRouter(item.filepath);
          break;
        case 'logmeal':
          analysis = await analyzeWithLogMeal(item.filepath);
          break;
        case 'edamam':
          analysis = await analyzeWithEdamam(item.filepath);
          break;
        case 'caloriemama':
          analysis = await analyzeWithCalorieMama(item.filepath);
          break;
      }

      const duration = Date.now() - startTime;

      if (analysis.success) {
        const metrics = calculateAccuracy(analysis, item.expected);

        console.log(`     Detected: ${analysis.name} - ${analysis.calories} cal`);
        console.log(`     Name Match: ${metrics.nameMatch ? '✓' : '✗'}`);
        console.log(`     Calorie Accuracy: ${(metrics.calorieAccuracy * 100).toFixed(1)}%`);
        console.log(`     Duration: ${duration}ms`);

        results.apis[apiId].results.push({
          food: item.name,
          expected: item.expected,
          actual: analysis,
          metrics,
          duration,
          success: true,
        });
      } else {
        console.log(`     ❌ Failed: ${analysis.error}`);
        if (analysis.note) console.log(`     ℹ️  ${analysis.note}`);

        results.apis[apiId].results.push({
          food: item.name,
          expected: item.expected,
          error: analysis.error,
          note: analysis.note,
          duration,
          success: false,
        });
      }

      // Delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Calculate statistics for each API
  for (const [apiId, apiData] of Object.entries(results.apis)) {
    const successful = apiData.results.filter((r) => r.success);

    if (successful.length > 0) {
      apiData.stats = {
        totalTests: apiData.results.length,
        successful: successful.length,
        failed: apiData.results.length - successful.length,
        avgNameMatch: successful.filter((r) => r.metrics.nameMatch).length / successful.length,
        avgCalorieAccuracy:
          successful.reduce((sum, r) => sum + r.metrics.calorieAccuracy, 0) / successful.length,
        avgDuration: successful.reduce((sum, r) => sum + r.duration, 0) / successful.length,
        avgConfidence:
          successful.reduce((sum, r) => sum + (r.actual.confidence || 0.9), 0) / successful.length,
        estimatedCost: apiData.results.length * APIs[apiId].costPerImage,
      };
    } else {
      apiData.stats = {
        totalTests: apiData.results.length,
        successful: 0,
        failed: apiData.results.length,
        note: 'No successful analyses - API not implemented or credentials missing',
      };
    }
  }

  // Save results
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  // Print comparison summary
  console.log('\\n\\n═══════════════════════════════════════════');
  console.log('📊 API COMPARISON SUMMARY');
  console.log('═══════════════════════════════════════════\\n');

  for (const [apiId, apiData] of Object.entries(results.apis)) {
    console.log(`${apiData.name}:`);

    if (apiData.stats.successful > 0) {
      console.log(`  Tests: ${apiData.stats.successful}/${apiData.stats.totalTests} successful`);
      console.log(`  Name Match: ${(apiData.stats.avgNameMatch * 100).toFixed(1)}%`);
      console.log(`  Calorie Accuracy: ${(apiData.stats.avgCalorieAccuracy * 100).toFixed(1)}%`);
      console.log(`  Avg Duration: ${apiData.stats.avgDuration.toFixed(0)}ms`);
      console.log(`  Avg Confidence: ${(apiData.stats.avgConfidence * 100).toFixed(0)}%`);
      console.log(`  Est. Cost: $${apiData.stats.estimatedCost.toFixed(2)}\\n`);
    } else {
      console.log(`  ${apiData.stats.note}\\n`);
    }
  }

  console.log(`Results saved to: ${RESULTS_FILE}\\n`);

  // Recommendation
  const enabledApis = Object.entries(results.apis).filter(
    ([_, data]) => data.stats.successful > 0
  );

  if (enabledApis.length > 1) {
    const sorted = enabledApis.sort(
      (a, b) => b[1].stats.avgCalorieAccuracy - a[1].stats.avgCalorieAccuracy
    );
    console.log('🏆 RECOMMENDATION:');
    console.log(`   Best Accuracy: ${sorted[0][1].name}`);
    console.log(`   - Calorie Accuracy: ${(sorted[0][1].stats.avgCalorieAccuracy * 100).toFixed(1)}%`);
    console.log(`   - Cost per image: $${APIs[sorted[0][0]].costPerImage.toFixed(3)}\\n`);
  } else if (enabledApis.length === 1) {
    console.log('ℹ️  Only one API tested. Add API keys to compare more providers.\\n');
  } else {
    console.log('⚠️  No APIs successfully tested. Check API keys and implementations.\\n');
  }
}

// Run comparison
runComparison().catch(console.error);
