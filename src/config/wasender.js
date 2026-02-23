const axios = require('axios');

const BASE_URL = 'https://wasenderapi.com/api';
const API_KEY = process.env.WASENDER_API_KEY;

if (!API_KEY) {
  console.warn('[WASender] WASENDER_API_KEY is missing — WhatsApp notification features will not work.');
}

const wasender = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

const enabled = !!API_KEY;

module.exports = { wasender, enabled };
