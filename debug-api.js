
const fetch = global.fetch || require('node-fetch');

async function debugApi() {
  const url = 'http://localhost:8000/api/articles';
  console.log(`Fetching ${url}...`);
  
  try {
    const response = await fetch(url);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error('Failed to fetch data');
      return;
    }

    const data = await response.json();
    console.log('Data Type:', Array.isArray(data) ? 'Array' : typeof data);
    
    let items = data;
    if (!Array.isArray(data)) {
        console.log('Data is not an array. Keys:', Object.keys(data));
        if (data.data) items = data.data;
        else if (data.results) items = data.results;
        else if (data.items) items = data.items;
    }

    if (Array.isArray(items) && items.length > 0) {
      console.log(`Found ${items.length} items.`);
      console.log('--- First Item Structure ---');
      console.log(JSON.stringify(items[0], null, 2));
      console.log('----------------------------');
      console.log('Keys:', Object.keys(items[0]).join(', '));
    } else {
      console.log('No items found or empty array.');
      console.log('Raw Data:', JSON.stringify(data, null, 2).substring(0, 500));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugApi();
