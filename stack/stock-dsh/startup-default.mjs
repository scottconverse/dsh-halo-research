import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseDocument } = createRequire(require.resolve('@deepseek-ai/dsh/package.json'))('yaml');

// DSH persists picker selections globally. Restore only the deployment's startup
// default before starting a new process; never rewrite saved session selections.
export function restoreStartupDefault(settingsPath, deploymentSettingsPath) {
  const deployment = parseDocument(readFileSync(deploymentSettingsPath, 'utf8'));
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
