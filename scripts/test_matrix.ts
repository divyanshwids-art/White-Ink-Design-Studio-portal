import 'dotenv/config';
import express from 'express';
import { db } from '../server/db.ts';
import { authRouter } from '../server/routes/auth.ts';
import { usersRouter } from '../server/routes/users.ts';

async function runTests() {
  await db.init();

  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);

  const server = app.listen(3999);
  const BASE = 'http://localhost:3999';

  console.log('Testing against ephemeral test server on port 3999...');

  async function login(email: string, password: string) {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
    return data.token;
  }

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name} ->`, err.message);
      failed++;
    }
  }

  // 1. Direct registration endpoint is disabled (403 Forbidden)
  await testCase('Public register is disabled (returns 403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Test Client Admin ${unique}`,
        email: `clientadmin_${unique}@example.com`,
        password: 'password123',
        companyName: `Test Company ${unique}`
      })
    });
    const data = await res.json();
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}: ${JSON.stringify(data)}`);
    if (!data.message || !data.message.toLowerCase().includes('disabled')) {
      throw new Error(`Expected disabled message, got ${JSON.stringify(data)}`);
    }
  });

  // Login actors with correct seed credentials
  const superAdminToken = await login('alex@planforge.io', 'Admin@123');
  const adminToken = await login('sarah@planforge.io', 'Admin@123');
  const clientAdminToken = await login('jonathan@acmecorp.com', 'Client@123'); // Acme Corp
  const clientToken = await login('rachel@acmecorp.com', 'Client@123');
  const teamMemberToken = await login('david@planforge.io', 'User@123');

  // Fetch Acme Corp Client ID
  const acmeClientAdmin = await db.getUserByEmail('jonathan@acmecorp.com');
  const acmeClientId = acmeClientAdmin?.clientId;
  if (!acmeClientId) throw new Error('Acme client ID not found on seeded client admin');

  // Fetch Globex Client ID
  const globexClient = await db.getUserByEmail('homer@globex.com');
  const globexClientId = globexClient?.clientId;
  if (!globexClientId) throw new Error('Globex client ID not found');

  // 2. SUPER_ADMIN checks
  await testCase('SUPER_ADMIN can create ADMIN', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `New Studio Admin ${unique}`,
        email: `new_admin_${unique}@whiteink.com`,
        password: 'password123',
        role: 'ADMIN'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.role !== 'ADMIN') throw new Error(`Expected role ADMIN, got ${data.role}`);
    await db.deleteUser(data.id);
  });

  await testCase('SUPER_ADMIN can create CLIENT_ADMIN with clientId', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `New Client Admin ${unique}`,
        email: `new_ca_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT_ADMIN',
        clientId: acmeClientId
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.role !== 'CLIENT_ADMIN') throw new Error(`Expected role CLIENT_ADMIN, got ${data.role}`);
    if (data.clientId !== acmeClientId) throw new Error(`Expected clientId ${acmeClientId}, got ${data.clientId}`);
    await db.deleteUser(data.id);
  });

  await testCase('SUPER_ADMIN creating CLIENT_ADMIN without clientId fails (400)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `New Client Admin ${unique}`,
        email: `new_ca_fail_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT_ADMIN'
      })
    });
    if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  });

  await testCase('SUPER_ADMIN CANNOT create TEAM_MEMBER (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `Illegal Dev ${unique}`,
        email: `illegal_dev_${unique}@whiteink.com`,
        password: 'password123',
        role: 'TEAM_MEMBER'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('SUPER_ADMIN CANNOT create CLIENT (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${superAdminToken}` },
      body: JSON.stringify({
        name: `Illegal Client ${unique}`,
        email: `illegal_client_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT',
        clientId: acmeClientId
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 3. ADMIN checks
  await testCase('ADMIN can create TEAM_MEMBER', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `New Team Member ${unique}`,
        email: `new_tm_${unique}@whiteink.com`,
        password: 'password123',
        role: 'TEAM_MEMBER'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.role !== 'TEAM_MEMBER') throw new Error(`Expected role TEAM_MEMBER, got ${data.role}`);
    await db.deleteUser(data.id);
  });

  await testCase('ADMIN CANNOT create ADMIN (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Illegal Admin ${unique}`,
        email: `illegal_admin_${unique}@whiteink.com`,
        password: 'password123',
        role: 'ADMIN'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('ADMIN CANNOT create CLIENT_ADMIN (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Illegal CA ${unique}`,
        email: `illegal_ca_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT_ADMIN',
        clientId: acmeClientId
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('ADMIN CANNOT create CLIENT (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: `Illegal Client ${unique}`,
        email: `illegal_client_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT',
        clientId: acmeClientId
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 4. CLIENT_ADMIN checks
  let createdClientId = '';
  await testCase('CLIENT_ADMIN can create CLIENT (auto-linked to own clientId)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({
        name: `Acme Colleague ${unique}`,
        email: `colleague_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT'
      })
    });
    const data = await res.json();
    if (res.status !== 201) throw new Error(`Expected 201, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.role !== 'CLIENT') throw new Error(`Expected role CLIENT, got ${data.role}`);
    if (data.clientId !== acmeClientId) throw new Error(`Expected auto-linked clientId ${acmeClientId}, got ${data.clientId}`);
    createdClientId = data.id;
  });

  await testCase('CLIENT_ADMIN CANNOT create CLIENT for different company (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({
        name: `Imposter ${unique}`,
        email: `imposter_${unique}@globex.com`,
        password: 'password123',
        role: 'CLIENT',
        clientId: globexClientId
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('CLIENT_ADMIN CANNOT create CLIENT_ADMIN (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({
        name: `Second CA ${unique}`,
        email: `second_ca_${unique}@acme.com`,
        password: 'password123',
        role: 'CLIENT_ADMIN'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('CLIENT_ADMIN CANNOT create TEAM_MEMBER (403 Forbidden)', async () => {
    const unique = Date.now();
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({
        name: `Infiltrator ${unique}`,
        email: `infiltrator_${unique}@whiteink.com`,
        password: 'password123',
        role: 'TEAM_MEMBER'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  // 5. Scoping checks: CLIENT_ADMIN listing users
  await testCase('CLIENT_ADMIN GET /api/users only returns users with their own clientId', async () => {
    const res = await fetch(`${BASE}/api/users`, {
      headers: { Authorization: `Bearer ${clientAdminToken}` }
    });
    const users = await res.json();
    if (!Array.isArray(users)) throw new Error('Expected array of users');
    for (const u of users) {
      if (u.clientId !== acmeClientId) {
        throw new Error(`User ${u.name} has clientId ${u.clientId}, expected ${acmeClientId}`);
      }
    }
  });

  // 6. CLIENT_ADMIN updating and deleting users
  await testCase('CLIENT_ADMIN can update their own company member', async () => {
    const res = await fetch(`${BASE}/api/users/${createdClientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({ name: 'Updated Acme Colleague' })
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}: ${JSON.stringify(data)}`);
    if (data.name !== 'Updated Acme Colleague') throw new Error(`Expected name updated, got ${data.name}`);
  });

  await testCase('CLIENT_ADMIN CANNOT update user from another company (403/404)', async () => {
    const homer = await db.getUserByEmail('homer@globex.com');
    if (!homer) throw new Error('Homer user not found');
    const res = await fetch(`${BASE}/api/users/${homer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientAdminToken}` },
      body: JSON.stringify({ name: 'Hacked Homer' })
    });
    if (res.status !== 403 && res.status !== 404) throw new Error(`Expected 403/404, got ${res.status}`);
  });

  await testCase('CLIENT_ADMIN can delete their own company member', async () => {
    const res = await fetch(`${BASE}/api/users/${createdClientId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${clientAdminToken}` }
    });
    if (res.status !== 200) throw new Error(`Expected 200, got ${res.status}`);
  });

  // 7. TEAM_MEMBER and CLIENT cannot create users
  await testCase('TEAM_MEMBER cannot create any user (403 Forbidden)', async () => {
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${teamMemberToken}` },
      body: JSON.stringify({
        name: 'Dev Friend',
        email: 'friend@whiteink.com',
        password: 'password123',
        role: 'TEAM_MEMBER'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  await testCase('CLIENT cannot create any user (403 Forbidden)', async () => {
    const res = await fetch(`${BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        name: 'Client Friend',
        email: 'clientfriend@acme.com',
        password: 'password123',
        role: 'CLIENT'
      })
    });
    if (res.status !== 403) throw new Error(`Expected 403, got ${res.status}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  server.close(() => {
    process.exit(failed > 0 ? 1 : 0);
  });
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
