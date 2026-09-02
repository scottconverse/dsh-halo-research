export function filterModelGroups(groups, query) {
  const words = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return groups;
  return groups.flatMap(group => {
    const models = group.models.filter(model => {
      const text = [group.id, group.name, model.id, model.name, model.description ?? ''].join(' ').toLowerCase();
      return words.every(word => text.includes(word));
    });
    return models.length === 0 ? [] : [{ ...group, models }];
  });
}
