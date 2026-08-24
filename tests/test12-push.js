const { PushNotificationService } = require('../server/pushService');

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

async function run() {
  console.log('Testing Push Notification Service (Test 12)');

  // Initialize without production keys
  const service = new PushNotificationService({
    fcmServerKey: '',
    apnsKeyId: ''
  });

  const payload = { title: 'Test', message: 'Hello' };

  console.log('1. Testing Android (FCM) Routing & Fallback');
  const androidResult = await service.sendToDevices([{ token: 'mock-android-123', platform: 'android' }], payload);
  if (androidResult.success !== 1 || androidResult.failed !== 0) {
    fail('Android fallback delivery failed', 11);
  }
  if (!androidResult.results || androidResult.results[0].status !== 'sent') {
    fail('Android result status mismatch', 12);
  }

  console.log('2. Testing iOS (APNs) Routing & Fallback');
  const iosResult = await service.sendToDevices([{ token: 'mock-ios-456', platform: 'ios' }], payload);
  if (iosResult.success !== 1 || iosResult.failed !== 0) {
    fail('iOS fallback delivery failed', 13);
  }
  if (!iosResult.results || iosResult.results[0].status !== 'sent') {
    fail('iOS result status mismatch', 14);
  }

  console.log('3. Testing Malformed and Empty Token Handling');
  
  // Empty array
  const emptyResult = await service.sendToDevices([], payload);
  if (emptyResult.success !== 0 || emptyResult.failed !== 0 || emptyResult.results.length !== 0) {
    fail('Empty array handling failed', 15);
  }

  // Null tokens
  const nullResult = await service.sendToDevices([{ token: null }], payload);
  if (nullResult.success !== 0 || nullResult.failed !== 0 || nullResult.results.length !== 0) {
    fail('Null token handling failed', 16);
  }

  // Undefined devices
  const undefinedResult = await service.sendToDevices(undefined, payload);
  if (undefinedResult.success !== 0 || undefinedResult.failed !== 0 || undefinedResult.results.length !== 0) {
    fail('Undefined payload handling failed', 17);
  }

  console.log('4. Verifying Aggregated Response Structure');
  const mixedResult = await service.sendToDevices([
    { token: 't1', platform: 'android' },
    { token: 't2', platform: 'ios' },
    { token: null }
  ], payload);

  if (!('success' in mixedResult) || !('failed' in mixedResult) || !Array.isArray(mixedResult.results)) {
    fail('Response structure missing keys', 18);
  }
  if (mixedResult.success !== 2 || mixedResult.failed !== 0 || mixedResult.results.length !== 2) {
    fail('Response structure count mismatch', 19);
  }

  console.log('Test 12 Passed! Push Notification Service verified.');
  process.exit(0);
}

run().catch(err => {
  console.error('Test 12 error', err);
  process.exit(99);
});
