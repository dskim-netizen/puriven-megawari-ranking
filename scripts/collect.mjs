// 큐텐 메가와리 랭킹(累積件数順)을 받아서 data/snapshots/ 에 저장하고 data/index.json 을 갱신합니다.
// 구글시트의 Apps Script(pullFromGitHub)가 index.json 을 보고 새 스냅샷을 가져가 시트에 씁니다.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const API = 'https://www.qoo10.jp/gmkt.inc/swe_SpecialAjaxService.asmx/GetPromotionRankingDataPC';
const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept-Language': 'ja-JP,ja;q=0.9',
  'Referer': 'https://www.qoo10.jp/gmkt.inc/Special/Special.aspx?sid=164938',
  'X-Requested-With': 'XMLHttpRequest',
};
const KEEP_IN_INDEX = 300;
const END = new Date('2026-12-03T02:00:00+09:00');   // 메가와리 종료 후에는 수집하지 않음

if (new Date() > END) {
  console.log('메가와리 기간이 끝나서 수집하지 않습니다.');
  process.exit(0);
}

async function fetchGroup(group) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ mobileYn: 'N', type: 'Q', tab: 'C', groupCode: group, age: 0, categoryCode: '', previous: false }),
      });
      if (res.status !== 200) throw new Error('HTTP ' + res.status);
      const d = JSON.parse(await res.text()).d || {};
      // 북마크 버튼과 같은 배열 형식
      // 0순위 1변동 2브랜드 3국가 4상품명 5코드 6판매가 7메가가 8할인율 9카트할인 10누적판매 11리뷰 12평점 13카테고리 14썸네일
      const out = [];
      const f = d.firstItem;
      if (f && f.gdNm) {
        const c = (f.connectUrl || '').match(/goodscode=(\d+)/);
        out.push([1, '', '', '', f.gdNm, c ? +c[1] : '', '', +String(f.finalPriceText).replace(/\D/g, '') || '', '', '', '', '', '', '', f.imageUrl || '']);
      }
      for (const x of d.items || []) {
        out.push([+x.row_number, x.ranking_fluctuation, x.brand_nm || '', x.brand_country || '', x.title || '', +x.gd_no,
          x.sell_price || '', x.final_price || '', x.discount_rate || '', (x.couponlabel || []).map(c => c.title).join(', '),
          x.item_sales_count_total || '', x.review_count || '', x.satisfaction_percent ? +x.satisfaction_percent : '',
          x.gdmc_cd || '', x.image_url || '']);
      }
      if (out.length < 10) throw new Error('items ' + out.length);
      return out;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  throw lastErr;
}

// GitHub 정시 실행은 자주 늦거나 빠지므로 15분마다 깨우고, 이번 시(한국 시간)에 이미 저장했으면 건너뜀
const hourKey = d => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().slice(0, 13);
{
  const idxPath0 = 'data/index.json';
  if (existsSync(idxPath0) && process.env.FORCE !== '1') {
    const files0 = JSON.parse(readFileSync(idxPath0, 'utf8')).files || [];
    const last = files0[files0.length - 1];
    if (last) {
      const lastIso = last.replace(/\.json$/, '').replace(/T(\d\d)-(\d\d)-(\d\d)-(\d+)Z/, 'T$1:$2:$3.$4Z');
      if (hourKey(lastIso) === hourKey(new Date())) {
        console.log('이번 시간은 이미 수집됨:', last);
        process.exit(0);
      }
    }
  }
}

const fetchedAt = new Date().toISOString();
const snap = { fetchedAt, g0: await fetchGroup(0), g5: await fetchGroup(5) };
const name = fetchedAt.replace(/[:.]/g, '-') + '.json';
writeFileSync('data/snapshots/' + name, JSON.stringify(snap));

const idxPath = 'data/index.json';
const idx = existsSync(idxPath) ? JSON.parse(readFileSync(idxPath, 'utf8')) : { files: [] };
idx.files.push(name);
idx.files = idx.files.slice(-KEEP_IN_INDEX);
idx.updatedAt = fetchedAt;
writeFileSync(idxPath, JSON.stringify(idx, null, 1));
console.log('saved', name, 'g0', snap.g0.length, 'g5', snap.g5.length);
