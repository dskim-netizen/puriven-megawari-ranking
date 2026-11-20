# puriven-megawari-ranking

큐텐 メガ割ランキング(累積件数順)의 総合·日用品・生活 상위 100을 매시간 수집하는 저장소입니다.

- `.github/workflows/collect.yml`: 매시 7분에 실행 (Actions 탭에서 "Run workflow"로 수동 실행 가능)
- `scripts/collect.mjs`: 큐텐에서 랭킹을 받아 `data/snapshots/`에 저장하고 `data/index.json`을 갱신
- 구글시트 쪽 Apps Script의 `pullFromGitHub`가 30분마다 새 스냅샷을 가져가 시트에 씁니다.

메가와리가 끝나면 Actions 탭에서 이 워크플로를 Disable 하세요.
