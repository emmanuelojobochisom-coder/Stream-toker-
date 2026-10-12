import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configure these as EXPO_PUBLIC_SUPABASE_URL and
// EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the Expo/EAS environment.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://igztzktvzhsuddaanxnp.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    'Stream Toker: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not configured. Authentication and database requests will not work until it is added to the Expo/EAS environment.'
  );
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY || 'missing-publishable-key',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
