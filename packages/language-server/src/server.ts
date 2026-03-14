import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeResult,
  TextDocumentSyncKind,
  DiagnosticSeverity,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { Diagnostic, validate as ValidateFn } from 'grigson';

let validate: typeof ValidateFn;

async function loadGrigson() {
  const grigson = await import('grigson');
  validate = grigson.validate;
}

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
  },
}));

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
