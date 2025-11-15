// Upload coach images to Supabase Storage
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://lxajnrofkgpwdpodjvkm.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4YWpucm9ma2dwd2Rwb2RqdmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyNTUzODQsImV4cCI6MjA2OTgzMTM4NH0.26BHNOyaILt3lzPdcfs-z_SBA-WKbORZEJuMQLnOkw8';

const images = [
  'coach_nora.png',
  'coach_blaze.png',
  'coach_kai.png',
  'coach_maya.png',
  'coach_sato.png'
];

async function uploadImage(filename) {
  return new Promise((resolve, reject) => {
    const filePath = `coach-images-for-heygen/${filename}`;
    const fileBuffer = fs.readFileSync(filePath);
    
    const options = {
      hostname: 'lxajnrofkgpwdpodjvkm.supabase.co',
      path: `/storage/v1/object/coach-avatars/${filename}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'image/png',
        'Content-Length': fileBuffer.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ Uploaded ${filename}`);
          resolve();
        } else {
          console.error(`❌ Failed to upload ${filename}: ${res.statusCode} ${data}`);
          reject(new Error(data));
        }
      });
    });

    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });
}

(async () => {
  console.log('📤 Uploading coach images to Supabase Storage...\n');
  
  for (const image of images) {
    try {
      await uploadImage(image);
    } catch (error) {
      console.error(`Error uploading ${image}:`, error.message);
    }
  }
  
  console.log('\n✅ Upload complete!');
  console.log('Verify at: https://supabase.com/dashboard/project/lxajnrofkgpwdpodjvkm/storage/buckets/coach-avatars');
})();
