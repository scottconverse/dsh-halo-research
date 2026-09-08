export function originalRoute(resolved, selected={}) {
 const provider=selected.provider??resolved.provider,model=selected.model??resolved.model;
 const effort=selected.reasoningEffort??(provider===resolved.provider&&model===resolved.model?resolved.reasoningEffort:undefined);
 return {provider,model,...effort===undefined?{}:{reasoningEffort:effort}};
}
export function applyRoute(resolved, route) {
 const {reasoningEffort:discarded,...rest}=resolved;
 return {...rest,provider:route.provider,model:route.model,...route.reasoningEffort===undefined?{}:{reasoningEffort:route.reasoningEffort}};
}
