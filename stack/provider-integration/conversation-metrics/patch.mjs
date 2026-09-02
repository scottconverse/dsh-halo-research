export function patchNativeTiming(bundle) {
  const needle='function assistantStepReading(node) {';
  if(bundle.split(needle).length!==2||bundle.includes('HALO_NATIVE_TIMING_V1'))throw Error('Unsupported or already-patched conversation bundle');
  const start=bundle.indexOf('function finalNode(state, context) {');
  const end=bundle.indexOf('\n\t\tfunction fallbackState',start);
  const part=bundle.slice(start,end), timing='firstTokenTime: state.firstTokenTime ?? null';
  if(start<0||end<0||part.split(timing).length!==2)throw Error('Unsupported final-node timing shape');
  bundle=bundle.slice(0,start)+part.replace(timing,`firstTokenTime: ['codex-cli','claude-cli'].includes(event.data.message.source?.provider) ? null : state.firstTokenTime ?? null`)+bundle.slice(end);
  return bundle.replace(needle,`${needle}
    // HALO_NATIVE_TIMING_V1: native transport deltas are not model-token timings.
    if (node.requestConfig?.provider === 'codex-cli' || node.requestConfig?.provider === 'claude-cli')
      return {ttftMs:null,decodeMs:null,outputTokens:null};`);
}
