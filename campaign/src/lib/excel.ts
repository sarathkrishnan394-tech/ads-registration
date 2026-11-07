function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export type ExcelSheet = {
  name: string;
  headers: string[];
  rows: string[][];
};

export function toExcelXml(sheets: ExcelSheet[]): string {
  const worksheets = sheets
    .map((sheet) => {
      const header = `<Row>${sheet.headers
        .map((h) => `<Cell ss:StyleID="header"><Data ss:Type="String">${xmlEscape(h)}</Data></Cell>`)
        .join("")}</Row>`;
      const body = sheet.rows
        .map(
          (row) =>
            `<Row>${row
              .map((cell) => `<Cell><Data ss:Type="String">${xmlEscape(cell ?? "")}</Data></Cell>`)
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${xmlEscape(sheet.name.slice(0, 31))}"><Table>${header}${body}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header">
    <Font ss:Bold="1" ss:Color="#FFFFFF"/>
    <Interior ss:Color="#0A2540" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${worksheets}
</Workbook>`;
}
