// Code.gs - Claude API를 사용한 영수증 판독기 + 월별 통계 + 카테고리 분류

// ⚠️ 설정: 여기에 Claude API 키를 입력하세요
var CLAUDE_API_KEY = '';

// 카테고리 및 결제수단 정의
var CATEGORIES = {
  '식비': {
    keywords: ['커피', '카페', '스타벅스', '이디야', '투썸', '빽다방', '메가커피', '할리스', 
               '음식', '식당', '레스토랑', '치킨', '피자', '햄버거', '맥도날드', '버거킹', 
               '편의점', 'GS25', 'CU', '세븐일레븐', '이마트24', 
               '마트', '이마트', '홈플러스', '롯데마트', '쿠팡', '마켓컬리',
               '배달', '요기요', '배달의민족', '쿠팡이츠'],
    icon: '🍔'
  },
  '교통비': {
    keywords: ['주유소', 'GS칼텍스', 'SK에너지', '현대오일뱅크', 'S-OIL',
               '택시', '카카오T', '우버', '타다',
               '지하철', '버스', '교통카드', '티머니',
               '톨게이트', '하이패스', '주차', '주차장'],
    icon: '🚗'
  },
  '의료비': {
    keywords: ['병원', '의원', '약국', '한의원', '치과', '정형외과', '내과', '외과',
               '클리닉', '검진', '건강검진', '예방접종'],
    icon: '🏥'
  },
  '쇼핑': {
    keywords: ['쿠팡', '네이버', '11번가', 'G마켓', '옥션', '위메프', '티몬',
               '백화점', '현대백화점', '롯데백화점', '신세계',
               '아울렛', '쇼핑몰', '옷', '의류', '신발', '가방'],
    icon: '🛍️'
  },
  '문화생활': {
    keywords: ['영화', 'CGV', '롯데시네마', '메가박스',
               '공연', '콘서트', '뮤지컬', '전시회',
               '도서', '서점', '교보문고', '영풍문고',
               'PC방', '노래방', '당구장', '볼링장'],
    icon: '🎬'
  },
  '통신비': {
    keywords: ['SKT', 'KT', 'LG U+', '알뜰폰', '통신요금', 
               '인터넷', '케이블', 'IPTV', '넷플릭스', '유튜브'],
    icon: '📱'
  },
  '공과금': {
    keywords: ['전기', '가스', '수도', '관리비', '아파트'],
    icon: '💡'
  },
  '교육': {
    keywords: ['학원', '과외', '교육', '학교', '대학교', '수강료', '교재'],
    icon: '📚'
  },
  '뷰티': {
    keywords: ['미용실', '헤어샵', '네일', '피부과', '에스테틱', '마사지', '스파'],
    icon: '💅'
  },
  '기타': {
    keywords: [],
    icon: '📦'
  }
};

var PAYMENT_METHODS = {
  '카드': ['카드', '신용카드', '체크카드', '승인'],
  '현금': ['현금', '현금영수증'],
  '계좌이체': ['이체', '계좌이체', '송금'],
  '간편결제': ['카카오페이', '네이버페이', '토스', '페이코', '삼성페이', '애플페이']
};

// 웹 앱 화면 표시
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('영수증 관리 시스템')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 카테고리 자동 분류 함수
function classifyReceipt(data) {
  var category = '기타';
  var paymentMethod = '현금';
  
  // 1. 카테고리 분류 (상호명 기반)
  var storeName = (data.storeName || '').toLowerCase();
  var maxScore = 0;
  
  for (var cat in CATEGORIES) {
    var keywords = CATEGORIES[cat].keywords;
    var score = 0;
    
    for (var i = 0; i < keywords.length; i++) {
      if (storeName.indexOf(keywords[i].toLowerCase()) !== -1) {
        score += 10;
      }
    }
    
    // 품목명도 체크
    if (data.items && data.items.length > 0) {
      for (var j = 0; j < data.items.length; j++) {
        var itemName = (data.items[j].name || '').toLowerCase();
        for (var k = 0; k < keywords.length; k++) {
          if (itemName.indexOf(keywords[k].toLowerCase()) !== -1) {
            score += 5;
          }
        }
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      category = cat;
    }
  }
  
  // 2. 결제수단 분류
  var receiptText = JSON.stringify(data).toLowerCase();
  
  for (var method in PAYMENT_METHODS) {
    var methodKeywords = PAYMENT_METHODS[method];
    for (var m = 0; m < methodKeywords.length; m++) {
      if (receiptText.indexOf(methodKeywords[m].toLowerCase()) !== -1) {
        paymentMethod = method;
        break;
      }
    }
    if (paymentMethod !== '현금') break;
  }
  
  // 카드 정보가 있으면 카드로 분류
  if (data.cardName || data.cardNumber || data.approvalNumber) {
    paymentMethod = '카드';
  }
  
  return {
    category: category,
    categoryIcon: CATEGORIES[category].icon,
    paymentMethod: paymentMethod
  };
}

// 영수증 분석 함수
function analyzeReceiptFromWeb(base64Image) {
  try {
    if (CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE' || CLAUDE_API_KEY === '') {
      return { error: 'Claude API 키를 설정해주세요.' };
    }
    
    Logger.log('분석 시작...');
    
    var apiUrl = ' https://api.anthropic.com/v1/messages';
    
    var requestBody = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image
            }
          },
          {
            type: 'text',
            text: '이 영수증 이미지를 분석해서 다음 정보를 JSON 형식으로 추출해주세요:\n\n' +
                  '{\n' +
                  '  "storeName": "상호명",\n' +
                  '  "businessNumber": "사업자번호 (숫자만)",\n' +
                  '  "date": "날짜 (YYYY-MM-DD 형식)",\n' +
                  '  "items": [\n' +
                  '    {\n' +
                  '      "name": "품명",\n' +
                  '      "quantity": 수량(숫자),\n' +
                  '      "unitPrice": 단가(숫자),\n' +
                  '      "amount": 금액(숫자)\n' +
                  '    }\n' +
                  '  ],\n' +
                  '  "taxableAmount": 과세물품(공급가액, 숫자),\n' +
                  '  "taxAmount": 부가세(세액, 숫자),\n' +
                  '  "taxFreeAmount": 면세물품(숫자),\n' +
                  '  "totalAmount": 총액(숫자)\n' +
                  '}\n\n' +
                  '주의사항:\n' +
                  '1. 과세물품 = 공급가액 (부가세 포함 전 금액)\n' +
                  '2. 부가세 = 세액 (VAT 10%)\n' +
                  '3. 면세물품 = 부가세가 없는 품목 금액\n' +
                  '4. 총액 = 과세물품 + 부가세 + 면세물품\n' +
                  '5.. 숫자에서 쉼표 제거, JSON만 반환'
          }
        ]
      }]
    };
    
    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(requestBody),
      muteHttpExceptions: true
    };
    
    var response = UrlFetchApp.fetch(apiUrl, options);
    var responseCode = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (responseCode !== 200) {
      Logger.log('API 오류: ' + responseText);
      return { error: 'API 오류: ' + responseText };
    }
    
    var result = JSON.parse(responseText);
    var extractedText = result.content[0].text;
    Logger.log('Claude 응답: ' + extractedText);
    
    // JSON 추출
    var jsonText = extractedText;
    if (jsonText.indexOf('```json') !== -1) {
      jsonText = jsonText.split('```json')[1].split('```')[0];
    } else if (jsonText.indexOf('```') !== -1) {
      jsonText = jsonText.split('```')[1].split('```')[0];
    }
    jsonText = jsonText.trim();
    
    var receiptData = JSON.parse(jsonText);
    receiptData = cleanData(receiptData);
    
    Logger.log('분석 완료');
    return receiptData;
    
  } catch (error) {
    Logger.log('오류: ' + error.toString());
    return { error: error.toString() };
  }
}

// 데이터 정제
function cleanData(data) {
  if (data.storeName) {
    data.storeName = data.storeName.replace(/[\-\s]+$/, '').trim();
  }
  
  if (data.businessNumber) {
    data.businessNumber = data.businessNumber.replace(/[-\s]/g, '');
  }
  
  if (data..date) {
    var dateMatch = data.date.match(/(\d{4})[.\-\/년]?(\d{1,2})[.\-\/월]?(\d{1,2})/);
    if (dateMatch) {
      var year = dateMatch[1];
      var month = dateMatch[2];
      if (month.length === 1) month = '0' + month;
      var day = dateMatch[3];
      if (day.length === 1) day = '0' + day;
      data.date = year + '-' + month + '-' + day;
    }
  }
  
  if (data.items && Array.isArray(data.items)) {
    data.items = data.items.filter(function(item) {
      return item.name && item.amount > 0;
    });
  } else {
    data.items = [];
  }
  
  data.totalAmount = parseInt(data.totalAmount) || 0;
  data.taxableAmount = parseInt(data.taxableAmount) || 0;
  data.taxAmount = parseInt(data.taxAmount) || 0;
  data.taxFreeAmount = parseInt(data.taxFreeAmount) || 0;
  
  // 하위 호환성: 기존 supplyAmount도 지원
  if (!data.taxableAmount && data.supplyAmount) {
    data.taxableAmount = parseInt(data.supplyAmount) || 0;
  }
  
  // ✨ 자동 분류 추가 (수동으로 지정된 경우 제외)
  if (!data.category || !data.paymentMethod) {
    var classification = classifyReceipt(data);
    if (!data.category) {
      data.category = classification.category;
      data.categoryIcon = classification.categoryIcon;
    }
    if (!data.paymentMethod) {
      data.paymentMethod = classification.paymentMethod;
    }
  }
  
  // categoryIcon이 없으면 추가
  if (data.category && !data.categoryIcon) {
    data.categoryIcon = CATEGORIES[data.category] ? CATEGORIES[data.category].icon : '📦';
  }
  
  return data;
}

// 수정된 데이터 저장
function saveEditedReceipt(data) {
  try {
    Logger.log('저장 시작...');
    saveToSpreadsheet(data);
    Logger.log('저장 완료');
    return { success: true, message: '스프레드시트에 저장되었습니다!' };
  } catch (error) {
    Logger.log('저장 오류: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// 스프레드시트 저장
function saveToSpreadsheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('영수증내역');
  
  if (!sheet) {
    sheet = ss.insertSheet('영수증내역');
    // 헤더에 카테고리와 결제수단 컬럼 추가
    sheet.appendRow(['날짜', '카테고리', '결제수단', '상호명', '사업자번호', '품명', '수량', '단가', '금액', '과세물품', '부가세', '면세물품', '총액', '등록일시']);
    var header = sheet.getRange(1, 1, 1, 14);
    header.setBackground(' #4285f4').setFontColor(' #ffffff').setFontWeight('bold');
    header.setHorizontalAlignment('center');
    
    sheet.setColumnWidth(1, 100);  // 날짜
    sheet.setColumnWidth(2, 100);  // 카테고리
    sheet.setColumnWidth(3, 100);  // 결제수단
    sheet.setColumnWidth(4, 150);  // 상호명
    sheet.setColumnWidth(5, 120);  // 사업자번호
    sheet.setColumnWidth(6, 250);  // 품명
    sheet.setColumnWidth(7, 60);   // 수량
    sheet.setColumnWidth(8, 100);  // 단가
    sheet.setColumnWidth(9, 100);  // 금액
    sheet.setColumnWidth(10, 100); // 과세물품
    sheet.setColumnWidth(11, 100); // 부가세
    sheet.setColumnWidth(12, 100); // 면세물품
    sheet.setColumnWidth(13, 100); // 총액
    sheet.setColumnWidth(14, 150); // 등록일시
  }
  
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  var categoryDisplay = (data.categoryIcon || '') + ' ' + (data.category || '기타');
  
  if (data.items.length === 0) {
    sheet.appendRow([
      data.date || '-',
      categoryDisplay,
      data.paymentMethod || '현금',
      data.storeName || '-',
      data.businessNumber || '-',
      '(품목없음)', 
      '', '', '',
      data.taxableAmount || 0,
      data.taxAmount || 0,
      data.taxFreeAmount || 0,
      data.totalAmount, 
      timestamp
    ]);
  } else {
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      sheet.appendRow([
        data.date || '-',
        i === 0 ? categoryDisplay : '',
        i === 0 ? (data.paymentMethod || '현금') : '',
        data.storeName || '-',
        data.businessNumber || '-',
        item.name, 
        item.quantity || 1, 
        item.unitPrice || item.amount, 
        item.amount,
        i === 0 ? (data.taxableAmount || '') : '',
        i === 0 ? (data.taxAmount || '') : '',
        i === 0 ? (data.taxFreeAmount || '') : '',
        i === 0 ? data.totalAmount : '',
        timestamp
      ]);
    }
    
    var lastRow = sheet.getLastRow();
    sheet.appendRow([
      data.date || '-',
      categoryDisplay,
      data.paymentMethod || '현금',
      data.storeName || '-',
      data.businessNumber || '-',
      '[합계]', 
      '', '', '',
      data.taxableAmount || '',
      data.taxAmount || '',
      data.taxFreeAmount || '',
      data.totalAmount, 
      timestamp
    ]);
    sheet.getRange(lastRow + 1, 1, 1, 14).setBackground(' #ffe599').setFontWeight('bold');
  }
}

// 월별 통계 조회
function getMonthlyStats(month) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('영수증내역');
    
    if (!sheet) {
      return { error: '영수증 내역이 없습니다. 먼저 영수증을 등록해주세요.' };
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { error: '저장된 영수증이 없습니다.' };
    }
    
    var targetYear = parseInt(month.split('-')[0]);
    var targetMonth = parseInt(month.split('-')[1]);
    
    var count = 0;
    var totalAmount = 0;
    var taxableAmount = 0;
    var taxAmount = 0;
    var taxFreeAmount = 0;
    
    var storeStats = {};
    var categoryStats = {};  // 카테고리별 통계
    var paymentStats = {};   // 결제수단별 통계
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var dateStr = row[0];
      var category = row[1];      // 카테고리
      var payment = row[2];       // 결제수단
      var storeName = row[3];     // 상호명
      var itemName = row[5];      // 품명
      var rowTaxable = row[9] || 0;
      var rowTax = row[10] || 0;
      var rowTaxFree = row[11] || 0;
      var rowTotal = row[12] || 0;
      
      var receiptDate;
      if (dateStr instanceof Date) {
        receiptDate = dateStr;
      } else if (typeof dateStr === 'string') {
        receiptDate = new Date(dateStr);
      } else {
        continue;
      }
      
      if (receiptDate.getFullYear() === targetYear && (receiptDate.getMonth() + 1) === targetMonth) {
        
        if (itemName === '[합계]') {
          count++;
          totalAmount += parseFloat(rowTotal) || 0;
          taxableAmount += parseFloat(rowTaxable) || 0;
          taxAmount += parseFloat(rowTax) || 0;
          taxFreeAmount += parseFloat(rowTaxFree) || 0;
          
          // 상호별
          if (storeName && storeName !== '-') {
            if (!storeStats[storeName]) {
              storeStats[storeName] = { count: 0, amount: 0 };
            }
            storeStats[storeName]..count++;
            storeStats[storeName].amount += parseFloat(rowTotal) || 0;
          }
          
          // 카테고리별
          var cleanCategory = category.replace(/[🍔🚗🏥🛍️🎬📱💡📚💅📦]/g, '').trim();
          if (cleanCategory) {
            if (!categoryStats[cleanCategory]) {
              categoryStats[cleanCategory] = { count: 0, amount: 0, icon: category.match(/[🍔🚗🏥🛍️🎬📱💡📚💅📦]/)?.[0] || '' };
            }
            categoryStats[cleanCategory]..count++;
            categoryStats[cleanCategory].amount += parseFloat(rowTotal) || 0;
          }
          
          // 결제수단별
          if (payment) {
            if (!paymentStats[payment]) {
              paymentStats[payment] = { count: 0, amount: 0 };
            }
            paymentStats[payment].count++;
            paymentStats[payment].amount += parseFloat(rowTotal) || 0;
          }
        }
      }
    }
    
    // 배열 변환 및 정렬
    var storesArray = [];
    for (var store in storeStats) {
      storesArray.push({
        name: store,
        count: storeStats[store].count,
        amount: storeStats[store].amount
      });
    }
    storesArray.sort(function(a, b) { return b.amount - a.amount; });
    if (storesArray.length > 10) storesArray = storesArray.slice(0, 10);
    
    var categoriesArray = [];
    for (var cat in categoryStats) {
      categoriesArray.push({
        name: cat,
        icon: categoryStats[cat].icon,
        count: categoryStats[cat].count,
        amount: categoryStats[cat].amount
      });
    }
    categoriesArray.sort(function(a, b) { return b.amount - a.amount; });
    
    var paymentsArray = [];
    for (var pay in paymentStats) {
      paymentsArray.push({
        name: pay,
        count: paymentStats[pay].count,
        amount: paymentStats[pay].amount
      });
    }
    paymentsArray.sort(function(a, b) { return b.amount - a.amount; });
    
    return {
      count: count,
      totalAmount: Math.round(totalAmount),
      taxableAmount: Math.round(taxableAmount),
      taxAmount: Math.round(taxAmount),
      taxFreeAmount: Math.round(taxFreeAmount),
      stores: storesArray,
      categories: categoriesArray,
      payments: paymentsArray
    };
    
  } catch (error) {
    Logger.log('통계 조회 오류: ' + error.toString());
    return { error: error.toString() };
  }
}
