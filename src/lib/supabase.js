import { createClient } from '@supabase/supabase-js';

// PASTIKAN URL BERHENTI DI .co (TIDAK ADA /rest/v1 ATAU GARIS MIRING /)
const supabaseUrl = 'https://oauijeolydtspwjffkdb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hdWlqZW9seWR0c3B3amZma2RiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2MDAzNzgsImV4cCI6MjEwMzE3NjM3OH0.rOr4CCF_z-uRktv5lUHxRZcHLiMZi5i2HTB8oTPpM_o';

export const supabase = createClient(supabaseUrl, supabaseKey);