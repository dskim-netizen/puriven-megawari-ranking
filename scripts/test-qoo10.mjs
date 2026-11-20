// GitHub 서버에서 큐텐 메가와리 랭킹 API에 접속되는지 확인하는 테스트
import { writeFileSync } from 'node:fs';

const API = 'https://www.qoo10.jp/gmkt.inc/swe_SpecialAjaxService.asmx/GetPromotionRankingDataPC';
const result = { testedAt: new Date().toISOString(), checks: [] };

for (const group of [0, 5]) {
  const check = { group };
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'ja-JP,ja;q=0.9',
        'Referer': 'https://www.qoo10.jp/gmkt.inc/Special/Special.aspx?sid=164938',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ mobileYn: 'N', type: 'Q', tab: 'C', groupCode: group, age: 0, categoryCode: '', previous: false }),
    });
    const text = await res.text();
    check.status = res.status;
    check.length = text.length;
    check.head = text.slice(0, 300);
    try {
      const d = JSON.parse(text).d || {};
      check.items = (d.items || []).length;
      check.sample = (d.items || []).slice(0, 3).map(x => `${x.row_number} ${x.brand_nm}`);
      check.ok = check.items > 0;
    } catch { check.ok = false; }
  } catch (e) {
    check.ok = false;
    check.error = String(e);
  }
  result.checks.push(check);
}
result.ok = result.checks.every(c => c.ok);
writeFileSync('test-result.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
