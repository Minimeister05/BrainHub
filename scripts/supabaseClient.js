// scripts/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://ilfhsgecffxusgimopmx.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsZmhzZ2VjZmZ4dXNnaW1vcG14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzA4NzQsImV4cCI6MjA4OTg0Njg3NH0._IOQHv8rFHqJrwNEIB2EIM3j0FFT4ibkIbQDBoCDqMQ'

window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY)