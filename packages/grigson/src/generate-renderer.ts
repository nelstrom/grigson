import fs from 'node:fs';
import path from 'node:path';

function toPascalCase(name: string): string {
  return name.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function toCamelCase(name: string): string {
  const p = toPascalCase(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

const RESERVED_NAMES = ['svg', 'text', 'html'];

export function validateRendererName(name: string | undefined): string | null {
  if (!name) return 'Error: A renderer name is required.';
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
    return 'Error: Renderer name must be lowercase letters, digits, and hyphens only (e.g. "high-contrast").';
  }
  if (RESERVED_NAMES.includes(name)) {
    return `Error: A renderer named "${name}" already exists.`;
  }
  return null;
}

function generateFiles(name: string): Record<string, string> {
  const packageName = `grigson-${name}-renderer`;
  const className = `Grigson${toPascalCase(name)}Renderer`;
  const elementTag = `grigson-${name}-renderer`;
  const binaryName = `grigson-${name}-renderer`;
  const viteLibName = toCamelCase(`grigson-${name}-renderer`);
  const viteRegisterLibName = toCamelCase(`grigson-${name}-renderer-register`);

  const packageJson = JSON.stringify({
    name: packageName,
    version: '1.0.0',
    description: `A ${name} renderer custom element for grigson-chart`,
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    bin: { [binaryName]: './dist/cli.js' },
    scripts: {
      build: 'pnpm run build:ts && pnpm run build:browser && pnpm run build:browser:register',
      'build:browser': 'vite build',
      'build:browser:register': 'VITE_BUILD_REGISTER=true vite build',
      'build:ts': 'tsc',
      typecheck: 'tsc --noEmit',
      clean: 'rm -rf dist',
      test: 'vitest',
      'test:run': 'vitest run',
    },
    devDependencies: {
      '@types/node': '^25.5.0',
      typescript: '^5.9.3',
      vite: '^8.0.0',
      vitest: '^4.0.18',
    },
    dependencies: {
      grigson: 'workspace:*',
    },
  }, null, 2);

  const tsconfigJson = JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: 'dist',
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      strict: true,
      skipLibCheck: true,
      esModuleInterop: true,
      allowImportingTsExtensions: false,
      rootDir: 'src',
    },
    include: ['src/**/*'],
    exclude: ['node_modules', 'dist', 'src/**/*.test.ts'],
  }, null, 2);

  const viteConfig =
`import { defineConfig } from 'vite';
import { resolve } from 'path';

const isRegister = process.env.VITE_BUILD_REGISTER === 'true';

export default defineConfig({
  build: {
    lib: {
      entry: isRegister
        ? resolve(__dirname, 'src/register.ts')
        : resolve(__dirname, 'src/index.browser.ts'),
      name: isRegister ? '${viteRegisterLibName}' : '${viteLibName}',
      fileName: (format) => {
        const base = isRegister ? '${packageName}-register' : '${packageName}';
        return format === 'es' ? \`\${base}.esm.js\` : \`\${base}.iife.js\`;
      },
      formats: ['iife', 'es'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
`;

  const vitestConfig =
`import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
`;

  const readme =
`# ${packageName}

A ${name} renderer custom element for grigson-chart.

## Usage

### Browser (custom element)

\`\`\`html
<script src="${packageName}-register.iife.js"></script>
<grigson-chart>
  <${elementTag}></${elementTag}>
</grigson-chart>
\`\`\`

### Node.js (CLI)

\`\`\`sh
${binaryName} song.chart
\`\`\`

### JavaScript

\`\`\`js
import { ${className} } from '${packageName}';
\`\`\`

## Development

\`\`\`sh
pnpm install
pnpm build
pnpm test
\`\`\`
`;

  const elementTs =
`import type { Song } from 'grigson';
import { GrigsonRendererUpdateEvent } from 'grigson';
import type { GrigsonRendererElement } from 'grigson';

export class ${className} extends HTMLElement implements GrigsonRendererElement {
  static get observedAttributes() { return [] as string[]; }
  attributeChangedCallback(_name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    this.dispatchEvent(new GrigsonRendererUpdateEvent());
  }
  renderChart(_song: Song): Element {
    const div = document.createElement('div');
    div.textContent = 'Under construction';
    return div;
  }
}
`;

  const indexTs = `export { ${className} } from './element.js';\n`;
  const indexBrowserTs = `export { ${className} } from './element.js';\n`;

  const registerTs =
`import { ${className} } from './element.js';
if (typeof customElements !== 'undefined') {
  customElements.define('${elementTag}', ${className});
}
`;

  const renderTs =
`import type { Song } from 'grigson';

export default function renderChart(_song: Song): string {
  return '<div>Under construction</div>';
}
`;

  const cliTs =
`#!/usr/bin/env node

import { runRenderer } from 'grigson';
import renderChart from './render.js';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(\`Usage: ${binaryName} [file]

Reads a .chart file (or stdin if no file is given) and writes the rendered
output to stdout.

Options:
  --help, -h   Show this help message and exit\`);
  process.exit(0);
}

const file = args.find((a: string) => !a.startsWith('-'));
await runRenderer(renderChart, { file });
`;

  return {
    'package.json': packageJson,
    'tsconfig.json': tsconfigJson,
    'vite.config.ts': viteConfig,
    'vitest.config.ts': vitestConfig,
    'README.md': readme,
    'src/element.ts': elementTs,
    'src/index.ts': indexTs,
    'src/index.browser.ts': indexBrowserTs,
    'src/register.ts': registerTs,
    'src/render.ts': renderTs,
    'src/cli.ts': cliTs,
  };
}

export function generateRenderer(name: string, outputDir: string): void {
  const packageName = `grigson-${name}-renderer`;
  const targetDir = path.join(outputDir, packageName);

  if (fs.existsSync(targetDir)) {
    throw new Error(`Directory already exists: ${targetDir}`);
  }

  const files = generateFiles(name);

  fs.mkdirSync(path.join(targetDir, 'src'), { recursive: true });

  const fileList: string[] = [];
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(targetDir, filePath);
    fs.writeFileSync(fullPath, content, 'utf8');
    fileList.push(filePath);
  }

  const lines = [
    `Created ${packageName}/`,
    '',
    ...fileList.map(f => `  ${f}`),
    '',
    'Next steps:',
    '',
    `  cd ${packageName}`,
    '  pnpm install',
    '  pnpm build',
  ];
  console.log(lines.join('\n'));
}
