import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ACTION_KEY, RESOURCE_KEY, ROLES_KEY } from '../auth/roles.decorator';
import { PermissionAction, PolicyEngine, ResourceModule, UserRole } from './permissions';

jest.mock('../prisma.service', () => ({ PrismaService: class {} }));

/** Every controller under src, found on disk so a new one is checked without listing it here. */
function controllerFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return controllerFiles(path);
    return name.endsWith('.controller.ts') ? [path] : [];
  });
}

const metadata = <T>(key: string, handler: object, controller: object): T | undefined =>
  Reflect.getMetadata(key, handler) ?? Reflect.getMetadata(key, controller);

/**
 * A role named in @Roles must also hold the permission the endpoint asks for, or it passes the role
 * check and is then refused with "Role … lacks … on …": the screen shows the action but it never works.
 */
describe('endpoint roles hold the permission the endpoint requires', () => {
  const engine = new PolicyEngine();
  const gaps: string[] = [];

  beforeAll(() => {
    for (const file of controllerFiles(join(__dirname, '..'))) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const exported = require(file) as Record<string, unknown>;
      for (const [className, controller] of Object.entries(exported)) {
        if (typeof controller !== 'function' || !className.endsWith('Controller')) continue;
        const proto = controller.prototype as Record<string, unknown>;
        for (const method of Object.getOwnPropertyNames(proto)) {
          const handler = proto[method];
          if (method === 'constructor' || typeof handler !== 'function') continue;
          const roles = metadata<UserRole[]>(ROLES_KEY, handler, controller);
          const resource = metadata<ResourceModule>(RESOURCE_KEY, handler, controller);
          const action = metadata<PermissionAction>(ACTION_KEY, handler, controller);
          if (!roles?.length || !resource || !action) continue;
          for (const role of roles) {
            if (!engine.can(role, resource, action)) gaps.push(`${className}.${method}: ${role} lacks ${resource}:${action}`);
          }
        }
      }
    }
  });

  it('finds no role that is let in and then refused', () => {
    expect(gaps).toEqual([]);
  });
});
