function applyClassification(data) {
  var result = classifyReceipt(data);
  data.category = result.category;
  data.paymentMethod = result.paymentMethod;
  return data;
}
