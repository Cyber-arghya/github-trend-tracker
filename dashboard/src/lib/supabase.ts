import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jmrhcujpuzyjjvmbruvz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptcmhjdWpwdXp5amp2bWJydXZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3NjI5NzUsImV4cCI6MjEwOTMzODk3NX0.69E0KjI7Y6O6a2-vn7QQjQbYySP7oxlycBDmrGLwN5k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

