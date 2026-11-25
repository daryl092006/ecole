/* eslint-disable @typescript-eslint/no-require-imports -- Isolated TypeScript integration assertions. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.resolve(__dirname, '../src', request.slice(2)) : request, parent, ...rest);
};
require.cache[require.resolve('server-only')] = { exports: {}, loaded: true };
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText, filename);
const { saveDocumentChunk, assembleDocumentChunks, removeDocumentChunks, DOCUMENT_CHUNK_BYTES } = require('../src/server/websiteDocumentChunks.ts');
const { uploadWebsiteDocuments } = require('./website-templates/website-document-upload.ts');
const { sniffDocument } = require('../src/services/websiteService.ts');
const year = '44444444-4444-4444-8444-444444444444';
const otherDraft = '55555555-5555-4555-8555-555555555555';
const objects = new Map();
let manifest;
const client = { storage: { from: () => ({
  upload: async (key, body, options) => { objects.set(key, new Blob([body], { type: options.contentType })); return {}; },
  download: async key => ({ data: objects.get(key), error: objects.has(key) ? null : new Error('Missing') }),
  remove: async keys => { keys.forEach(key => objects.delete(key)); return {}; },
}) } };
function form(size = 5 * 1024 * 1024) {
  const data = new FormData();
  for (const key of ['academic_year_id', 'niveau_id', 'filiere_id']) data.set(key, year);
  const bytes = new Uint8Array(size); bytes.set(Buffer.from('%PDF-1.7\n'));
  data.set('diplome_file', new File([bytes], 'diplome.pdf', { type: 'application/pdf' }));
  return data;
}
async function run() {
  const calls = [];
  const transport = { post: async (url, data) => {
    calls.push(url);
    if (data instanceof FormData) {
      // Measure the real multipart body, including browser boundaries.
      const request = new Request('http://localhost', { method: 'POST', body: data });
      assert.ok((await request.arrayBuffer()).byteLength < 4_500_000);
    }
    if (url.endsWith('etape3-document-bloc')) await saveDocumentChunk(client, year, data);
    else if (url.endsWith('etape3-blocs-nettoyage')) await removeDocumentChunks(client, year, data.upload_ids);
    else {
      manifest = data;
      const assembled = await assembleDocumentChunks(client, year, data);
      const file = assembled.get('diplome_file');
      assert.equal(file.size, 5 * 1024 * 1024);
      assert.equal(file.name, 'diplome.pdf');
      assert.equal(sniffDocument(new Uint8Array(await file.arrayBuffer())), 'application/pdf');
    }
    return { data: { received: true } };
  } };
  assert.deepEqual(await uploadWebsiteDocuments(transport, 'a'.repeat(64), form()), { received: true });
  assert.equal(calls.filter(url => url.endsWith('etape3-document-bloc')).length, 3);
  assert.equal(objects.size, 0);
  await assert.rejects(uploadWebsiteDocuments(transport, 'token', form(5 * 1024 * 1024 + 1)), /5 Mo/);
  await assert.rejects(assembleDocumentChunks(client, year, manifest), /incomplet/);
  const data = new FormData(); data.set('upload_id', manifest.documents[0].upload_id); data.set('index', '0');
  data.set('chunk', new File([new Uint8Array(DOCUMENT_CHUNK_BYTES)], 'chunk', { type: 'application/pdf' }));
  await saveDocumentChunk(client, year, data);
  // A different dossier cannot read or clean up another dossier's blocks.
  await assert.rejects(assembleDocumentChunks(client, otherDraft, manifest), /incomplet/);
  assert.equal(objects.size, 1);
  await assert.rejects(assembleDocumentChunks(client, year, { ...manifest, documents: [{ ...manifest.documents[0], size: 1 }] }), /Taille/);
  assert.equal(objects.size, 0);
  data.set('upload_id', '../escape');
  await assert.rejects(saveDocumentChunk(client, year, data));
  const failureClient = { post: async (url, body) => {
    if (url.endsWith('etape3-document-bloc')) { await saveDocumentChunk(client, year, body); throw new Error('Network failure'); }
    if (url.endsWith('etape3-blocs-nettoyage')) await removeDocumentChunks(client, year, body.upload_ids);
    return { data: {} };
  } };
  await assert.rejects(uploadWebsiteDocuments(failureClient, 'token', form()), /Network failure/);
  assert.equal(objects.size, 0);
  console.log('Documents : 5 Mo en trois blocs, limites multipart, reprise après échec, isolation et nettoyage vérifiés.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
