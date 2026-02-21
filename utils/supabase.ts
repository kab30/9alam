import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ehwtqtzquvatesargbno.supabase.co';
const supabaseKey = 'sb_publishable_YsuwdLizStcwxMDUA8kcgw_78WMiPZy';

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Document {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApiKey {
  id: string;
  key_value: string;
  label: string;
  is_active: boolean;
  created_at: string;
}
