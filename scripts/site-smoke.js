'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const htmlFiles = [
  path.join(root, 'index.html'),
  ...fs.readdirSync(path.join(root, 'pages'))
    .filter((name) => name.endsWith('.html'))
    .map((name) => path.join(root, 'pages', name))
];
const errors = [];
const i18nSource = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');

const decodeHtmlText = (value) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&mdash;/gi, '—')
  .replace(/&ndash;/gi, '–')
  .replace(/&laquo;/gi, '«')
  .replace(/&raquo;/gi, '»')
  .replace(/&#39;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\s+/g, ' ')
  .trim();

const hasTranslation = (value) => i18nSource.includes(`${JSON.stringify(value)}:`);

const checkLocalReference = (owner, reference) => {
  if (!reference || /^(?:#|%23|data:|https?:|mailto:|tel:)/i.test(reference)) return;
  const clean = reference.split(/[?#]/, 1)[0];
  let decoded;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    errors.push(`${path.relative(root, owner)}: invalid encoded URL ${reference}`);
    return;
  }

  const target = decoded.startsWith('/')
    ? path.resolve(root, `.${decoded}`)
    : path.resolve(path.dirname(owner), decoded);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    errors.push(`${path.relative(root, owner)}: unsafe local URL ${reference}`);
    return;
  }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
    errors.push(`${path.relative(root, owner)}: missing local file ${reference}`);
  }
};

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relativeFile = path.relative(root, file);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) {
    errors.push(`${relativeFile}: duplicate ids ${duplicateIds.join(', ')}`);
  }
  // Inline *executable* scripts break the CSP. Structured-data blocks
  // (application/ld+json) are inert data, never executed, so they are fine.
  const inlineScripts = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/gi)]
    .filter(([, attrs]) => !/type\s*=\s*["']application\/ld\+json["']/i.test(attrs));
  if (inlineScripts.length) {
    errors.push(`${relativeFile}: inline script found`);
  }
  if (/\b(?:href|src|data-map-src)=["']http:\/\//i.test(html)) {
    errors.push(`${relativeFile}: insecure external URL found`);
  }
  if ((html.match(/\bid=["']bhpLoader["']/gi) || []).length !== 1) {
    errors.push(`${relativeFile}: shared page loader is missing or duplicated`);
  }
  const preloaderLockVersion = html.match(/preloader-lock\.js\?v=([\w.-]+)/i);
  const preloaderVersion = html.match(/preloader\.js\?v=([\w.-]+)/i);
  if (!preloaderLockVersion || !preloaderVersion || preloaderLockVersion[1] !== preloaderVersion[1]) {
    errors.push(`${relativeFile}: page-transition scripts are missing or stale`);
  }
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    checkLocalReference(file, match[1]);
  }

  const visibleMarkup = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const untranslated = new Set();
  for (const fragment of visibleMarkup.split(/<[^>]+>/g)) {
    const text = decodeHtmlText(fragment);
    if (/[\u0400-\u04ff]/u.test(text) && !hasTranslation(text)) untranslated.add(text);
  }
  for (const match of visibleMarkup.matchAll(/\b(?:placeholder|aria-label|title|alt)=["']([^"']+)["']/gi)) {
    const text = decodeHtmlText(match[1]);
    if (/[\u0400-\u04ff]/u.test(text) && !hasTranslation(text)) untranslated.add(text);
  }
  if (untranslated.size) {
    errors.push(`${relativeFile}: missing EN/KY translations for ${[...untranslated].join(' | ')}`);
  }
}

const homeHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if ((homeHtml.match(/\bclass=["'][^"']*\bpartner-card\b/gi) || []).length !== 3) {
  errors.push('index.html: expected three verified partner cards');
}
if (/partner-placeholder|logo-img--mobile|brand-mark-dark/i.test(homeHtml)) {
  errors.push('index.html: obsolete partner or mobile-logo markup found');
}

const cssFile = path.join(root, 'css', 'style.css');
const css = fs.readFileSync(cssFile, 'utf8');
for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
  checkLocalReference(cssFile, match[1]);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Site smoke test passed: ${htmlFiles.length} pages`);
}
