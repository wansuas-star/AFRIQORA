const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function migrateStage3E() {
  const stateFile = 'server/data.json';
  if (!fs.existsSync(stateFile)) {
    console.log('No server/data.json found, skipping.');
    return;
  }
  
  const raw = fs.readFileSync(stateFile, 'utf8');
  let state = {};
  try {
    state = JSON.parse(raw);
  } catch(e) {
    console.error('Error parsing data.json', e);
    return;
  }

  // 1. Post Likes (state.likes[videoId][userId])
  console.log('Migrating Likes...');
  if (state.likes) {
    for (const [postId, users] of Object.entries(state.likes)) {
      for (const [userId, timestamp] of Object.entries(users)) {
        await prisma.postLike.upsert({
          where: { userId_postId: { userId, postId } },
          update: {},
          create: {
            userId,
            postId,
            createdAt: timestamp ? new Date(timestamp) : new Date()
          }
        }).catch(e => {});
      }
    }
  }

  // 2. Comments (array of { id, videoId, authorId, text, createdAt })
  console.log('Migrating Comments...');
  if (state.comments && Array.isArray(state.comments)) {
    for (const comment of state.comments) {
      if (!comment.id || !comment.videoId || (!comment.userId && !comment.authorId)) continue;
      await prisma.comment.upsert({
        where: { id: comment.id },
        update: {
          text: comment.text || '',
          createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date()
        },
        create: {
          id: comment.id,
          postId: comment.videoId,
          userId: comment.userId || comment.authorId,
          text: comment.text || '',
          createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date()
        }
      }).catch(e => {});
    }
  }

  // 3. Shares (state.shares[videoId] = array of { id, userId, platform, createdAt })
  console.log('Migrating Shares...');
  if (state.shares) {
    for (const [postId, sharesArray] of Object.entries(state.shares)) {
      if (Array.isArray(sharesArray)) {
        for (const share of sharesArray) {
          if (!share.id || !share.userId) continue;
          await prisma.postShare.upsert({
            where: { id: share.id },
            update: {
              platform: share.platform || null,
              createdAt: share.createdAt ? new Date(share.createdAt) : new Date()
            },
            create: {
              id: share.id,
              userId: share.userId,
              postId: postId,
              platform: share.platform || null,
              createdAt: share.createdAt ? new Date(share.createdAt) : new Date()
            }
          }).catch(e => {
            // fallback if upsert fails or model has no @id for upsert. 
            // wait, PostShare DOES have an id in Prisma schema!
          });
        }
      }
    }
  }

  // 4. Saves (state.saves[videoId][userId])
  console.log('Migrating Saves...');
  if (state.saves) {
    for (const [postId, users] of Object.entries(state.saves)) {
      for (const [userId, timestamp] of Object.entries(users)) {
        await prisma.postSave.upsert({
          where: { userId_postId: { userId, postId } },
          update: {},
          create: {
            userId,
            postId,
            createdAt: timestamp ? new Date(timestamp) : new Date()
          }
        }).catch(e => {});
      }
    }
  }

  // 5. Blocks (state.blockedUsers[blockerId] = array of blockedIds)
  console.log('Migrating Blocks...');
  if (state.blockedUsers) {
    for (const [blockerId, blockedUsers] of Object.entries(state.blockedUsers)) {
      for (const blockedId of blockedUsers) {
        await prisma.userBlock.upsert({
          where: { blockerId_blockedId: { blockerId, blockedId } },
          update: {},
          create: {
            blockerId,
            blockedId
          }
        }).catch(e => {});
      }
    }
  }

  // 6. Connects (state.connects[userId][serviceName])
  console.log('Migrating Connects...');
  if (state.connects) {
    for (const [userId, services] of Object.entries(state.connects)) {
      for (const [serviceName, data] of Object.entries(services)) {
        if (data.connected) {
          await prisma.serviceConnection.upsert({
            where: { userId_serviceName: { userId, serviceName } },
            update: {
              permissions: data.meta ? JSON.stringify(data.meta.permissions || []) : null
            },
            create: {
              userId,
              serviceName,
              permissions: data.meta ? JSON.stringify(data.meta.permissions || []) : null,
              createdAt: data.createdAt ? new Date(data.createdAt) : new Date()
            }
          }).catch(e => {});
        }
      }
    }
  }

  console.log('Stage 3E Migration Complete!');
}

migrateStage3E().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
