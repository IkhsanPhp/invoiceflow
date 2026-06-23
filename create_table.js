const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://root:123123@31.97.187.38:8800/invoiceflow'
});

async function run() {
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_profile_updates (
        id TEXT PRIMARY KEY,
        vendor_id TEXT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        status TEXT NOT NULL,
        submitted_data JSONB NOT NULL,
        revision_notes TEXT,
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by TEXT REFERENCES "user"(id) ON DELETE SET NULL
      );
    `);
    console.log('Table vendor_profile_updates created successfully');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await client.end();
  }
}

run();
