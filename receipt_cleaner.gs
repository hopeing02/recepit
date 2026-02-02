function cleanReceiptData(data) {
  normalizeDate(data);
  normalizeAmounts(data);
  normalizeItems(data);
  return data;
}

function normalizeDate(data) {
  if (!data.date) return;
  var m = data.date.match(/(\d{4}).?(\d{1,2}).?(\d{1,2})/);
  if (m) {
    data.date = `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  }
}

function normalizeAmounts(data) {
  data.totalAmount = Number(data.totalAmount) || 0;
  data.taxableAmount = Number(data.taxableAmount) || 0;
  data.taxAmount = Number(data.taxAmount) || 0;
  data.taxFreeAmount = Number(data.taxFreeAmount) || 0;
}

function normalizeItems(data) {
  if (!Array.isArray(data.items)) data.items = [];
  data.items = data.items.filter(i => i.name && i.amount > 0);
}

function pad(n) {
  return n.toString().padStart(2, '0');
}
