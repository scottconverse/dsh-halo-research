import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseDocument } = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))('yaml');

// DSH persists picker selections globally. Restore only the deployment's startup
// default before starting a new process; never rewrite saved session selections.
export function restoreStartupDefault(settingsPath, deploymentSettingsPath) {
  const deployment = parseDocument(readFileSync(deploymentSettingsPath, 'utf8'));
  // DSH 0.2 imports legacy settings into the profile patch once, then renames
  // settings.yaml to settings.yaml.imported. Do not recreate the legacy file.
  if (!existsSync(settingsPath)) {
    const profilePath = join(dirname(settingsPath), 'profiles', 'web', 'cordis.patch.yml');
    const profile = parseDocument(readFileSync(profilePath, 'utf8'));
    const selection = deployment.get('agent-default-model')?.toJSON();
    if (deployment.errors.length || profile.errors.length || !selection?.provider || !selection?.model)
      throw new Error('Cannot restore startup model: deployment or profile configuration is invalid.');
    const rows = profile.toJSON();
    const row = rows.findLast(row => row.id === 'agent-default-model');
    if (!row) throw new Error('Web profile must declare agent-default-model.');
    if (JSON.stringify(row.config) === JSON.stringify(selection)) return false;
    const index = rows.lastIndexOf(row);
    profile.setIn([index, 'config'], selection);
    writeFileSync(profilePath, profile.toString());
    return true;
  }
  const settings = parseDocument(readFileSync(settingsPath, 'utf8'));
  if (deployment.errors.length || settings.errors.length) {
    throw new Error('Cannot restore startup model: settings YAML is invalid.');
  }
  const selection = deployment.get('agent-default-model')?.toJSON();
  if (!selection?.provider || !selection?.model) {
    throw new Error('The deployment settings must declare a startup provider and model.');
  }
  if (JSON.stringify(settings.get('agent-default-model')?.toJSON()) === JSON.stringify(selection)) return false;
  settings.set('agent-default-model', selection);
  writeFileSync(settingsPath, settings.toString());
  return true;
}
