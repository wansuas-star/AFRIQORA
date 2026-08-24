const fetch = require('node-fetch');

const BASE = process.env.BASE || 'http://localhost:4010';

function extractCookie(setCookie) {
  if (!setCookie) return '';
  return String(setCookie).split(';')[0] || '';
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function request(method, path, body, cookie, extraHeaders = {}) {
  const headers = Object.assign({}, extraHeaders);
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json().catch(() => ({}));
  return { res, json };
}

async function register(label) {
  const email = `${label}+${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'TestPass123!';
  const r = await request('POST', '/auth/register', { email, password, displayName: label });
  if (!r.res.ok || !r.json.ok || !r.json.user) fail('register failed: ' + label, 10);
  const cookie = extractCookie(r.res.headers.get('set-cookie'));
  if (!cookie) fail('missing cookie: ' + label, 11);
  return { cookie, user: r.json.user };
}

async function getNotifications(cookie, cursor = 0, limit = 50) {
  const r = await request('GET', '/notifications?cursor=' + encodeURIComponent(String(cursor)) + '&limit=' + encodeURIComponent(String(limit)), null, cookie);
  if (!r.res.ok || !r.json.ok || !Array.isArray(r.json.items)) fail('notifications fetch failed', 12);
  return r.json;
}

function findNote(notes, predicate) {
  return (notes || []).find(predicate) || null;
}

async function run() {
  console.log('Notifications integration test against', BASE);

  const creator = await register('notes-creator');
  const viewer = await register('notes-viewer');
  const second = await register('notes-second');
  const blocked = await register('notes-blocked');

  const postResp = await request('POST', '/creator/posts', {
    title: 'Notifications Test Post',
    content: 'Post used for notification flow tests.',
    category: 'Testing',
    location: 'Johannesburg',
    status: 'published'
  }, creator.cookie);
  if (!postResp.res.ok || !postResp.json.ok || !postResp.json.post) fail('post create failed', 13);
  const contentId = String(postResp.json.post.id);

  const businessResp = await request('POST', '/creator/business-profile', {
    businessName: 'Notifications Business',
    ownerDisplayName: 'Notifications Creator',
    category: 'Consulting',
    location: 'Johannesburg',
    description: 'Business profile for enquiry notifications.'
  }, creator.cookie);
  if (!businessResp.res.ok || !businessResp.json.ok || !businessResp.json.businessProfile) fail('business profile create failed', 14);
  const businessId = String(businessResp.json.businessProfile.id);

  const follow = await request('POST', '/follow', { creatorId: creator.user.afriqoraId, followerId: viewer.user.id }, viewer.cookie);
  if (!follow.res.ok || !follow.json.ok) fail('follow failed', 15);

  const like1 = await request('POST', '/interactions/like', { videoId: contentId, userId: viewer.user.id }, viewer.cookie);
  if (!like1.res.ok || !like1.json.ok || like1.json.liked !== true) fail('like 1 failed', 16);
  const like2 = await request('POST', '/interactions/like', { videoId: contentId, userId: viewer.user.id }, viewer.cookie);
  if (!like2.res.ok || !like2.json.ok || like2.json.liked !== false) fail('like dedupe behavior failed', 17);

  const comment = await request('POST', '/comments', { videoId: contentId, authorId: viewer.user.id, text: 'Top post!' }, viewer.cookie);
  if (!comment.res.ok || !comment.json.ok || !comment.json.comment) fail('comment failed', 18);

  const reply = await request('POST', '/comments', {
    videoId: contentId,
    authorId: creator.user.id,
    text: 'Thanks for the feedback',
    parentCommentId: String(comment.json.comment.id)
  }, creator.cookie);
  if (!reply.res.ok || !reply.json.ok || !reply.json.comment) fail('reply failed', 19);

  const share = await request('POST', '/interactions/share', { videoId: contentId, userId: viewer.user.id, platform: 'native' }, viewer.cookie);
  if (!share.res.ok || !share.json.ok) fail('share failed', 20);

  const save = await request('POST', '/interactions/save', { videoId: contentId }, viewer.cookie);
  if (!save.res.ok || !save.json.ok || save.json.saved !== true) fail('save failed', 21);

  const connectionRequest = await request('POST', '/connections/request', { targetUserId: creator.user.id }, second.cookie);
  if (!connectionRequest.res.ok || !connectionRequest.json.ok || !connectionRequest.json.request) fail('connection request failed', 22);
  const connectionAccept = await request('POST', '/connections/respond', {
    requestId: String(connectionRequest.json.request.id),
    action: 'accept'
  }, creator.cookie);
  if (!connectionAccept.res.ok || !connectionAccept.json.ok) fail('connection accept failed', 23);

  const message = await request('POST', '/messages/thread', { text: 'Need help with creator tools' }, viewer.cookie);
  if (!message.res.ok || !message.json.ok) fail('message thread post failed', 24);

  const enquiry = await request('POST', '/business/enquiries', {
    businessId,
    message: 'I want to book your consulting service.',
    contactMode: 'test'
  }, viewer.cookie);
  if (!enquiry.res.ok || !enquiry.json.ok || !enquiry.json.enquiry) fail('business enquiry failed', 25);

  const creatorNotes = await getNotifications(creator.cookie, 0, 60);
  const viewerNotes = await getNotifications(viewer.cookie, 0, 60);
  const secondNotes = await getNotifications(second.cookie, 0, 60);

  const followNote = findNote(creatorNotes.items, (n) => n.type === 'new_follower' && String(n.actorUserId) === String(viewer.user.id));
  if (!followNote) fail('missing follow notification for creator', 26);

  const likeNote = findNote(creatorNotes.items, (n) => n.type === 'post_like' && String(n.objectId) === contentId);
  if (!likeNote) fail('missing like notification for creator', 27);

  const commentNote = findNote(creatorNotes.items, (n) => n.type === 'post_comment' && String(n.actorUserId) === String(viewer.user.id));
  if (!commentNote) fail('missing comment notification for creator', 28);

  const replyNote = findNote(viewerNotes.items, (n) => n.type === 'comment_reply' && String(n.actorUserId) === String(creator.user.id));
  if (!replyNote) fail('missing reply notification for viewer', 29);

  const shareNote = findNote(creatorNotes.items, (n) => n.type === 'post_share' && String(n.actorUserId) === String(viewer.user.id));
  if (!shareNote) fail('missing share notification for creator', 30);

  const saveNote = findNote(creatorNotes.items, (n) => n.type === 'content_save' && String(n.actorUserId) === String(viewer.user.id));
  if (!saveNote) fail('missing save notification for creator', 31);

  const connectionRequestNote = findNote(creatorNotes.items, (n) => n.type === 'connection_request' && String(n.actorUserId) === String(second.user.id));
  if (!connectionRequestNote) fail('missing connection request notification for creator', 32);

  const connectionAcceptedNote = findNote(secondNotes.items, (n) => n.type === 'connection_accepted' && String(n.actorUserId) === String(creator.user.id));
  if (!connectionAcceptedNote) fail('missing connection accepted notification for requester', 33);

  const messageNote = findNote(viewerNotes.items, (n) => n.type === 'message_received');
  if (!messageNote || String(messageNote.route || '') !== '#/messages') fail('missing or invalid message notification', 34);

  const enquiryNote = findNote(creatorNotes.items, (n) => n.type === 'business_enquiry' && String(n.actorUserId) === String(viewer.user.id));
  if (!enquiryNote) fail('missing business enquiry notification', 35);

  const likeNotesForContent = creatorNotes.items.filter((n) => n.type === 'post_like' && String(n.objectId) === contentId && String(n.actorUserId) === String(viewer.user.id));
  if (likeNotesForContent.length !== 1) fail('duplicate like notifications were created', 36);

  const blockResp = await request('POST', '/users/block', { targetUserId: blocked.user.id }, creator.cookie);
  if (!blockResp.res.ok || !blockResp.json.ok) fail('creator block failed', 37);
  const blockedLike = await request('POST', '/interactions/like', { videoId: contentId, userId: blocked.user.id }, blocked.cookie);
  if (!blockedLike.res.ok || !blockedLike.json.ok) fail('blocked user like request failed', 38);

  const creatorAfterBlock = await getNotifications(creator.cookie, 0, 80);
  const blockedActorLike = creatorAfterBlock.items.filter((n) => n.type === 'post_like' && String(n.actorUserId) === String(blocked.user.id));
  if (blockedActorLike.length > 0) fail('blocked user still generated visible notifications', 39);

  for (let i = 0; i < 8; i += 1) {
    const c = await request('POST', '/comments', { videoId: contentId, authorId: second.user.id, text: 'Pagination comment ' + i }, second.cookie);
    if (!c.res.ok || !c.json.ok) fail('failed to generate pagination comment ' + i, 40);
  }

  const page1 = await getNotifications(creator.cookie, 0, 5);
  if (!page1.hasMore || typeof page1.nextCursor !== 'number') fail('pagination first page invalid', 41);
  const page2 = await getNotifications(creator.cookie, page1.nextCursor, 5);
  if (!Array.isArray(page2.items) || page2.items.length < 1) fail('pagination second page missing items', 42);

  const markOne = await request('POST', '/notifications/' + encodeURIComponent(String(page1.items[0].id)) + '/read', {}, creator.cookie);
  if (!markOne.res.ok || !markOne.json.ok) fail('mark one read failed', 43);

  const unreadBeforeAll = await request('GET', '/notifications/unread-count', null, creator.cookie);
  if (!unreadBeforeAll.res.ok || !unreadBeforeAll.json.ok) fail('unread count before mark-all failed', 44);

  const markAll = await request('POST', '/notifications/read-all', {}, creator.cookie);
  if (!markAll.res.ok || !markAll.json.ok) fail('mark all read failed', 45);

  const unreadAfterAll = await request('GET', '/notifications/unread-count', null, creator.cookie);
  if (!unreadAfterAll.res.ok || !unreadAfterAll.json.ok || Number(unreadAfterAll.json.unreadCount || 0) !== 0) fail('mark all did not clear unread count', 46);

  const isolationAttempt = await request('POST', '/notifications/' + encodeURIComponent(String(page1.items[0].id)) + '/read', {}, viewer.cookie);
  if (isolationAttempt.res.status !== 404) fail('notification user isolation failed', 47);

  console.log('Notifications integration test passed');
  process.exit(0);
}

run().catch((err) => {
  console.error('Notifications test error', err);
  process.exit(99);
});
