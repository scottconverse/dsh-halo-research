import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const previous = 'const workspace=this.workspaces.list.getSnapshot();const sessions=this.sessions.list.getSnapshot();const current=this.mainReference?.sessionId;const currentWorkspaceId=current===void 0?void 0:workspace.items.find(item=>item.sessionIds.includes(current))?.workspaceId;const recent=workspace.phase===`ready`&&sessions.phase===`ready`?recentWorkspace(workspace.items,sessions.byId):void 0;const target=workspaceId??currentWorkspaceId??recent;if(target===void 0){if(initializeDraft){this.notify({kind:`createFailed`,message:this.ctx.locale.bind(`workspace`)(`draft.workspaceRequired`)});return}this.clearMain();return}';
const neutral = `
    if (workspaceId === undefined) {
      const navigation = AbortSignal.any([this.ctx.layout.beginNavigation(), this.lifetime.signal]);
      void this.initializeDefaultWorkspace(navigation).then(workspace => {
        if (navigation.aborted) return;
        if (workspace !== undefined) {
          this.startSession(workspace.workspaceId, options);
        } else {
          this.clearMain();
          if (initializeDraft) {
            this.notify({ kind: 'createFailed', message: this.ctx.locale.bind('workspace')('draft.workspaceRequired') });
          }
        }
      }).catch(reason => console.warn('new session workspace selection failed:', reason));
      return;
    }
    const target = workspaceId;
`;

const previousRestore = 'let target=workspace?.workspaceId??recentWorkspace(workspaces.items,sessions.byId);if(target===void 0&&workspaces.items.length===0&&sessions.ids.length===0)';
const neutralRestore = 'let target=workspace?.workspaceId;if(target===void 0)';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) throw new Error('Unexpected rc.5 workspace client source');
  return source.replace(before, after);
}

export function patchClient(source) {
  return replaceOnce(replaceOnce(source, previous, neutral), previousRestore, neutralRestore);
}

export function prepareOverlay(sourcePackage, destination) {
  const read = relative => fs.readFileSync(path.join(sourcePackage, relative));
  const manifest = JSON.parse(read('package.json'));
  if (manifest.name !== '@deepseek-ai/dsh-client-ui-workspace' || manifest.version !== '0.2.2-rc.5') {
    throw new Error('The workspace overlay requires DSH 0.2.2-rc.5');
  }
  const client = patchClient(read('lib/client.js').toString('utf8'));
  fs.mkdirSync(path.join(destination, 'lib'), { recursive: true });
  fs.writeFileSync(path.join(destination, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  fs.writeFileSync(path.join(destination, 'lib/index.js'), read('lib/index.js'));
  fs.writeFileSync(path.join(destination, 'lib/client.js'), client);
  if (fs.existsSync(path.join(sourcePackage, 'locale'))) {
    fs.cpSync(path.join(sourcePackage, 'locale'), path.join(destination, 'locale'), { recursive: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [, , sourcePackage, destination] = process.argv;
  if (!sourcePackage || !destination) throw new Error('Provide the source package and overlay destination.');
  prepareOverlay(sourcePackage, destination);
}
