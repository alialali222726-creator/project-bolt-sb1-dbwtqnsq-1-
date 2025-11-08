import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https//bllhyrcaovvbtzbwppav.supabase.co;
const supabaseAnonKey = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsbGh5cmNhb3Z2YnR6YndwcGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDkzODIsImV4cCI6MjA3ODE4NTM4Mn0.MMRgp1uNSBbF8IT1LanI2G8wkavqp4BxLFzOTS8fyDg;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
