const url = 'https://cuco360.cucorent.com/api/apiv2/checking/getfullchecks/380?start_date=2026-03-04%2000%3A00%3A00&end_date=2026-03-04%2023%3A59%3A59';
const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'APIkey': 'k9fKmKcVCRc44Rf7dpkxhnfU9z9t0XsgrYgkGQSr9unWFZPOKsySznPHb7bUJzBc' };
console.log('Fetching:', url);
fetch(url, { headers })
  .then(r => {
      console.log('Status:', r.status);
      return r.text();
  })
  .then(t => {
      console.log('Body Preview:', t.substring(0, 500));
      try {
          const json = JSON.parse(t);
          if (Array.isArray(json)) console.log('Is Array: Yes, Length:', json.length);
          else if (json.data) console.log('Has Data Array:', json.data.length);
          else console.log('Unknown JSON structure:', Object.keys(json));
      } catch(e) { console.log('Not JSON'); }
  })
  .catch(e => console.error('Error:', e.message));