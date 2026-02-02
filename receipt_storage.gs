function saveReceipt(data) {
//saveReceipt 함수는 data라는 영수증 정보를 받아서 저장하는 함수입니다.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
// ss변수는 현재 열려있는 스프레드시트 파일을 가져옵니다.
  var sheet = ss.getSheetByName('영수증내역') || ss.insertSheet('영수증내역');
// sheet변수는 영수증내역이라는 이름의 시트를 찾거나 없으면 새로 만듭니다.
  sheet.appendRow([
// appendRow는 시트의 맨 아래에 새로운 행을 추가합니다.
    data.date,
//data에서 날짜 정보를 첫 번째 칸에 넣습니다.
    data.category,
//data에서 카테고리 정보를 두 번째 칸에 넣습니다.
    data.paymentMethod,
//data에서 결제수단 정보를 세 번째 칸에 넣습니다.
    data.storeName,
//data에서 가게이름 정보를 네 번째 칸에 넣습니다.
    data.totalAmount,
//data에서 총금액 정보를 다섯 번째 칸에 넣습니다.
    Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss')
//현재 시간을 지정된 시간대와 형식으로 변환하여 여섯 번째 칸에 넣습니다.
  ]);
}
