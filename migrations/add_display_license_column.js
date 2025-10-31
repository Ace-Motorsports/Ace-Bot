
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../db.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Connected to the SQLite database.');
});

const migrationQuery = 'ALTER TABLE tags ADD COLUMN display_license BOOLEAN DEFAULT 1';

db.run(migrationQuery, function(err) {
  if (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('Migration already applied: Column "display_license" already exists.');
    } else {
      console.error('Error running migration:', err.message);
    }
  } else {
    console.log('Migration successful: Added "display_license" column to the "tags" table.');
  }

  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message);
    }
    console.log('Database connection closed.');
  });
});
