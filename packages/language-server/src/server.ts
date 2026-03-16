import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeResult,
  TextDocumentSyncKind,
  DiagnosticSeverity,
  TextEdit,
  Range,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  Diagnostic,
  validate as ValidateFn,
  parseSong as ParseSongFn,
  normaliseSong as NormaliseSongFn,
} from 'grigson';

let validate: typeof ValidateFn;
let parseSong: typeof ParseSongFn;
let normaliseSong: typeof NormaliseSongFn;
let TextRenderer: new () => { render(song: ReturnType<typeof parseSong>): string };

async function loadGrigson() {
  const grigson = await import('grigson');
  validate = grigson.validate;
  parseSong = grigson.parseSong;
  normaliseSong = grigson.normaliseSong;
  TextRenderer = grigson.TextRenderer;
}

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    documentFormattingProvider: true,
  },
}));

connection.onDocumentFormatting((params) => {
  if (!parseSong || !normaliseSong || !TextRenderer) return [];
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  const text = document.getText();
  try {
    const song = parseSong(text);
    const normalised = normaliseSong(song);
    const output = new TextRenderer().render(normalised);
    if (output === text) return [];
    const lastLine = document.lineCount - 1;
    const lastChar = document.getText().split('\n').at(-1)!.length;
    return [TextEdit.replace(Range.create(0, 0, lastLine, lastChar), output)];
  } catch {
    return [];
  }
});

function validateDocument(document: TextDocument): void {
  if (!validate) return;
  const diagnostics = validate(document.getText()).map((d: Diagnostic) => ({
    range: d.range,
    severity: d.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    message: d.message,
    source: d.source,
  }));
  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

documents.onDidChangeContent((change) => validateDocument(change.document));
documents.onDidOpen((event) => validateDocument(event.document));

documents.listen(connection);

loadGrigson().then(() => {
  connection.listen();
});
