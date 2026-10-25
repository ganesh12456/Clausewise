import type { Agreement, Commitment } from "../domain/workspace.ts";
export function download(name: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportReview(agreement: Agreement) {
  const d = agreement.data;
  download(
    d.name + "-review.txt",
    `${d.name}\nContract review record | ${new Date().toISOString()}\n${d.coverage}\nCompany standard: ${d.policyName || "Not checked"}\n\n` +
      d.findings
        .map(
          (f) =>
            `${f.severity} priority: ${f.title}\n${f.reason}\nSource: ${f.quote || "Required wording not found"}\nProposed wording: ${f.suggestion}\nDecision: ${f.status}\n`,
        )
        .join("\n"),
  );
}
export function calendarText(commitment: Commitment, now = new Date()) {
  const esc = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\r?\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Clausewise//EN\r\nBEGIN:VEVENT\r\nUID:${commitment.id}@clausewise\r\nDTSTAMP:${now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(
      /\.\d{3}/,
      "",
    )}\r\nDTSTART;VALUE=DATE:${commitment.data.date.replace(/-/g, "")}\r\nSUMMARY:${esc(commitment.data.name)}\r\nDESCRIPTION:${esc(commitment.data.evidence || "Confirmed commitment")}\r\nBEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:Contract commitment\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR`;
}
