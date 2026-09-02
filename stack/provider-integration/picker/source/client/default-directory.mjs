export function createDefaultModelDirectory(api, createStore) {
  const store = createStore({ current: null, routable: null, groups: [], failures: [], status: 'idle', error: null });
  let disposed = false;
  let generation = 0;
  let saving = false;
  const unwrap = response => {
    if (!response.result.ok) throw new Error(response.result.error.message);
    return response.result.value;
  };
  const route = value => {
    if (!value || typeof value.provider !== 'string' || typeof value.model !== 'string') {
      throw new Error('The default model is not configured. Select a model to continue.');
    }
    return { provider: value.provider, model: value.model,
      ...(typeof value.reasoningEffort === 'string' ? { reasoningEffort: value.reasoningEffort } : {}) };
  };
  const fail = (error, token) => {
    if (!disposed && token === generation) store.update(s => {
      s.status = 'error'; s.error = error instanceof Error ? error.message : String(error);
    });
    return false;
  };
  async function load() {
    // Settings events during a save must not race the acknowledged selection.
    if (disposed || saving) return false;
    const token = ++generation;
    store.update(s => { s.status = 'loading'; s.error = null; });
    try {
      const [catalog, settings] = await Promise.all([
        api.llm.models({}).then(unwrap), api.settings.describe({}).then(unwrap),
      ]);
      if (disposed || token !== generation) return false;
      // A missing default must not hide the choices needed to repair it.
      store.update(s => { s.groups = catalog.groups; s.failures = catalog.failures; });
      const current = route(settings.namespaces.find(n => n.ns === 'agent-default-model')?.value);
      store.update(s => {
        s.current = current; s.groups = catalog.groups; s.failures = catalog.failures;
        s.status = 'ready'; s.error = null;
      });
      return true;
    } catch (error) { return fail(error, token); }
  }
  async function select(selection) {
    if (disposed || saving) return false;
    const token = ++generation;
    saving = true;
    store.update(s => { s.status = 'selecting'; s.error = null; });
    try {
      const selected = route(selection);
      unwrap(await api.settings.replace({ ns: 'agent-default-model', section: selected }));
      if (disposed || token !== generation) return false;
      store.update(s => { s.current = selected; s.status = 'ready'; s.error = null; });
      return true;
    } catch (error) { return fail(error, token); }
    finally { saving = false; }
  }
  return { store, load, select, dispose() { disposed = true; generation++; } };
}
