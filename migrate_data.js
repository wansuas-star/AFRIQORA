const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrate() {
  console.log('Starting migration...');
  const dataPath = path.join(__dirname, 'server', 'data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('data.json not found!');
    process.exit(1);
  }

  const state = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

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
  console.log('Migrating posts...');
  for (const [postId, p] of Object.entries(state.creatorPosts || {})) {
    let businessId = null;
    let authorId = p.ownerUserId || p.creatorId || p.authorId;
    if (p.businessId) {
      businessId = p.businessId;
      authorId = state.businessProfiles[businessId]?.ownerUserId || authorId;
    }

    if (authorId) {
      await prisma.post.upsert({
        where: { id: p.id || postId },
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
          id: p.id || postId,
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
  if (state.follows && state.follows.followersByCreator) {
    for (const [creatorAfriqoraId, followers] of Object.entries(state.follows.followersByCreator)) {
      const followingId = userByAfriqoraId[creatorAfriqoraId];
      if (!followingId) continue; // Skip if invalid
      for (const [followerId, timestamp] of Object.entries(followers)) {
        if (state.users[followerId]) {
          await prisma.userFollow.upsert({
            where: { followerId_followingId: { followerId, followingId } },
            update: { createdAt: new Date(timestamp) },
            create: { followerId, followingId, createdAt: new Date(timestamp) }
          }).catch(()=>{}); // Ignore duplicates or invalid refs silently
        }
      }
    }
  }

  // 6. Business follows
  for (const [uid, user] of Object.entries(state.users || {})) {
    if (user.followingBusinesses && Array.isArray(user.followingBusinesses)) {
      for (const bid of user.followingBusinesses) {
        if (state.businessProfiles[bid]) {
           await prisma.businessFollow.upsert({
             where: { followerId_businessId: { followerId: uid, businessId: bid } },
             update: {},
             create: { followerId: uid, businessId: bid }
           }).catch(()=>{});
        }
      }
    }
  }

  // 7. Connection Requests
  if (state.connectionRequests) {
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

migrate().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
    // 6. Messages
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

  // 7. Notifications
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



  console.log('Migration complete!');
}

