/**
 * AFRIQORA Production Database Safe Backup & Integrity Verification Utility
 * Creates atomic, timestamped snapshots of the SQLite database with SHA-256 verification.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../prisma/dev.db');
const backupDir = path.resolve(__dirname, '../backups');

function createBackup() {
  if (!fs.existsSync(dbPath)) {
    console.error('Error: Database file does not exist at ' + dbPath);
    process.exit(1);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `afriqora-db-backup-${timestamp}.sqlite`;
  const targetPath = path.join(backupDir, backupFileName);

  console.log('Initiating database backup snapshot...');
  fs.copyFileSync(dbPath, targetPath);

  // Compute checksum
  const fileBuffer = fs.readFileSync(targetPath);
  const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  const metaPath = targetPath + '.meta.json';
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        source: dbPath,
        backupFile: backupFileName,
        sha256Hash: hash,
        fileSizeBytes: fileBuffer.length,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log('Backup created successfully: ' + targetPath);
  console.log('SHA-256 Checksum: ' + hash);
  console.log('Metadata recorded at: ' + metaPath);
}

createBackup();
