export interface TableColumn<T> {
  header: string;
  value: (row: T) => string | number;
  maxWidth?: number;
  align?: "left" | "right";
}

export function terminalText(value: unknown): string {
  return [...String(value ?? "")]
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || (code >= 127 && code <= 159) ? " " : character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function shorten(value: string, maxWidth: number): string {
  const characters = [...value];
  if (characters.length <= maxWidth) return value;
  if (maxWidth <= 3) return characters.slice(0, maxWidth).join("");
  return `${characters.slice(0, maxWidth - 3).join("")}...`;
}

function pad(value: string, width: number, align: "left" | "right"): string {
  const length = [...value].length;
  const padding = " ".repeat(Math.max(0, width - length));
  return align === "right" ? `${padding}${value}` : `${value}${padding}`;
}

export function formatTable<T>(
  rows: T[],
  columns: Array<TableColumn<T>>,
): string {
  const rendered = rows.map((row) =>
    columns.map((column) => terminalText(column.value(row))),
  );
  const widths = columns.map((column, index) => {
    const contentWidth = Math.max(
      [...column.header].length,
      ...rendered.map((row) => [...(row[index] ?? "")].length),
    );
    return Math.min(contentWidth, column.maxWidth ?? contentWidth);
  });
  const line = (values: string[]) =>
    values
      .map((value, index) => {
        const column = columns[index] as TableColumn<T>;
        const width = widths[index] as number;
        return pad(shorten(value, width), width, column.align ?? "left");
      })
      .join("  ")
      .trimEnd();
  return [line(columns.map((column) => column.header)), ...rendered.map(line)]
    .join("\n")
    .trimEnd();
}

export function formatKeyValues(
  entries: Array<[label: string, value: unknown]>,
): string {
  const width = Math.max(...entries.map(([label]) => [...label].length));
  return entries
    .map(
      ([label, value]) =>
        `${pad(label, width, "left")}  ${terminalText(value)}`,
    )
    .join("\n");
}
