/**
 * Smoke test — end-to-end verification of WeddingOS core flows.
 *
 * Runs against a running API server. Usage:
 *   AGENTMAIL= SMOKE_API=http://localhost:5000 npx tsx scripts/smoke.ts
 *
 * Set SMOKE_API to the API base URL (default http://localhost:5000).
 * Set SMOKE_CLEANUP=1 to delete test data at the end (default: keep).
 */

const BASE = process.env.SMOKE_API ?? "http://localhost:5000";
const CLEANUP = process.env.SMOKE_CLEANUP === "1";

// Unique test identity so re-runs don't collide
const RUN = Date.now().toString(36);
const TEST_EMAIL = `smoke-${RUN}@test.weddingos.app`;
const TEST_PASSWORD = "SmokeTest!2026";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(
  path: string,
  options: { method?: string; body?: unknown; cookie?: string } = {},
) {
  const { method = "GET", body, cookie } = options;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, setCookie: res.headers.get("set-cookie") };
}

let cookie = "";

async function main() {
  console.log(`\n=== WeddingOS Smoke Test (run ${RUN}) ===`);
  console.log(`Target: ${BASE}\n`);

  // ── 1. Auth flow ─────────────────────────────────────────────────────
  console.log("── Auth ──");
  const register = await api("/api/auth/register", {
    method: "POST",
    body: {
      name: "Smoke Test Vendor",
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    },
  });
  ok("register vendor", register.status === 201 || register.status === 200, `status ${register.status}`);
  cookie = register.setCookie ?? "";
  ok("register returns session cookie", cookie.length > 0);

  const me = await api("/api/auth/me", { cookie });
  ok("GET /api/auth/me", me.status === 200 && !!(me.json as any)?.vendor, `status ${me.status}`);
  const vendorId = (me.json as any)?.vendor?.id;
  ok("vendor id present", typeof vendorId === "number");

  const dupRegister = await api("/api/auth/register", {
    method: "POST",
    body: { name: "Dup", email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  ok("duplicate email rejected", dupRegister.status === 409 || dupRegister.status === 400, `status ${dupRegister.status}`);

  const badLogin = await api("/api/auth/login", {
    method: "POST",
    body: { email: TEST_EMAIL, password: "wrongpassword" },
  });
  ok("bad password rejected", badLogin.status === 401, `status ${badLogin.status}`);

  const login = await api("/api/auth/login", {
    method: "POST",
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  ok("login success", login.status === 200, `status ${login.status}`);
  cookie = login.setCookie ?? cookie;
  ok("login returns session cookie", cookie.length > 0);

  // ── 2. Client CRUD ──────────────────────────────────────────────────
  console.log("\n── Clients ──");
  const clientRes = await api("/api/clients", {
    method: "POST",
    cookie,
    body: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "555-0101",
      partnerName: "John Doe",
      weddingDate: "2027-06-15",
      venue: "The Fountains",
      notes: "Smoke test client",
      status: "active",
    },
  });
  ok("create client", clientRes.status === 201, `status ${clientRes.status}`);
  const clientId = (clientRes.json as any)?.client?.id;
  ok("client id present", typeof clientId === "number");

  const clientsList = await api("/api/clients", { cookie });
  ok("list clients", clientsList.status === 200 && Array.isArray((clientsList.json as any)?.clients), `status ${clientsList.status}`);
  ok("client in list", (clientsList.json as any)?.clients?.some((c: any) => c.id === clientId));

  const clientDetail = await api(`/api/clients/${clientId}`, { cookie });
  ok("get client detail", clientDetail.status === 200 && (clientDetail.json as any)?.client?.name === "Jane Doe");

  // ── 3. Timeline ─────────────────────────────────────────────────────
  console.log("\n── Timeline ──");
  const eventRes = await api(`/api/timeline/${clientId}`, {
    method: "POST",
    cookie,
    body: {
      title: "Ceremony",
      description: "The main event",
      eventDate: "2027-06-15",
      startTime: "14:00",
      endTime: "15:00",
      location: "Chapel",
      category: "ceremony",
    },
  });
  ok("create timeline event", eventRes.status === 201, `status ${eventRes.status}`);
  const eventId = (eventRes.json as any)?.event?.id;

  const eventRes2 = await api(`/api/timeline/${clientId}`, {
    method: "POST",
    cookie,
    body: {
      title: "Reception",
      eventDate: "2027-06-15",
      startTime: "17:00",
      endTime: "23:00",
      category: "reception",
    },
  });
  ok("create second event", eventRes2.status === 201);

  const timelineList = await api(`/api/timeline/${clientId}`, { cookie });
  const events = (timelineList.json as any)?.events ?? [];
  ok("list timeline events", timelineList.status === 200 && events.length >= 2, `count ${events.length}`);

  // Reorder
  const reorder = await api("/api/timeline/reorder", {
    method: "PATCH",
    cookie,
    body: { items: events.map((e: any, i: number) => ({ id: e.id, sort_order: i })) },
  });
  ok("reorder events", reorder.status === 200, `status ${reorder.status}`);

  // ── 4. Invoices + Stripe ────────────────────────────────────────────
  console.log("\n── Invoices ──");
  const invoiceRes = await api(`/api/invoices/${clientId}`, {
    method: "POST",
    cookie,
    body: {
      invoiceNumber: `INV-${RUN}`,
      amountCents: 250000,
      dueDate: "2027-07-01",
      notes: "Smoke test invoice",
      lineItems: [
        { description: "Wedding photography — 8 hours", quantity: 1, unitPriceCents: 250000, totalCents: 250000 },
      ],
    },
  });
  ok("create invoice", invoiceRes.status === 201, `status ${invoiceRes.status}`);
  const invoiceId = (invoiceRes.json as any)?.invoice?.id;

  const invoiceList = await api(`/api/invoices/${clientId}`, { cookie });
  ok("list invoices", invoiceList.status === 200 && (invoiceList.json as any)?.invoices?.length >= 1);

  const sendInvoice = await api(`/api/invoices/${invoiceId}/send`, {
    method: "POST",
    cookie,
  });
  ok("send invoice", sendInvoice.status === 200, `status ${sendInvoice.status}`);

  const payInvoice = await api(`/api/invoices/${invoiceId}/pay`, {
    method: "POST",
    cookie,
  });
  ok(
    "pay invoice (checkout URL or paid status)",
    (payInvoice.status === 200 && (payInvoice.json as any)?.checkoutUrl) ||
      (payInvoice.status === 200 && (payInvoice.json as any)?.invoice?.status === "paid"),
    `status ${payInvoice.status}`,
  );

  // ── 5. Contracts + email ────────────────────────────────────────────
  console.log("\n── Contracts ──");
  const contractRes = await api(`/api/contracts/${clientId}`, {
    method: "POST",
    cookie,
    body: {
      title: "Photography Agreement",
      content: `Photography Agreement between Jane Doe and the vendor. Coverage: 8 hours. Price: $2500.00.`,
    },
  });
  ok("create contract", contractRes.status === 201, `status ${contractRes.status}`);
  const contractId = (contractRes.json as any)?.contract?.id;

  const sendContract = await api(`/api/contracts/${contractId}/send`, {
    method: "POST",
    cookie,
  });
  ok("send contract", sendContract.status === 200 && (sendContract.json as any)?.contract?.status === "sent");

  const signContract = await api(`/api/contracts/${contractId}/sign`, {
    method: "POST",
    cookie,
    body: { signatureData: { name: "Jane Doe", ip: "127.0.0.1", date: new Date().toISOString() } },
  });
  ok("sign contract", signContract.status === 200 && (signContract.json as any)?.contract?.status === "signed");

  // ── 6. Galleries + public portal ────────────────────────────────────
  console.log("\n── Galleries ──");
  const galleryRes = await api(`/api/galleries/${clientId}`, {
    method: "POST",
    cookie,
    body: {
      title: "Engagement Shoot",
      description: "Golden hour at the park",
      passwordHash: "smoke-pass", // NOTE: real app hashes; test endpoint accepts
      isPublished: false,
      hasProofing: true,
    },
  });
  ok("create gallery", galleryRes.status === 201, `status ${galleryRes.status}`);
  const galleryId = (galleryRes.json as any)?.gallery?.id;

  const publishGallery = await api(`/api/galleries/${galleryId}`, {
    method: "PATCH",
    cookie,
    body: { isPublished: true },
  });
  ok("publish gallery", publishGallery.status === 200 && (publishGallery.json as any)?.gallery?.isPublished === true);

  // Public access — images endpoint should work without auth
  const publicImages = await api(`/api/g/public/${galleryId}/images`);
  ok("public gallery images accessible", publicImages.status === 200, `status ${publicImages.status}`);
  ok("public gallery returns gallery info", !!(publicImages.json as any)?.gallery);

  // ── 7. Calendar ─────────────────────────────────────────────────────
  console.log("\n── Calendar ──");
  const slotRes = await api("/api/calendar", {
    method: "POST",
    cookie,
    body: {
      startTime: new Date(Date.now() + 7 * 864e5).toISOString(),
      endTime: new Date(Date.now() + 7 * 864e5 + 3600e3).toISOString(),
      serviceType: "Consultation",
    },
  });
  ok("create calendar slot", slotRes.status === 201, `status ${slotRes.status}`);

  const calendarList = await api("/api/calendar", { cookie });
  ok("list calendar slots", calendarList.status === 200 && Array.isArray((calendarList.json as any)?.slots));

  // ── 8. Settings ─────────────────────────────────────────────────────
  console.log("\n── Settings ──");
  const profile = await api("/api/vendors/profile", { cookie });
  ok("get vendor profile", profile.status === 200 && (profile.json as any)?.vendor?.businessName !== undefined, `status ${profile.status}`);

  const updateProfile = await api("/api/vendors/profile", {
    method: "PATCH",
    cookie,
    body: { businessName: "Smoke Test Studios", phone: "555-9999" },
  });
  ok("update vendor profile", updateProfile.status === 200, `status ${updateProfile.status}`);

  // ── 9. Logout ───────────────────────────────────────────────────────
  console.log("\n── Logout ──");
  const logout = await api("/api/auth/logout", { method: "POST", cookie });
  ok("logout", logout.status === 200, `status ${logout.status}`);

  // Session should be invalid after logout
  const meAfterLogout = await api("/api/auth/me", { cookie });
  ok("session invalid after logout", meAfterLogout.status === 401, `status ${meAfterLogout.status}`);

  // ── Summary ─────────────────────────────────────────────────────────
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  console.log("\nAll smoke tests passed ✓");
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
