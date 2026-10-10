import { supabase } from './supabase';

export async function checkSupabaseConnection() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error) {
    console.log('Supabase check failed:', error.message);
    return { connected: false, error: error.message };
  }

  console.log('Supabase connection successful');
  return { connected: true, data };
}
