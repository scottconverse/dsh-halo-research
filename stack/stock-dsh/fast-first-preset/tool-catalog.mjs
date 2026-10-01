// Preset-local presentation adapter using DSH's stock prompt assembly hook.
// Browser MCP tools are agent-owned, so inherited-tool masks cannot hide them.
// This changes the schemas sent to this preset's model, not host permissions,
// providers, registry entries, or any other preset's catalog.
export const name = 'halo-lean-tool-catalog';
export const inject = ['systemPrompt'];

const resourceTools = new Set([
  'list_mcp_resources', 'list_mcp_resource_templates', 'read_mcp_resource',
]);

export function apply(ctx) {
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
    const assembly = await next();
    return {
      ...assembly,
      tools: assembly.tools.filter(tool =>
        !tool.name.startsWith('mcp__') && !resourceTools.has(tool.name)),
      sections: assembly.sections.filter(section => !section.name.startsWith('mcp:')),
    };
  });
}
