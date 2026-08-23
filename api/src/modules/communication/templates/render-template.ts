/**
 * docs/16-module-communication.md §4 — `{{student_name}}`/`{{balance}}`/
 * `{{due_date}}`-style substitution. Unknown placeholders resolve to an
 * empty string rather than being left as literal `{{...}}` text in a
 * message a parent actually receives.
 */
export function renderTemplate(
  body: string,
  context: Record<string, string>,
): string {
  return body.replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_match, key: string) => context[key] ?? '',
  );
}
