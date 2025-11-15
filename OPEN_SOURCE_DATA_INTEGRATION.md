# 🗄️ Open-Source Data Sources to Bootstrap MindFork

**Date**: 2025-11-03
**Purpose**: Free, high-quality nutrition databases to populate your app Day 1

---

## 🌟 TIER 1: Must-Have (Free, Comprehensive, Official)

### 1. USDA FoodData Central (⭐⭐⭐⭐⭐ BEST!)

**Why use it**:
- ✅ 390,000+ foods with complete nutrition data
- ✅ Official US government database (highly accurate)
- ✅ Free, open-source, no API limits
- ✅ Includes branded foods (McDonald's, Chipotle, etc.)
- ✅ Updated monthly
- ✅ Barcode data included for many foods

**Data quality**: Excellent - lab-tested values

**Integration**:
```bash
# Download latest database (JSON format)
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2024-10-31.zip

# Or use their API (no key required!)
curl "https://api.nal.usda.gov/fdc/v1/foods/search?query=pizza&api_key=DEMO_KEY"
```

**Tables to populate**:
- `food_items` - All food data
- `food_entries` - Use as template suggestions
- `ai_knowledge_sources` - Nutrition facts for AI grounding

**Example SQL integration**:
```sql
-- Create staging table for USDA import
CREATE TABLE usda_food_import (
  fdc_id TEXT PRIMARY KEY,
  description TEXT,
  data_type TEXT,
  category TEXT,
  brand_owner TEXT,
  ingredients TEXT,
  serving_size NUMERIC,
  serving_unit TEXT,
  calories NUMERIC,
  protein_g NUMERIC,
  fat_g NUMERIC,
  carbs_g NUMERIC,
  fiber_g NUMERIC,
  sugar_g NUMERIC,
  sodium_mg NUMERIC,
  barcode_upc TEXT
);

-- Import from CSV
COPY usda_food_import
FROM '/path/to/FoodData_Central_foundation_food.csv'
DELIMITER ',' CSV HEADER;

-- Merge into food_items
INSERT INTO food_items (
  food_name,
  brand_name,
  calories,
  protein_g,
  fat_g,
  carbs_g,
  fiber_g,
  sugar_g,
  sodium_mg,
  data_source,
  usda_fdc_id,
  barcode
)
SELECT
  description,
  brand_owner,
  calories,
  protein_g,
  fat_g,
  carbs_g,
  fiber_g,
  sugar_g,
  sodium_mg,
  'usda_fooddata_central',
  fdc_id,
  barcode_upc
FROM usda_food_import
ON CONFLICT (usda_fdc_id) DO UPDATE SET
  food_name = EXCLUDED.food_name,
  calories = EXCLUDED.calories,
  updated_at = NOW();
```

**API Integration** (for real-time search):
```typescript
async function searchUSDAFoods(query: string) {
  const response = await fetch(
    `https://api.nal.usda.gov/fdc/v1/foods/search?` +
    `query=${encodeURIComponent(query)}` +
    `&pageSize=25` +
    `&api_key=YOUR_API_KEY` // Get free key at: https://fdc.nal.usda.gov/api-key-signup.html
  );

  const data = await response.json();

  return data.foods.map(food => ({
    fdc_id: food.fdcId,
    name: food.description,
    brand: food.brandOwner,
    calories: food.foodNutrients.find(n => n.nutrientName === 'Energy')?.value,
    protein_g: food.foodNutrients.find(n => n.nutrientName === 'Protein')?.value,
    // ... map other nutrients
  }));
}
```

**Download**: https://fdc.nal.usda.gov/download-datasets.html
**API Docs**: https://fdc.nal.usda.gov/api-guide.html

---

### 2. Open Food Facts (⭐⭐⭐⭐ Great for branded/international)

**Why use it**:
- ✅ 2.8 million+ products
- ✅ Crowdsourced (Wikipedia of food)
- ✅ International coverage (not just US)
- ✅ Barcode database (1M+ barcodes!)
- ✅ Product photos included
- ✅ Nutrition Score (A-E rating)
- ✅ Open Database License

**Data quality**: Good - community verified

**Integration**:
```bash
# Download MongoDB dump (38GB, complete database)
wget https://static.openfoodfacts.org/data/openfoodfacts-mongodbdump.tar.gz

# Or download PostgreSQL-ready CSV (3GB)
wget https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv
```

**API Integration**:
```typescript
async function searchOpenFoodFacts(barcode: string) {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );

  const data = await response.json();

  if (data.status === 1) {
    return {
      barcode,
      name: data.product.product_name,
      brand: data.product.brands,
      calories: data.product.nutriments.energy_kcal,
      protein_g: data.product.nutriments.proteins_100g,
      fat_g: data.product.nutriments.fat_100g,
      carbs_g: data.product.nutriments.carbohydrates_100g,
      fiber_g: data.product.nutriments.fiber_100g,
      sugar_g: data.product.nutriments.sugars_100g,
      sodium_mg: data.product.nutriments.sodium_100g * 1000,
      photo_url: data.product.image_url,
      nutrition_grade: data.product.nutriscore_grade // A, B, C, D, E
    };
  }
}

// Barcode scanning integration!
async function scanBarcode(barcodeValue: string) {
  // Try USDA first
  let food = await searchUSDAByBarcode(barcodeValue);

  if (!food) {
    // Fallback to Open Food Facts
    food = await searchOpenFoodFacts(barcodeValue);
  }

  if (food) {
    // Save to food_items for future quick access
    await supabase.from('food_items').upsert({
      food_name: food.name,
      brand_name: food.brand,
      barcode: barcodeValue,
      calories: food.calories,
      // ... other fields
      data_source: 'open_food_facts'
    });
  }

  return food;
}
```

**Download**: https://world.openfoodfacts.org/data
**API Docs**: https://openfoodfacts.github.io/openfoodfacts-server/api/

---

### 3. MyFitnessPal Database Export (Community Projects)

**Why use it**:
- ✅ User-verified foods
- ✅ Restaurant dishes
- ✅ Home-cooked meals

**Warning**: ⚠️ Not officially available, but community exports exist

**Alternative**: Use their API (if you have partnership) or scrape legally with permission

---

## 🧠 TIER 2: AI Training & Knowledge

### 4. Nutrition Research Papers (PubMed Central)

**Why use it**:
- ✅ 8 million+ scientific articles
- ✅ Free full-text access
- ✅ Use for AI knowledge grounding
- ✅ Cite sources in AI responses

**Integration**:
```typescript
async function fetchNutritionResearch(topic: string) {
  const response = await fetch(
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?` +
    `db=pmc&term=${encodeURIComponent(topic + ' nutrition')}&retmode=json&retmax=10`
  );

  const data = await response.json();

  for (const pmcid of data.esearchresult.idlist) {
    // Fetch full article
    const article = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?` +
      `db=pmc&id=${pmcid}&retmode=xml`
    );

    // Extract text, generate embedding, store in ai_knowledge_sources
    const text = extractArticleText(article);
    const embedding = await generateEmbedding(text);

    await supabase.from('ai_knowledge_sources').insert({
      source_type: 'research_paper',
      source_name: `PubMed PMC${pmcid}`,
      source_url: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/`,
      content: text,
      embedding,
      reliability_score: 9.5, // Peer-reviewed!
      peer_reviewed: true,
      topic_tags: [topic, 'nutrition', 'science']
    });
  }
}

// Populate knowledge base with key topics
const topics = [
  'intermittent fasting',
  'emotional eating',
  'calorie deficit',
  'protein intake',
  'fiber benefits',
  'glycemic index'
];

for (const topic of topics) {
  await fetchNutritionResearch(topic);
}
```

**API Docs**: https://www.ncbi.nlm.nih.gov/pmc/tools/developers/

---

### 5. Nutrition.gov Guidance

**Why use it**:
- ✅ Official dietary guidelines
- ✅ Meal planning resources
- ✅ Portion guidance
- ✅ Free to use

**Populate**:
- `micro_lessons` - Educational content
- `nutrition_knowledge` - Guidelines
- `ai_knowledge_sources` - Grounding for AI responses

**Download**: https://www.nutrition.gov/topics

---

## 🏃 TIER 3: Exercise & Activity Data

### 6. Compendium of Physical Activities

**Why use it**:
- ✅ 800+ activities with MET values
- ✅ Calculate calories burned
- ✅ Free, research-backed

**Integration**:
```sql
CREATE TABLE activity_compendium (
  id UUID PRIMARY KEY,
  activity_code TEXT,
  activity_name TEXT,
  met_value NUMERIC, -- Metabolic equivalent
  category TEXT
);

-- Calculate calories burned
-- Calories = MET × weight_kg × duration_hours
```

**Download**: https://sites.google.com/site/compendiumofphysicalactivities/

---

## 📊 TIER 4: Recipe Databases

### 7. Recipe1M+ Dataset

**Why use it**:
- ✅ 1 million+ recipes
- ✅ Ingredients + instructions
- ✅ Nutrition calculated
- ✅ Academic research dataset

**Tables**: `recipes`, `recipe_ingredients`

**Download**: http://pic2recipe.csail.mit.edu/

---

### 8. Spoonacular API (Freemium)

**Why use it**:
- ✅ 360,000+ recipes
- ✅ Nutrition analysis API
- ✅ Meal planning API
- ✅ Free tier: 150 requests/day

**Integration**:
```typescript
async function analyzeRecipe(ingredients: string[]) {
  const response = await fetch(
    `https://api.spoonacular.com/recipes/parseIngredients?` +
    `apiKey=YOUR_KEY`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredientList: ingredients.join('\n'),
        servings: 1
      })
    }
  );

  return await response.json();
}
```

**Pricing**: Free tier (150/day), then $0.004/request
**API Docs**: https://spoonacular.com/food-api/docs

---

## 🎯 TIER 5: Barcode Databases

### 9. UPC Database (Digit-Eyes)

**Why use it**:
- ✅ 100 million+ barcodes
- ✅ Product info + images
- ✅ Free API (rate limited)

**Integration**: Augment `food_items` with barcode lookups

**API**: https://www.digit-eyes.com/gtin/api.html

---

### 10. Barcodelookup.com

**Free tier**: 100 requests/day
**Paid**: $30/month for unlimited

---

## 🚀 Bootstrap Strategy (Day 1)

### Step 1: Import USDA FoodData Central (2 hours)
```bash
# Download CSV
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2024-10-31.zip
unzip FoodData_Central_csv_2024-10-31.zip

# Import to Supabase
psql $DATABASE_URL -c "\COPY usda_food_import FROM 'foundation_food.csv' CSV HEADER"

# Merge into food_items (390,000 foods!)
psql $DATABASE_URL -f scripts/merge_usda_foods.sql
```

**Result**: 390,000 foods instantly available!

### Step 2: Import Open Food Facts Barcodes (1 hour)
```bash
# Download barcode database
wget https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
gunzip en.openfoodfacts.org.products.csv.gz

# Import only foods with barcodes and nutrition
psql $DATABASE_URL -c "\COPY openfoodfacts_import FROM 'en.openfoodfacts.org.products.csv' CSV HEADER"

# Filter and merge
psql $DATABASE_URL -f scripts/merge_barcode_foods.sql
```

**Result**: 1 million+ barcodes for instant scanning!

### Step 3: Populate AI Knowledge Base (30 min)
```typescript
// Run this script to fetch nutrition research
async function populateKnowledgeBase() {
  const topics = [
    'intermittent fasting safety',
    'emotional eating psychology',
    'calorie deficit weight loss',
    'high protein diet benefits',
    'fiber satiety',
    'meal timing metabolism'
  ];

  for (const topic of topics) {
    await fetchNutritionResearch(topic);
    await delay(1000); // Rate limit
  }
}
```

**Result**: AI can cite peer-reviewed sources!

### Step 4: Add Dietary Guidelines (30 min)
```sql
-- Insert USDA Dietary Guidelines
INSERT INTO nutrition_knowledge (
  knowledge_type,
  title,
  content,
  source_url,
  reliability_score
) VALUES
  ('guideline', 'Recommended Daily Calorie Intake',
   'Adult men: 2000-3000 kcal/day, Adult women: 1600-2400 kcal/day (varies by activity level)',
   'https://www.dietaryguidelines.gov', 10.0),

  ('guideline', 'Protein RDA',
   '0.8g per kg body weight (minimum). Athletes: 1.2-2.0g/kg. Strength training: 1.6-2.2g/kg.',
   'https://www.dietaryguidelines.gov', 10.0);

-- Generate embeddings for semantic search
UPDATE nutrition_knowledge
SET embedding = generate_embedding(content)
WHERE embedding IS NULL;
```

---

## 📈 Cost Analysis

### Free Options (Recommended for Bootstrap):
- ✅ **USDA FoodData Central**: $0 (390K foods)
- ✅ **Open Food Facts**: $0 (2.8M foods)
- ✅ **PubMed Central**: $0 (8M articles)
- ✅ **Nutrition.gov**: $0 (guidelines)

**Total Cost**: $0 🎉
**Time to Import**: ~4 hours
**Foods Available**: 3+ million
**AI Knowledge**: Thousands of research papers

### Paid Options (Optional):
- **Spoonacular API**: $49/month (360K recipes + nutrition analysis)
- **Nutritionix API**: $50/month (detailed nutrition data)
- **Barcodelookup**: $30/month (unlimited barcode lookups)

**Recommendation**: Start with free options, upgrade when you have paying users!

---

## 🎯 Priority Import Order

1. **USDA FoodData Central** - Day 1 (390K foods, highest quality)
2. **Open Food Facts** - Day 1 (barcodes for scanning)
3. **PubMed Central** - Day 2 (AI knowledge grounding)
4. **Nutrition.gov** - Day 2 (educational content)
5. **Compendium of Physical Activities** - Day 3 (exercise data)

---

## 🔧 Implementation Scripts

### Script 1: USDA Import
```bash
#!/bin/bash
# scripts/import_usda_foods.sh

echo "Downloading USDA FoodData Central..."
curl -O https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_csv_2024-10-31.zip

echo "Extracting..."
unzip -o FoodData_Central_csv_2024-10-31.zip

echo "Importing to database..."
psql "$SUPABASE_DB_URL" <<EOF
CREATE TEMP TABLE usda_import (
  fdc_id TEXT,
  description TEXT,
  food_category TEXT,
  publication_date TEXT
);

\COPY usda_import FROM 'food.csv' CSV HEADER;

INSERT INTO food_items (
  food_name,
  data_source,
  usda_fdc_id,
  category
)
SELECT
  description,
  'usda_fooddata_central',
  fdc_id,
  food_category
FROM usda_import
ON CONFLICT (usda_fdc_id) DO NOTHING;

SELECT COUNT(*) as imported_count FROM food_items WHERE data_source = 'usda_fooddata_central';
EOF

echo "✅ USDA import complete!"
```

### Script 2: Generate AI Embeddings
```typescript
// scripts/generate_embeddings.ts

import { supabase } from './supabaseClient';
import { openai } from './openaiClient';

async function generateEmbeddingsForKnowledge() {
  // Get knowledge without embeddings
  const { data: knowledge } = await supabase
    .from('ai_knowledge_sources')
    .select('id, content')
    .is('embedding', null)
    .limit(100);

  for (const item of knowledge) {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: item.content
    });

    await supabase
      .from('ai_knowledge_sources')
      .update({
        embedding: embedding.data[0].embedding,
        embedding_model: 'text-embedding-3-small'
      })
      .eq('id', item.id);

    console.log(`✅ Generated embedding for: ${item.id}`);
  }
}

generateEmbeddingsForKnowledge();
```

---

## 🏆 Bootstrap Checklist

- [ ] Import USDA FoodData Central (390K foods)
- [ ] Import Open Food Facts barcodes (1M+ barcodes)
- [ ] Fetch nutrition research papers (100+ articles)
- [ ] Add dietary guidelines (20+ guidelines)
- [ ] Generate embeddings for AI search
- [ ] Test food search (text + barcode)
- [ ] Test AI knowledge retrieval
- [ ] Verify nutrition data accuracy

**Time required**: 1 day
**Cost**: $0
**Result**: Production-ready food database + AI knowledge base!

---

*All data sources are free and open-source!*
*Integration scripts ready to use*
*World-class nutrition data from Day 1*
