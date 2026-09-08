'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const releaseRoot = path.join(projectRoot, 'release');
const staticRoot = path.join(releaseRoot, 'static');
const nodeRoot = path.join(releaseRoot, 'node');
const publicDirectories = ['css', 'images', 'js', 'pages', 'video'];
const publicAssets = [
  'apple-touch-icon.png',
  'favicon-16.png',
  'favicon-32.png',
  'favicon-96.png',
  'brand-logo-dark.png',
  'brand-logo-light.png',
  'partner-hydroenergetica.png',
  'partner-cink.png',
  'GolosText-Regular.woff2',
  'GolosText-Medium.woff2',
  'GolosText-SemiBold.woff2',
  'GolosText-Bold.woff2',
  'GolosText-ExtraBold.woff2',
  'SpaceGrotesk-Variable.woff2',
  'Manrope-Variable.woff2',
  'D-DIN-Regular.woff2',
  'D-DIN-Bold.woff2',
  'D-DINCondensed-Regular.woff2',
  'D-DINCondensed-Bold.woff2',
  'brand-wave.svg',
  'og-cover.jpg',
  'licenses/OFL-SpaceGrotesk.txt',
  'licenses/OFL-Manrope.txt',
  'licenses/OFL-D-DIN.txt'
];

const ensureInsideProject = (target) => {
  const relative = path.relative(projectRoot, target);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Unsafe release target: ${target}`);
  }
};

const copyFile = (source, target) => {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
};

const copyDirectory = (source, target) => {
  fs.cpSync(source, target, {
    recursive: true,
    filter: (entry) => !path.basename(entry).startsWith('.')
  });
};

ensureInsideProject(releaseRoot);
fs.rmSync(releaseRoot, { recursive: true, force: true });
fs.mkdirSync(staticRoot, { recursive: true });
fs.mkdirSync(nodeRoot, { recursive: true });

for (const destination of [staticRoot, nodeRoot]) {
  for (const rootFile of ['index.html', '404.html', 'favicon.ico', 'robots.txt', 'sitemap.xml']) {
    copyFile(path.join(projectRoot, rootFile), path.join(destination, rootFile));
  }
  for (const directory of publicDirectories) {
    copyDirectory(path.join(projectRoot, directory), path.join(destination, directory));
  }
  for (const asset of publicAssets) {
    copyFile(path.join(projectRoot, 'assets', asset), path.join(destination, 'assets', asset));
  }
}

copyFile(path.join(projectRoot, 'server.js'), path.join(nodeRoot, 'server.js'));
fs.writeFileSync(
  path.join(nodeRoot, 'package.json'),
  `${JSON.stringify({
    name: 'berg-house-site',
    version: '1.0.0',
    private: true,
    scripts: { start: 'node server.js' },
    engines: { node: '>=18' }
  }, null, 2)}\n`,
  'utf8'
);

console.log(`Static hosting package: ${staticRoot}`);
console.log(`Node.js hosting package: ${nodeRoot}`);
