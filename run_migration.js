const fs = require('fs');
const { execSync } = require('child_process');

const sql = fs.readFileSync('supabase/migrations/20260723300000_supplier_agreements.sql', 'utf8');

const stmts = sql
  .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('BEGIN') && !s.startsWith('COMMIT'));

for (const stmt of stmts) {
  try {
    fs.writeFileSync('temp.sql', stmt + ';');
    console.log('Executing:', stmt.slice(0, 50) + '...');
    execSync('npx supabase db query -f temp.sql', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to execute statement');
  }
}

if (fs.existsSync('temp.sql')) {
  fs.unlinkSync('temp.sql');
}
