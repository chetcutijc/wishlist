// Supabase Configuration '
const SUPABASE_URL = 'https://tomzrvnvdywpffzjiesd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvbXpydm52ZHl3cGZmanppZXNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc4NDg1MDUsImV4cCI6MTc2Njc2ODEwNX0.HF9xXPxK0EflUeEv9xXvL5pT1VW7eTKZ2k2e9Z8x9Ik';
const EDGE_FUNCTION_URL = 'https://tomzrvnvdywpffzjiesd.supabase.co/functions/v1/fetch-product-meta';

// Initialize Supabase client
const supabase = supabase_module.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
