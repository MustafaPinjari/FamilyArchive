// End-to-End automated verification script
const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=================================================");
  console.log("STARTING AUTOMATED ACCEPTANCE TESTS FOR ARCHIVE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test Landing Page
  console.log("--- 1. Testing Landing Page ---");
  const landingRes = await fetch(`${BASE_URL}/`);
  assert(landingRes.status === 200, "Landing page responds with HTTP 200");
  const landingHtml = await landingRes.text();
  assert(landingHtml.includes("OUR FAMILY ARCHIVE"), "Landing page displays 'OUR FAMILY ARCHIVE'");
  assert(landingHtml.includes("Enter Archive"), "Landing page has 'Enter Archive' CTA button");

  // 2. Test Unauthenticated Access
  console.log("\n--- 2. Testing Route Protection ---");
  const unauthTreeRes = await fetch(`${BASE_URL}/api/family-tree`);
  assert(unauthTreeRes.status === 401, "Unauthenticated /api/family-tree returns 401 Unauthorized");

  // 3. Test Authentication Login
  console.log("\n--- 3. Testing Authentication Login ---");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "mustafa", password: "Family@Archive2026" }),
  });
  assert(loginRes.status === 200, "Login as 'mustafa' returns 200 OK");
  const loginJson = await loginRes.json();
  assert(loginJson.user.username === "mustafa", "User is 'mustafa'");
  assert(loginJson.user.role === "SUPER_ADMIN", "User role is 'SUPER_ADMIN'");

  const setCookie = loginRes.headers.get("set-cookie");
  assert(Boolean(setCookie && setCookie.includes("family_archive_session")), "Session cookie 'family_archive_session' received");

  // Extract session cookie
  const sessionCookie = setCookie.split(";")[0];

  // 4. Test Session Validation
  console.log("\n--- 4. Testing Session Validation ---");
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  assert(meRes.status === 200, "/api/auth/me returns 200 OK");
  const meJson = await meRes.json();
  assert(meJson.authenticated === true, "Session is authenticated");
  assert(meJson.user.username === "mustafa", "Current user is mustafa");

  // 5. Test Dashboard Metrics
  console.log("\n--- 5. Testing Dashboard Metrics ---");
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
    headers: { Cookie: sessionCookie },
  });
  assert(dashRes.status === 200, "/api/dashboard returns 200 OK");
  const dashJson = await dashRes.json();
  assert(dashJson.metrics.members >= 37, `Dynamic member count is ${dashJson.metrics.members} (>= 37 members)`);
  assert(dashJson.familyLead.id === "akhtar", `Family lead is Akhtar (${dashJson.familyLead.nickname})`);
  assert(dashJson.generations.length === 4, `Found 4 distinct generations: ${dashJson.generations.map(g => `Gen ${g.generation}: ${g.count}`).join(", ")}`);

  // 6. Test Family Tree Dynamic Engine
  console.log("\n--- 6. Testing Family Tree Dynamic Engine ---");
  const treeRes = await fetch(`${BASE_URL}/api/family-tree`, {
    headers: { Cookie: sessionCookie },
  });
  assert(treeRes.status === 200, "/api/family-tree returns 200 OK");
  const treeJson = await treeRes.json();

  const mohammad = treeJson.members.find(m => m.id === "mohammad");
  assert(Boolean(mohammad && mohammad.is_deceased === 1), "Mohammad exists and is marked deceased (1)");

  const hamida = treeJson.members.find(m => m.id === "hamida");
  assert(Boolean(hamida), "Hamida exists");

  const akhtar = treeJson.members.find(m => m.id === "akhtar");
  assert(Boolean(akhtar && akhtar.is_family_lead === 1 && akhtar.nickname === "Bade Pappa"), "Akhtar exists, has nickname 'Bade Pappa', and is marked Family Lead");

  const shakur = treeJson.members.find(m => m.id === "shakur");
  const sattar = treeJson.members.find(m => m.id === "sattar");
  const mukhtar = treeJson.members.find(m => m.id === "mukhtar");

  assert(Boolean(shakur && sattar && mukhtar), "All 4 brothers exist");
  assert(
    akhtar.display_order < shakur.display_order &&
    shakur.display_order < sattar.display_order &&
    sattar.display_order < mukhtar.display_order,
    "Strict sibling order verified: Akhtar < Shakur < Sattar < Mukhtar"
  );

  assert(treeJson.layout.nodes.length > 0, `Layout engine generated ${treeJson.layout.nodes.length} positioned nodes`);
  assert(treeJson.layout.edges.length > 0, `Layout engine generated ${treeJson.layout.edges.length} marriage & branch edges`);
  assert(treeJson.layout.bounds.width > 0 && treeJson.layout.bounds.height > 0, `Tree layout bounds: ${treeJson.layout.bounds.width}x${treeJson.layout.bounds.height}`);

  // 7. Test Member Profile & Kinship
  console.log("\n--- 7. Testing Member Kinship & Profile ---");
  const mukhtarRes = await fetch(`${BASE_URL}/api/members/mukhtar`, {
    headers: { Cookie: sessionCookie },
  });
  assert(mukhtarRes.status === 200, "/api/members/mukhtar returns 200 OK");
  const mukhtarJson = await mukhtarRes.json();
  assert(mukhtarJson.kinship.father?.id === "mohammad", "Mukhtar's father is Mohammad");
  assert(mukhtarJson.kinship.mother?.id === "hamida", "Mukhtar's mother is Hamida");
  assert(mukhtarJson.kinship.spouse?.id === "shabana", "Mukhtar's spouse is Shabana");

  const mukhtarChildIds = mukhtarJson.kinship.children.map(c => c.id);
  assert(mukhtarChildIds.includes("mustafa") && mukhtarChildIds.includes("sharmin"), "Mukhtar's children are Mustafa and Sharmin");

  // 8. Test Document Vault Upload
  console.log("\n--- 8. Testing Document Vault Upload ---");
  const formData = new FormData();
  const dummyFile = new Blob(["SAMPLE AADHAAR CONTENT FOR VAULT"], { type: "text/plain" });
  formData.append("file", dummyFile, "aadhaar_mukhtar.txt");
  formData.append("person_id", "mukhtar");
  formData.append("name", "Mukhtar Aadhaar Card");
  formData.append("category", "Identity");
  formData.append("description", "Government Identity Proof");
  formData.append("document_number", "XXXX-XXXX-9901");
  formData.append("visibility", "FAMILY_ONLY");

  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert(uploadRes.status === 201, "Document upload for Mukhtar returns 201 Created");
  const uploadJson = await uploadRes.json();
  const uploadedDocId = uploadJson.document.id;
  assert(Boolean(uploadedDocId), `Document created with ID: ${uploadedDocId}`);

  // 9. Test Document Preview & Download
  console.log("\n--- 9. Testing Document Preview & Download ---");
  const previewRes = await fetch(`${BASE_URL}/api/documents/${uploadedDocId}/preview`, {
    headers: { Cookie: sessionCookie },
  });
  assert(previewRes.status === 200, "Preview endpoint returns 200 OK");
  const previewContent = await previewRes.text();
  assert(previewContent === "SAMPLE AADHAAR CONTENT FOR VAULT", "Preview streams exact file contents");

  const downloadRes = await fetch(`${BASE_URL}/api/documents/${uploadedDocId}/download`, {
    headers: { Cookie: sessionCookie },
  });
  assert(downloadRes.status === 200, "Download endpoint returns 200 OK");
  const disposition = downloadRes.headers.get("content-disposition");
  assert(Boolean(disposition && disposition.includes("attachment")), "Download has 'attachment' Content-Disposition");

  // 10. Test Audit Logs
  console.log("\n--- 10. Testing Audit Logs ---");
  const auditRes = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
    headers: { Cookie: sessionCookie },
  });
  assert(auditRes.status === 200, "/api/admin/audit-logs returns 200 OK");
  const auditJson = await auditRes.json();
  const uploadActionLogged = auditJson.logs.some(l => l.action === "UPLOAD_DOCUMENT" && l.target_id === uploadedDocId);
  assert(uploadActionLogged, "Document upload action is permanently recorded in audit logs");

  // 11. Test Global Search
  console.log("\n--- 11. Testing Global Search ---");
  const searchRes = await fetch(`${BASE_URL}/api/search?q=Aadhaar`, {
    headers: { Cookie: sessionCookie },
  });
  assert(searchRes.status === 200, "Search query 'Aadhaar' returns 200 OK");
  const searchJson = await searchRes.json();
  assert(searchJson.documents.some(d => d.id === uploadedDocId), "Global search finds newly uploaded Aadhaar document");

  // 12. Test Archive JSON Export
  console.log("\n--- 12. Testing Full Archive JSON Export ---");
  const exportRes = await fetch(`${BASE_URL}/api/admin/export`, {
    headers: { Cookie: sessionCookie },
  });
  assert(exportRes.status === 200, "/api/admin/export returns 200 OK");
  const exportJson = await exportRes.json();
  assert(exportJson.stats.total_members >= 37, `Export backup contains ${exportJson.stats.total_members} family members`);
  assert(exportJson.stats.total_documents >= 1, `Export backup contains ${exportJson.stats.total_documents} documents`);

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
