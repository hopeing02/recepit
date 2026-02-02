function extractReceiptFromImage(base64Image) {
  var prompt = buildReceiptExtractionPrompt();
  var response = callClaudeWithImage(base64Image, prompt);
  return parseClaudeResponse(response);
}
