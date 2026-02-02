function saveReceipt(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('영수증내역') || ss.insertSheet('영수증내역');
  sheet.appendRow([
    data.date,
    data.category,
    data.paymentMethod,
    data.storeName,
    data.totalAmount,
    Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
  ]);
}
