/**
 * ⚠️ Claude Editable Section
 * - JSON schema 변경
 * - 추출 규칙 수정 가능
 * - 함수명 변경 금지
 */
function buildReceiptExtractionPrompt() {
  return `
이 영수증 이미지를 분석하여 JSON만 반환하세요.

{
  "storeName": string,
  "businessNumber": string,
  "date": "YYYY-MM-DD",
  "items": [
    { "name": string, "quantity": number, "unitPrice": number, "amount": number }
  ],
  "taxableAmount": number,
  "taxAmount": number,
  "taxFreeAmount": number,
  "totalAmount": number
}

규칙:
- JSON 외 텍스트 금지
- 숫자에 쉼표 포함 금지
- 항목 누락 시 0 또는 빈 배열
`;
}
