import { POST } from "../app/api/transcribe/route";
import { NextRequest } from "next/server";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
  console.log(`✓ ${msg}`);
}

async function runTests() {
  console.log("=== RUNNING AUDIO ROUTE TESTS ===\n");

  // 1. Missing file in request returns 400
  console.log("--- 1. Request Validation Tests ---");
  const emptyFormData = new FormData();
  const reqWithoutFile = new NextRequest("http://localhost:3000/api/transcribe", {
    method: "POST",
    body: emptyFormData,
  });

  const res1 = await POST(reqWithoutFile);
  const data1 = await res1.json();
  assert(res1.status === 400, "Missing file returns 400 status");
  assert(data1.error === "missing_file", "Missing file error code is 'missing_file'");

  // 2. Server configuration pre-check
  const originalKey = process.env.GROQ_API_KEY;
  try {
    delete process.env.GROQ_API_KEY;
    const formData = new FormData();
    const fakeBlob = new Blob(["dummy audio content"], { type: "audio/webm" });
    formData.append("file", fakeBlob, "test.webm");

    const reqWithoutKey = new NextRequest("http://localhost:3000/api/transcribe", {
      method: "POST",
      body: formData,
    });

    const res2 = await POST(reqWithoutKey);
    const data2 = await res2.json();
    assert(res2.status === 500, "Missing API key returns 500 status");
    assert(data2.error === "server_misconfigured", "Error code is 'server_misconfigured'");
  } finally {
    if (originalKey === undefined) {
      delete process.env.GROQ_API_KEY;
    } else {
      process.env.GROQ_API_KEY = originalKey;
    }
  }

  // 3. Invalid MIME type returns 400
  const invalidMimeForm = new FormData();
  const textBlob = new Blob(["not audio"], { type: "text/plain" });
  invalidMimeForm.append("file", textBlob, "doc.txt");
  const reqInvalidMime = new NextRequest("http://localhost:3000/api/transcribe", {
    method: "POST",
    body: invalidMimeForm,
  });
  const res3 = await POST(reqInvalidMime);
  const data3 = await res3.json();
  assert(res3.status === 400, "Invalid mime type returns 400");
  assert(data3.error === "invalid_file_type", "Invalid mime error code is 'invalid_file_type'");

  console.log("\n=================================");
  console.log("🎉 ALL AUDIO TESTS PASSED!");
  console.log("=================================\n");
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
