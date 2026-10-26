/* =========================================================================
 * 데모 모드 — n8n 서버 없이 예시 데이터로 모든 화면을 체험하게 한다
 *
 * 왜: 프로젝트 기간이 끝나 n8n(blitzrattle.app.n8n.cloud)과 Railway 서버가 내려갔다.
 *     화면 코드는 그대로 두고, n8n으로 가는 요청만 이 파일이 가로채 예시 응답을 돌려준다.
 *
 * - 각 페이지 <head>에서 다른 스크립트보다 먼저 불러온다.
 * - 처리 결과(승인·반려·수동검토·새 건의)는 sessionStorage에 남아, 탭을 닫기 전까지
 *   대시보드 ↔ 처리 내역 ↔ 건의 폼 사이에서 이어진다. 주소 끝에 ?demo=reset 을 붙이면 처음 상태로 돌아간다.
 * - 끄려면 ENABLED를 false로. (n8n을 다시 띄우면 화면 코드는 그대로 실제 서버와 통신한다)
 * ========================================================================= */
(function () {
  const ENABLED = true;
  if (!ENABLED) return;

  const HOST = 'blitzrattle.app.n8n.cloud';
  const KEY = 'aimmune_demo_v1';
  const DELAY_MS = 600; // 로딩 화면이 잠깐 보이도록

  /* ---------- 날짜 ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  function stamp(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /* ---------- 예시 지침 (JOY) ---------- */
  const G = {
    B08: {
      title: '사용량 확인이 어려운 고객 안내',
      lines: ['1. 고객의 요구사항을 정확히 파악한다.', '2. 고객이 사용량을 모르면 무제한 요금제를 우선 권유한다.', '3. 안내한 내용은 상담 화면에 요약해 보여준다.'],
      before: '고객이 사용량을 모르면 무제한 요금제를 우선 권유한다.',
      after: '고객이 사용량을 모르면 휴대폰 설정에서 최근 사용량을 함께 확인하고, 그 결과를 기준으로 요금제를 비교해 안내한다.',
    },
    B09: {
      title: '요금제 비교 안내 분량',
      lines: ['1. 고객의 이용 목적과 예산을 먼저 묻는다.', '2. 고객 조건에 맞는 요금제를 모두 나열해 안내한다.', '3. 고객이 선택한 요금제의 부가 혜택을 함께 안내한다.'],
      before: '고객 조건에 맞는 요금제를 모두 나열해 안내한다.',
      after: '고객 조건에 맞는 요금제를 최대 3개로 추려, 월 요금과 데이터 제공량을 표로 비교해 안내한다.',
    },
    B11: {
      title: '약정 할인 조건 안내',
      lines: ['1. 약정 할인 금액을 안내한다.', '2. 할인 적용 시작일을 안내한다.'],
      before: '약정 할인 금액을 안내한다.',
      after: '약정 할인 금액과 함께 약정 기간, 중도 해지 시 위약금 발생 여부를 안내한다.',
    },
    B12: {
      title: '결합 할인 안내',
      lines: ['1. 결합 할인은 고객의 가족 회선 수를 확인한 뒤 안내한다.', '2. 결합 가능 여부가 불확실하면 매장 담당자 확인을 권한다.'],
    },
  };

  function revision(id, key, risk, rank, count, reason, createdAt) {
    const g = G[key];
    return {
      revisionId: id, agentId: 'JOY',
      guideline: { itemId: 'JOY-' + key, title: g.title },
      currentVersion: { versionNumber: 'v1.0', content: g.lines.join('\n') },
      candidateVersion: { versionNumber: 'v1.1', content: g.lines.map((l) => l.replace(g.before, g.after)).join('\n') },
      change: { beforeSentence: g.before, afterSentence: g.after, reason },
      evidence: { count, reportIds: Array.from({ length: count }, (_, i) => `RPT-DEMO-${key}-${i + 1}`) },
      risk: { level: risk, reason: risk === 'HIGH' ? '잘못된 안내로 고객이 불필요한 요금을 낼 수 있음' : risk === 'MEDIUM' ? '고객이 선택하기 어려워 상담이 길어짐' : '안내가 부족해 추가 문의가 생김' },
      priority: { rank, reason: `동일 지침 신고 ${count}건 / 검토순위 ${rank}` },
      manager: { id: 'M-001', name: '데모 담당자' },
      createdAt, firstSubmittedAt: createdAt, occurredAt: createdAt.slice(0, 10),
    };
  }

  function seed() {
    return {
      pending: {
        'M-001': {
          items: [
            revision('REV-DEMO-01', 'B08', 'HIGH', 1, 2, '사용량 확인 없이 고가 요금제를 먼저 권해, 고객이 불필요한 지출을 걱정함.', '2026-10-05 14:10:00'),
            revision('REV-DEMO-02', 'B09', 'MEDIUM', 2, 3, '정보가 너무 많아 고객이 선택하기 어렵다는 현장 의견이 반복 접수됨.', '2026-10-06 10:22:00'),
            revision('REV-DEMO-03', 'B11', 'LOW', 3, 1, '약정 조건을 빠뜨려 고객이 해지 위약금을 나중에 알게 됨.', '2026-10-06 16:40:00'),
          ],
          manualItems: [{
            type: 'MANUAL', reportId: 'RPT-DEMO-M01', agentName: 'JOY', agentId: 'JOY', complaintType: '개선 요청',
            userPrompt: '가족 결합 할인되는 요금제 알려줘',
            agentResponse: '가족 결합 할인은 요금제마다 달라 정확한 안내가 어렵습니다.',
            issueRequest: '결합 가능한 요금제와 할인 금액을 예시로 보여 주면 좋겠어요.',
            resolution: 'AI 판단 보류', reasonCode: '관련 지침을 하나로 특정하지 못함', guidelineItemId: 'JOY-B12',
            createdAt: '2026-10-07 09:15:00', occurredAt: '2026-10-07',
          }],
          techItems: [{
            type: 'TECH', reportId: 'RPT-DEMO-T01', agentName: 'JOY', agentId: 'JOY', complaintType: '응답 지연',
            userPrompt: '5G 요금제 중에 제일 저렴한 거 알려줘', agentResponse: '(응답 없음)',
            issueRequest: '답변이 30초 넘게 나오지 않았어요.',
            classificationReason: '응답 지연은 지침 개정이 아니라 시스템 확인 대상',
            risk: { level: 'MEDIUM', reason: '상담 진행이 늦어짐' },
            createdAt: '2026-10-07 11:02:00', occurredAt: '2026-10-07',
          }],
        },
      },
      guidelines: Object.entries(G).map(([k, g]) => ({
        guidelineItemId: 'JOY-' + k, itemId: 'JOY-' + k, versionId: 'VER-DEMO-' + k, versionNumber: 'v1.0',
        title: g.title, content: g.lines.join('\n'), agentId: 'JOY',
      })),
      history: {
        'M-001': [
          { revisionId: 'REV-DEMO-H1', summary: '요금제 안내 시 확인되지 않은 요금제를 임의로 만들지 않도록 명시', agentId: 'JOY', risk: { level: 'HIGH' }, evidenceCount: 2, decision: 'APPROVE', decidedAt: '2026-10-02 13:05', managerId: 'M-001' },
          { revisionId: 'REV-DEMO-H2', summary: '부가서비스 안내 문구에 해지 방법 추가', agentId: 'JOY', risk: { level: 'LOW' }, evidenceCount: 1, decision: 'APPROVE', decidedAt: '2026-10-01 17:51', managerId: 'M-001' },
          { revisionId: 'REV-DEMO-H3', summary: '경쟁사 요금제와 직접 비교해 안내', agentId: 'JOY', risk: { level: 'MEDIUM' }, evidenceCount: 1, decision: 'REJECT', rejectionReason: '경쟁사 직접 비교는 내부 정책상 불가. 자사 요금제 중심으로 다시 작성 필요.', decidedAt: '2026-09-30 16:14', managerId: 'M-001' },
        ],
      },
      seq: 1,
    };
  }

  /* ---------- 상태 저장 ---------- */
  const mem = { v: null };
  function load() {
    try {
      if (/[?&]demo=reset\b/.test(location.search)) sessionStorage.removeItem(KEY);
      const raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return mem.v || (mem.v = seed());
  }
  function save(s) {
    mem.v = s;
    try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  const box = (s, id) => (s.pending[id] = s.pending[id] || { items: [], manualItems: [], techItems: [] });

  /* ---------- 응답 ---------- */
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function reply(data, status = 200) {
    await wait(DELAY_MS);
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  }
  async function readJson(init) {
    try { return JSON.parse(init && typeof init.body === 'string' ? init.body : '{}'); } catch (e) { return {}; }
  }

  function chatReply(q) {
    if (q === '/') return '새 상담을 시작할게요.';
    if (/사용량|데이터|청구/.test(q)) {
      return '**상담 방향 (데모 예시)**\n\n고객이 사용량을 정확히 모르면, 먼저 휴대폰 **설정 > 데이터 사용량**에서 최근 사용량을 함께 확인해 보세요.\n\n- 확인한 사용량을 기준으로 요금제를 비교해 안내합니다.\n- 사용량을 모른다는 이유만으로 무제한 요금제를 먼저 권하지 않습니다.\n\n_이 답변은 A-Immune으로 개정된 지침(JOY-B08)을 반영한 예시예요._';
    }
    if (/요금제|추천|비교/.test(q)) {
      return '**조건에 맞는 요금제 (데모 예시)**\n\n| 요금제 | 월 요금 | 데이터 |\n| --- | --- | --- |\n| 예시 요금제 A | 33,000원 | 6GB |\n| 예시 요금제 B | 45,000원 | 15GB |\n| 예시 요금제 C | 55,000원 | 무제한 |\n\n고객의 실제 사용량을 확인한 뒤, 3개 중에서 고르도록 안내해 보세요.\n\n_요금제 이름과 가격은 데모용 가상 데이터예요._';
    }
    return '지금은 데모 모드라 실제 JOY 대신 예시 답변을 보여 드려요.\n\n**요금제**나 **데이터 사용량**에 대해 물어보면 예시 상담을 볼 수 있어요. 답변이 아쉬우면 아래 뮤니 버튼으로 건의를 남겨 보세요.';
  }

  async function handle(url, init) {
    const u = new URL(url);
    const p = u.pathname;
    const method = (init && init.method || 'GET').toUpperCase();
    const s = load();
    const mgr = u.searchParams.get('managerId') || 'M-001';

    if (/\/chat$/.test(p)) {
      const b = await readJson(init);
      return reply({ reply: chatReply(String(b.chatInput || '').trim()) });
    }

    if (/a-immune-report/.test(p) && method === 'POST') {
      const f = init.body instanceof FormData ? init.body : new FormData();
      const id = `RPT-DEMO-${String(s.seq++).padStart(3, '0')}`;
      const agent = String(f.get('agent_name') || 'JOY');
      box(s, 'M-001').manualItems.unshift({
        type: 'MANUAL', reportId: id, agentName: agent, agentId: agent, complaintType: String(f.get('category') || '개선 요청'),
        userPrompt: String(f.get('user_prompt') || ''), agentResponse: String(f.get('agent_response') || ''),
        issueRequest: String(f.get('issue_request') || ''), resolution: '데모 접수',
        reasonCode: '데모 모드에서는 AI 분석 없이 수동검토로 접수돼요', guidelineItemId: '',
        createdAt: stamp(), occurredAt: [f.get('error_date'), f.get('error_time')].filter(Boolean).join(' '),
      });
      save(s);
      return reply({ ok: true, reportId: id });
    }

    if (/a-immune-admin-pending/.test(p)) {
      const b = box(s, mgr);
      return reply({ ok: true, items: b.items, techItems: b.techItems, manualItems: b.manualItems, guidelines: s.guidelines });
    }

    if (/a-immune-admin-history/.test(p)) {
      return reply({ ok: true, items: s.history[mgr] || [] });
    }

    if (/a-immune-revision-decision/.test(p)) {
      const b = await readJson(init);
      const pend = box(s, b.managerId || 'M-001');
      const item = pend.items.find((x) => x.revisionId === b.revisionId);
      if (!item) return reply({ ok: false, message: '이미 처리된 개정안입니다.' }, 409);
      pend.items = pend.items.filter((x) => x !== item);
      (s.history[b.managerId || 'M-001'] = s.history[b.managerId || 'M-001'] || []).unshift({
        revisionId: item.revisionId, summary: item.guideline?.title || item.change?.reason || '',
        agentId: item.agentId, risk: item.risk, evidenceCount: item.evidence?.count || 1,
        decision: b.decision, rejectionReason: b.rejectionReason || '', decidedAt: stamp().slice(0, 16), managerId: b.managerId,
      });
      save(s);
      return reply({ ok: true });
    }

    if (/a-immune-tech-confirm/.test(p)) {
      const b = await readJson(init);
      const pend = box(s, b.managerId || 'M-001');
      pend.techItems = pend.techItems.filter((x) => x.reportId !== b.reportId);
      save(s);
      return reply({ ok: true });
    }

    if (/a-immune-manual-review/.test(p)) {
      const b = await readJson(init);
      const pend = box(s, b.managerId || 'M-001');
      const m = pend.manualItems.find((x) => x.reportId === b.reportId);
      if (b.action === 'SAVE_NOTE') return reply({ ok: true, message: '검토 메모를 저장했습니다. (데모)' });
      pend.manualItems = pend.manualItems.filter((x) => x !== m);
      if (b.action === 'SUBMIT_REVISION') {
        const g = s.guidelines.find((x) => x.guidelineItemId === b.guidelineItemId) || {};
        const id = `REV-DEMO-${String(s.seq++).padStart(3, '0')}`;
        pend.items.unshift({
          revisionId: id, agentId: g.agentId || 'JOY',
          guideline: { itemId: b.guidelineItemId, title: g.title || '' },
          currentVersion: { versionNumber: g.versionNumber || 'v1.0', content: g.content || '' },
          candidateVersion: { versionNumber: 'v1.1', content: (g.content || '').replace(b.beforeSentence, b.afterSentence) },
          change: { beforeSentence: b.beforeSentence, afterSentence: b.afterSentence, reason: b.reason },
          evidence: { count: 1, reportIds: [b.reportId] },
          risk: { level: 'MEDIUM', reason: '담당자가 직접 작성한 수정안' },
          priority: { rank: 1, reason: '담당자 수동 작성 / 검토순위 1' },
          manager: { id: b.managerId, name: '데모 담당자' },
          createdAt: stamp(), firstSubmittedAt: stamp(), occurredAt: m?.occurredAt || '',
        });
        save(s);
        return reply({ ok: true, message: '수정안을 승인대기 개정안으로 등록했습니다. (데모)' });
      }
      save(s);
      return reply({ ok: true, message: '변경 없이 처리완료했습니다. (데모)' });
    }

    return reply({ ok: true });
  }

  /* ---------- fetch 가로채기 ---------- */
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === 'string' ? input : input && input.url;
    if (url && url.includes(HOST)) return handle(url, init || {});
    return realFetch(input, init);
  };
  window.AIMMUNE_DEMO = { reset() { try { sessionStorage.removeItem(KEY); } catch (e) {} mem.v = null; } };

  /* ---------- 안내 토스트 (페이지를 열 때 5초) ---------- */
  function toast() {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:3000;max-width:calc(100vw - 32px);'
      + 'display:flex;align-items:center;gap:10px;padding:10px 14px 10px 16px;border-radius:999px;background:#1d2340;color:#fff;'
      + 'font:500 14px/1.4 Inter,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.2);transition:opacity .3s';
    el.innerHTML = '<span style="padding:2px 8px;border-radius:999px;background:#f06548;font-weight:700;font-size:12px">DEMO</span>'
      + '<span>서버 운영이 종료되어 예시 데이터로 동작하는 데모예요. 처리 결과는 탭을 닫으면 처음으로 돌아가요.</span>'
      + '<button type="button" aria-label="안내 닫기" style="all:unset;cursor:pointer;padding:0 4px;font-size:16px;opacity:.7">✕</button>';
    const close = () => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); };
    el.querySelector('button').addEventListener('click', close);
    document.body.appendChild(el);
    setTimeout(close, 5000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', toast);
  else toast();
})();
