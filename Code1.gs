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

// 웹 앱 화면 표시
// 사용자가 웹 브라우저에서 이 앱에 접속했을 때 실행되는 함수입니다.
function doGet() {
  // Index라는 이름의 HTML 파일을 불러와서 화면에 표시합니다.
  return HtmlService.createHtmlOutputFromFile('Index')
    // 브라우저 탭에 표시될 제목을 설정합니다.
    .setTitle('영수증 관리 시스템')
    // 다른 웹사이트의 프레임 안에서도 이 앱이 표시되도록 허용합니다.
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 영수증 분석 함수
// 영수증 이미지를 받아서 Claude AI로 분석하는 함수입니다.
function analyzeReceiptFromWeb(base64Image) {
  // 에러가 발생할 수 있는 코드를 안전하게 실행하기 위한 블록입니다.
  try {
    // API 키가 초기값 그대로이거나 비어있는지 확인합니다.
    if (CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE' || CLAUDE_API_KEY === '') {
      // API 키가 없으면 에러 메시지를 반환합니다.
      return { error: 'Claude API 키를 설정해주세요.' };
    }
    
    // 로그에 분석 시작 메시지를 기록합니다.
    Logger.log('분석 시작...');
    
    // Claude API 서버의 주소를 저장합니다.
    var apiUrl = 'https://api.anthropic.com/v1/messages';
    
    // API에 보낼 요청 내용을 담는 객체를 만듭니다.
    var requestBody = {
      // 사용할 AI 모델의 이름을 지정합니다.
      model: 'claude-sonnet-4-5-20250929',
      // AI가 생성할 수 있는 최대 글자 수를 제한합니다.
      max_tokens: 2048,
      // AI에게 보낼 메시지 목록입니다.
      messages: [{
        // 사용자 역할로 메시지를 보냅니다.
        role: 'user',
        // 메시지 내용 배열입니다.
        content: [
          {
            // 이미지 타입의 데이터임을 알립니다.
            type: 'image',
            // 이미지 정보를 담는 객체입니다.
            source: {
              // base64 인코딩된 이미지임을 지정합니다.
              type: 'base64',
              // 이미지가 JPEG 형식임을 알립니다.
              media_type: 'image/jpeg',
              // 실제 이미지 데이터를 넣습니다.
              data: base64Image
            }
          },
          {
            // 텍스트 타입의 데이터임을 알립니다.
            type: 'text',
            // AI에게 영수증을 분석하여 JSON 형식으로 정보를 추출하라는 명령입니다.
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
                  '5. 숫자에서 쉼표 제거, JSON만 반환'
          }
        ]
      }]
    };
    
    // HTTP 요청을 보낼 때 사용할 옵션들을 설정합니다.
    var options = {
      // POST 방식으로 데이터를 전송합니다.
      method: 'post',
      // 보내는 데이터가 JSON 형식임을 알립니다.
      contentType: 'application/json',
      // 요청 헤더에 포함할 정보들입니다.
      headers: {
        // API 인증 키를 헤더에 포함합니다.
        'x-api-key': CLAUDE_API_KEY,
        // Claude API의 버전을 지정합니다.
        'anthropic-version': '2023-06-01'
      },
      // 요청 본문에 실제 데이터를 JSON 문자열로 변환하여 넣습니다.
      payload: JSON.stringify(requestBody),
      // HTTP 에러가 발생해도 예외를 던지지 않고 응답을 받습니다.
      muteHttpExceptions: true
    };
    
    // 지정한 URL로 설정한 옵션을 사용하여 HTTP 요청을 보냅니다.
    var response = UrlFetchApp.fetch(apiUrl, options);
    // 서버로부터 받은 응답의 상태 코드를 가져옵니다.
    var responseCode = response.getResponseCode();
    // 서버로부터 받은 응답 내용을 텍스트로 가져옵니다.
    var responseText = response.getContentText();
    
    // 응답 상태 코드가 200이 아니면 에러가 발생한 것입니다.
    if (responseCode !== 200) {
      // 에러 내용을 로그에 기록합니다.
      Logger.log('API 오류: ' + responseText);
      // 에러 메시지를 반환합니다.
      return { error: 'API 오류: ' + responseText };
    }
    
    // 응답 텍스트를 JSON 객체로 변환합니다.
    var result = JSON.parse(responseText);
    // 응답 결과에서 AI가 생성한 텍스트 부분만 추출합니다.
    var extractedText = result.content[0].text;
    // AI가 생성한 텍스트를 로그에 기록합니다.
    Logger.log('Claude 응답: ' + extractedText);
    
    // JSON 추출
    // AI 응답 텍스트를 임시로 저장합니다.
    var jsonText = extractedText;
    // 응답에 ```json 태그가 있는지 확인합니다.
    if (jsonText.indexOf('```json') !== -1) {
      // ```json과 ``` 사이의 JSON 데이터만 추출합니다.
      jsonText = jsonText.split('```json')[1].split('```')[0];
    // ``` 태그만 있는 경우를 확인합니다.
    } else if (jsonText.indexOf('```') !== -1) {
      // ``` 사이의 데이터만 추출합니다.
      jsonText = jsonText.split('```')[1].split('```')[0];
    }
    // 추출한 JSON 문자열의 앞뒤 공백을 제거합니다.
    jsonText = jsonText.trim();
    
    // JSON 문자열을 객체로 변환합니다.
    var receiptData = JSON.parse(jsonText);
    // 변환한 데이터를 정제하는 함수를 호출합니다.
    receiptData = cleanData(receiptData);
    
    // 분석 완료 메시지를 로그에 기록합니다.
    Logger.log('분석 완료');
    // 정제된 영수증 데이터를 반환합니다.
    return receiptData;
    
  // 에러가 발생하면 이 블록이 실행됩니다.
  } catch (error) {
    // 에러 내용을 로그에 기록합니다.
    Logger.log('오류: ' + error.toString());
    // 에러 메시지를 반환합니다.
    return { error: error.toString() };
  }
}

// 데이터 정제
// AI가 추출한 데이터를 깔끔하게 정리하는 함수입니다.
function cleanData(data) {
  // 상호명이 있는지 확인합니다.
  if (data.storeName) {
    // 상호명 끝의 하이픈과 공백을 제거합니다.
    data.storeName = data.storeName.replace(/[\-\s]+$/, '').trim();
  }
  
  // 사업자번호가 있는지 확인합니다.
  if (data.businessNumber) {
    // 사업자번호에서 하이픈과 공백을 모두 제거합니다.
    data.businessNumber = data.businessNumber.replace(/[-\s]/g, '');
  }
  
  // 날짜 데이터가 있는지 확인합니다.
  if (data.date) {
    // 날짜 문자열에서 연도, 월, 일을 추출합니다.
    var dateMatch = data.date.match(/(\d{4})[.\-\/년]?(\d{1,2})[.\-\/월]?(\d{1,2})/);
    // 날짜 패턴이 매칭되었는지 확인합니다.
    if (dateMatch) {
      // 연도 부분을 추출합니다.
      var year = dateMatch[1];
      // 월 부분을 추출합니다.
      var month = dateMatch[2];
      // 월이 한 자리 숫자면 앞에 0을 붙입니다.
      if (month.length === 1) month = '0' + month;
      // 일 부분을 추출합니다.
      var day = dateMatch[3];
      // 일이 한 자리 숫자면 앞에 0을 붙입니다.
      if (day.length === 1) day = '0' + day;
      // 날짜를 YYYY-MM-DD 형식으로 저장합니다.
      data.date = year + '-' + month + '-' + day;
    }
  }
  
  // 품목 데이터가 있고 배열 형식인지 확인합니다.
  if (data.items && Array.isArray(data.items)) {
    // 품명이 있고 금액이 0보다 큰 품목만 남깁니다.
    data.items = data.items.filter(function(item) {
      return item.name && item.amount > 0;
    });
  // 품목 데이터가 없거나 배열이 아닌 경우입니다.
  } else {
    // 빈 배열로 초기화합니다.
    data.items = [];
  }
  
  // 총액을 정수로 변환하며 실패시 0으로 설정합니다.
  data.totalAmount = parseInt(data.totalAmount) || 0;
  // 과세물품 금액을 정수로 변환하며 실패시 0으로 설정합니다.
  data.taxableAmount = parseInt(data.taxableAmount) || 0;
  // 부가세를 정수로 변환하며 실패시 0으로 설정합니다.
  data.taxAmount = parseInt(data.taxAmount) || 0;
  // 면세물품 금액을 정수로 변환하며 실패시 0으로 설정합니다.
  data.taxFreeAmount = parseInt(data.taxFreeAmount) || 0;
  
  // 하위 호환성: 기존 supplyAmount도 지원
  // 과세물품 값이 없고 공급가액 값이 있는지 확인합니다.
  if (!data.taxableAmount && data.supplyAmount) {
    // 공급가액을 과세물품 값으로 사용합니다.
    data.taxableAmount = parseInt(data.supplyAmount) || 0;
  }
  
  // 정제된 데이터를 반환합니다.
  return data;
}

// 수정된 데이터 저장
// 사용자가 수정한 영수증 데이터를 저장하는 함수입니다.
function saveEditedReceipt(data) {
  // 에러가 발생할 수 있는 코드를 안전하게 실행합니다.
  try {
    // 저장 시작 메시지를 로그에 기록합니다.
    Logger.log('저장 시작...');
    // 스프레드시트에 데이터를 저장하는 함수를 호출합니다.
    saveToSpreadsheet(data);
    // 저장 완료 메시지를 로그에 기록합니다.
    Logger.log('저장 완료');
    // 성공 메시지를 반환합니다.
    return { success: true, message: '스프레드시트에 저장되었습니다!' };
  // 에러가 발생하면 이 블록이 실행됩니다.
  } catch (error) {
    // 에러 내용을 로그에 기록합니다.
    Logger.log('저장 오류: ' + error.toString());
    // 실패 메시지와 에러 내용을 반환합니다.
    return { success: false, error: error.toString() };
  }
}

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
    sheet.appendRow(['날짜', '상호명', '사업자번호', '품명', '수량', '단가', '금액', '과세물품', '부가세', '면세물품', '총액', '등록일시']);
    // 첫 행의 12개 열 범위를 선택합니다.
    var header = sheet.getRange(1, 1, 1, 12);
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
    // 과세물품 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(8, 100);  // 과세물품
    // 부가세 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(9, 100);  // 부가세
    // 면세물품 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(10, 100); // 면세물품
    // 총액 열의 너비를 100픽셀로 설정합니다.
    sheet.setColumnWidth(11, 100); // 총액
    // 등록일시 열의 너비를 150픽셀로 설정합니다.
    sheet.setColumnWidth(12, 150); // 등록일시
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

// 월별 통계 조회
// 특정 월의 영수증 통계를 계산하는 함수입니다.
function getMonthlyStats(month) {
  // 에러가 발생할 수 있는 코드를 안전하게 실행합니다.
  try {
    // 현재 활성화된 스프레드시트를 가져옵니다.
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // 영수증내역 시트를 찾습니다.
    var sheet = ss.getSheetByName('영수증내역');
    
    // 시트가 없는지 확인합니다.
    if (!sheet) {
      // 영수증이 없다는 에러 메시지를 반환합니다.
      return { error: '영수증 내역이 없습니다. 먼저 영수증을 등록해주세요.' };
    }
    
    // 시트의 모든 데이터를 2차원 배열로 가져옵니다.
    var data = sheet.getDataRange().getValues();
    
    // 헤더 제외
    // 데이터가 헤더만 있거나 비어있는지 확인합니다.
    if (data.length <= 1) {
      // 저장된 영수증이 없다는 에러 메시지를 반환합니다.
      return { error: '저장된 영수증이 없습니다.' };
    }
    
    // 월 형식 변환 (YYYY-MM)
    // 월 문자열에서 연도 부분을 추출하여 정수로 변환합니다.
    var targetYear = parseInt(month.split('-')[0]);
    // 월 문자열에서 월 부분을 추출하여 정수로 변환합니다.
    var targetMonth = parseInt(month.split('-')[1]);
    
    // 영수증 개수를 세는 변수를 0으로 초기화합니다.
    var count = 0;
    // 총액 합계를 저장하는 변수를 0으로 초기화합니다.
    var totalAmount = 0;
    // 과세물품 합계를 저장하는 변수를 0으로 초기화합니다.
    var taxableAmount = 0;
    // 부가세 합계를 저장하는 변수를 0으로 초기화합니다.
    var taxAmount = 0;
    // 면세물품 합계를 저장하는 변수를 0으로 초기화합니다.
    var taxFreeAmount = 0;
    
    // 상호별 통계를 위한 객체
    // 각 상호별 데이터를 저장할 빈 객체를 만듭니다.
    var storeStats = {};
    
    // 헤더를 제외한 모든 행에 대해 반복합니다.
    for (var i = 1; i < data.length; i++) {
      // 현재 행 데이터를 가져옵니다.
      var row = data[i];
      // 날짜 열의 값을 가져옵니다.
      var dateStr = row[0]; // 날짜
      // 상호명 열의 값을 가져옵니다.
      var storeName = row[1]; // 상호명
      // 품명 열의 값을 가져옵니다.
      var itemName = row[3]; // 품명
      // 금액 열의 값을 가져오며 없으면 0입니다.
      var itemAmount = row[6] || 0; // 금액
      // 과세물품 열의 값을 가져오며 없으면 0입니다.
      var rowTaxable = row[7] || 0; // 과세물품
      // 부가세 열의 값을 가져오며 없으면 0입니다.
      var rowTax = row[8] || 0; // 부가세
      // 면세물품 열의 값을 가져오며 없으면 0입니다.
      var rowTaxFree = row[9] || 0; // 면세물품
      // 총액 열의 값을 가져오며 없으면 0입니다.
      var rowTotal = row[10] || 0; // 총액
      
      // 날짜 파싱
      // 영수증 날짜를 저장할 변수를 선언합니다.
      var receiptDate;
      // 날짜가 이미 Date 객체인지 확인합니다.
      if (dateStr instanceof Date) {
        // 그대로 사용합니다.
        receiptDate = dateStr;
      // 날짜가 문자열인지 확인합니다.
      } else if (typeof dateStr === 'string') {
        // 문자열을 Date 객체로 변환합니다.
        receiptDate = new Date(dateStr);
      // 날짜 형식이 아닌 경우입니다.
      } else {
        // 이 행을 건너뜁니다.
        continue;
      }
      
      // 해당 월의 데이터만 필터링
      // 연도와 월이 모두 일치하는지 확인합니다.
      if (receiptDate.getFullYear() === targetYear && (receiptDate.getMonth() + 1) === targetMonth) {
        
        // [합계] 행만 집계 (각 영수증당 1회만 집계)
        // 품명이 합계인지 확인합니다.
        if (itemName === '[합계]') {
          // 영수증 개수를 1 증가시킵니다.
          count++;
          // 총액을 누적합니다.
          totalAmount += parseFloat(rowTotal) || 0;
          // 과세물품 금액을 누적합니다.
          taxableAmount += parseFloat(rowTaxable) || 0;
          // 부가세를 누적합니다.
          taxAmount += parseFloat(rowTax) || 0;
          // 면세물품 금액을 누적합니다.
          taxFreeAmount += parseFloat(rowTaxFree) || 0;
          
          // 상호별 통계
          // 상호명이 있고 대시가 아닌지 확인합니다.
          if (storeName && storeName !== '-') {
            // 해당 상호가 객체에 없는지 확인합니다.
            if (!storeStats[storeName]) {
              // 해당 상호의 통계 객체를 초기화합니다.
              storeStats[storeName] = { count: 0, amount: 0 };
            }
            // 해당 상호의 영수증 개수를 1 증가시킵니다.
            storeStats[storeName].count++;
            // 해당 상호의 금액을 누적합니다.
            storeStats[storeName].amount += parseFloat(rowTotal) || 0;
          }
        }
      }
    }
    
    // 상호별 통계를 배열로 변환하고 금액 순으로 정렬
    // 상호별 데이터를 담을 빈 배열을 만듭니다.
    var storesArray = [];
    // 객체의 모든 상호에 대해 반복합니다.
    for (var store in storeStats) {
      // 상호 정보를 배열에 추가합니다.
      storesArray.push({
        // 상호명을 저장합니다.
        name: store,
        // 영수증 개수를 저장합니다.
        count: storeStats[store].count,
        // 총 금액을 저장합니다.
        amount: storeStats[store].amount
      });
    }
    // 금액이 많은 순서대로 배열을 정렬합니다.
    storesArray.sort(function(a, b) { return b.amount - a.amount; });
    
    // 상위 10개만 반환
    // 상호가 10개보다 많은지 확인합니다.
    if (storesArray.length > 10) {
      // 상위 10개만 남기고 자릅니다.
      storesArray = storesArray.slice(0, 10);
    }
    
    // 계산된 통계 결과를 반환합니다.
    return {
      // 영수증 개수를 반환합니다.
      count: count,
      // 총액을 반올림하여 반환합니다.
      totalAmount: Math.round(totalAmount),
      // 과세물품 금액을 반올림하여 반환합니다.
      taxableAmount: Math.round(taxableAmount),
      // 부가세를 반올림하여 반환합니다.
      taxAmount: Math.round(taxAmount),
      // 면세물품 금액을 반올림하여 반환합니다.
      taxFreeAmount: Math.round(taxFreeAmount),
      // 상호별 통계 배열을 반환합니다.
      stores: storesArray
    };
    
  // 에러가 발생하면 이 블록이 실행됩니다.
  } catch (error) {
    // 에러 내용을 로그에 기록합니다.
    Logger.log('통계 조회 오류: ' + error.toString());
    // 에러 메시지를 반환합니다.
    return { error: error.toString() };
  }
}
```
⚠️ 위험 라인
[8줄] return HtmlService.createHtmlOutputFromFile('Index') → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[10줄] .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[17줄] return { error: 'Claude API 키를 설정해주세요.' }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[80줄] var response = UrlFetchApp.fetch(apiUrl, options); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[86줄] return { error: 'API 오류: ' + responseText }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[106줄] return receiptData; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[110줄] return { error: error.toString() }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[138줄] return item.name && item.amount > 0; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[154줄] return data; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[158줄] function saveEditedReceipt(data) { → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[161줄] saveToSpreadsheet(data); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[163줄] return { success: true, message: '스프레드시트에 저장되었습니다!' }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[166줄] return { success: false, error: error.toString() }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[171줄] function saveToSpreadsheet(data) { → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[172줄] var ss = SpreadsheetApp.getActiveSpreadsheet(); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[250줄] var ss = SpreadsheetApp.getActiveSpreadsheet(); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[254줄] return { error: '영수증 내역이 없습니다. 먼저 영수증을 등록해주세요.' }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[261줄] return { error: '저장된 영수증이 없습니다.' }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[330줄] storesArray.sort(function(a, b) { return b.amount - a.amount; }); → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[337줄] return { → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
[348줄] return { error: error.toString() }; → 외부 의존 / 보안 / 저장 / 흐름 종료 가능성
