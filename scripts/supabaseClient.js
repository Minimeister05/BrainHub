// scripts/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://ilfhsgecffxusgimopmx.supabase.co'
const SUPABASE_KEY = 'sb_publishable_wdr4-5H2vtmGjRdEFKKNIg_SHEUakm3'

window.supabase = createClient(SUPABASE_URL, SUPABASE_KEY)