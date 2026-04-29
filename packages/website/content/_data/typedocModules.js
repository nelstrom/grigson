import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, 'typedoc-output.json');

const KIND = {
  FUNCTION: 64,
  CLASS: 128,
  INTERFACE: 256,
  TYPE_ALIAS: 2097152,
  VARIABLE: 32,
  ENUM: 8,
  PROPERTY: 1024,
  METHOD: 2048,
  CONSTRUCTOR: 512,
};

// Maps source file stem → logical module key
const FILE_TO_MODULE = {
  'parser/parser': 'parser',
  'parser/types': 'parser',
  'theory/transpose': 'transpose',
  'theory/normalise': 'normalise',
  'theory/keys': 'keys',
  'theory/keyDetector': 'keyDetector',
  'theory/pitchClass': 'pitchClass',
  'theory/harmonicAnalysis': 'harmonicAnalysis',
  'renderers/text': 'text',
  'renderers/html': 'html',
  'renderers/renderer-css': 'renderer-css',
  validator: 'validator',
  events: 'events',
  'notation/preset': 'notation',
  'notation/registry': 'notation',
};

const MODULE_ORDER = [
  'parser',
  'transpose',
  'normalise',
  'keys',
  'keyDetector',
  'pitchClass',
  'harmonicAnalysis',
  'text',
  'html',
  'renderer-css',
  'notation',
  'validator',
  'events',
];

const MODULE_META = {
  parser: {
    title: 'Parser',
    slug: 'parser',
    description: 'Parse .chart source strings into typed song trees.',
  },
  transpose: {
    title: 'Transpose',
    slug: 'transpose',
    description: 'Shift chord roots by semitone interval with correct enharmonic spelling.',
  },
  normalise: {
    title: 'Normalise',
    slug: 'normalise',
    description: 'Respell chords to match key signatures and canonical enharmonic conventions.',
  },
  keys: {
    title: 'Keys',
    slug: 'keys',
    description: 'Key lookup, mode detection, diatonic note sets, and sibling mode utilities.',
  },
  keyDetector: {
    title: 'Key Detection',
    slug: 'key-detection',
    description: 'Infer the tonic key from a chord sequence.',
  },
  pitchClass: {
    title: 'Pitch Class',
    slug: 'pitch-class',
    description: 'Map note names to integer pitch classes (0–11) and enharmonic pairs.',
  },
  harmonicAnalysis: {
    title: 'Harmonic Analysis',
    slug: 'harmonic-analysis',
    description:
      'Annotate chord sequences with inferred local keys and circle-of-fifths distances.',
  },
  text: {
    title: 'Text Renderer',
    slug: 'text-renderer',
    description: 'Render a parsed song to plain-text or ASCII chord charts.',
  },
  html: {
    title: 'HTML Renderer',
    slug: 'html-renderer',
    description: 'Render a parsed song to semantic HTML with aria labels and grid layout.',
  },
  'renderer-css': {
    title: 'Renderer CSS',
    slug: 'renderer-css',
    description: 'Generate stylesheet and font-face declarations for the HTML renderer.',
  },
  notation: {
    title: 'Notation Presets',
    slug: 'notation',
    description:
      'Register and resolve notation presets that control how chord qualities are rendered.',
  },
  validator: {
    title: 'Validator',
    slug: 'validator',
    description: 'Produce structured diagnostics from a .chart source string.',
  },
  events: {
    title: 'Events',
    slug: 'events',
    description: 'Custom events dispatched by the <grigson-chart> custom element.',
  },
};

function extractComment(comment) {
  if (!comment) return '';
  const parts = [];
  if (comment.summary) {
    for (const part of comment.summary) {
      if (part.kind === 'text' || part.kind === 'code') parts.push(part.text);
    }
  }
  return parts.join('').trim();
}

function serializeType(t, depth = 0) {
  if (!t) return 'unknown';
  if (depth > 4) return '…';

  switch (t.type) {
    case 'intrinsic':
      return t.name;
    case 'literal':
      return JSON.stringify(t.value);
    case 'reference': {
      const args =
        t.typeArguments && t.typeArguments.length > 0
          ? `<${t.typeArguments.map((a) => serializeType(a, depth + 1)).join(', ')}>`
          : '';
      return `${t.name}${args}`;
    }
    case 'array':
      return `${serializeType(t.elementType, depth + 1)}[]`;
    case 'union':
      return t.types.map((u) => serializeType(u, depth + 1)).join(' | ');
    case 'intersection':
      return t.types.map((u) => serializeType(u, depth + 1)).join(' & ');
    case 'tuple':
      return `[${(t.elements || []).map((e) => serializeType(e, depth + 1)).join(', ')}]`;
    case 'reflection': {
      if (!t.declaration) return '{}';
      const members = (t.declaration.children || [])
        .slice(0, 6)
        .map((c) => `${c.name}: ${serializeType(c.type, depth + 1)}`);
      if ((t.declaration.children || []).length > 6) members.push('…');
      return `{ ${members.join('; ')} }`;
    }
    case 'typeOperator':
      return `${t.operator} ${serializeType(t.target, depth + 1)}`;
    case 'indexedAccess':
      return `${serializeType(t.objectType, depth + 1)}[${serializeType(t.indexType, depth + 1)}]`;
    case 'conditional':
      return `${serializeType(t.checkType, depth + 1)} extends ${serializeType(t.extendsType, depth + 1)} ? ${serializeType(t.trueType, depth + 1)} : ${serializeType(t.falseType, depth + 1)}`;
    case 'mapped':
      return `{ [${t.parameter} in ${serializeType(t.parameterType, depth + 1)}]: ${serializeType(t.templateType, depth + 1)} }`;
    case 'predicate':
      return t.targetType ? `${t.name} is ${serializeType(t.targetType, depth + 1)}` : 'boolean';
    case 'query':
      return `typeof ${serializeType(t.queryType, depth + 1)}`;
    case 'rest':
      return `...${serializeType(t.elementType, depth + 1)}`;
    case 'optional':
      return `${serializeType(t.elementType, depth + 1)}?`;
    case 'template-literal':
      return '`…`';
    case 'named-tuple-member':
      return `${t.name}${t.isOptional ? '?' : ''}: ${serializeType(t.element, depth + 1)}`;
    default:
      return t.name ?? 'unknown';
  }
}

function serializeSignature(sig) {
  if (!sig) return '';
  const typeParams =
    sig.typeParameter && sig.typeParameter.length > 0
      ? `<${sig.typeParameter.map((tp) => tp.name).join(', ')}>`
      : '';
  const params = (sig.parameters || [])
    .map((p) => {
      const opt = p.flags?.isOptional ? '?' : '';
      const rest = p.flags?.isRest ? '...' : '';
      return `${rest}${p.name}${opt}: ${serializeType(p.type)}`;
    })
    .join(', ');
  const ret = serializeType(sig.type);
  const name = sig.name === '__type' ? '' : sig.name;
  return `${name}${typeParams}(${params}): ${ret}`;
}

function buildFunction(ref) {
  const sigs = ref.signatures || [];
  const primary = sigs[0];
  return {
    name: ref.name,
    signature: primary ? serializeSignature(primary) : `${ref.name}()`,
    description: primary ? extractComment(primary.comment) : extractComment(ref.comment),
    overloads: sigs.slice(1).map(serializeSignature),
  };
}

function buildVariable(ref) {
  return {
    name: ref.name,
    type: serializeType(ref.type),
    description: extractComment(ref.comment),
  };
}

function buildType(ref) {
  const kindLabel =
    ref.kind === KIND.INTERFACE ? 'interface' : ref.kind === KIND.ENUM ? 'enum' : 'type';

  const members = (ref.children || []).map((child) => ({
    name: child.name,
    type: serializeType(child.type),
    description: extractComment(child.comment),
    optional: child.flags?.isOptional ?? false,
  }));

  return {
    name: ref.name,
    kind: kindLabel,
    description: extractComment(ref.comment),
    aliasedType: ref.kind === KIND.TYPE_ALIAS ? serializeType(ref.type) : null,
    members,
  };
}

function buildClass(ref) {
  const ctor = (ref.children || []).find((c) => c.kind === KIND.CONSTRUCTOR);
  const methods = (ref.children || [])
    .filter((c) => c.kind === KIND.METHOD && !c.flags?.isPrivate && !c.flags?.isProtected)
    .map((m) => {
      const sig = (m.signatures || [])[0];
      return {
        name: m.name,
        signature: sig ? serializeSignature(sig) : `${m.name}()`,
        description: sig ? extractComment(sig.comment) : extractComment(m.comment),
      };
    });
  const properties = (ref.children || [])
    .filter((c) => c.kind === KIND.PROPERTY && !c.flags?.isPrivate && !c.flags?.isProtected)
    .map((p) => ({
      name: p.name,
      type: serializeType(p.type),
      description: extractComment(p.comment),
    }));

  const ctorSig = ctor && (ctor.signatures || [])[0];

  return {
    name: ref.name,
    description: extractComment(ref.comment),
    constructorSignature: ctorSig ? serializeSignature(ctorSig) : null,
    methods,
    properties,
  };
}

export default function () {
  let raw;
  try {
    raw = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch {
    console.warn('[typedocModules] typedoc-output.json not found — skipping API pages.');
    return [];
  }

  // Flat list of exported symbols from index.ts resolution
  const allSymbols = raw.children ?? [];

  // Group by source file → module key
  const grouped = new Map();
  for (const sym of allSymbols) {
    const fileName = sym.sources?.[0]?.fileName ?? '';
    const stem = fileName.replace(/^(?:packages\/grigson\/)?src\//, '').replace(/\.ts$/, '');
    const key = FILE_TO_MODULE[stem] ?? stem.split('/').pop();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(sym);
  }

  return MODULE_ORDER.filter((key) => grouped.has(key)).map((key) => {
    const meta = MODULE_META[key];
    const symbols = grouped.get(key);
    return {
      slug: meta.slug,
      title: meta.title,
      description: meta.description,
      functions: symbols.filter((s) => s.kind === KIND.FUNCTION).map(buildFunction),
      classes: symbols.filter((s) => s.kind === KIND.CLASS).map(buildClass),
      types: symbols
        .filter((s) => [KIND.INTERFACE, KIND.TYPE_ALIAS, KIND.ENUM].includes(s.kind))
        .map(buildType),
      variables: symbols.filter((s) => s.kind === KIND.VARIABLE).map(buildVariable),
    };
  });
}
