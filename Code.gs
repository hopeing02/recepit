function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('영수증 관리 시스템')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function analyzeReceiptFromWeb(base64Image) {
  var raw = extractReceiptFromImage(base64Image);   // OCR + Claude
  var cleaned = cleanReceiptData(raw);              // 정제
  var classified = applyClassification(cleaned);    // 분류
  saveReceipt(classified);                           // 저장
  return classified;
}
