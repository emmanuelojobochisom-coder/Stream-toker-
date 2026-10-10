import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  'https://igztzktvzhsuddaanxnp.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'PASTE_YOUR_ACTUAL_PUBLISHABLE_KEY_HERE';
sb_publishable_AyfCxjkK3wR39l1VFX36iA_3HKz2x0T
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
