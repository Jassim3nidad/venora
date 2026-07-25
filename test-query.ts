import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Try loading env from apps/web/.env.local if dotenv didn't pick it up
const envPath = path.join(process.cwd(), "apps", "web", ".env.local");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: venues } = await supabase.from('venues').select('id, name').limit(10);
  
  const venueId = venues?.find(v => v.name.toLowerCase().includes('amorita'))?.id;
  console.log("Found venueId:", venueId);

  if (!venueId) return;

  const { data: aggr, error } = await supabase
    .from("venue_supplier_agreements")
    .select(`
      id, status, venue_id, supplier_id,
      supplier_profiles ( id, business_name, accreditation_status )
    `)
    .eq("venue_id", venueId);

  console.log("Agreements for venue:", JSON.stringify(aggr, null, 2));
  console.log("Agreements error:", error);

  const { data: part, error: pErr } = await supabase
    .from("venue_suppliers")
    .select("supplier_id, status")
    .eq("venue_id", venueId);

  console.log("Partnerships for venue:", JSON.stringify(part, null, 2));
  console.log("Partnerships error:", pErr);
}

run().catch(console.error);
