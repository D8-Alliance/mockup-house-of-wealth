import { readFileSync } from 'fs';
import { join } from 'path';

/** The frontend hides AI tabs from roles the server refuses; its role lists must match ai.controller.ts. */
const controller = readFileSync(join(__dirname, 'ai.controller.ts'), 'utf8');
const frontend = readFileSync(join(__dirname, '..', '..', '..', 'src', 'ai', 'aiTabAccess.ts'), 'utf8');

const rolesOf = (text: string) => [...text.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();
const serverRoles = (route: string) => {
  const match = controller.match(new RegExp(`@Post\\('${route}'\\)\\s*@Roles\\(([^)]*)\\)`));
  if (!match) throw new Error(`No @Roles for ${route}`);
  return rolesOf(match[1]);
};
const frontendRoles = (name: string) => {
  const match = frontend.match(new RegExp(`const ${name} = \\[([^\\]]*)\\]`));
  if (!match) throw new Error(`No ${name} in aiTabAccess.ts`);
  return rolesOf(match[1]);
};

describe('AI tab access mirrors the server', () => {
  it.each([
    ['SHARIAH_ANALYSIS', 'shariah/analyze'],
    ['CONTRACT_ADVISOR', 'contract-advisor/analyze'],
    ['DUE_DILIGENCE', 'due-diligence/analyze'],
  ])('%s matches POST ai/%s', (name, route) => {
    expect(frontendRoles(name)).toEqual(serverRoles(route));
  });
});
