// 스프레드시트 저장
// 영수증 데이터를 구글 스프레드시트에 실제로 저장하는 함수입니다.
function saveToSpreadsheet(data) {
  // 현재 활성화된 스프레드시트를 가져옵니다.
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // 영수증내역이라는 이름의 시트를 찾습니다.
  var sheet = ss.getSheetByName('영수증내역');
  
  // 해당 시트가 없는지 확인합니다.
  if (!sheet) {
    // 영수증내역이라는 이름의 새 시트를 만듭니다.
    sheet = ss.insertSheet('영수증내역');
    // 첫 행에 열 제목들을 추가합니다.
    sheet.appendRow(['날짜', '상호명', '사업자번호', '품명', '수량', '단가', '금액', '카드회사', '카드번호', '과세물품', '부가세', '면세물품', '총액', '등록일시']);
    // 첫 행의 14개 열 범위를 선택합니다.
    var header = sheet.getRange(1, 1, 1, 14);
    // 헤더 배경색을 파란색으로 설정합니다.
    header.setBackground('#4285f4').setFontColor('#ffffff').setFontWeight('bold');
    // 헤더 텍스트를 가운데 정렬합니다.
    header.setHorizontalAlignment('center');
    
    // 날짜 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(1, 100);  // 날짜
    // 상호명 열의 너비를 150픽셀로 설정합니다.
    sheet.setColumnWidth(2, 150);  // 상호명
    // 사업자번호 열의 너비를 120픽셀로 설정합니다.
    sheet.setColumnWidth(3, 120);  // 사업자번호
    // 품명 열의 너비를 250픽셀로 설정합니다.
    sheet.setColumnWidth(4, 250);  // 품명
    // 수량 열의 너비를 60픽셀로 설정합니다.
    sheet.setColumnWidth(5, 60);   // 수량
    // 단가 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(6, 100);  // 단가
    // 금액 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(7, 100);  // 금액
    // 카드회사 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(8, 100);  // 카드회사
    // 카드번호 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(9, 100);  // 카드번호
    // 과세물품 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(10, 100);  // 과세물품
    // 부가세 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(11, 100);  // 부가세
    // 면세물품 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(12, 100); // 면세물품
    // 총액 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(13, 100); // 총액
    // 등록일시 열의 너비를 150픽셀로 설정합니다.
    sheet.setColumnWidth(14, 150); // 등록일시
  }
  
  // 현재 시간을 한국 시간대 기준으로 포맷팅합니다.
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  
  // 품목 목록이 비어있는지 확인합니다.
  if (data.items.length === 0) {
    // 품목이 없을 때 한 줄만 추가합니다.
    sheet.appendRow([
      // 날짜가 없으면 대시를 표시합니다.
      data.date || '-', 
      // 상호명이 없으면 대시를 표시합니다.
      data.storeName || '-',
      // 사업자번호가 없으면 대시를 표시합니다.
      data.businessNumber || '-',
      // 품목이 없다는 메시지를 표시합니다.
      '(품목없음)', 
      // 수량 칸을 비웁니다.
      '', '', '',
      // 과세물품 금액을 표시하며 없으면 0입니다.
      data.taxableAmount || 0,
      // 부가세 금액을 표시하며 없으면 0입니다.
      data.taxAmount || 0,
      // 면세물품 금액을 표시하며 없으면 0입니다.
      data.taxFreeAmount || 0,
      // 총액을 표시합니다.
      data.totalAmount, 
      // 등록 시간을 표시합니다.
      timestamp
    ]);
  // 품목이 있는 경우입니다.
  } else {
    // 모든 품목에 대해 반복합니다.
    for (var i = 0; i < data.items.length; i++) {
      // 현재 품목 정보를 가져옵니다.
      var item = data.items[i];
      // 각 품목을 한 줄씩 추가합니다.
      sheet.appendRow([
        // 날짜가 없으면 대시를 표시합니다.
        data.date || '-', 
        // 상호명이 없으면 대시를 표시합니다.
        data.storeName || '-',
        // 사업자번호가 없으면 대시를 표시합니다.
        data.businessNumber || '-',
        // 품목명을 표시합니다.
        item.name, 
        // 수량이 없으면 1로 표시합니다.
        item.quantity || 1, 
        // 단가가 없으면 금액을 단가로 사용합니다.
        item.unitPrice || item.amount, 
        // 품목 금액을 표시합니다.
        item.amount,
        // 첫 번째 품목일 때만 과세물품을 표시합니다.
        i === 0 ? (data.taxableAmount || '') : '',
        // 첫 번째 품목일 때만 부가세를 표시합니다.
        i === 0 ? (data.taxAmount || '') : '',
        // 첫 번째 품목일 때만 면세물품을 표시합니다.
        i === 0 ? (data.taxFreeAmount || '') : '',
        // 첫 번째 품목일 때만 총액을 표시합니다.
        i === 0 ? data.totalAmount : '',
        // 등록 시간을 표시합니다.
        timestamp
      ]);
    }
    
    // 마지막으로 추가된 행 번호를 가져옵니다.
    var lastRow = sheet.getLastRow();
    // 합계 행을 추가합니다.
    sheet.appendRow([
      // 날짜가 없으면 대시를 표시합니다.
      data.date || '-', 
      // 상호명이 없으면 대시를 표시합니다.
      data.storeName || '-',
      // 사업자번호가 없으면 대시를 표시합니다.
      data.businessNumber || '-',
      // 합계임을 표시합니다.
      '[합계]', 
      // 빈 칸을 남깁니다.
      '', '', '',
    
      // 과세물품 금액을 표시합니다.
      data.taxableAmount || '',
      // 부가세 금액을 표시합니다.
      data.taxAmount || '',
      // 면세물품 금액을 표시합니다.
      data.taxFreeAmount || '',
      // 총액을 표시합니다.
      data.totalAmount, 
      // 등록 시간을 표시합니다.
      timestamp
    ]);
    // 합계 행의 배경색을 노란색으로 설정하고 굵게 표시합니다.
    sheet.getRange(lastRow + 1, 1, 1, 12).setBackground('#ffe599').setFontWeight('bold');
  }
}
