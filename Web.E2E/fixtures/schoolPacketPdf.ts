/** PDF mínimo válido para subir en /escuela/acuerdo (sin datos sensibles). */
export function minimalSchoolPacketPdfBytes(label: string): Buffer {
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 200 200]/Parent 2 0 R/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 40 120 Td (${label}) Tj ET
endstream endobj
xref
0 5
trailer<</Size 5/Root 1 0 R>>
startxref
0
%%EOF`
  return Buffer.from(body, 'utf8')
}
