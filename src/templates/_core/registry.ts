import type {
  RegisteredTemplate,
  ResumeTemplate,
  TemplateManifest,
} from '../../types/template';

/**
 * Template registry (spec §7.1). The SINGLE place that scans the templates
 * folder; NEVER edited to add a template. Manifests load eagerly (needed for
 * the picker); components load lazily so each template is code-split.
 */

interface ManifestModule {
  manifest: TemplateManifest;
}
type ComponentModule = { default: ResumeTemplate };

const manifestModules = import.meta.glob<ManifestModule>('/src/templates/*/manifest.ts', {
  eager: true,
});
const componentLoaders = import.meta.glob<ComponentModule>('/src/templates/*/index.tsx');

function folderIdFromPath(path: string): string {
  const match = path.match(/\/templates\/([^/]+)\//);
  return match ? match[1] : path;
}

const registry = new Map<string, RegisteredTemplate>();

for (const [path, mod] of Object.entries(manifestModules)) {
  const id = folderIdFromPath(path);
  const loader = componentLoaders[`/src/templates/${id}/index.tsx`];
  if (!loader) continue;
  registry.set(id, { manifest: mod.manifest, load: loader });
}

/** All registered templates, sorted with ATS-safe ones first for the picker. */
export function listTemplates(): RegisteredTemplate[] {
  return [...registry.values()].sort((a, b) => {
    if (a.manifest.atsSafe !== b.manifest.atsSafe) return a.manifest.atsSafe ? -1 : 1;
    return a.manifest.id.localeCompare(b.manifest.id);
  });
}

/** Look up a template by id, falling back to `classic` (or the first registered). */
export function getTemplate(id: string): RegisteredTemplate {
  const found = registry.get(id);
  if (found) return found;
  const fallback = registry.get('classic') ?? [...registry.values()][0];
  if (!fallback) throw new Error('No resume templates are registered');
  return fallback;
}

/** Whether a template id exists in the registry. */
export function hasTemplate(id: string): boolean {
  return registry.has(id);
}
