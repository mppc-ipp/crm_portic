export function agruparPorDia<T extends { dia: string }>(items: T[]): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const dia = item.dia;
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(item);
    return acc;
  }, {});
}
