/**
 * AFRIQORA Production Platform Owner Secure Bootstrap CLI
 * Securely creates or promotes the designated Platform Owner account on the production host.
 * Never hardcodes passwords or credentials; accepts input via secure environment or CLI prompts.
 */

const readline = require('readline');
const bcrypt = require('bcryptjs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function bootstrap() {
  console.log('======================================================================');
  console.log('AFRIQORA PRODUCTION PLATFORM OWNER SECURE BOOTSTRAP');
  console.log('======================================================================\n');

  const envOwnerEmail = (process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase();
  if (!envOwnerEmail) {
    console.error('FATAL: PLATFORM_OWNER_EMAIL must be configured in production environment.');
    process.exit(1);
  }

  console.log('Designated Platform Owner Email (from environment): ' + envOwnerEmail);
  const inputEmail = await question('Confirm Platform Owner Email to configure: ');

  if (inputEmail.trim().toLowerCase() !== envOwnerEmail) {
    console.error('ERROR: Input email does not match PLATFORM_OWNER_EMAIL configured in environment.');
    process.exit(1);
  }

  const displayName = await question('Enter Platform Owner Display Name: ');
  const password = await question('Enter Secure Password for Platform Owner (min 16 chars): ');

  if (!password || password.length < 16) {
    console.error('ERROR: Production password must be at least 16 characters.');
    process.exit(1);
  }

  console.log('\nHashing credentials with bcrypt (12 salt rounds)...');
  const passwordHash = await bcrypt.hash(password, 12);

  console.log('Provisioning Platform Owner record in database...');
  const ownerUser = await prisma.user.upsert({
    where: { email: envOwnerEmail },
    update: {
      displayName: displayName.trim() || 'AFRIQORA Platform Owner',
      passwordHash,
      isPlatformOwner: true,
      twoFactor: true,
    },
    create: {
      email: envOwnerEmail,
      displayName: displayName.trim() || 'AFRIQORA Platform Owner',
      passwordHash,
      isPlatformOwner: true,
      twoFactor: true,
    },
  });

  console.log('======================================================================');
  console.log('SUCCESS: Platform Owner successfully configured on production host.');
  console.log('User ID: ' + ownerUser.id);
  console.log('Email: ' + ownerUser.email);
  console.log('Platform Owner Privileges: ENABLED');
  console.log('Two-Factor Enforcement: ENABLED');
  console.log('======================================================================\n');

  await prisma.$disconnect();
  rl.close();
}

bootstrap().catch(async (e) => {
  console.error('Bootstrap failed:', e);
  await prisma.$disconnect();
  rl.close();
  process.exit(1);
});
