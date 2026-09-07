'use strict';

const base = process.argv[2] || 'http://127.0.0.1:5173';
const tests = [
  ['GET', '/', 200],
  ['GET', '/pages/about.html', 200],
  ['GET', '/pages/services.html', 200],
  ['GET', '/pages/projects.html', 200],
  ['GET', '/pages/blog.html', 200],
  ['GET', '/pages/contacts.html', 200],
  ['GET', '/pages/privacy.html', 200],
  ['GET', '/pages/cookies.html', 200],
  ['GET', '/favicon.ico', 200],
  ['GET', '/assets/favicon-32.png', 200],
  ['GET', '/server.js', 404],
  ['GET', '/package.json', 404],
  ['GET', '/README.md', 404],
  ['GET', '/AUDIT_REPORT.md', 404],
  ['GET', '/.git/config', 404],
  ['GET', '/%2e%2e%2fserver.js', 404],
  ['GET', '/assets/%2e%2e%2fserver.js', 404],
  ['GET', '/assets/%00.png', 404],
  ['GET', '/%E0%A4%A', 404],
  ['GET', '/assets/test.bak', 404],
  ['POST', '/', 405],
  ['PUT', '/pages/about.html', 405],
  ['HEAD', '/css/style.css', 200],
  ['GET', `/${'a'.repeat(2100)}`, 414],
];

const run = async () => {
  let failures = 0;
  for (const [method, requestPath, expected] of tests) {
    try {
      const response = await fetch(`${base}${requestPath}`, { method, redirect: 'manual' });
      const body = method === 'HEAD' ? '' : await response.text();
      const passed = response.status === expected;
      if (!passed) failures += 1;
      console.log(
        passed ? 'PASS' : 'FAIL',
        method.padEnd(5),
        String(response.status).padEnd(4),
        requestPath.slice(0, 70),
        method === 'HEAD' ? 'HEAD' : `${Buffer.byteLength(body)} bytes`
      );
    } catch (error) {
      failures += 1;
      console.log('FAIL', method, requestPath.slice(0, 70), error.cause?.code || error.message);
    }
  }

  const response = await fetch(`${base}/`);
  const csp = response.headers.get('content-security-policy') || '';
  const scriptPolicy = csp.split(';').find((directive) => directive.trim().startsWith('script-src')) || '';
  const headerChecks = [
    ['CSP blocks inline scripts', !scriptPolicy.includes("'unsafe-inline'")],
    ['CSP blocks framing', csp.includes("frame-ancestors 'none'")],
    ['HSTS enabled', Boolean(response.headers.get('strict-transport-security'))],
    ['MIME sniffing disabled', response.headers.get('x-content-type-options') === 'nosniff'],
    ['Legacy framing disabled', response.headers.get('x-frame-options') === 'DENY'],
    ['Referrer policy set', Boolean(response.headers.get('referrer-policy'))],
    ['Permissions policy set', Boolean(response.headers.get('permissions-policy'))],
    ['Opener isolation set', response.headers.get('cross-origin-opener-policy') === 'same-origin'],
    ['Resource policy set', response.headers.get('cross-origin-resource-policy') === 'same-origin'],
  ];

  for (const [label, passed] of headerChecks) {
    if (!passed) failures += 1;
    console.log(passed ? 'PASS' : 'FAIL', label);
  }

  if (failures) {
    console.error(`Security smoke test failed: ${failures} check(s)`);
    process.exitCode = 1;
    return;
  }
  console.log('Security smoke test passed');
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
