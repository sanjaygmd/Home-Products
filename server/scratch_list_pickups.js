import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

async function getAuthToken() {
  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();

  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  return data.token;
}

async function listPickups() {
  const token = await getAuthToken();
  const response = await fetch(`${BASE_URL}/settings/company/pickup`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const data = await response.json();
  console.log("Registered Pickups in Shiprocket:", JSON.stringify(data, null, 2));
}

listPickups();
