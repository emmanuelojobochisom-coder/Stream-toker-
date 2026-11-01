const APPWRITE_ENDPOINT = 'https://sfo.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '6ae7229700347f8482f0';

// Appwrite is configured as the secondary service. Supabase remains the
// source of truth for authentication, profiles, videos, messages and gifts.
export async function checkAppwriteConnection() {
  const response = await fetch(`${APPWRITE_ENDPOINT}/health`, {
    method: 'GET',
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Appwrite health check failed (${response.status})`);
  }

  return response.json();
}

export { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID };
