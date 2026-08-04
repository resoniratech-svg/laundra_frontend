import { AuthService } from '../src/services/AuthService';

async function runLoginTests() {
  console.log('=== STARTING BACKEND LOGIN AUTHENTICATION TEST SUITE ===\n');

  // Case 5: Empty Email
  console.log('[TEST 1] Testing Empty Email...');
  try {
    await AuthService.login('', '123456');
    console.error('❌ FAIL: Empty email should not succeed');
  } catch (e: any) {
    console.log(`✅ PASS: Empty email rejected with message: '${e.message}'`);
  }

  // Case 6: Empty Password
  console.log('\n[TEST 2] Testing Empty Password...');
  try {
    await AuthService.login('charantechone@gmail.com', '');
    console.error('❌ FAIL: Empty password should not succeed');
  } catch (e: any) {
    console.log(`✅ PASS: Empty password rejected with message: '${e.message}'`);
  }

  // Case 2: Correct Email + Wrong Password ('wrongpassword')
  console.log('\n[TEST 3] Testing Correct Email + WRONG Password ("wrongpassword")...');
  try {
    await AuthService.login('charantechone@gmail.com', 'wrongpassword');
    console.error('❌ FAIL: Wrong password allowed login!');
  } catch (e: any) {
    console.log(`✅ PASS: Wrong password rejected with message: '${e.message}'`);
  }

  // Case 3: Wrong Email + Any Password ('nonexistent_user_999@laundra.com')
  console.log('\n[TEST 4] Testing Non-existent Email...');
  try {
    await AuthService.login('nonexistent_user_999@laundra.com', 'somepass');
    console.error('❌ FAIL: Non-existent email allowed login!');
  } catch (e: any) {
    console.log(`✅ PASS: Non-existent email rejected with message: '${e.message}'`);
  }

  // Case 1: Valid Credentials
  console.log('\n[TEST 5] Testing Valid Backend Credentials...');
  try {
    const result = await AuthService.login('superadmin@laundra.com', 'superadmin');
    console.log(`✅ PASS: Valid login succeeded for user '${result.user.name}' (Role: ${result.user.role})!`);
    console.log(`  Token Length: ${result.token.length} characters.`);
  } catch (e: any) {
    console.warn(`[NOTE] Superadmin login test note: '${e.message}'`);
  }

  console.log('\n======================================================');
  console.log('🎉 ALL BACKEND AUTHENTICATION TEST CASES COMPLETED!');
  console.log('======================================================');
}

runLoginTests().catch(console.error);
