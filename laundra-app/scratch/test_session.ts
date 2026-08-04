import { SessionService } from '../src/utils/session';
import { useAuthStore } from '../src/store/authStore';
import { apiClient } from '../src/api/client';
import { User } from '../src/types/user';

async function testSessionLifecycle() {
  console.log('=== STARTING SESSION PERSISTENCE & LIFECYCLE TEST ===\n');

  const mockUser: User = {
    id: 'u-99',
    name: 'Prakash',
    email: 'prakash@laundra.com',
    password: '',
    role: 'delivery',
    status: 'Active',
    companyId: 'comp-101',
    createdAt: new Date().toISOString(),
  };

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token_content';

  // Step 1: Save Session
  console.log('[TEST 1] Action: Logging in and saving session to Secure Store...');
  await SessionService.saveSession(mockUser, mockToken);

  console.log('  => isAuthenticated in Zustand:', useAuthStore.getState().isAuthenticated);
  console.log('  => currentUser in Zustand:', useAuthStore.getState().currentUser?.name);
  console.log('  => Authorization Header in Axios:', apiClient.defaults.headers.common['Authorization']);

  if (!useAuthStore.getState().isAuthenticated || apiClient.defaults.headers.common['Authorization'] !== `Bearer ${mockToken}`) {
    throw new Error('Save session failed to hydrate state or set headers!');
  }
  console.log('✅ STEP 1 PASSED: Session saved & Axios header attached.');

  // Step 2: Simulate App Force Close & Startup
  console.log('\n[TEST 2] Action: Simulating App Force Close & Startup Hydration...');
  // Clear in-memory Zustand state & reset Axios headers
  useAuthStore.getState().logoutUser();
  delete apiClient.defaults.headers.common['Authorization'];

  console.log('  [State Reset] isAuthenticated before startup:', useAuthStore.getState().isAuthenticated);
  console.log('  [State Reset] Authorization Header before startup:', apiClient.defaults.headers.common['Authorization']);

  // Run app initialization hydration
  const session = await SessionService.loadSession();

  console.log('  => Hydrated User from Secure Store:', session?.user.name);
  console.log('  => isAuthenticated after startup:', useAuthStore.getState().isAuthenticated);
  console.log('  => Restored Authorization Header:', apiClient.defaults.headers.common['Authorization']);

  if (!session || !useAuthStore.getState().isAuthenticated || apiClient.defaults.headers.common['Authorization'] !== `Bearer ${mockToken}`) {
    throw new Error('Load session failed to restore token across app startup!');
  }
  console.log('✅ STEP 2 PASSED: Session restored automatically across app startup.');

  // Step 3: Logout
  console.log('\n[TEST 3] Action: Logging out...');
  await SessionService.clearSession();

  console.log('  => isAuthenticated after logout:', useAuthStore.getState().isAuthenticated);
  console.log('  => currentUser after logout:', useAuthStore.getState().currentUser);
  console.log('  => Authorization Header after logout:', apiClient.defaults.headers.common['Authorization']);

  if (useAuthStore.getState().isAuthenticated || apiClient.defaults.headers.common['Authorization']) {
    throw new Error('Logout failed to clear Secure Store or Axios headers!');
  }
  console.log('✅ STEP 3 PASSED: Logout completely cleared Secure Store & Axios headers.');

  console.log('\n==========================================================');
  console.log('🎉 ALL SESSION PERSISTENCE & LIFECYCLE TESTS PASSED 100%!');
  console.log('==========================================================');
}

testSessionLifecycle().catch(console.error);
