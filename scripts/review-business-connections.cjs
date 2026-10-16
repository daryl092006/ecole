/* eslint-disable @typescript-eslint/no-require-imports -- Read-only TypeScript catalog review. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, 'src', request.slice(2)) : request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  module._compile(result.outputText, filename);
};
const { ROLE_ACCESS } = require('../src/permissions/rolePermissions.ts');
const { PORTAL_ROUTES } = require('../src/constants/portalRoutes.ts');
const requirements = {
  createStudentIdentity: ['student.update', 'student.lifecycle.manage'],
  createEnrollmentAndDraftContract: ['student.lifecycle.manage', 'payment.record'],
  recordPayment: ['student.view', 'payment.record'],
  manageAcademicYear: ['academic.year.open'],
};
const roles = Object.values(ROLE_ACCESS).map(access => ({ role: access.role, operations: Object.fromEntries(Object.entries(requirements).map(([operation, permissions]) => [operation, { eligibleInRoleCatalog: permissions.every(permission => access.permissions.includes(permission)), missingPermissions: permissions.filter(permission => !access.permissions.includes(permission)) }])) }));
const apiRoutes = [];
function inspect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) inspect(filename);
    else if (entry.name === 'route.ts') {
      const source = fs.readFileSync(filename, 'utf8');
      const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
      const methods = []; const permissions = new Set();
      function visit(node) {
        if (ts.isFunctionDeclaration(node) && node.name && ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'].includes(node.name.text) && node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) methods.push(node.name.text);
        if (ts.isCallExpression(node) && node.expression.getText(ast) === 'requirePermission' && node.arguments[1] && ts.isStringLiteral(node.arguments[1])) permissions.add(node.arguments[1].text);
        ts.forEachChild(node, visit);
      }
      visit(ast);
      apiRoutes.push({ file: path.relative(root, filename).replaceAll('\\', '/'), methods, literalPermissionsDeclaredInFile: [...permissions], referencesYearResolver: source.includes('resolveAcademicYear(') });
    }
  }
}
inspect(path.join(root, 'src', 'app', 'api'));
const report = {
  generatedAt: new Date().toISOString(),
  scope: 'Static local inventory. Effective grants, indirect authorization and database guards are not certified by this report. No remote access or business write.',
  portalRoutes: PORTAL_ROUTES.length,
  requirements, roles, apiRoutes,
};
const destination = path.join(root, '.tmp', 'business-review');
fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, 'connections.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ portalRoutes: report.portalRoutes, apiRoutes: apiRoutes.length, combinedEnrollmentRoles: roles.filter(role => role.operations.createEnrollmentAndDraftContract.eligibleInRoleCatalog).map(role => role.role), report: '.tmp/business-review/connections.json' }, null, 2));
