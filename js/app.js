/**
 * app.js — UI制御・イベント処理・レンダリング
 *
 * 将来的な拡張ポイント:
 *   - ユーザー認証: 画面表示前に認証チェックを追加
 *   - スカウト履歴: saveScoutHistory() を送信完了時に呼ぶ
 *   - 返信結果記録: S.learningData.scoutAction.result を更新するUIを追加
 */

// ── 訴求ポイントマスタ ──
const ALL_APPEALS = [
  { id: 'tech',      name: '技術的挑戦',       desc: '最新技術・難しい課題への挑戦機会' },
  { id: 'career',    name: 'キャリアアップ',    desc: '職位・役割・影響範囲の拡大' },
  { id: 'scale',     name: '大規模プロジェクト', desc: '大きな規模・インパクトのある開発' },
  { id: 'startup',   name: 'スタートアップ成長', desc: '急成長フェーズへの参画・事業貢献' },
  { id: 'autonomy',  name: '裁量・自由度',       desc: '技術選定・設計の意思決定権' },
  { id: 'mgmt',      name: 'マネジメント機会',   desc: 'チームリード・組織づくりへの関与' },
  { id: 'remote',    name: '働き方改善',         desc: 'リモート・フレックス・ワークライフ' },
  { id: 'salary',    name: '年収アップ',         desc: '報酬・待遇の向上' },
  { id: 'social',    name: '社会貢献性',         desc: '世の中へのインパクト・ミッション共感' },
  { id: 'global',    name: 'グローバル環境',     desc: '英語・海外チームとの協業機会' },
  { id: 'team',      name: '優秀なチーム',       desc: 'ハイレベルな仲間・刺激ある環境' },
  { id: 'stability', name: '安定・安心感',       desc: '事業の安定性・会社の信頼性' },
];

const $ = id => document.getElementById(id);
const md = () => $('mdl').value;

// ── パネル遷移 ──
function go(n) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  if      (n === '15')      { $('p15').classList.add('on'); }
  else if (n === 'Batch')   { $('pBatch').classList.add('on'); }
  else if (n === 'History') { $('pHistory').classList.add('on'); }
  else {
    document.getElementById('p' + n).classList.add('on');
    for (let i = 1; i <= 5; i++) {
      const el = $('si' + i); el.classList.remove('active', 'done');
      if      (i < n)   el.classList.add('done');
      else if (i === n) el.classList.add('active');
    }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── ローディング ──
let ltimer = null, lstep = 0;
function showLoad(steps) {
  steps = steps || 5; lstep = 0;
  $('ov').classList.add('on');
  for (let i = 1; i <= 5; i++) $('ls' + i).classList.remove('on', 'ok');
  $('ls1').classList.add('on'); lstep = 1;
  ltimer = setInterval(() => {
    if (lstep < steps) {
      $('ls' + lstep).classList.remove('on'); $('ls' + lstep).classList.add('ok');
      lstep++; $('ls' + lstep).classList.add('on');
    }
  }, 1100);
}
function hideLoad() { clearInterval(ltimer); $('ov').classList.remove('on'); }

// ── エラー表示 ──
function err(msg)  { const b = $('errBar'); b.textContent = msg; b.classList.add('on'); setTimeout(() => b.classList.remove('on'), 9000); }
function clearErr(){ $('errBar').classList.remove('on'); }
function esc(s)    { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>'); }

// ══════════════════════════════════════════
// STEP1: フォーム入力 → 分析開始
// ══════════════════════════════════════════
$('analyzeBtn').addEventListener('click', () => {
  const c = {
    company:    $('c_co').value.trim(),
    role:       $('c_role').value.trim(),
    experience: $('c_exp').value.trim(),
    skills:     $('c_sk').value.trim(),
    projects:   $('c_pj').value.trim(),
    reason:     $('c_why').value.trim()
  };
  const j = {
    position:        $('j_pos').value.trim(),
    company:         $('j_co').value.trim(),
    description:     $('j_desc').value.trim(),
    requirements:    $('j_req').value.trim(),
    preferred:       $('j_pref')?.value.trim() || '',
    appeal:          $('j_ap').value.trim(),
    successExamples: $('j_success')?.value.trim() || ''
  };
  if (!c.company || !c.role || !c.experience || !c.skills) {
    err('候補者情報の必須項目（会社・職種・経験概要・スキル）を入力してください。'); return;
  }
  if (!j.position || !j.description || !j.requirements || !j.appeal) {
    err('求人情報の必須項目（ポジション・仕事内容・求める経験・魅力）を入力してください。'); return;
  }
  clearErr(); S.candidate = c; S.job = j;
  const iq = calcInfoQuality(c);
  if (iq.score < 70) { renderAIQuestions(c, j, iq); go('15'); }
  else { runAnalysis(); }
});

// ── ボタンイベント一覧 ──
$('reAnalyzeBtn').addEventListener('click', runAnalysis);
$('b2to1').addEventListener('click',  () => go(1));
$('b2to3').addEventListener('click',  () => { renderAppealSelector(); go(3); });
$('b3to2').addEventListener('click',  () => go(2));
$('genMailBtn').addEventListener('click', generateMail);
$('b5to3').addEventListener('click',  () => go(3));
$('regenAllBtn').addEventListener('click', generateMail);
$('pvBtn').addEventListener('click',  togglePreview);
$('restartBtn').addEventListener('click', restart);

// p15 (AI補完質問)
$('b15to1').addEventListener('click', () => go(1));
$('b15skip').addEventListener('click', () => runAnalysis());
$('b15analyze').addEventListener('click', () => {
  document.querySelectorAll('.aq-input textarea').forEach(ta => {
    const field = ta.dataset.field;
    if (field && ta.value.trim()) S.candidate[field] += '\n【補足】' + ta.value.trim();
  });
  runAnalysis();
});

// バッチモード
$('batchModeBtn').addEventListener('click', openBatchMode);
$('batchAddBtn').addEventListener('click', addBatchCandidate);
$('batchBackBtn').addEventListener('click', () => { $('batchModeBtn').classList.remove('active'); go(1); });
$('batchRunBtn').addEventListener('click', runBatch);

// ══════════════════════════════════════════
// 分析フロー
// ══════════════════════════════════════════
async function runAnalysis() {
  showLoad(4);
  try { await callAnalysisAPI(); }
  catch (e) {
    hideLoad();
    if (e.message.includes('demo')) { demoAnalysis(); }
    else { err('分析エラー: ' + e.message); demoAnalysis(); hideLoad(); }
  }
}

// ── デモ分析（APIキーなし・オフライン） ──
function demoAnalysis() {
  const c = S.candidate, j = S.job;
  const hasLead       = /リード|マネジ|チームリード|lead|manager/i.test(c.experience + c.skills);
  const wantsChallenge = /挑戦|技術|スタートアップ|裁量/i.test(c.reason);
  const wantsMgmt     = /マネジ|組織|チームビルド|マネージャー/i.test(c.reason + c.experience);
  const wantsStability = /安定|大手|福利厚生/i.test(c.reason);

  let typeCategory, typeReason;
  if      (wantsMgmt && hasLead)          { typeCategory = 'PM・マネジメント型';   typeReason = `${c.role}としてチームリード経験があり、組織やマネジメントへの志向が読み取れます。現職での技術×マネジメントの両軸を活かし、より大きな組織やPM的役割を求めている可能性があります。`; }
  else if (wantsChallenge && !hasLead)    { typeCategory = '技術スペシャリスト型';  typeReason = `${c.role}として深い専門性を磨いてきたキャリアパターンです。転職動機から技術的挑戦・スペシャリストとしての成長を重視していることが読み取れます。`; }
  else if (wantsChallenge && hasLead)     { typeCategory = '市場価値向上型';        typeReason = `技術リード経験を持ちながら、さらなる市場価値向上を意識した転職志向です。スキルの幅を広げ、より希少性の高い人材になることを目指していると考えられます。`; }
  else if (wantsStability)                { typeCategory = '安定志向型';            typeReason = `現職での経験を活かしつつ、より安定した環境・待遇を求めている傾向があります。急成長フェーズよりも、事業基盤が安定した環境を好む可能性があります。`; }
  else                                    { typeCategory = 'キャリアアップ型';      typeReason = `${c.company}での${c.role}としての実績を踏まえ、より大きな責任範囲・役職・影響力を求めてキャリアアップを目指していると判断します。`; }

  const pri1 = wantsChallenge ? { id: 'tech',     name: '技術的挑戦' } : { id: 'career',   name: 'キャリアアップ' };
  const pri2 = hasLead        ? { id: 'autonomy', name: '裁量・自由度' } : { id: 'startup', name: 'スタートアップ成長' };
  const pri3 = { id: 'team', name: '優秀なチーム' };
  const sk0 = c.skills.split(/[,、\n]/)[0].trim();

  S.analysis = {
    candidateTypeCategory: typeCategory,
    candidateTypeReason:   typeReason,
    motivationHypothesis: `・自分のスキルが直接事業成長に繋がる環境を求めている\n・技術的により高い挑戦ができるポジションへの移行を望んでいる\n・これまでの経験を活かしつつ、より影響範囲の大きい仕事をしたい`,
    whyContact:   `${c.company}で${c.role}として培った経験は、${j.position}の要件に対して高い親和性を持ちます。現在市場でこのスキルセットを持つ人材は希少であり、このタイミングでのアプローチには戦略的な価値があります。`,
    matchPoints:  `・${sk0}のスキルが求める経験と直接マッチ\n・${hasLead ? 'チームリード経験がポジションの責任範囲に合う' : '実装力・専門性がポジションの即戦力として機能'}\n・開発スタイル・技術志向が求人内容と近い`,
    avoidPoints:  `・「大手企業の安定性」を前面に出した訴求は逆効果になる可能性\n・「マネジメント不要・個人作業中心」という訴求はリード経験者には響かない可能性`,
    // Phase1: OHEREフレーム
    ohere: {
      observation: `・${c.company}にて${c.role}として従事\n・スキルセット: ${c.skills.slice(0, 60)}\n・${c.experience.slice(0, 80)}`,
      hypothesis:  `${sk0}での実績を武器に、より大きな裁量とインパクトを求めているのではないか。現職での${hasLead ? 'リード経験を活かしつつ' : '専門性を深めつつ'}、次のステージへのタイミングを探っている可能性がある。`,
      evidence:    `・転職理由に「${c.reason ? c.reason.slice(0, 30) : '成長・挑戦'}」への言及\n・${hasLead ? 'チームリード経験はマネジメント志向を示す' : 'スペシャリスト志向が経歴から読み取れる'}\n・スキルセットの広さが市場価値向上意識を反映`,
      recommendation: `冒頭で「${sk0}でのご経験」に言及し、まず候補者の実績を認めるトーンで始める。次に「技術的な課題の大きさ」を具体的に語ることで、相手の好奇心を引き出す。最後はカジュアル面談の提案で低コストな返信を促す。`,
      scoutStrategy: {
        step1_empathy:    `${c.company}での${c.role}として積み上げてきた経験への共感と、現在の環境が持つ可能性の限界への理解を示す。`,
        step2_recognition: `${sk0}を活かした${c.experience.includes('リード') ? 'リードとしての実績' : '技術的な成果'}を具体的に言及し、能力を正当に評価していることを伝える。`,
        step3_future:     `このポジションでは${j.position}として、${j.description.slice(0, 40)}...という挑戦ができることを伝える。`,
        step4_ibm:        `IBMのグローバルスケール・最先端技術・社会貢献というユニークな環境が、候補者の志向と合致していることを説明する。`,
        step5_meeting:    `「30分・選考なし・話を聞くだけでもOK」というフレーミングで、返信コストを最小化する。`
      }
    },
    // Phase1: キャリアストーリーAI
    careerStory: {
      past:      `${c.company}にて${c.role}として、${c.experience.slice(0, 60)}...という実績を積み上げてきた。`,
      present:   `現在は${sk0}を中心とするスキルセットを武器に、${c.company}で${hasLead ? 'チームをリードする立場として' : '専門家として'}価値を発揮している。`,
      future:    `${j.position}では${wantsChallenge ? '技術的挑戦と裁量の大きさ' : 'キャリアの拡大と影響範囲の広さ'}を手に入れ、市場でさらに希少な人材へと成長できる可能性がある。`,
      narrative:  `${c.company}で${c.role}として培ってきた${sk0}の実力は、着実に市場価値を高めてきた証です。現職での経験と実績は本物ですが、次のステージでより大きな挑戦をする時期に来ているのではないでしょうか。${j.position}でのポジションは、その方向性と合致しています。`
    },
    // Phase1: 候補者温度感AI
    temperature: {
      stars:    c.reason && c.reason.length > 10 ? (wantsChallenge ? 4 : 3) : 2,
      label:    c.reason && c.reason.length > 10 ? (wantsChallenge ? '半年以内' : '情報収集') : '受け身',
      reason:   `転職理由${c.reason ? '（「' + c.reason.slice(0, 20) + '...」）' : 'が未記入'}から判断。${c.reason ? '意欲的な言葉が見られるため転職意欲は比較的高め。' : '転職理由が不明なため慎重にアプローチが必要。'}`,
      approach: `${c.reason && c.reason.length > 10 ? '比較的返信を得やすいタイミングです。スカウト文の質を上げれば高い確率で返信が期待できます。' : '転職意欲が不明なため、低プレッシャーかつ好奇心を刺激するアプローチが有効です。'}`
    },
    appealPriority: [
      { rank: 1, appealId: pri1.id, appealName: pri1.name, reason: `転職理由に「${wantsChallenge ? '技術的挑戦' : 'キャリアアップ'}」への言及があり、このポジションが直接訴求できるポイントです。候補者が次のキャリアで最も実現したいことと合致しています。` },
      { rank: 2, appealId: pri2.id, appealName: pri2.name, reason: `${hasLead ? 'リード経験者は裁量・意思決定権の大きさを重視する傾向があります' : '成長フェーズへの参画意向が読み取れます'}。2番目に有効な訴求として訴求戦略に組み込んでください。` },
      { rank: 3, appealId: pri3.id, appealName: pri3.name, reason: `優秀なエンジニアとの協業機会は、技術・成長志向の候補者に普遍的に有効です。メール内で「チームの質」を具体的に伝えることで差別化できます。` }
    ],
    otherRecommendedAppeals: wantsChallenge ? ['startup'] : ['salary'],
    recommendedAppeals: [pri1.id, pri2.id, pri3.id, wantsChallenge ? 'startup' : 'salary'],
    recruiterGuidance: [
      { judgment: `この候補者は「${typeCategory}」パターンです`, judgmentReason: `${c.company}での${c.role}経験、スキルセット（${sk0}等）、転職理由の組み合わせからこのタイプと判断しています。`, approach: `スカウトメールでは${wantsChallenge ? '「技術的な難易度・裁量の大きさ」を冒頭に前面に出す' : '「キャリアの拡大・影響範囲の広さ」を具体的な数字で示す'}ことで、開封率・返信率を高めてください。` },
      { judgment: `現職でのスキルは市場での希少価値が高い`, judgmentReason: `${sk0}などの経験は現在の採用市場において競争力が高く、複数社から同時にアプローチを受けている可能性があります。`, approach: `「なぜあなたに声をかけたのか」を具体的に書くことが重要です。経歴の「どこ」に注目したかを明示し、テンプレ感を排除してください。` },
      { judgment: `返信を引き出すには「低コスト・低リスク」の誘い方が有効`, judgmentReason: `転職を積極的に考えていない可能性もあるため、選考色の強い誘い方は開封されても返信されないリスクがあります。`, approach: `「30分のカジュアル面談」「選考なし・話を聞くだけ」というフレーミングで声をかけることで、返信率を高められます。` }
    ],
    score:      wantsChallenge ? 81 : 74,
    scoreReason: 'スキル・経験・転職志向の3軸でバランスよくマッチしています。',
    reason:      `${c.role}として${c.company}で実績を積んだ候補者は、${j.position}の要件と高い親和性があります。転職志向と求人の魅力がマッチしており、返信率の高いスカウトが期待できます。`,
    strategyNote: `${wantsChallenge ? '「技術的裁量の大きさ」と「事業フェーズの面白さ」を前面に出したアプローチが有効です。' : 'まず現職での課題を引き出し、解決策としてこのポジションを提示する流れが効果的です。'}`
  };
  hideLoad(); renderAnalysis(); go(2);
}

// ══════════════════════════════════════════
// STEP2: 分析結果レンダリング（OHEREフレーム）
// ══════════════════════════════════════════
function renderAnalysis() {
  const a = S.analysis;
  const score = parseInt(a.score) || 0;
  setTimeout(() => {
    $('sBar').style.width = score + '%';
    $('sNum').textContent = score + '%';
    $('sLv').textContent  = score >= 85 ? '非常に高い' : score >= 70 ? '高い' : score >= 55 ? '中程度' : '要検討';
  }, 80);

  const typeCategory = a.candidateTypeCategory || a.candidateType || '—';
  const typeReason   = a.candidateTypeReason   || a.typeReason   || '';

  // ── 候補者温度感 ──
  const temp = a.temperature || {};
  const tempStars = parseInt(temp.stars) || 0;
  const starsFilled = '★'.repeat(tempStars) + '☆'.repeat(5 - tempStars);
  const tempClass = tempStars >= 4 ? 'temp-hot' : tempStars >= 3 ? 'temp-warm' : tempStars >= 2 ? 'temp-cool' : 'temp-cold';
  $('temperatureBlock').innerHTML = `
    <div class="temp-stars ${tempClass}">${starsFilled}</div>
    <div class="temp-label">${esc(temp.label || '—')}</div>
    <div class="temp-reason">${esc(temp.reason || '')}</div>
    <div class="temp-approach">${esc(temp.approach || '')}</div>`;

  // ── キャリアストーリー ──
  const cs = a.careerStory || {};
  $('careerStoryBlock').innerHTML = cs.narrative
    ? `<div class="cs-narrative">${esc(cs.narrative)}</div>
       <div class="cs-timeline">
         <div class="cs-row"><span class="cs-tag cs-past">過去</span><span class="cs-text">${esc(cs.past || '')}</span></div>
         <div class="cs-row"><span class="cs-tag cs-present">現在</span><span class="cs-text">${esc(cs.present || '')}</span></div>
         <div class="cs-row"><span class="cs-tag cs-future">未来</span><span class="cs-text">${esc(cs.future || '')}</span></div>
       </div>`
    : `<div class="ab-text">${esc(a.motivationHypothesis || '')}</div>`;

  // ── OHEREフレーム ──
  const oh = a.ohere || {};
  const strat = oh.scoutStrategy || {};
  const ohereSteps = [
    { key: 'O', label: 'Observation', sub: '経歴から分かる事実', color: '#2563eb', bg: '#eff6ff', val: oh.observation },
    { key: 'H', label: 'Hypothesis',  sub: 'この人はこういう人では？', color: '#7c3aed', bg: '#f5f3ff', val: oh.hypothesis },
    { key: 'E', label: 'Evidence',    sub: 'なぜそう考えたか（経歴紐づき）', color: '#0891b2', bg: '#ecfeff', val: oh.evidence },
    { key: 'R', label: 'Recommendation', sub: 'トップリクルーターのアプローチ', color: '#059669', bg: '#ecfdf5', val: oh.recommendation },
    { key: 'S', label: 'Scout Strategy', sub: '刺さる訴求の順番', color: '#d97706', bg: '#fffbeb', val: null, strat: strat }
  ];
  $('ohereBlock').innerHTML = ohereSteps.map(s => `
    <div class="ohere-step" style="border-left-color:${s.color}">
      <div class="ohere-head">
        <span class="ohere-key" style="background:${s.color}">${s.key}</span>
        <span class="ohere-label">${s.label}</span>
        <span class="ohere-sub">${s.sub}</span>
      </div>
      <div class="ohere-body">
        ${s.strat ? `
          <div class="ohere-strat">
            ${[
              ['①共感',      strat.step1_empathy,    '#6366f1'],
              ['②能力承認',  strat.step2_recognition,'#7c3aed'],
              ['③未来提示',  strat.step3_future,     '#0891b2'],
              ['④IBM訴求',   strat.step4_ibm,        '#059669'],
              ['⑤面談誘導',  strat.step5_meeting,    '#d97706']
            ].map(([lbl, txt, c]) => txt ? `<div class="ohere-strat-row"><span class="ohere-strat-lbl" style="background:${c}">${lbl}</span><span class="ohere-strat-txt">${esc(txt)}</span></div>` : '').join('')}
          </div>` : `<div class="ab-text">${esc(s.val || '—')}</div>`}
      </div>
    </div>`).join('');

  // ── 既存ブロック（候補者タイプ・接点・避ける訴求） ──
  const blocks = [
    { label: '候補者タイプ（固定分類）', dot: '#7c3aed', html: `<div class="type-fixed-badge">${esc(typeCategory)}<span class="type-fixed-tag">固定5分類</span></div><div class="ab-text" style="margin-top:10px">${esc(typeReason)}</div>` },
    { label: '求人との接点',             dot: '#0891b2', html: `<div class="ab-text">${esc(a.matchPoints)}</div>` },
    { label: '⚠️ 避けるべき訴求',        dot: '#d97706', cls: 'warn', html: `<div class="ab-text">${esc(a.avoidPoints)}</div>` },
    { label: 'スコア根拠',               dot: '#6b7280', html: `<div class="ab-text">${esc(a.scoreReason)}</div>` },
  ];
  $('aGrid').innerHTML = blocks.map(b =>
    `<div class="ab${b.cls ? ' ' + b.cls : ''}">\n<div class="ab-label"><div class="ab-dot" style="background:${b.dot}"></div>${b.label}</div>\n${b.html}\n</div>`
  ).join('');

  // 訴求優先順位
  const pri = a.appealPriority || [];
  const others = (a.otherRecommendedAppeals || []).map(id => { const ap = ALL_APPEALS.find(x => x.id === id); return ap ? ap.name : id; });
  const rankClass = ['rank-1', 'rank-2', 'rank-3'];
  $('priorityList').innerHTML = pri.map((p, i) => `
    <div class="priority-item ${rankClass[i] || ''}">
      <div class="priority-rank">${p.rank}</div>
      <div class="priority-body">
        <div class="priority-name">${esc(p.appealName)}</div>
        <div class="priority-reason">${esc(p.reason)}</div>
      </div>
    </div>`).join('') +
    (others.length ? `<div class="priority-other"><div class="priority-other-title">その他の有効な訴求</div>${others.join('　/　')}</div>` : '');

  // 採用担当者ガイダンス
  const gd = a.recruiterGuidance || [];
  $('guidanceList').innerHTML = gd.map(g => `
    <div class="guidance-item">
      <div class="guidance-flow">
        <div class="guidance-row"><span class="guidance-row-label lbl-judge">AI判断</span><span class="guidance-row-text">${esc(g.judgment)}</span></div>
        <div class="guidance-row"><span class="guidance-row-label lbl-reason">判断理由</span><span class="guidance-row-text">${esc(g.judgmentReason)}</span></div>
        <div class="guidance-row row-action"><span class="guidance-row-label lbl-action">アプローチ</span><span class="guidance-row-text">${esc(g.approach)}</span></div>
      </div>
    </div>`).join('');

  buildLearningData();
}

// ══════════════════════════════════════════
// STEP3: 訴求セレクターレンダリング
// ══════════════════════════════════════════
function renderAppealSelector() {
  const a = S.analysis, rec = a.recommendedAppeals || [];
  const reasons = a.appealReasons || {};
  const priMap = {};
  (a.appealPriority || []).forEach(p => { if (p.appealId) priMap[p.appealId] = { reason: p.reason, rank: p.rank }; });

  $('appealGrid').innerHTML = ALL_APPEALS.map(ap => {
    const isRec    = rec.includes(ap.id);
    const priInfo  = priMap[ap.id];
    const reason   = priInfo ? `${priInfo.rank}位推奨 — ${priInfo.reason}` : (reasons[ap.id] || '');
    const badge    = priInfo ? `<span class="ai-rec-badge">${priInfo.rank}位</span>` : (isRec ? '<span class="ai-rec-badge">AI推奨</span>' : '');
    return `<div class="appeal-item"><input type="checkbox" id="ap_${ap.id}" value="${ap.id}" ${isRec ? 'checked' : ''}><label class="appeal-label" for="ap_${ap.id}"><div class="appeal-check">${isRec ? '✓' : ''}</div><div class="appeal-info"><div class="appeal-name">${ap.name}${badge}</div><div class="appeal-desc">${ap.desc}</div>${reason ? `<div class="appeal-reason">${reason}</div>` : ''}</div></label></div>`;
  }).join('');

  document.querySelectorAll('.appeal-item input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => { cb.nextElementSibling.querySelector('.appeal-check').textContent = cb.checked ? '✓' : ''; });
  });
  $('strategyNote').innerHTML = `<strong>AIのアプローチ戦略メモ：</strong>${esc(a.strategyNote || '')}`;
}

// ══════════════════════════════════════════
// STEP5: スカウト文生成・レンダリング
// ══════════════════════════════════════════
async function generateMail() {
  S.selectedAppeals = [...document.querySelectorAll('#appealGrid input:checked')].map(cb => {
    const ap = ALL_APPEALS.find(a => a.id === cb.value); return ap ? ap.name : '';
  }).filter(Boolean);
  if (S.selectedAppeals.length === 0) { err('訴求ポイントを少なくとも1つ選択してください。'); return; }
  showLoad(5);
  try { if (hasApiKey()) await callMailAPI(); else demoMail(); }
  catch (e) { hideLoad(); err('生成エラー: ' + e.message); demoMail(); hideLoad(); }
}

function demoMail() {
  const c = S.candidate, j = S.job, sel = S.selectedAppeals, jCo = j.company || 'IBM';
  const sk0 = c.skills.split(/[,、\n]/)[0].trim();
  const story = (S.analysis?.careerStory || {}).narrative || '';
  S.mail = {
    subject: `${c.company}での${sk0}ご経験について — ${j.position}のご相談`,
    intro:   `${c.company}で${c.role}として${c.experience.slice(0, 40)}...という経験を積まれてきた点に注目し、ご連絡しました。${story ? '\n' + story.slice(0, 80) + '...' : ''}`,
    why:     `${sk0}の実務経験と${c.experience.includes('リード') ? 'チームリードとしての実績' : '高い実装力'}は、このポジションで求めているプロフィールと非常に合致しています。\n特に${c.experience.slice(0, 50)}...という部分が、今回の求人要件に直接マッチしています。`,
    match:   `${j.position}では${j.description.slice(0, 60)}...という業務を担当いただきます。\n${sk0}のご経験は即戦力として活かせる部分が多く、${j.requirements.slice(0, 40)}...という要件にも強く合致しています。`,
    benefit: `${sel.includes('技術的挑戦') ? 'IBMでは最先端AI・クラウド技術に関わる大規模プロジェクトに携わることができ、' : sel.includes('グローバル環境') ? 'IBMのグローバル環境で170カ国以上のチームと協業できる機会があり、' : 'IBMという環境では、'}${j.appeal.split(/[,、\n]/)[0].trim()}という特徴があります。\n${c.reason ? '「' + c.reason.slice(0, 30) + '...」という志向に応える環境です。' : 'これまでの経験を次のステージで活かしていただけます。'}`,
    cta:     `30分ほど、選考を前提としないカジュアルなお話しの機会をいただけますか？\n「興味はあるけど転職は考えていない」という方でも大歓迎です。ご都合のよいお日時をいただけますと幸いです。`
  };
  hideLoad(); renderMail(); renderProcessLog(); go(5);
  // デモ用のセルフレビュー（遅延実行）
  setTimeout(() => {
    S.selfReview = {
      scores: { templateFreedom: 78, candidateSpecificity: 72, ibmness: 65, appealConsistency: 80, motivationAlignment: 75 },
      replyRate: 38,
      overallComment: '候補者固有の経験への言及があり、テンプレ感は比較的少ないスカウトです。IBMならではの訴求をより強化し、候補者の転職理由との一致感を高めることで返信率が上がります。',
      improvements: [
        { axis: 'IBMらしさ', issue: 'IBMである必然性が薄く、他社のスカウトと差別化できていない。', fix: 'IBMのAI・Watsonx・グローバルプロジェクトなど固有の強みを具体的に1〜2文組み込む。' },
        { axis: '候補者固有性', issue: '経歴への言及があるが、もう一歩踏み込んだ具体性が欲しい。', fix: '候補者の実績数値（チーム人数・PV数・改善率など）を直接引用すると固有性が上がる。' }
      ]
    };
    renderSelfReview();
  }, 800);
}

function renderMail() {
  const m = S.mail;
  ['subject', 'intro', 'why', 'match', 'benefit', 'cta'].forEach(sec => {
    const ta = $('ta-' + sec); if (ta) { ta.value = m[sec] || ''; autoResize(ta); updateCC('ta-' + sec, 'cc-' + sec); }
  });
  $('reasonTxt').textContent = S.analysis?.reason || '';
  if (S.learningData.scoutAction) {
    S.learningData.scoutAction.selectedAppeals  = S.selectedAppeals;
    S.learningData.scoutAction.generatedSubject = S.mail?.subject || '';
  }
  // 履歴に自動保存してフィードバックUIを描画
  saveScoutHistory();
  renderFeedbackUI();
  // AIセルフレビューを非同期で実行（APIあれば本物、なければdemoで実行済み）
  if (hasApiKey()) {
    const srBox = $('selfReviewBox');
    if (srBox) { srBox.innerHTML = '<div class="sr-loading"><div class="spin" style="width:20px;height:20px;border-width:2px;margin:0 auto 8px"></div><div style="font-size:12px;color:var(--muted)">AIがスカウト文を採点中...</div></div>'; srBox.style.display = 'block'; }
    callSelfReviewAPI().catch(() => {});
  }
}

// ══════════════════════════════════════════
// STEP5: セルフレビュー レンダリング（IBM専用6軸）
// ══════════════════════════════════════════
function renderSelfReview() {
  const sr = S.selfReview;
  const box = $('selfReviewBox');
  if (!sr || !box) return;

  const sc = sr.scores || {};
  const axes = [
    { key: 'templateFreedom',    label: 'テンプレート感',       icon: '📝', invert: false },
    { key: 'candidateSpecificity', label: '候補者固有性',        icon: '👤', invert: false },
    { key: 'ibmness',            label: 'IBMらしさ',             icon: '🔷', invert: false },
    { key: 'appealConsistency',  label: '訴求の一貫性',          icon: '🎯', invert: false },
    { key: 'motivationAlignment', label: '転職動機との整合性',   icon: '💡', invert: false }
  ];
  const replyRate = parseInt(sr.replyRate) || 0;
  const rateClass = replyRate >= 50 ? 'sr-rate-high' : replyRate >= 30 ? 'sr-rate-mid' : 'sr-rate-low';
  const avgScore = Math.round(axes.reduce((s, a) => s + (parseInt(sc[a.key]) || 0), 0) / axes.length);
  const impHtml = (sr.improvements || []).map(imp => `
    <div class="sr-imp-item">
      <div class="sr-imp-axis">${esc(imp.axis)}</div>
      <div class="sr-imp-issue">⚠️ ${esc(imp.issue)}</div>
      <div class="sr-imp-fix">💡 ${esc(imp.fix)}</div>
    </div>`).join('');

  box.style.display = 'block';
  box.innerHTML = `
    <div class="sr-header">
      <div class="sr-title">
        <span class="sr-icon">✦</span>
        AIセルフレビュー <span class="sr-ibm-badge">IBM専用版</span>
      </div>
      <div class="sr-reply-wrap">
        <span class="sr-reply-label">返信率予測</span>
        <span class="sr-reply-rate ${rateClass}">${replyRate}%</span>
      </div>
    </div>
    <div class="sr-overall">${esc(sr.overallComment || '')}</div>
    <div class="sr-axes">
      ${axes.map(a => {
        const v = parseInt(sc[a.key]) || 0;
        const barClass = v >= 75 ? 'sr-bar-good' : v >= 50 ? 'sr-bar-mid' : 'sr-bar-low';
        return `<div class="sr-axis-row">
          <div class="sr-axis-label">${a.icon} ${a.label}</div>
          <div class="sr-axis-bar-wrap"><div class="sr-axis-bar ${barClass}" style="width:${v}%"></div></div>
          <div class="sr-axis-score">${v}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="sr-avg-row">
      <span class="sr-avg-label">総合スコア</span>
      <span class="sr-avg-score">${avgScore}<span style="font-size:13px;font-weight:400">/100</span></span>
    </div>
    ${impHtml ? `<div class="sr-imp-section"><div class="sr-imp-title">改善指摘</div>${impHtml}</div>` : ''}`;
}

function renderProcessLog() {
  const log = {
    timestamp:              new Date().toISOString(),
    candidate_type_category: S.analysis?.candidateTypeCategory || S.analysis?.candidateType,
    match_score:            S.analysis?.score,
    appeal_priority:        (S.analysis?.appealPriority || []).map(p => ({ rank: p.rank, id: p.appealId, name: p.appealName })),
    selected_appeals:       S.selectedAppeals,
    recommended_appeals:    S.analysis?.recommendedAppeals,
    generated_subject:      S.mail?.subject,
    learning_data_ready:    !!S.learningData.version
  };
  S.processLog = log;
  $('procLog').innerHTML = JSON.stringify(log, null, 2)
    .replace(/"([^"]+)":/g, '<span class="log-key">"$1":</span>')
    .replace(/: "([^"]+)"/g, ': <span class="log-str">"$1"</span>')
    .replace(/: (\d+)/g, ': <span class="log-val">$1</span>');
}

// ── 再生成ボタン ──
document.querySelectorAll('.regen-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const sec = btn.dataset.sec, orig = btn.textContent;
    btn.textContent = '生成中...'; btn.disabled = true;
    try { if (hasApiKey()) await regenSection(sec); else regenSectionDemo(sec); }
    catch { regenSectionDemo(sec); }
    btn.textContent = orig; btn.disabled = false;
  });
});

function regenSectionDemo(sec) {
  const newVal = sec === 'subject'
    ? `【${S.candidate.role}のご経験をぜひ】${S.job.company || '弊社'}でのチャレンジについてご相談`
    : S.mail[sec] || '';
  S.mail[sec] = newVal; const ta = $('ta-' + sec); ta.value = newVal; autoResize(ta); updateCC('ta-' + sec, 'cc-' + sec);
}

// ── プレビュー・コピー ──
function togglePreview() {
  const pv = $('pvBox'), ms = $('mSections'), btn = $('pvBtn');
  if (pv.classList.contains('on')) { pv.classList.remove('on'); ms.style.display = ''; btn.textContent = 'プレビュー'; }
  else { pv.textContent = buildFull(); pv.classList.add('on'); ms.style.display = 'none'; btn.textContent = '編集に戻る'; }
}
function buildFull() {
  return `件名：${$('ta-subject')?.value || ''}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${['intro', 'why', 'match', 'benefit', 'cta'].map(s => $('ta-' + s)?.value || '').join('\n\n')}\n\n[担当者名]\n[会社名] 採用担当`;
}

$('cpAll').addEventListener('click',  () => { navigator.clipboard.writeText(buildFull()).then(() => flashCopy('cpAll', '✓ コピーしました')); });
$('cpSubj').addEventListener('click', () => { navigator.clipboard.writeText($('ta-subject')?.value || '').then(() => flashCopy('cpSubj', '✓ コピーしました')); });
function flashCopy(id, msg) { const b = $(id), orig = b.textContent; b.classList.add('ok'); b.textContent = msg; setTimeout(() => { b.classList.remove('ok'); b.textContent = orig; }, 2000); }

// ── テキストエリア自動リサイズ ──
function autoResize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
function updateCC(taId, ccId) { const ta = $(taId), cc = $(ccId); if (!ta || !cc) return; cc.textContent = ta.value.length + '字'; cc.classList.toggle('warn', ta.value.length > 400); }
document.querySelectorAll('.ms textarea').forEach(ta => {
  ta.addEventListener('input', () => {
    autoResize(ta);
    const sec = ta.id.replace('ta-', '');
    updateCC('ta-' + sec, 'cc-' + sec);
    if (S.mail) S.mail[sec] = ta.value;
    if ($('pvBox').classList.contains('on')) $('pvBox').textContent = buildFull();
    // Phase1.5: 修正ログ記録（AI原文と異なる場合のみ）
    if (S.mail && S.currentHistoryId) {
      const history = loadScoutHistory();
      const entry = history.find(h => h.id === S.currentHistoryId);
      const aiOrig = entry?.mailAi?.[sec] || '';
      if (aiOrig && aiOrig !== ta.value) {
        // 変更中フラグ（debounce用）
        if (!ta._editTimer) {
          ta._editTimer = setTimeout(() => {
            saveEditLog(S.currentHistoryId, sec, aiOrig, ta.value, '');
            ta._editTimer = null;
          }, 2000);
        }
      }
    }
  });
});

// ── プロセスログ表示切替 ──
$('logToggle').addEventListener('click', () => {
  const b = $('logBox');
  if (b.style.display === 'none') { b.style.display = 'block'; $('logToggle').textContent = '判断プロセスログを非表示 ▲'; }
  else                            { b.style.display = 'none';  $('logToggle').textContent = '判断プロセスログを表示 ▼'; }
});

// ── 新規作成 ──
function restart() {
  document.querySelectorAll('input[type=text], textarea').forEach(el => { if (!el.closest('.topbar')) el.value = ''; });
  S.candidate = {}; S.job = {}; S.analysis = null; S.mail = null; S.selfReview = null; S.selectedAppeals = []; S.learningData = {};
  S.currentHistoryId = null;
  S.currentProjectId = null;
  // プロジェクト選択バーのアクティブ状態をリセット
  document.querySelectorAll('.proj-sel-btn').forEach(b => b.classList.remove('active'));
  go(1);
}

// ══════════════════════════════════════════
// 機能A: 情報品質チェック & AI補完質問
// ══════════════════════════════════════════
function calcInfoQuality(c) {
  const checks = [];
  let score = 0;

  if (!c.reason || c.reason.length < 10) {
    checks.push({ field: 'reason', priority: 'high', q: '転職・転職を検討している理由や、次のキャリアで実現したいことはありますか？', why: '転職理由は「候補者タイプ」と「訴求ポイント優先順位」の精度に最も影響します。' });
  } else { score += 30; }

  if (c.experience.length < 30 || !/[0-9０-９年名件%％万億]/.test(c.experience)) {
    checks.push({ field: 'experience', priority: 'high', q: '経験した業務で、規模・人数・期間・成果などを具体的に教えてください。（例: チーム5名・月間100万PV・レスポンス30%改善）', why: '具体的な数値があると、求人との「接点」分析の精度が上がります。' });
  } else { score += 20; }

  if (!c.projects || c.projects.length < 5) {
    checks.push({ field: 'projects', priority: 'med', q: '印象に残っているプロジェクトや、自分が主導・貢献したエピソードはありますか？', why: 'プロジェクト経験があると、スカウト文に「あなたの実績を見た」という具体性が出ます。' });
  } else { score += 15; }

  if (c.skills.split(/[,、\n]/).length < 3) {
    checks.push({ field: 'skills', priority: 'med', q: '主要スキル以外に、得意なツール・フレームワーク・業務領域があれば教えてください。', why: 'スキルの幅がわかるとマッチ分析の精度が高まります。' });
  } else { score += 15; }

  if (!/(株式|有限|Inc|Ltd|LLC|corp|スタートアップ|SIer|ベンチャー|上場)/i.test(c.company) && c.company.length < 6) {
    checks.push({ field: 'company', priority: 'low', q: '現在の会社は大手・SIer・スタートアップ・外資系などどのような環境ですか？', why: '会社環境の種別がわかると候補者志向の推測精度が向上します。' });
  } else { score += 10; }

  score += 10;
  return { score: Math.min(score, 100), checks };
}

function renderAIQuestions(c, j, iq) {
  const score = iq.score;
  const level = score >= 70 ? 'high' : score >= 45 ? 'mid' : 'low';
  const fill = $('iqFill');
  fill.className = `iq-fill ${level}`;
  setTimeout(() => { fill.style.width = score + '%'; }, 60);
  const scoreEl = $('iqScore');
  scoreEl.textContent = score + '点';
  scoreEl.className = `iq-score ${level}`;

  $('aqIntro').innerHTML = score < 45
    ? `<strong>情報品質スコア ${score}点 — 補完が必要です</strong><br>現在の情報では「訴求ポイントの優先順位」と「候補者タイプ分類」の精度が低くなります。以下の質問に回答することで、トップリクルーター並みの精度を実現できます。`
    : `<strong>情報品質スコア ${score}点 — あと少しで精度が大幅向上</strong><br>基本情報は揃っていますが、以下の情報を補完するとAI分析の信頼度が上がります。スキップしてもそのまま分析を進められます。`;

  const priLabel = { high: '精度影響：高', med: '精度影響：中', low: '精度影響：低' };
  const priClass = { high: 'aqp-high',     med: 'aqp-med',     low: 'aqp-low' };
  $('aqList').innerHTML = iq.checks.map(q => `
    <div class="aq-item">
      <div class="aq-item-head">
        <span class="aq-priority ${priClass[q.priority]}">${priLabel[q.priority]}</span>
        <span class="aq-q">${esc(q.q)}</span>
      </div>
      <div class="aq-why">${esc(q.why)}</div>
      <div class="aq-input"><textarea placeholder="（スキップする場合は空欄のまま）" data-field="${q.field}" rows="2"></textarea></div>
    </div>`).join('');
}

// ══════════════════════════════════════════
// 機能B: バッチ処理
// ══════════════════════════════════════════
let batchCandCount = 0;
const BATCH_RESULTS = [];

function openBatchMode() {
  $('batchModeBtn').classList.add('active');
  const j = S.job;
  $('batchJobSummary').textContent = j && j.position
    ? `ポジション: ${j.position}${j.company ? ' / ' + j.company : ''}\n仕事内容: ${j.description ? j.description.slice(0, 80) + '...' : ''}`
    : '求人情報が未入力です。先にSTEP1の求人情報を入力してください。';
  if (batchCandCount === 0) { addBatchCandidate(); addBatchCandidate(); }
  go('Batch');
}

function addBatchCandidate() {
  batchCandCount++;
  const n = batchCandCount;
  const div = document.createElement('div');
  div.className = 'batch-cand'; div.id = `bcand_${n}`;
  div.innerHTML = `
    <div class="batch-cand-head">
      <span class="batch-cand-num">候補者 ${n}</span>
      <span class="batch-cand-status bcs-wait" id="bcand_status_${n}">待機中</span>
    </div>
    <div class="batch-cand-body">
      <div class="fg"><label>現在の会社<span class="req">*</span></label><input type="text" id="bc_co_${n}" placeholder="例：株式会社〇〇"></div>
      <div class="fg"><label>現在の職種<span class="req">*</span></label><input type="text" id="bc_role_${n}" placeholder="例：バックエンドエンジニア"></div>
      <div class="fg"><label>経験概要<span class="req">*</span></label><textarea id="bc_exp_${n}" placeholder="主な経験・実績を簡潔に" style="min-height:54px"></textarea></div>
      <div class="fg"><label>スキル<span class="req">*</span></label><textarea id="bc_sk_${n}" placeholder="例：Java, AWS, Docker" style="min-height:54px"></textarea></div>
      <div class="fg" style="grid-column:span 2"><label>転職理由・志向（任意）</label><textarea id="bc_why_${n}" placeholder="例：技術的挑戦をしたい" style="min-height:40px"></textarea></div>
    </div>`;
  $('batchCandidates').appendChild(div);
  updateBatchRunBtn();
  div.querySelectorAll('input,textarea').forEach(el => el.addEventListener('input', updateBatchRunBtn));
}

function updateBatchRunBtn() {
  let valid = false;
  for (let i = 1; i <= batchCandCount; i++) {
    const co = $(`bc_co_${i}`), role = $(`bc_role_${i}`), exp = $(`bc_exp_${i}`), sk = $(`bc_sk_${i}`);
    if (co && role && exp && sk && co.value.trim() && role.value.trim() && exp.value.trim() && sk.value.trim()) { valid = true; break; }
  }
  if (!S.job || !S.job.position) valid = false;
  $('batchRunBtn').disabled = !valid;
}

async function runBatch() {
  const j = S.job?.position
    ? S.job
    : { position: $('j_pos')?.value.trim() || '', company: $('j_co')?.value.trim() || '', description: $('j_desc')?.value.trim() || '', requirements: $('j_req')?.value.trim() || '', appeal: $('j_ap')?.value.trim() || '' };
  if (!j.position) { err('求人情報のポジション名を入力してください。'); return; }

  const candidates = [];
  for (let i = 1; i <= batchCandCount; i++) {
    const co = $(`bc_co_${i}`), role = $(`bc_role_${i}`), exp = $(`bc_exp_${i}`), sk = $(`bc_sk_${i}`), why = $(`bc_why_${i}`);
    if (!co || !co.value.trim() || !role?.value.trim() || !exp?.value.trim() || !sk?.value.trim()) continue;
    candidates.push({ idx: i, company: co.value.trim(), role: role.value.trim(), experience: exp.value.trim(), skills: sk.value.trim(), projects: '', reason: why?.value.trim() || '' });
  }
  if (candidates.length === 0) { err('有効な候補者情報が1件もありません。'); return; }

  $('batchResult').classList.remove('on');
  $('batchResultGrid').innerHTML = '';
  BATCH_RESULTS.length = 0;
  const prog = $('batchProgress'), progTxt = $('batchProgressText');
  prog.classList.add('on'); $('batchRunBtn').disabled = true;

  for (let ci = 0; ci < candidates.length; ci++) {
    const cand = candidates[ci];
    const statusEl = $(`bcand_status_${cand.idx}`);
    if (statusEl) { statusEl.className = 'batch-cand-status bcs-run'; statusEl.textContent = '分析中...'; }
    progTxt.textContent = `分析中 ${ci + 1}/${candidates.length}件目 — ${cand.role}（${cand.company}）`;
    try {
      const result = await runBatchSingle(cand, j);
      BATCH_RESULTS.push(result);
      if (statusEl) { statusEl.className = 'batch-cand-status bcs-done'; statusEl.textContent = '完了'; }
    } catch (e) {
      BATCH_RESULTS.push({ cand, error: e.message });
      if (statusEl) { statusEl.className = 'batch-cand-status bcs-err'; statusEl.textContent = 'エラー'; }
    }
    if (ci < candidates.length - 1) await new Promise(r => setTimeout(r, 600));
  }
  prog.classList.remove('on'); $('batchRunBtn').disabled = false;
  renderBatchResults(); $('batchResult').classList.add('on');
}

function batchDemoResult(c, j) {
  const hasLead        = /リード|マネジ|lead|manager/i.test(c.experience + c.skills);
  const wantsChallenge = /挑戦|技術|スタートアップ|裁量/i.test(c.reason);
  const wantsMgmt      = /マネジ|組織|チームビルド/i.test(c.reason + c.experience);
  const wantsStability = /安定|大手|福利厚生/i.test(c.reason);
  let type;
  if      (wantsMgmt && hasLead)        type = 'PM・マネジメント型';
  else if (wantsChallenge && !hasLead)  type = '技術スペシャリスト型';
  else if (wantsChallenge && hasLead)   type = '市場価値向上型';
  else if (wantsStability)              type = '安定志向型';
  else                                  type = 'キャリアアップ型';
  const sk0 = c.skills.split(/[,、\n]/)[0].trim();
  return {
    cand: c,
    candidateTypeCategory: type,
    score: wantsChallenge ? 79 : 72,
    topAppeal: wantsChallenge ? '技術的挑戦' : 'キャリアアップ',
    topAppealReason: `転職志向と求人の魅力が一致しており、${wantsChallenge ? '技術的挑戦' : 'キャリアの拡大'}を訴求することで返信率が高まります。`,
    avoidPoint: '「安定性」「大手のブランド力」は響かない可能性',
    subject: `${c.company}での${sk0}ご経験について — ${j.position}のご相談`,
    mailBody: `${c.company}で${c.role}として${c.experience.slice(0, 40)}...という経験を積まれてきた点に注目し、ご連絡しました。\n${sk0}の実務経験と${hasLead ? 'チームリードとしての実績' : '高い実装力'}は、今回の${j.position}ポジションが求めているプロフィールと非常に合致しています。\n${j.description.slice(0, 50)}…という業務をお任せしたいと考えています。\n30分ほど、選考を前提としないカジュアルなお話しの機会をいただけますか？`
  };
}

function renderBatchResults() {
  $('batchResultGrid').innerHTML = BATCH_RESULTS.map((r, i) => {
    if (r.error) return `<div class="br-item"><div class="br-item-head"><div class="br-num">${i + 1}</div><span class="br-name" style="color:var(--red)">${esc(r.cand.role)}（${esc(r.cand.company)}）</span><span style="font-size:12px;color:var(--red)">エラー: ${esc(r.error)}</span></div></div>`;
    const scoreColor = r.score >= 80 ? 'var(--green)' : r.score >= 65 ? 'var(--accent)' : 'var(--amber)';
    return `
      <div class="br-item">
        <div class="br-item-head">
          <div class="br-num">${i + 1}</div>
          <div class="br-name">${esc(r.cand.role)}（${esc(r.cand.company)}）</div>
          <span class="br-type">${esc(r.candidateTypeCategory)}</span>
          <span class="br-score" style="color:${scoreColor}">${r.score}%</span>
        </div>
        <div class="br-body">
          <div class="br-field"><div class="br-field-label">最優先訴求</div><div class="br-field-val">${esc(r.topAppeal)}<br><span style="font-size:11px;color:var(--muted)">${esc(r.topAppealReason)}</span></div></div>
          <div class="br-field"><div class="br-field-label">避けるべき訴求</div><div class="br-field-val">${esc(r.avoidPoint)}</div></div>
        </div>
        <div class="br-mail-box">
          <div class="br-mail-label">生成されたスカウト</div>
          <div class="br-mail-subj">${esc(r.subject)}</div>
          <div class="br-mail-body">${esc(r.mailBody)}</div>
          <button class="br-copy-btn" data-idx="${i}">コピー</button>
        </div>
      </div>`;
  }).join('');

  $('batchResultGrid').querySelectorAll('.br-copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const r = BATCH_RESULTS[idx];
      if (!r || r.error) return;
      navigator.clipboard.writeText(`件名：${r.subject}\n\n${r.mailBody}`).then(() => {
        const orig = btn.textContent; btn.textContent = '✓ コピーしました'; setTimeout(() => btn.textContent = orig, 2000);
      });
    });
  });
}

// ══════════════════════════════════════════
// 機能C: 返信結果フィードバックUI
// ══════════════════════════════════════════
function renderFeedbackUI() {
  const box = $('feedbackBox');
  if (!box) return;
  const id = S.currentHistoryId;
  const history = loadScoutHistory();
  const entry = history.find(h => h.id === id) || {};
  const r = entry.result || {};

  const btn = (key, label, activeVal, color) => {
    const active = r[key] === activeVal;
    return `<button class="fb-btn${active ? ' active' : ''}" style="${active ? 'background:' + color + ';border-color:' + color + ';color:#fff' : ''}" onclick="toggleFeedback('${key}',${activeVal},'${color}')">${label}</button>`;
  };

  box.innerHTML = `
    <div class="fb-title">📊 送信後フィードバック <span class="fb-sub">返信状況を記録すると将来の学習データになります</span></div>
    <div class="fb-row">
      <div class="fb-group">
        <div class="fb-group-label">返信</div>
        ${btn('replied', '✓ 返信あり', true, '#16a34a')}
        ${btn('replied', '✗ 返信なし', false, '#dc2626')}
      </div>
      <div class="fb-group">
        <div class="fb-group-label">面談</div>
        ${btn('meetingScheduled', '✓ 設定済み', true, '#2563eb')}
        ${btn('meetingScheduled', '未設定', false, '#6b7280')}
      </div>
      <div class="fb-group">
        <div class="fb-group-label">採用</div>
        ${btn('hired', '✓ 採用', true, '#7c3aed')}
        ${btn('hired', '未採用', false, '#6b7280')}
      </div>
    </div>
    <div class="fb-note-row">
      <textarea class="fb-note" id="fbNote" placeholder="メモ（任意）：返信内容・印象・次のアクションなど" rows="2">${r.feedbackNote || ''}</textarea>
      <button class="fb-save-btn" onclick="saveFeedbackNote()">保存</button>
    </div>
    ${r.replied !== null ? '<div class="fb-saved">✓ フィードバック保存済み</div>' : ''}
  `;
}

function toggleFeedback(key, val, color) {
  const id = S.currentHistoryId; if (!id) return;
  const history = loadScoutHistory();
  const entry = history.find(h => h.id === id); if (!entry) return;
  // 同じ値をクリックしたらリセット
  entry.result[key] = entry.result[key] === val ? null : val;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  renderFeedbackUI();
}

function saveFeedbackNote() {
  const id = S.currentHistoryId; if (!id) return;
  const note = $('fbNote')?.value || '';
  updateHistoryResult(id, { feedbackNote: note });
  const btn = document.querySelector('.fb-save-btn');
  if (btn) { btn.textContent = '✓ 保存'; btn.style.background = '#16a34a'; setTimeout(() => { btn.textContent = '保存'; btn.style.background = ''; }, 1800); }
}

// ══════════════════════════════════════════
// 機能D: スカウト履歴一覧パネル
// ══════════════════════════════════════════
function openHistory() {
  renderHistory();
  go('History');
}

function renderHistory() {
  const history = loadScoutHistory();
  const grid = $('historyGrid');
  if (!grid) return;

  if (history.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:14px">まだスカウト履歴がありません。<br>スカウト文を生成すると自動的に保存されます。</div>';
    return;
  }

  const resultLabel = r => {
    if (r.hired === true)            return '<span class="hr-badge hb-hired">採用</span>';
    if (r.meetingScheduled === true) return '<span class="hr-badge hb-meeting">面談</span>';
    if (r.replied === true)          return '<span class="hr-badge hb-replied">返信あり</span>';
    if (r.replied === false)         return '<span class="hr-badge hb-no">返信なし</span>';
    return '<span class="hr-badge hb-wait">未記録</span>';
  };

  grid.innerHTML = history.map(h => {
    const d = new Date(h.savedAt);
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    const scoreColor = h.analysis.score >= 80 ? 'var(--green)' : h.analysis.score >= 65 ? 'var(--accent)' : 'var(--amber)';
    return `
      <div class="hr-item">
        <div class="hr-item-head">
          <div>
            <div class="hr-name">${esc(h.candidate.role)} <span class="hr-company">@ ${esc(h.candidate.company)}</span></div>
            <div class="hr-pos">${esc(h.job.position)}${h.job.company ? ' — ' + esc(h.job.company) : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="hr-score" style="color:${scoreColor}">${h.analysis.score}点</span>
            ${resultLabel(h.result)}
            <span class="hr-date">${dateStr}</span>
          </div>
        </div>
        <div class="hr-type">${esc(h.analysis.candidateTypeCategory)}</div>
        <div class="hr-subj">${esc(h.mail?.subject || '—')}</div>
        <div class="hr-actions">
          <button class="btn btn-ghost btn-sm" onclick="loadHistoryEntry('${h.id}')">再表示</button>
          <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="removeHistoryEntry('${h.id}')">削除</button>
        </div>
      </div>`;
  }).join('');
}

function loadHistoryEntry(id) {
  const history = loadScoutHistory();
  const h = history.find(e => e.id === id); if (!h) return;
  S.candidate = { ...h.candidate };
  S.mail      = { ...(h.mail || {}) };
  S.currentHistoryId = id;
  S.selectedAppeals  = [...(h.selectedAppeals || [])];
  renderMail();
  go(5);
}

function removeHistoryEntry(id) {
  if (!confirm('この履歴を削除しますか？')) return;
  deleteHistoryEntry(id);
  renderHistory();
}

// ══════════════════════════════════════════
// Phase1.5: 求人プロジェクト管理 UI
// ══════════════════════════════════════════

/** プロジェクト選択バーを描画（カード上部の保存済み求人ボタン群） */
function renderProjectSelector() {
  const projects = loadProjects();
  const bar  = $('projSelectorBar');
  const list = $('projSelectorList');
  if (!bar || !list) return;

  if (projects.length === 0) {
    bar.classList.remove('has-projects');
    return;
  }
  bar.classList.add('has-projects');
  list.innerHTML = projects.map(p => `
    <button class="proj-sel-btn${p.id === S.currentProjectId ? ' active' : ''}"
            onclick="loadProject('${p.id}')" title="${esc(p.position)} — ${new Date(p.updatedAt).toLocaleDateString('ja-JP')}に保存">
      ${esc(p.name || p.position)}
    </button>`).join('');
}

/** プロジェクトを読み込んでフォームに反映 */
function loadProject(id) {
  const projects = loadProjects();
  const proj = projects.find(p => p.id === id);
  if (!proj) return;
  applyProjectToForm(proj);
  renderProjectSelector();  // アクティブ状態更新
  // モーダルが開いている場合は閉じる
  closeProjectModal();
  // ユーザーへの通知
  const btn = $('projSaveBtn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ 読み込みました';
    btn.classList.add('saved');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('saved'); }, 1800);
  }
}

/** 現在のフォーム内容をプロジェクトとして保存 */
function saveCurrentProject() {
  const pos = $('j_pos')?.value.trim();
  if (!pos) { err('ポジション名を入力してから求人情報を保存してください。'); return; }
  const proj = buildProjectFromForm();
  const id = saveProject(proj);
  S.currentProjectId = id;
  renderProjectSelector();

  const btn = $('projSaveBtn');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✓ 保存しました';
    btn.classList.add('saved');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('saved'); }, 1800);
  }
}

/** プロジェクト管理モーダルを開く */
function openProjectModal() {
  renderProjectModalList();
  $('projModalOverlay').classList.add('on');
}

/** プロジェクト管理モーダルを閉じる */
function closeProjectModal() {
  $('projModalOverlay').classList.remove('on');
}

/** モーダル内のオーバーレイクリックで閉じる（モーダル内クリックは閉じない） */
function closeProjModal(event) {
  if (event.target === $('projModalOverlay')) closeProjectModal();
}

/** モーダル内のプロジェクトリストを描画 */
function renderProjectModalList() {
  const projects = loadProjects();
  const list  = $('projModalList');
  const empty = $('projModalEmpty');
  if (!list) return;

  if (projects.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  list.innerHTML = projects.map(p => {
    const d = new Date(p.updatedAt);
    const dateStr = `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
    return `
      <div class="proj-item">
        <div class="proj-item-info">
          <div class="proj-item-name">${esc(p.name || p.position)}</div>
          <div class="proj-item-pos">${esc(p.position)}${p.company ? ' — ' + esc(p.company) : ''}</div>
          <div class="proj-item-date">最終更新: ${dateStr}${p.successExamples ? ' ⭐ 成功例あり' : ''}</div>
        </div>
        <div class="proj-item-actions">
          <button class="proj-load-btn" onclick="loadProject('${p.id}')">読み込む</button>
          <button class="proj-del-btn" onclick="deleteProjectConfirm('${p.id}')">削除</button>
        </div>
      </div>`;
  }).join('');
}

/** プロジェクト削除確認 */
function deleteProjectConfirm(id) {
  if (!confirm('この求人プロジェクトを削除しますか？')) return;
  deleteProject(id);
  if (S.currentProjectId === id) S.currentProjectId = null;
  renderProjectModalList();
  renderProjectSelector();
}

// ページ読み込み時にプロジェクト選択バーを初期描画
document.addEventListener('DOMContentLoaded', () => {
  renderProjectSelector();
});
// DOMContentLoadedが既に発火済みの場合に備えてすぐにも実行
if (document.readyState !== 'loading') renderProjectSelector();
