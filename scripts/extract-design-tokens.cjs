const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const designRoot = path.join(root, 'design/stitch');
const sections = ['colors', 'borderRadius', 'spacing', 'fontFamily', 'fontSize'];
const camel = value => value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

// Read only literal objects. Never execute scripts supplied in a design export.
function readObject(html, key) {
  const match = new RegExp(`(?:"${key}"|\\b${key})\\s*:\\s*\\{`).exec(html);
  if (!match) throw new Error(`Missing design section: ${key}`);
  const start = match.index + match[0].lastIndexOf('{');
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < html.length; index += 1) {
    const char = html[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) {
      return JSON.parse(html.slice(start, index + 1).replace(/([{,]\s*)([A-Za-z][A-Za-z0-9]*)\s*:/g, '$1"$2":'));
    }
  }
  throw new Error(`Unclosed design section: ${key}`);
}

const screens = fs.readdirSync(designRoot).filter(name =>
  fs.existsSync(path.join(designRoot, name, 'code.html')),
);
const manifest = screens.map(name => {
  const html = fs.readFileSync(path.join(designRoot, name, 'code.html'), 'utf8');
  const png = fs.readFileSync(path.join(designRoot, name, 'screen.png'));
  if (png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${name}`);
  return {
    screen: name,
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
    htmlSha256: crypto.createHash('sha256').update(html).digest('hex'),
    pngSha256: crypto.createHash('sha256').update(png).digest('hex'),
    tokens: name === 'landing' ? null : Object.fromEntries(sections.map(key => [key, readObject(html, key)])),
  };
});
const appScreens = manifest.filter(screen => screen.tokens);
const chosen = {};
const conflicts = [];
for (const section of sections) {
  chosen[section] = {};
  const keys = new Set(appScreens.flatMap(screen => Object.keys(screen.tokens[section])));
  for (const key of [...keys].sort()) {
    const counts = new Map();
    for (const screen of appScreens) {
      const value = JSON.stringify(screen.tokens[section][key]);
      if (value !== undefined) counts.set(value, (counts.get(value) || 0) + 1);
    }
    const ranked = [...counts].sort((a, b) => b[1] - a[1]);
    chosen[section][key] = JSON.parse(ranked[0][0]);
    if (ranked.length > 1) conflicts.push({section, key, variants: ranked});
  }
}
const dp = value => parseFloat(value) * (value.endsWith('rem') ? 16 : 1);
const colors = Object.fromEntries(Object.entries(chosen.colors).map(([key, value]) => [camel(key), value]));
const typography = Object.fromEntries(Object.entries(chosen.fontSize).map(([key, [size, attributes]]) => [camel(key), {
  fontFamily: chosen.fontFamily[key][0],
  fontSize: dp(size),
  lineHeight: dp(attributes.lineHeight),
  letterSpacing: Number((parseFloat(attributes.letterSpacing) * dp(size)).toFixed(3)),
  fontWeight: attributes.fontWeight,
}]));
const tokens = {
  colors: {...colors, navSelected: '#dceee8', navBorder: '#d9e1dd', navInactive: '#5b6b64', handoff: '#14302a'},
  typography,
  spacing: Object.fromEntries(Object.entries(chosen.spacing).map(([key, value]) => [camel(key), dp(value)])),
  radius: {small: 4, medium: 8, input: 12, field: 14, card: 16, largeCard: 20, sheet: 24, pill: 9999},
  size: {minTouchTarget: 48, button: 56, input: 52, nav: 64, navIcon: 24, activeNavIcon: 22},
  borderWidth: {default: 1, selected: 2},
  // CSS evidence retained separately from Android elevation approximations.
  shadows: {
    cardCss: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    navCss: '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
    cardElevation: 1,
    navElevation: 4,
    sheetElevation: 8,
  },
  motion: {pressMs: 150, transitionMs: 300, handoffMs: 3000},
  landing: {background: '#1f6f5c', paper: '#faf8f2', ink: '#11231c', monoFamily: 'DM Mono', displayFamily: 'Space Grotesk'},
};
fs.mkdirSync(path.join(root, 'src/theme'), {recursive: true});
fs.writeFileSync(path.join(root, 'src/theme/tokens.ts'),
  '// Generated from the supplied Stitch exports by scripts/extract-design-tokens.cjs.\n' +
  '// Values use Android dp/sp; letterSpacing is converted from em. See design/NOTES.md.\n' +
  '// Font family names describe the source; bundle/map Android fonts during project setup.\n' +
  `export const tokens = ${JSON.stringify(tokens, null, 2)} as const;\n\n` +
  'export type ThemeTokens = typeof tokens;\n' +
  'export type TypographyVariant = keyof typeof tokens.typography;\n');
fs.writeFileSync(path.join(root, 'design/token-audit.json'), JSON.stringify({appScreenCount: appScreens.length, conflicts, chosen, screens: manifest}, null, 2) + '\n');
console.log(`Imported ${manifest.length} screen pairs; compared ${appScreens.length} app token sets; found ${conflicts.length} configuration conflicts.`);
