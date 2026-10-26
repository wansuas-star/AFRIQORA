const fs = require('fs');
const path = require('path');

function resolveDataPath() {
  const candidatePaths = [
    process.env.DATA_PATH,
    process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null,
    path.join(__dirname, 'server', 'data.json'),
    path.join(__dirname, '..', 'server', 'data.json'),
    path.join(__dirname, 'data.json'),
    path.join(__dirname, 'backend', 'data.json'),
    path.resolve(__dirname, '..', 'AFRQORA', 'server', 'data.json'),
    path.resolve(__dirname, '..', 'AFRIQORA', 'server', 'data.json'),
    'C:\\Users\\hp\\Documents\\AFRQORA\\server\\data.json',
    'C:\\Users\\hp\\Documents\\AFRIQORA\\server\\data.json'
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }
  return null;
}

function resolveActiveDatabase() {
  const candidateDbs = [
    // Primary active database for AFRIQORA Satellite Intelligence platform
    path.join(__dirname, 'backend', 'prisma', 'dev.db'),
    path.resolve('C:/Users/hp/Documents/AFRQORA/backend/prisma/dev.db'),
    path.resolve('C:/Users/hp/Documents/AFRIQORA/backend/prisma/dev.db'),
    path.join(__dirname, '..', 'backend', 'prisma', 'dev.db'),
    process.env.DATABASE_URL ? (path.isAbsolute(process.env.DATABASE_URL.replace(/^file:/, ''))
      ? process.env.DATABASE_URL.replace(/^file:/, '')
      : path.resolve(__dirname, 'backend', process.env.DATABASE_URL.replace(/^file:/, ''))) : null,
    path.join(__dirname, 'prisma', 'dev.db')
  ].filter(Boolean);

  for (const candidate of candidateDbs) {
    if (fs.existsSync(candidate)) {
      return path.resolve(candidate);
    }
  }
  return null;
}

function getPrismaClient() {
  const activeDb = resolveActiveDatabase();
  const prismaClientModule = [
    path.join(__dirname, 'backend', 'node_modules', '@prisma', 'client'),
    path.join(__dirname, '..', 'backend', 'node_modules', '@prisma', 'client'),
    path.join(__dirname, 'node_modules', '@prisma', 'client'),
    'C:\\Users\\hp\\Documents\\AFRQORA\\backend\\node_modules\\@prisma\\client',
    'C:\\Users\\hp\\Documents\\AFRQORA\\node_modules\\@prisma\\client',
    '@prisma/client'
  ].find(p => {
    try { return require.resolve(p); } catch { return false; }
  });

  const { PrismaClient } = require(prismaClientModule || '@prisma/client');
  return new PrismaClient({
    datasources: activeDb ? { db: { url: `file:${activeDb.replace(/\\/g, '/')}` } } : undefined
  });
}

const prisma = getPrismaClient();

async function migrate() {
  const isLiveConfirmed = process.argv.includes('--confirm-live-migration');
  const isDryRun = !isLiveConfirmed || process.argv.includes('--dry-run') || process.argv.includes('--validate');

  console.log(`Starting migration diagnostic & execution${isDryRun ? ' [SAFE DRY-RUN MODE]' : ' [LIVE MIGRATION]'}...`);

  const dataPath = resolveDataPath();
  const dbPath = resolveActiveDatabase();

  if (!dataPath) {
    console.error('data.json not found! Checked candidate locations:');
    console.error(' - ./server/data.json');
    console.error(' - ../server/data.json');
    console.error(' - ./data.json');
    console.error(' - ./backend/data.json');
    console.error(' - C:\\Users\\hp\\Documents\\AFRQORA\\server\\data.json');
    process.exit(1);
  }

  console.log(`Source data path : ${dataPath}`);
  console.log(`Target database  : ${dbPath || 'Prisma Default'}`);

  const state = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  const userCount = Object.keys(state.users || {}).length;
  const bizCount = Object.keys(state.businessProfiles || {}).length;
  const postsCount = Array.isArray(state.creatorPosts)
    ? state.creatorPosts.length
    : Object.keys(state.creatorPosts || {}).length;
  const sessionsCount = Object.keys(state.sessions || {}).length;
  const followsCount = state.follows?.followersByCreator
    ? Object.keys(state.follows.followersByCreator).length
    : 0;
  const connCount = state.connectionRequests
    ? Object.keys(state.connectionRequests).length
    : 0;
  const messageThreadsCount = Object.keys(state.messages || {}).length;
  const notifUsersCount = Object.keys(state.notifications || {}).length;

  console.log(`\nSource records detected in data.json:`);
  console.log(` - Users: ${userCount}`);
  console.log(` - Business Profiles: ${bizCount}`);
  console.log(` - Creator Posts: ${postsCount}`);
  console.log(` - Sessions: ${sessionsCount}`);
  console.log(` - Creator Follow Clusters: ${followsCount}`);
  console.log(` - Connection Requests: ${connCount}`);
  console.log(` - Message Threads: ${messageThreadsCount}`);
  console.log(` - Users with Notifications: ${notifUsersCount}`);

  // Query active database record counts
  const activeUserCount = await prisma.user.count().catch(() => 'N/A');
  const activeBizCount = await prisma.businessProfile.count().catch(() => 'N/A');
  const activeReportCount = prisma.intelligenceReport ? await prisma.intelligenceReport.count().catch(() => 'N/A') : 'N/A';
  const activeTargetCount = prisma.satelliteTarget ? await prisma.satelliteTarget.count().catch(() => 'N/A') : 'N/A';

  console.log(`\nExisting records in active target database:`);
  console.log(` - Users in DB: ${activeUserCount}`);
  console.log(` - Business Profiles in DB: ${activeBizCount}`);
  console.log(` - Intelligence Reports in DB: ${activeReportCount}`);
  console.log(` - Satellite Targets in DB: ${activeTargetCount}`);

  if (isDryRun) {
    console.log('\n[SAFE DRY-RUN] Database write operations skipped.');
    if (!isLiveConfirmed) {
      console.log('Notice: Safe dry-run is the default to protect active satellite platform data.');
      console.log('To execute live writes, --confirm-live-migration must be explicitly provided.');
    }
    console.log('\nActive Prisma Schema model availability:');
    console.log(` - prisma.user: ${prisma.user ? 'AVAILABLE' : 'NOT FOUND'}`);
    console.log(` - prisma.businessProfile: ${prisma.businessProfile ? 'AVAILABLE' : 'NOT FOUND'}`);
    console.log(` - prisma.connectionRequest: ${prisma.connectionRequest ? 'AVAILABLE' : 'NOT FOUND'}`);
    console.log(` - prisma.session: ${prisma.session ? 'AVAILABLE' : 'NOT FOUND'}`);
    console.log(` - prisma.notification: ${prisma.notification ? 'AVAILABLE' : 'NOT FOUND'}`);
    console.log(` - prisma.post: ${prisma.post ? 'AVAILABLE' : 'DECOMMISSIONED (Safe: skipped)'}`);
    console.log(` - prisma.userFollow: ${prisma.userFollow ? 'AVAILABLE' : 'DECOMMISSIONED (Safe: skipped)'}`);
    console.log(` - prisma.message: ${prisma.message ? 'AVAILABLE' : 'DECOMMISSIONED (Safe: skipped)'}`);
    console.log('\nDry run validation completed successfully.');
    return;
  }

  // 1. Users
  console.log('Migrating users...');
  for (const [userId, user] of Object.entries(state.users || {})) {
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        email: user.email,
        passwordHash: user.passwordHash || 'migrated-missing-hash',
        displayName: user.displayName,
        afriqoraId: user.afriqoraId || null,
        username: user.username || null,
        bio: user.bio || null,
        location: user.location || null,
        website: user.website || null,
        contact: user.contact || null,
        profilePhoto: user.profilePhoto || null,
      },
      create: {
        id: userId,
        email: user.email,
        passwordHash: user.passwordHash || 'migrated-missing-hash',
        displayName: user.displayName,
        afriqoraId: user.afriqoraId || null,
        username: user.username || null,
        bio: user.bio || null,
        location: user.location || null,
        website: user.website || null,
        contact: user.contact || null,
        profilePhoto: user.profilePhoto || null,
        createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
      }
    });
  }

  // 2. Business Profiles
  console.log('Migrating business profiles...');
  for (const [bizId, biz] of Object.entries(state.businessProfiles || {})) {
    if (biz.id && biz.ownerUserId) {
      await prisma.businessProfile.upsert({
        where: { id: biz.id },
        update: {
          businessName: biz.businessName,
          location: biz.location,
          country: biz.country,
          category: biz.category,
          description: biz.description,
          phone: biz.contact || biz.phone,
          website: biz.website || null,
          logo: biz.logo || null,
          hours: biz.hours ? JSON.stringify(biz.hours) : null,
          categories: biz.categories ? JSON.stringify(biz.categories) : null,
          services: biz.services ? JSON.stringify(biz.services) : null,
          socialLinks: biz.socialLinks ? JSON.stringify(biz.socialLinks) : null,
          serviceAreas: biz.serviceAreas ? JSON.stringify(biz.serviceAreas) : null,
          languagesServed: biz.languagesServed ? JSON.stringify(biz.languagesServed) : null,
          faqs: biz.faqs ? JSON.stringify(biz.faqs) : null,
          media: biz.media ? JSON.stringify(biz.media) : null,
          semanticIndex: biz._semanticIndex || null,
        },
        create: {
          id: biz.id,
          ownerId: biz.ownerUserId,
          businessName: biz.businessName,
          location: biz.location,
          country: biz.country,
          category: biz.category,
          description: biz.description,
          phone: biz.contact || biz.phone,
          website: biz.website || null,
          logo: biz.logo || null,
          hours: biz.hours ? JSON.stringify(biz.hours) : null,
          categories: biz.categories ? JSON.stringify(biz.categories) : null,
          services: biz.services ? JSON.stringify(biz.services) : null,
          socialLinks: biz.socialLinks ? JSON.stringify(biz.socialLinks) : null,
          serviceAreas: biz.serviceAreas ? JSON.stringify(biz.serviceAreas) : null,
          languagesServed: biz.languagesServed ? JSON.stringify(biz.languagesServed) : null,
          faqs: biz.faqs ? JSON.stringify(biz.faqs) : null,
          media: biz.media ? JSON.stringify(biz.media) : null,
          semanticIndex: biz._semanticIndex || null,
        }
      });
    }
  }

  // 3. Posts
  if (prisma.post) {
    console.log('Migrating posts...');
    const postsEntries = Array.isArray(state.creatorPosts)
      ? state.creatorPosts.entries()
      : Object.entries(state.creatorPosts || {});
    for (const [postId, p] of postsEntries) {
      let businessId = null;
      let authorId = p.ownerUserId || p.creatorId || p.authorId;
      if (p.businessId) {
        businessId = p.businessId;
        authorId = state.businessProfiles?.[businessId]?.ownerUserId || authorId;
      }

      if (authorId) {
        await prisma.post.upsert({
          where: { id: p.id || String(postId) },
          update: {
            title: p.title || '',
            text: p.content || p.text || '',
            video: p.video,
            type: p.contentType || p.type || 'text',
            category: p.category || null,
            location: p.location || null,
            website: p.website || null,
            contact: p.contact || null,
            image: p.image || null,
            topics: p.topics ? JSON.stringify(p.topics) : null,
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
            authorLocationAllowed: p.authorLocationAllowed || false,
            authorLocation: p.authorLocation || null,
            videoProcessing: p.videoProcessing ? JSON.stringify(p.videoProcessing) : null,
            status: p.status || 'published',
            semanticIndex: p._semanticIndex || null,
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
          },
          create: {
            id: p.id || String(postId),
            authorId: authorId,
            businessId: businessId,
            title: p.title || '',
            text: p.content || p.text || '',
            video: p.video,
            type: p.contentType || p.type || 'text',
            category: p.category || null,
            location: p.location || null,
            website: p.website || null,
            contact: p.contact || null,
            image: p.image || null,
            topics: p.topics ? JSON.stringify(p.topics) : null,
            publishedAt: p.publishedAt ? new Date(p.publishedAt) : null,
            authorLocationAllowed: p.authorLocationAllowed || false,
            authorLocation: p.authorLocation || null,
            videoProcessing: p.videoProcessing ? JSON.stringify(p.videoProcessing) : null,
            status: p.status || 'published',
            semanticIndex: p._semanticIndex || null,
            createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt) : null,
          }
        });
      }
    }
  } else {
    console.log('Skipping posts: Post model is decommissioned in current schema.');
  }

  // 4. Sessions
  console.log('Migrating sessions...');
  for (const [sid, sess] of Object.entries(state.sessions || {})) {
    await prisma.session.upsert({
      where: { id: sid },
      update: {
        userId: sess.userId,
        expiresAt: new Date(sess.expiresAt),
      },
      create: {
        id: sid,
        userId: sess.userId,
        createdAt: new Date(sess.createdAt),
        expiresAt: new Date(sess.expiresAt),
      }
    });
  }

  console.log('Migrating follows & connections...');
  
  // Create an afriqoraId -> userId map for fast lookup
  const userByAfriqoraId = {};
  for (const [uid, u] of Object.entries(state.users || {})) {
    if (u.afriqoraId) userByAfriqoraId[u.afriqoraId] = uid;
  }

  // 5. User follows
  if (prisma.userFollow) {
    if (state.follows && state.follows.followersByCreator) {
      for (const [creatorAfriqoraId, followers] of Object.entries(state.follows.followersByCreator)) {
        const followingId = userByAfriqoraId[creatorAfriqoraId];
        if (!followingId) continue;
        for (const [followerId, timestamp] of Object.entries(followers)) {
          if (state.users[followerId]) {
            await prisma.userFollow.upsert({
              where: { followerId_followingId: { followerId, followingId } },
              update: { createdAt: new Date(timestamp) },
              create: { followerId, followingId, createdAt: new Date(timestamp) }
            }).catch(()=>{});
          }
        }
      }
    }
  } else {
    console.log('Skipping user follows: UserFollow model is decommissioned in current schema.');
  }

  // 6. Business follows
  if (prisma.businessFollow) {
    for (const [uid, user] of Object.entries(state.users || {})) {
      if (user.followingBusinesses && Array.isArray(user.followingBusinesses)) {
        for (const bid of user.followingBusinesses) {
          if (state.businessProfiles?.[bid]) {
            await prisma.businessFollow.upsert({
              where: { followerId_businessId: { followerId: uid, businessId: bid } },
              update: {},
              create: { followerId: uid, businessId: bid }
            }).catch(()=>{});
          }
        }
      }
    }
  }

  // 7. Connection Requests
  if (prisma.connectionRequest && state.connectionRequests) {
    for (const req of Object.values(state.connectionRequests)) {
      if (req.id && req.requesterUserId && req.targetUserId) {
        await prisma.connectionRequest.upsert({
          where: { requesterId_targetId: { requesterId: req.requesterUserId, targetId: req.targetUserId } },
          update: { status: req.status || 'pending' },
          create: {
            id: req.id,
            requesterId: req.requesterUserId,
            targetId: req.targetUserId,
            status: req.status || 'pending',
            createdAt: req.createdAt ? new Date(req.createdAt) : new Date()
          }
        }).catch(()=>{});
      }
    }
  }

  // 8. Messages
  if (prisma.message) {
    console.log('Migrating messages...');
    for (const [threadKey, messages] of Object.entries(state.messages || {})) {
      for (const msg of messages) {
        await prisma.message.upsert({
          where: { id: msg.id },
          update: {
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            content: msg.content || null,
            mediaUrl: msg.mediaUrl || null,
            status: msg.status || 'sent',
            createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          },
          create: {
            id: msg.id,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            content: msg.content || null,
            mediaUrl: msg.mediaUrl || null,
            status: msg.status || 'sent',
            createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date(),
          }
        });
      }
    }
  } else {
    console.log('Skipping messages: Message model is decommissioned in current schema.');
  }

  // 9. Notifications
  if (prisma.notification) {
    console.log('Migrating notifications...');
    for (const [userId, notifs] of Object.entries(state.notifications || {})) {
      for (const notif of notifs) {
        if (!notif.id) continue;
        await prisma.notification.upsert({
          where: { id: notif.id },
          update: {
            recipientUserId: notif.recipientUserId || userId,
            actorUserId: notif.actorUserId || '',
            type: notif.type,
            title: notif.title || null,
            message: notif.message || null,
            route: notif.route || null,
            metadata: notif.metadata ? JSON.stringify(notif.metadata) : null,
            read: !!notif.read,
            dedupeKey: notif.dedupeKey || null,
            createdAt: notif.timestamp ? new Date(notif.timestamp) : new Date(),
          },
          create: {
            id: notif.id,
            recipientUserId: notif.recipientUserId || userId,
            actorUserId: notif.actorUserId || '',
            type: notif.type,
            title: notif.title || null,
            message: notif.message || null,
            route: notif.route || null,
            metadata: notif.metadata ? JSON.stringify(notif.metadata) : null,
            read: !!notif.read,
            dedupeKey: notif.dedupeKey || null,
            createdAt: notif.timestamp ? new Date(notif.timestamp) : new Date(),
          }
        });
      }
    }
  }

  console.log('Migration diagnostic complete!');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
