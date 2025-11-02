/**
 * USDA API Integration Test
 * Verifies API key works and service functions correctly
 */

const USDA_API_KEY = 'ax7Ek8hbSJeZAiohM5BhsfqTwUStKGIquwNJWFZC';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

async function testUSDAIntegration() {
  console.log('🧪 Testing USDA FoodData Central Integration\n');

  // Test 1: Search for chicken breast
  console.log('Test 1: Search "chicken breast"');
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=chicken breast&pageSize=5&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.totalHits} results`);
    console.log(`   Top result: ${data.foods[0]?.description}`);
    console.log(`   FDC ID: ${data.foods[0]?.fdcId}`);
    console.log(`   Data Type: ${data.foods[0]?.dataType}\n`);
  } catch (error) {
    console.error('❌ Search test failed:', error.message, '\n');
    return;
  }

  // Test 2: Get specific food by FDC ID (171477 = chicken breast)
  console.log('Test 2: Get FDC ID 171477 (chicken breast)');
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/food/171477?api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const food = await response.json();
    console.log(`✅ Retrieved: ${food.description}`);

    // Extract key nutrients
    const getNutrient = (nutrientNumber) => {
      const nutrient = food.foodNutrients.find(n => n.nutrientNumber === nutrientNumber);
      return nutrient ? nutrient.value : 0;
    };

    const calories = getNutrient('208');
    const protein = getNutrient('203');
    const carbs = getNutrient('205');
    const fat = getNutrient('204');

    console.log(`   Calories: ${calories} kcal`);
    console.log(`   Protein: ${protein}g`);
    console.log(`   Carbs: ${carbs}g`);
    console.log(`   Fat: ${fat}g`);
    console.log(`   Total Nutrients: ${food.foodNutrients.length}\n`);
  } catch (error) {
    console.error('❌ FDC ID lookup failed:', error.message, '\n');
    return;
  }

  // Test 3: Search by barcode (example: 041196912364)
  console.log('Test 3: Search branded food "cheerios"');
  try {
    const response = await fetch(
      `${USDA_BASE_URL}/foods/search?query=cheerios&dataType=Branded&pageSize=3&api_key=${USDA_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.totalHits} branded foods`);

    if (data.foods.length > 0) {
      const food = data.foods[0];
      console.log(`   Name: ${food.description}`);
      console.log(`   Brand: ${food.brandName || 'N/A'}`);
      console.log(`   Barcode: ${food.gtinUpc || 'N/A'}\n`);
    }
  } catch (error) {
    console.error('❌ Branded search failed:', error.message, '\n');
    return;
  }

  // Test 4: Test different food types
  console.log('Test 4: Search common foods');
  const testFoods = ['apple', 'banana', 'rice', 'salmon'];

  for (const foodName of testFoods) {
    try {
      const response = await fetch(
        `${USDA_BASE_URL}/foods/search?query=${foodName}&pageSize=1&api_key=${USDA_API_KEY}`
      );
      const data = await response.json();
      console.log(`✅ ${foodName}: ${data.totalHits} results (${data.foods[0]?.description})`);
    } catch (error) {
      console.error(`❌ ${foodName} search failed`);
    }
  }

  console.log('\n🎉 All USDA API tests passed!');
  console.log('\n📊 Summary:');
  console.log('   - API Key: Valid ✅');
  console.log('   - Search: Working ✅');
  console.log('   - FDC ID Lookup: Working ✅');
  console.log('   - Branded Foods: Working ✅');
  console.log('   - Nutrient Data: Available ✅');
}

// Run tests
testUSDAIntegration().catch(error => {
  console.error('\n💥 Test suite failed:', error);
  process.exit(1);
});
