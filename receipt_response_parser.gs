function parseClaudeResponse(response) {
  if (response.getResponseCode() !== 200) {
    throw new Error(response.getContentText());
  }

  var body = JSON.parse(response.getContentText());
  var text = body.content[0].text || '';
  return extractJson(text);
}

function extractJson(text) {
  if (text.indexOf('```') !== -1) {
    text = text.split('```')[1];
  }
  return JSON.parse(text.trim());
}
