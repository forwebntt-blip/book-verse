import process from "node:process";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";

async function checkJson(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  return JSON.parse(text);
}

async function checkHtml(path, matcher) {
  const response = await fetch(`${baseUrl}${path}`);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned ${response.status}: ${text.slice(0, 300)}`);
  }

  if (!matcher.test(text)) {
    throw new Error(`${path} did not include expected shell marker.`);
  }
}

async function main() {
  const health = await checkJson("/health");
  if (health?.data?.status !== "ok") {
    throw new Error("Health payload is missing status=ok.");
  }

  const csrf = await checkJson("/csrf-token");
  if (!csrf?.success || !csrf?.data?.csrfToken) {
    throw new Error("CSRF endpoint did not return a token.");
  }

  const shellMarker = /meta name="csrf-token"|Dang nhap tai khoan|Hoan tat don hang|Tao tai khoan moi/i;
  await checkHtml("/", shellMarker);
  await checkHtml("/books", shellMarker);
  await checkHtml("/search", shellMarker);
  await checkHtml("/cart", shellMarker);
  await checkHtml("/login", shellMarker);

  console.log(
    JSON.stringify(
      {
        passed: true,
        checked: [
          "/health",
          "/csrf-token",
          "/",
          "/books",
          "/search",
          "/cart",
          "/login",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
