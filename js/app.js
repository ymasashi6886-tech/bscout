/**
 * app.js — UI制御・イベント処理・レンダリング
 *
 * 将来的な拡張ポイント:
 *   - ユーザー認証: 画面表示前に認証チェックを追加
 *   - スカウト履歴: saveScoutHistory() を送信完了時に呼ぶ
 *   - 返信結果記録: S.learningData.scoutAction.result を更新するUIを追加
 */

// ══════════════════════════════════════════
// Phase2: IBM専用訴求ライブラリ
// ══════════════════════════════════════════

/**
 * IBM訴求マスタ（v1.2: 構造拡張版）
 * 30〜50軸への拡張を見据えた構造:
 * id / name / icon / color / colorL / desc / ibmStrength / ibmExample / effectiveFor / priority / keywords
 *
 * ibmExample: スカウト文に組み込める具体的な一文例
 * priority: 1=最重要, 2=重要, 3=補助
 * keywords: 検索・マッチング用タグ
 */
const IBM_APPEALS = [
  // ── AI・テクノロジー軸 ──
  {
    id: 'ai_transformation', name: 'AI Transformation', icon: '✦',
    color: '#6d28d9', colorL: '#f5f3ff',
    desc: 'IBMのAI変革プロジェクト・watsonx活用機会',
    ibmStrength: 'IBMはwatsonx.aiを中心に金融・製造・医療など各業界のAI変革を主導。候補者がAIを「作る側」ではなく「社会に実装する側」に立てる。',
    ibmExample: '今、IBMが最も力を入れているwatsonxによる業界AI変革プロジェクトに、中心メンバーとして関わるポジションです。',
    effectiveFor: ['技術スペシャリスト型', 'PM・マネジメント型', '市場価値向上型'],
    priority: 1,
    keywords: ['AI', 'DX', 'watsonx', '変革', '実装', 'LLM', '生成AI'],
  },
  {
    id: 'watsonx', name: 'watsonx', icon: '🔬',
    color: '#0891b2', colorL: '#ecfeff',
    desc: 'IBMの生成AI基盤watsonxへの深関与',
    ibmStrength: 'watsonxはオープンソースLLMをエンタープライズで使える唯一の基盤。GPTとは異なり「自社データで動く」AIを構築できる。',
    ibmExample: 'watsonx.aiでGranite・Llama3などのOSSモデルを企業データに最適化する、まさにLLM時代の最前線です。',
    effectiveFor: ['技術スペシャリスト型', '市場価値向上型'],
    priority: 1,
    keywords: ['watsonx', 'Granite', 'LLM', 'RAG', 'MLOps', '生成AI', 'Foundation Model'],
  },
  {
    id: 'tech_env', name: '技術環境', icon: '⚙️',
    color: '#0f766e', colorL: '#f0fdfa',
    desc: 'OSS・エッジ・クラウドなど最先端技術スタック',
    ibmStrength: 'RedHat/OpenShift・Kubernetes・Terraform・Instana・Qiskitなど業界標準OSSの中心にいる。技術スタック自体が市場価値に直結する環境。',
    ibmExample: 'RedHat/OpenShiftやKubernetesのエコシステムど真ん中で、業界標準OSSのコア部分に触れながら働けます。',
    effectiveFor: ['技術スペシャリスト型', '市場価値向上型'],
    priority: 1,
    keywords: ['RedHat', 'OpenShift', 'Kubernetes', 'Terraform', 'OSS', 'クラウド', 'コンテナ'],
  },
  // ── 規模・案件軸 ──
  {
    id: 'scale', name: '大規模案件', icon: '🏗',
    color: '#059669', colorL: '#ecfdf5',
    desc: '国家・業界インフラ規模のプロジェクト',
    ibmStrength: '銀行・官公庁・製造業の基幹システムから医療DXまで、個人では体験できない超大規模案件に携われる。スタートアップでは絶対に積めない経験スケール。',
    ibmExample: '国内メガバンクや官公庁の基幹システム更新など、1件で数百億規模のプロジェクトに関わることができます。',
    effectiveFor: ['PM・マネジメント型', 'キャリアアップ型', '技術スペシャリスト型'],
    priority: 1,
    keywords: ['大規模', '官公庁', '金融', '製造', '基幹系', 'インフラ', 'エンタープライズ'],
  },
  {
    id: 'finance_dx', name: '金融DX', icon: '🏦',
    color: '#1d4ed8', colorL: '#dbeafe',
    desc: 'メガバンク・証券・保険のDXプロジェクト',
    ibmStrength: 'IBMは国内メガバンク・地銀・保険会社のコアバンキング・リスク管理・AI活用で独占的な実績を持つ。金融業界の「インフラを知るエンジニア」としての経歴が積める。',
    ibmExample: '国内主要金融機関のコアシステム更新やリスクモデル構築で、金融×AIの最前線に立てます。',
    effectiveFor: ['技術スペシャリスト型', 'PM・マネジメント型', '市場価値向上型'],
    priority: 2,
    keywords: ['金融', '銀行', '保険', '証券', 'FinTech', 'リスク管理', 'コアバンキング'],
  },
  {
    id: 'public_dx', name: '官公庁・社会インフラDX', icon: '🏛',
    color: '#7c3aed', colorL: '#f5f3ff',
    desc: '行政・医療・教育のデジタル変革',
    ibmStrength: 'デジタル庁・自治体DX・医療情報システムなど、社会インフラのデジタル変革プロジェクトに技術者として関与できる。',
    ibmExample: '自治体のDXや医療情報基盤の構築など、インフラとして社会に残るシステムを設計できるポジションです。',
    effectiveFor: ['PM・マネジメント型', '安定志向型', '社会貢献志向型'],
    priority: 2,
    keywords: ['官公庁', '自治体', '医療', '教育', '社会インフラ', 'デジタル庁', 'DX'],
  },
  // ── グローバル・組織軸 ──
  {
    id: 'global', name: 'グローバル環境', icon: '🌏',
    color: '#2563eb', colorL: '#eff6ff',
    desc: '170カ国・多国籍チームとの協業機会',
    ibmStrength: 'IBMは170カ国に拠点を持ち、日本のプロジェクトでも常に海外チームと協働。英語が実務レベルで使え、外資系の中でも圧倒的なグローバル規模。',
    ibmExample: '入社初日から英語Slack・週次英語会議は普通です。TOEIC600点台でも入社後に伸びるケースが多いです。',
    effectiveFor: ['グローバル志向型', '市場価値向上型', '技術スペシャリスト型'],
    priority: 1,
    keywords: ['グローバル', '英語', '海外', '多国籍', '170カ国', '外資系'],
  },
  // ── ブランド・安定軸 ──
  {
    id: 'brand', name: 'IBMブランド', icon: '🔷',
    color: '#1d4ed8', colorL: '#dbeafe',
    desc: '112年の実績・世界的信頼ブランド',
    ibmStrength: '「IBMにいた」という経歴の市場価値は別格。特にエンタープライズ領域では信頼の証。転職後も「IBMバックグラウンド」としてキャリアに機能し続ける。',
    ibmExample: 'IBMの経歴は、エンタープライズ領域での「信頼の証」として、次のキャリアでも機能し続けます。',
    effectiveFor: ['市場価値向上型', '安定志向型', 'キャリアアップ型'],
    priority: 2,
    keywords: ['ブランド', '市場価値', 'キャリア', '実績', '信頼', '112年'],
  },
  {
    id: 'stability', name: '安定・長期雇用', icon: '🛡',
    color: '#374151', colorL: '#f9fafb',
    desc: '創業112年・外資系最高水準の雇用安定性',
    ibmStrength: '1911年創業・リーマンショック・コロナ禍も黒字継続。外資系の中では最も雇用安定性が高い部類。平均勤続年数は日系大手に匹敵。',
    ibmExample: '外資系でありながら、IBMの雇用安定性は国内日系大手と遜色ありません。創業112年の実績がそれを証明しています。',
    effectiveFor: ['安定志向型', 'キャリアアップ型'],
    priority: 2,
    keywords: ['安定', '長期', '雇用', '継続', '112年', '老舗', '外資系'],
  },
  // ── 社会貢献軸 ──
  {
    id: 'social', name: '社会貢献', icon: '🌱',
    color: '#16a34a', colorL: '#f0fdf4',
    desc: 'IBMの社会課題解決・ESGプロジェクト',
    ibmStrength: '医療・教育・気候変動・行政DXなど社会インフラへの貢献機会。「稼ぐAI」ではなく「社会を変えるAI」というキャリアストーリーが作れる。',
    ibmExample: '気候変動対策・医療アクセス改善・デジタルデバイド解消など、技術で社会課題に向き合うプロジェクトがあります。',
    effectiveFor: ['安定志向型', '社会貢献志向型', 'PM・マネジメント型'],
    priority: 2,
    keywords: ['社会貢献', 'ESG', '医療', '教育', '気候変動', 'SDGs', 'インパクト'],
  },
  // ── 育成・キャリア軸 ──
  {
    id: 'training', name: '育成制度', icon: '📚',
    color: '#d97706', colorL: '#fffbeb',
    desc: 'IBM内部認定・世界水準の育成プログラム',
    ibmStrength: 'IBMのBadge/認定プログラム・Think Academyは業界標準。スキルが「IBMブランド付き」で市場価値として可視化される。社内異動・ローテーションも豊富。',
    ibmExample: '400種以上のIBM Skills Badge認定が取得でき、スキルが「IBMブランド付き」で市場価値として可視化されます。',
    effectiveFor: ['キャリアアップ型', '市場価値向上型', '安定志向型'],
    priority: 2,
    keywords: ['育成', 'Badge', '研修', 'スキル', '認定', 'キャリア開発', 'ローテーション'],
  },
  {
    id: 'career_change', name: 'キャリアチェンジ支援', icon: '🔄',
    color: '#7c3aed', colorL: '#f5f3ff',
    desc: '社内公募・異動によるキャリア転換機会',
    ibmStrength: '社内公募制度で2〜3年ごとに別チームへの異動が一般的。エンジニアからコンサル、技術から営業など、社内でのキャリアチェンジが実現できる。',
    ibmExample: '2〜3年でチームを変えながらキャリアを積める社内公募制度で、「IBM内転職」が当たり前の文化です。',
    effectiveFor: ['キャリアアップ型', '市場価値向上型'],
    priority: 3,
    keywords: ['キャリアチェンジ', '社内公募', '異動', 'ローテーション', '多様な経験'],
  },
  // ── 働き方・報酬軸 ──
  {
    id: 'workstyle', name: '働き方', icon: '🏠',
    color: '#7c3aed', colorL: '#f5f3ff',
    desc: 'フレックス・リモート・ハイブリッドワーク',
    ibmStrength: 'IBM Japanはフレックス勤務・リモートワークが定着。育児・副業・地方在住も対応。年間を通じた柔軟な働き方は外資系の中でも充実度が高い。',
    ibmExample: '週3〜4日リモート・コアタイムなしのフレックスが標準。副業原則OKの部門も増えています。',
    effectiveFor: ['安定志向型', 'キャリアアップ型'],
    priority: 2,
    keywords: ['リモート', 'フレックス', 'ワークライフバランス', '副業', '育児', '在宅'],
  },
  {
    id: 'benefits', name: '福利厚生・報酬', icon: '🎁',
    color: '#be185d', colorL: '#fdf2f8',
    desc: '外資系水準の報酬・ベネフィット体系',
    ibmStrength: '外資系標準の給与レンジ・株式報酬・確定拠出年金・語学支援。大手日系との比較で「透明性の高い評価と報酬」が訴求ポイント。',
    ibmExample: 'RSU（株式報酬）・確定拠出年金・語学支援に加え、グレード制で透明性の高い評価体系です。年収700万〜1500万レンジ。',
    effectiveFor: ['安定志向型', 'キャリアアップ型'],
    priority: 3,
    keywords: ['報酬', '年収', '福利厚生', 'RSU', '株式報酬', '確定拠出', '給与'],
  },
  // ── 裁量・自律性軸 ──
  {
    id: 'autonomy', name: '裁量・技術選定', icon: '🎯',
    color: '#dc2626', colorL: '#fef2f2',
    desc: '技術選定・設計の意思決定権',
    ibmStrength: 'IBMのコンサル・エンジニアは顧客の技術戦略を立案するポジションが多く、社内承認フローが整備された上での大きな裁量が与えられる。',
    ibmExample: '顧客の技術戦略を立案するポジションが多く、「何を使うか」の意思決定に関われる裁量があります。',
    effectiveFor: ['技術スペシャリスト型', 'PM・マネジメント型', '市場価値向上型'],
    priority: 2,
    keywords: ['裁量', '技術選定', '意思決定', 'アーキテクチャ', '自律性'],
  },
  // ── v1.5 追加6軸 ──
  {
    id: 'consulting', name: 'コンサルティング力', icon: '💡',
    color: '#0369a1', colorL: '#e0f2fe',
    desc: '技術×ビジネスのコンサルスキル獲得',
    ibmStrength: 'IBMのコンサルタントは技術実装だけでなく経営層への提言・変革推進まで担う。エンジニアが「ビジネスを語れる人材」に成長できる唯一の場。',
    ibmExample: 'Fortune500企業の経営幹部にAI戦略を直接提案するプロジェクトに、技術者として参加できます。',
    effectiveFor: ['PM・マネジメント型', '市場価値向上型', 'キャリアアップ型'],
    priority: 2,
    keywords: ['コンサル', '提案力', '経営', 'ビジネス', 'ストラテジー', 'CXO'],
  },
  {
    id: 'innovation', name: 'イノベーション文化', icon: '🚀',
    color: '#7c3aed', colorL: '#f5f3ff',
    desc: '社内起業・新規事業・研究開発への参画',
    ibmStrength: 'IBMリサーチは量子コンピューティング・次世代AI・セキュリティの世界最先端研究機関。社内インキュベーション制度でアイデアを事業化できる環境がある。',
    ibmExample: 'IBM Research参加者は年間数百件の特許を出願。社内提案から新製品が生まれるイノベーション文化があります。',
    effectiveFor: ['技術スペシャリスト型', '市場価値向上型'],
    priority: 3,
    keywords: ['イノベーション', '研究', '量子', '特許', '新規事業', 'リサーチ'],
  },
  {
    id: 'hybrid_cloud', name: 'ハイブリッドクラウド', icon: '☁️',
    color: '#0891b2', colorL: '#ecfeff',
    desc: 'Red Hat/OpenShiftによるハイブリッドクラウド設計',
    ibmStrength: 'Red Hat買収（340億ドル）によりAWS・Azure・Google Cloud上で動くOpenShiftを提供。マルチクラウド設計の実務経験は市場最高水準の希少性。',
    ibmExample: 'AWS・Azure・オンプレを横断するOpenShiftクラスター設計の実務経験は、IBM以外ではほぼ積めません。',
    effectiveFor: ['技術スペシャリスト型', '市場価値向上型'],
    priority: 2,
    keywords: ['Red Hat', 'OpenShift', 'ハイブリッドクラウド', 'Kubernetes', 'マルチクラウド'],
  },
  {
    id: 'diversity', name: 'ダイバーシティ', icon: '🌈',
    color: '#0d9488', colorL: '#f0fdfa',
    desc: '多様性・インクルージョン・DE&I施策',
    ibmStrength: '1950年代から人種・性別の平等を宣言したIBMは、DE&I文化の先駆者。LGBTQ+・障がい者・シニア・外国籍社員の活躍事例が豊富。',
    ibmExample: 'IBMのDE&I指数はForbes誌のTop100常連。多様な価値観を「事業の強み」として活かす文化が根付いています。',
    effectiveFor: ['安定志向型', 'グローバル志向型'],
    priority: 3,
    keywords: ['ダイバーシティ', 'DE&I', 'インクルージョン', '多様性', 'LGBTQ'],
  },
  {
    id: 'mentorship', name: '育成・メンター制度', icon: '🤝',
    color: '#65a30d', colorL: '#f7fee7',
    desc: 'IBMのメンター・コーチング文化',
    ibmStrength: 'ほぼ全エンジニア・コンサルタントに社内メンターが存在。Agile・Design Thinking・Enterprise Design Thinkingの実践訓練も充実。',
    ibmExample: 'IBM社内では上位グレードのメンターが必ずつき、半年〜1年単位で成長を伴走してもらえます。',
    effectiveFor: ['キャリアアップ型', '安定志向型'],
    priority: 3,
    keywords: ['メンター', 'コーチング', 'Agile', 'Design Thinking', '育成', '成長'],
  },
  {
    id: 'startup_dna', name: 'スタートアップ的裁量', icon: '⚡',
    color: '#ea580c', colorL: '#fff7ed',
    desc: '大企業でありながらスタートアップ的な動き方',
    ibmStrength: 'IBMは2019年以降、IBM GarageメソッドによりMVP開発・デザインスプリント・アジャイル開発を社内標準化。大企業の安定性とスタートアップの速度を両立。',
    ibmExample: 'IBMのGarageプロジェクトでは、顧客のMVPを4週間で実装・リリースするスプリントが当たり前です。',
    effectiveFor: ['技術スペシャリスト型', 'キャリアアップ型'],
    priority: 3,
    keywords: ['スタートアップ', 'Garage', 'MVP', 'アジャイル', 'スプリント', '速度'],
  },
];

/**
 * 候補者タイプ × IBM訴求 相性マトリクス
 * rank: 1=必須, 2=有効, 3=補助
 */
const IBM_MATRIX = {
  '技術スペシャリスト型':  ['ai_transformation','watsonx','tech_env','scale','autonomy','global','hybrid_cloud','innovation'],
  'PM・マネジメント型':    ['scale','ai_transformation','autonomy','social','global','brand','consulting','startup_dna'],
  'キャリアアップ型':      ['training','career_change','brand','scale','workstyle','benefits','mentorship','consulting'],
  '市場価値向上型':        ['ai_transformation','watsonx','brand','tech_env','global','training','innovation','hybrid_cloud'],
  '安定志向型':            ['stability','brand','benefits','workstyle','social','training','diversity','mentorship'],
};

// 後方互換のため旧IDマッピングも保持
const ALL_APPEALS = IBM_APPEALS.map(a => ({ id: a.id, name: a.name, desc: a.desc }));

/** 候補者タイプから推奨IBM訴求IDリストを返す（順序付き） */
function getIbmAppealsForType(typeCategory) {
  return IBM_MATRIX[typeCategory] || ['ai_transformation','brand','scale','global','tech_env','training'];
}

const $ = id => document.getElementById(id);
const md = () => $('mdl').value;

// ── パネル遷移（v1.3: ステッパー6段階対応）──
function go(n) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  if      (n === '15')      { $('p15').classList.add('on'); }
  else if (n === 'Batch')   { $('pBatch').classList.add('on'); }
  else if (n === 'History') { $('pHistory').classList.add('on'); }
  else {
    const panelEl = document.getElementById('p' + n);
    if (panelEl) panelEl.classList.add('on');
    for (let i = 1; i <= 6; i++) {
      const el = $('si' + i); if (!el) continue;
      el.classList.remove('active', 'done');
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
  if (!c.company) { err('「現在の会社」を入力してください。'); return; }
  if (!c.role)    { err('「現在の職種」を入力してください。'); return; }
  if (!c.experience || c.experience.length < 10) { err('「経験概要」をもう少し詳しく入力してください（例：チーム規模・担当業務・成果など）。'); return; }
  if (!c.skills)  { err('「スキル」を入力してください（例：Java, AWS, チームリード など）。'); return; }
  if (!j.position)    { err('「募集ポジション名」を入力してください。'); return; }
  if (!j.description) { err('「仕事内容」を入力してください。'); return; }
  if (!j.requirements){ err('「求める経験・スキル」を入力してください。'); return; }
  if (!j.appeal)      { err('「会社・ポジションの魅力」を入力してください。AI訴求の質に最も影響します。'); return; }
  clearErr(); S.candidate = c; S.job = j;
  const iq = calcInfoQuality(c);
  if (iq.score < 70) { renderAIQuestions(c, j, iq); go('15'); }
  else { runAnalysis(); }
});

// ── ボタンイベント一覧（v1.3: Story Planner対応）──
$('reAnalyzeBtn').addEventListener('click', runAnalysis);
$('b2to1').addEventListener('click',  () => go(1));
$('b2to3').addEventListener('click',  () => { renderAppealSelector(); go(3); });
$('b3to2').addEventListener('click',  () => go(2));
// v1.3: STEP3 → STEP4（Story Planner）
$('genStoryBtn').addEventListener('click', generateStoryPlan);
// v1.3: STEP4 ボタン
$('b4to3').addEventListener('click',  () => go(3));
$('regenStoryBtn').addEventListener('click', generateStoryPlan);
// genMailBtn は STEP4（Story Planner確認後）からトリガー
$('genMailBtn').addEventListener('click', generateMail);
$('b5to3').addEventListener('click',  () => go(4));
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
// STEP3: IBM専用 訴求セレクターレンダリング (Phase2)
// ══════════════════════════════════════════
function renderAppealSelector() {
  const a = S.analysis;
  const typeCategory = a.candidateTypeCategory || a.candidateType || '';
  const rec = a.recommendedAppeals || getIbmAppealsForType(typeCategory);
  const priMap = {};
  (a.appealPriority || []).forEach(p => { if (p.appealId) priMap[p.appealId] = { reason: p.reason, rank: p.rank }; });

  // マトリクス推奨順でソート：推奨上位を先頭に、それ以外を後ろに
  const matrixOrder = getIbmAppealsForType(typeCategory);
  const sorted = [
    ...matrixOrder.map(id => IBM_APPEALS.find(a => a.id === id)).filter(Boolean),
    ...IBM_APPEALS.filter(a => !matrixOrder.includes(a.id))
  ];

  // タイプ専用ヒントバナー
  const typeHint = {
    '技術スペシャリスト型':  '技術スペシャリスト型はAI Transformation・watsonx・技術環境が最も刺さります。IBMが「技術を社会に実装する場」であることを前面に出してください。',
    'PM・マネジメント型':    'PM・マネジメント型は大規模案件・AI変革・裁量の訴求が有効です。IBMのプロジェクト規模と意思決定権の大きさを具体的に伝えてください。',
    'キャリアアップ型':       'キャリアアップ型には育成制度・IBMブランド・大規模案件が響きます。「IBMにいた」という経歴価値と体系的な成長機会を強調してください。',
    '市場価値向上型':         '市場価値向上型はAI×IBM×グローバルの組み合わせが最強です。IBMのAI変革経験が市場で最も希少な実績になることを訴求してください。',
    '安定志向型':             '安定志向型にはIBMブランド・福利厚生・働き方・社会貢献が有効です。IBMの112年の実績と安定した事業基盤を具体的に示してください。',
  };

  $('appealGrid').innerHTML = `
    <div class="ibm-matrix-banner">
      <div class="imb-type-row">
        <span class="imb-type-badge">${esc(typeCategory || '未分類')}</span>
        <span class="imb-type-label">候補者タイプ × IBM訴求 マトリクス最適化</span>
      </div>
      <div class="imb-hint">${esc(typeHint[typeCategory] || '候補者タイプに合わせたIBM訴求を選択してください。')}</div>
    </div>
    <div class="ibm-appeal-grid">` +
    sorted.map(ap => {
      const isRec   = rec.includes(ap.id);
      const priInfo = priMap[ap.id];
      const rank    = priInfo ? priInfo.rank : (isRec ? '推奨' : '');
      const reason  = priInfo ? priInfo.reason : '';
      const rankClass = priInfo?.rank === 1 ? 'rank1' : priInfo?.rank === 2 ? 'rank2' : priInfo?.rank === 3 ? 'rank3' : isRec ? 'recommended' : '';
      return `
        <div class="ibm-appeal-item ${rankClass}">
          <input type="checkbox" id="ap_${ap.id}" value="${ap.id}" ${isRec ? 'checked' : ''}>
          <label class="ibm-appeal-label" for="ap_${ap.id}" style="--ap-color:${ap.color};--ap-color-l:${ap.colorL}">
            <div class="ibm-ap-head">
              <span class="ibm-ap-icon">${ap.icon}</span>
              <span class="ibm-ap-name">${esc(ap.name)}</span>
              ${rank ? `<span class="ibm-ap-rank rank-${rank === '推奨' ? 'rec' : rank}">${rank === '推奨' ? 'AI推奨' : rank + '位'}</span>` : ''}
            </div>
            <div class="ibm-ap-desc">${esc(ap.desc)}</div>
            <div class="ibm-ap-strength">${esc(ap.ibmStrength)}</div>
            ${reason ? `<div class="ibm-ap-reason">💡 ${esc(reason)}</div>` : ''}
          </label>
        </div>`;
    }).join('') + `</div>`;

  document.querySelectorAll('.ibm-appeal-item input[type=checkbox]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = cb.closest('.ibm-appeal-item');
      if (cb.checked) item.classList.add('checked'); else item.classList.remove('checked');
    });
    // 初期状態反映
    if (cb.checked) cb.closest('.ibm-appeal-item').classList.add('checked');
  });
  $('strategyNote').innerHTML = `<strong>IBMアプローチ戦略メモ：</strong>${esc(a.strategyNote || '')}`;
}

// ══════════════════════════════════════════
// STEP4: Story Planner — 会話設計生成
// ══════════════════════════════════════════
async function generateStoryPlan() {
  // 訴求選択を先に確定
  S.selectedAppeals = [...document.querySelectorAll('#appealGrid input:checked')].map(cb => {
    const ap = IBM_APPEALS.find(a => a.id === cb.value); return ap ? ap.name : cb.value;
  }).filter(Boolean);
  S.selectedAppealIds = [...document.querySelectorAll('#appealGrid input:checked')].map(cb => cb.value);
  if (S.selectedAppeals.length === 0) { err('訴求ポイントを少なくとも1つ選択してください。'); return; }

  // PANEL 4に遷移してローディング状態を見せる
  go(4);
  $('spLoading').style.display = 'block';
  $('spContent').style.display = 'none';

  try {
    if (hasApiKey()) {
      await callStoryPlannerAPI();
    } else {
      demoStoryPlan();
    }
    renderStoryPlanner();
  } catch (e) {
    demoStoryPlan();
    renderStoryPlanner();
  }
}

/** デモ用 Story Plan（APIなし時） */
function demoStoryPlan() {
  const c = S.candidate, a = S.analysis || {};
  const typeCategory = a.candidateTypeCategory || '技術スペシャリスト型';
  const sk0 = (c.skills || '').split(/[,、\s]/)[0].trim();
  S.storyPlan = {
    openingFocus: `${c.role}として${c.experience ? c.experience.slice(0, 30) + '...' : sk0 + 'の経験'}まで担当されている点に着目しました。`,
    capabilityToAcknowledge: `${sk0}を実務レベルで使いこなしながら、チームの成果に貢献できるエンジニアとして評価しています。`,
    careerHypothesis: `技術的な挑戦の機会を求めており、より大きなスケールのプロジェクトで自分の力を試したいと考えているのではないでしょうか。`,
    ibmAppeals: [
      { rank: 1, appeal: S.selectedAppeals[0] || 'AI Transformation', reason: '候補者の技術的志向とIBMのAI実装力が合致しています。', ibmExample: 'watsonxによる業界AI変革プロジェクトに中心メンバーとして関われます。' },
      { rank: 2, appeal: S.selectedAppeals[1] || '大規模案件', reason: '現職ではスケールに制約がある可能性があり、IBM規模の案件が刺さります。', ibmExample: '国内メガバンクや官公庁向けの基幹システム、数百億規模のプロジェクトです。' },
      { rank: 3, appeal: S.selectedAppeals[2] || 'グローバル環境', reason: '市場価値向上の観点でグローバル経験が訴求ポイントになります。', ibmExample: '170カ国・入社初日から英語Slack・週次英語会議が当たり前です。' },
    ],
    conversationFlow: [
      { step: 1, phase: '共感', content: `${c.company}での経験を積みながら、次のステージを考えているタイミングではないかと感じました。` },
      { step: 2, phase: '能力承認', content: `${sk0}の経験は、業界でも希少な実力です。` },
      { step: 3, phase: '未来提示', content: `IBMでは、その経験をさらに大きなスケールで活かせるポジションがあります。` },
      { step: 4, phase: 'IBM訴求', content: `watsonxによるAI変革プロジェクトに、設計段階から関われます。` },
      { step: 5, phase: '面談誘導', content: `30分、選考なしのカジュアルな情報交換からでも構いません。` },
    ],
    closingStyle: '情報交換型',
    closingReason: '転職意思が固まっていない可能性があり、プレッシャーをかけないアプローチが有効',
    writingTone: '技術的な具体性を重視し、短めの文で論理的に。距離感は近め。',
    avoidInThisScout: '過剰な敬語・回りくどい誘導・「ぜひ」「ご縁」などの定型表現。IBMの説明が長くなりすぎること。'
  };
}

/** Story Plannerの内容をUIに描画 */
function renderStoryPlanner() {
  const sp = S.storyPlan;
  if (!sp) return;

  $('spLoading').style.display = 'none';
  $('spContent').style.display = 'block';

  // 表示モードを確実に表示
  $('spViewMode').style.display = '';
  $('spEditMode').style.display = 'none';
  const toggleBtn = $('spEditToggleBtn');
  if (toggleBtn) { toggleBtn.textContent = '✎ 編集モード'; toggleBtn.classList.remove('active'); }

  _renderSpViewMode(sp);

  // メモをクリア
  const noteEl = $('sp-note');
  if (noteEl) noteEl.value = sp._recruiterNote || '';

  // 学習データにstoryPlanを保存
  if (S.learningData) S.learningData.storyPlan = { ...sp };
}

/** 表示モードの描画（分離して再利用可能に） */
function _renderSpViewMode(sp) {
  // 冒頭フォーカス・能力承認・キャリア仮説
  $('sp-openingFocus').textContent = sp.openingFocus || '';
  $('sp-capability').textContent   = sp.capabilityToAcknowledge || '';
  $('sp-hypothesis').textContent   = sp.careerHypothesis || '';

  // IBM訴求設計
  const rankColors = ['', 'rank-1', 'rank-2', 'rank-3'];
  $('sp-appeals').innerHTML = (sp.ibmAppeals || []).map(a => `
    <div class="sp-appeal-item">
      <div class="sp-appeal-rank ${rankColors[a.rank] || ''}">${a.rank}</div>
      <div class="sp-appeal-body">
        <div class="sp-appeal-name">${esc(a.appeal)}</div>
        <div class="sp-appeal-reason">${esc(a.reason)}</div>
        ${a.ibmExample ? `<div class="sp-appeal-example">💡 ${esc(a.ibmExample)}</div>` : ''}
      </div>
    </div>`).join('');

  // 会話フロー
  $('sp-flow').innerHTML = (sp.conversationFlow || []).map(f => `
    <div class="sp-flow-item">
      <div class="sp-flow-step">${f.step}</div>
      <div class="sp-flow-phase">${esc(f.phase)}</div>
      <div class="sp-flow-content">${esc(f.content)}</div>
    </div>`).join('');

  // メタ情報
  const closingBadge = { '情報交換型': '🤝', 'カジュアル型': '☕', '提案型': '💼' };
  $('sp-closing').textContent = `${closingBadge[sp.closingStyle] || ''} ${sp.closingStyle || ''}` + (sp.closingReason ? `（${sp.closingReason}）` : '');
  $('sp-tone').textContent    = sp.writingTone || '';
  $('sp-avoid').textContent   = sp.avoidInThisScout || '';
}

// ══════════════════════════════════════════
// v1.4: Story Planner 直接編集UI
// ══════════════════════════════════════════

/** 編集モード ↔ 表示モードの切り替え */
function toggleSpEdit() {
  const isEdit = $('spEditMode').style.display !== 'none';
  if (isEdit) {
    cancelSpEdit();
  } else {
    _openSpEditMode();
  }
}

/** 編集モードを開いてフォームにS.storyPlanの値を反映 */
function _openSpEditMode() {
  const sp = S.storyPlan;
  if (!sp) return;

  // v1.5 BUG FIX: 編集前スナップショットを保存して「キャンセル」で巻き戻せるようにする
  S._spEditSnapshot = JSON.parse(JSON.stringify(sp));

  $('spViewMode').style.display = 'none';
  $('spEditMode').style.display = '';
  const btn = $('spEditToggleBtn');
  if (btn) { btn.textContent = '← 表示に戻る'; btn.classList.add('active'); }

  // 単一テキストフィールド
  _setSpEditField('spe-openingFocus',    sp.openingFocus || '');
  _setSpEditField('spe-capability',      sp.capabilityToAcknowledge || '');
  _setSpEditField('spe-hypothesis',      sp.careerHypothesis || '');
  _setSpEditField('spe-writingTone',     sp.writingTone || '');
  _setSpEditField('spe-avoidInThisScout',sp.avoidInThisScout || '');

  // クロージングスタイル select
  const sel = $('spe-closingStyle');
  if (sel) sel.value = sp.closingStyle || '情報交換型';

  // 会話フロー（STEP1〜5）の動的レンダリング
  const flowEl = $('spe-flowFields');
  if (flowEl) {
    flowEl.innerHTML = (sp.conversationFlow || []).map((f, idx) => `
      <div class="sp-edit-flow-item">
        <div class="sp-edit-flow-label">
          <div class="sp-edit-flow-step">${f.step}</div>
          <div class="sp-edit-flow-phase">${esc(f.phase)}</div>
        </div>
        <textarea class="sp-edit-ta" rows="2"
          oninput="spEditFlowSync(${idx}, this.value)">${esc(f.content)}</textarea>
      </div>`).join('');
  }

  // IBM訴求設計（訴求名・理由・例）
  const appealsEl = $('spe-appealFields');
  if (appealsEl) {
    const rankBadgeClass = ['', '', 'r2', 'r3'];
    appealsEl.innerHTML = (sp.ibmAppeals || []).map((a, idx) => `
      <div class="sp-edit-appeal-item">
        <div class="sp-edit-appeal-header">
          <div class="sp-edit-appeal-rank-badge ${rankBadgeClass[a.rank] || ''}">${a.rank}</div>
          <input class="sp-edit-appeal-name-input" type="text" value="${esc(a.appeal)}"
            placeholder="訴求名" oninput="spEditAppealSync(${idx}, 'appeal', this.value)">
        </div>
        <div class="sp-edit-appeal-sub-label">理由（なぜこの訴求が刺さるか）</div>
        <textarea class="sp-edit-ta" rows="2"
          oninput="spEditAppealSync(${idx}, 'reason', this.value)">${esc(a.reason || '')}</textarea>
        <div class="sp-edit-appeal-sub-label">IBMの具体例（1文）</div>
        <textarea class="sp-edit-ta" rows="1"
          oninput="spEditAppealSync(${idx}, 'ibmExample', this.value)">${esc(a.ibmExample || '')}</textarea>
      </div>`).join('');
  }
}

/** textarea/inputの初期値セット */
function _setSpEditField(id, val) {
  const el = $(id);
  if (!el) return;
  el.value = val;
}

/** 単一フィールドのリアルタイム同期（S.storyPlanに即反映） */
function spEditSync(field, val) {
  if (!S.storyPlan) return;
  S.storyPlan[field] = val;
}

/** 会話フローのリアルタイム同期 */
function spEditFlowSync(idx, val) {
  if (!S.storyPlan || !S.storyPlan.conversationFlow) return;
  if (S.storyPlan.conversationFlow[idx]) S.storyPlan.conversationFlow[idx].content = val;
}

/** IBM訴求のリアルタイム同期 */
function spEditAppealSync(idx, field, val) {
  if (!S.storyPlan || !S.storyPlan.ibmAppeals) return;
  if (S.storyPlan.ibmAppeals[idx]) S.storyPlan.ibmAppeals[idx][field] = val;
}

/** 編集内容を保存して表示モードへ戻る */
function applySpEdit() {
  if (!S.storyPlan) return;
  // saveStoryPlanEditでログに保存（メモと一緒に）
  const note = $('sp-note')?.value || '';
  saveStoryPlanEdit(S.storyPlan, note);
  if (S.learningData?.storyPlan) S.learningData.storyPlan.wasEdited = true;
  // v1.5: スナップショットをクリア（保存完了）
  S._spEditSnapshot = null;

  // 表示モードに戻って再描画
  $('spEditMode').style.display = 'none';
  $('spViewMode').style.display = '';
  const btn = $('spEditToggleBtn');
  if (btn) { btn.textContent = '✎ 編集モード'; btn.classList.remove('active'); }
  _renderSpViewMode(S.storyPlan);
}

/** v1.5 BUG FIX: キャンセル時はスナップショットから復元してS.storyPlanを巻き戻す */
function cancelSpEdit() {
  if (S._spEditSnapshot) {
    S.storyPlan = JSON.parse(JSON.stringify(S._spEditSnapshot));
    S._spEditSnapshot = null;
  }
  $('spEditMode').style.display = 'none';
  $('spViewMode').style.display = '';
  const btn = $('spEditToggleBtn');
  if (btn) { btn.textContent = '✎ 編集モード'; btn.classList.remove('active'); }
  _renderSpViewMode(S.storyPlan);
}

// ══════════════════════════════════════════
// STEP5: スカウト文生成・レンダリング（v1.3: Story Planner依存）
// ══════════════════════════════════════════
async function generateMail() {
  // Story Plannerのメモを保存 + 編集ログを記録
  const noteEl = $('sp-note');
  if (noteEl && S.storyPlan) {
    S.storyPlan._recruiterNote = noteEl.value;
    if (S.learningData?.storyPlan) S.learningData.storyPlan._recruiterNote = noteEl.value;
    // v1.4: メモがあれば編集ログに保存
    if (noteEl.value.trim()) saveStoryPlanEdit(S.storyPlan, noteEl.value);
  }
  showLoad(5);
  try { if (hasApiKey()) await callMailAPI(); else demoMail(); }
  catch (e) { hideLoad(); err('生成エラー: ' + e.message); demoMail(); hideLoad(); }
}

function demoMail() {
  const c = S.candidate, j = S.job, sel = S.selectedAppeals, jCo = j.company || 'IBM';
  const sk0 = c.skills.split(/[,、\n]/)[0].trim();
  const story = (S.analysis?.careerStory || {}).narrative || '';

  // v1.4: Story Plannerが存在する場合はその設計に従ってデモ文を構成
  const sp = S.storyPlan || {};
  const spFlow1 = (sp.conversationFlow || []).find(f => f.step === 1)?.content || '';
  const spFlow2 = (sp.conversationFlow || []).find(f => f.step === 2)?.content || '';
  const spFlow3 = (sp.conversationFlow || []).find(f => f.step === 3)?.content || '';
  const spAppeal1 = (sp.ibmAppeals || [])[0];
  const spAppeal2 = (sp.ibmAppeals || [])[1];
  const spOpening = sp.openingFocus || '';
  const spCapability = sp.capabilityToAcknowledge || '';

  const introText = spOpening
    ? `${spOpening}\n${spCapability ? spCapability : ''}`
    : `${c.company}で${c.role}として${c.experience.slice(0, 40)}...という経験を積まれてきた点に注目し、ご連絡しました。${story ? '\n' + story.slice(0, 80) + '...' : ''}`;

  const whyText = spFlow1 || spFlow2
    ? `${spFlow1}\n${spFlow2}`
    : `${sk0}の実務経験と${c.experience.includes('リード') ? 'チームリードとしての実績' : '高い実装力'}は、このポジションで求めているプロフィールと非常に合致しています。\n特に${c.experience.slice(0, 50)}...という部分が、今回の求人要件に直接マッチしています。`;

  const matchText = spFlow3
    ? `${spFlow3}\n${j.position}では${j.description.slice(0, 60)}...というプロジェクトに関われます。`
    : `${j.position}では${j.description.slice(0, 60)}...という業務を担当いただきます。\n${sk0}のご経験は即戦力として活かせる部分が多く、${j.requirements.slice(0, 40)}...という要件にも強く合致しています。`;

  const benefitText = spAppeal1
    ? `${spAppeal1.ibmExample || spAppeal1.reason || ''}\n${spAppeal2 ? (spAppeal2.ibmExample || spAppeal2.reason || '') : ''}`
    : `${sel.includes('技術的挑戦') ? 'IBMでは最先端AI・クラウド技術に関わる大規模プロジェクトに携わることができ、' : sel.includes('グローバル環境') ? 'IBMのグローバル環境で170カ国以上のチームと協業できる機会があり、' : 'IBMという環境では、'}${j.appeal.split(/[,、\n]/)[0].trim()}という特徴があります。\n${c.reason ? '「' + c.reason.slice(0, 30) + '...」という志向に応える環境です。' : 'これまでの経験を次のステージで活かしていただけます。'}`;

  const closingStyle = sp.closingStyle || '';
  const ctaText = closingStyle === '情報交換型'
    ? `もしよければ、30分ほど情報交換という形でお話しできませんか。選考は一切関係ありません。\nご都合のよいお日時を教えていただければ、こちらで日程を合わせます。`
    : closingStyle === '提案型'
    ? `一度、具体的なポジションの詳細をお伝えしながらお話しできればと思います。\n30分、オンラインで構いません。ご都合はいかがでしょうか。`
    : `30分ほど、選考を前提としないカジュアルなお話しの機会をいただけますか？\n「興味はあるけど転職は考えていない」という方でも大歓迎です。ご都合のよいお日時をいただけますと幸いです。`;

  S.mail = {
    subject: `${c.company}での${sk0}ご経験について — ${j.position}のご相談`,
    intro:   introText.trim(),
    why:     whyText.trim(),
    match:   matchText.trim(),
    benefit: benefitText.trim(),
    cta:     ctaText
  };
  hideLoad(); renderMail(); renderProcessLog(); go(6);
  // デモ用のセルフレビュー（v1.2新5軸版・遅延実行）
  setTimeout(() => {
    S.selfReview = {
      scores: { humanness: 74, candidateSpecificity: 72, consistency: 80, ibmness: 65, evidenceQuality: 70 },
      overallComment: '候補者固有の経験への言及があり、人間らしい文章に近づいています。IBMならではの訴求をより具体的な数値・事例で強化し、冒頭の書き出しをもう一段踏み込んだ表現にすることで品質が上がります。',
      improvements: [
        { axis: 'IBMらしさ', issue: 'IBMである必然性が薄く、他社のスカウトと差別化できていない。', fix: 'watsonxや170カ国グローバルなど固有の強みを具体的な数値・事例で1〜2文組み込む。', targetSection: 'benefit' },
        { axis: '候補者固有性', issue: '経歴への言及があるが、具体的な数値・規模感が薄い。', fix: '候補者の実績数値（チーム人数・規模・改善率）を直接引用すると固有性が上がる。', targetSection: 'intro' }
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
  // v1.5 BUG FIX: storyPlan確定後に学習データを再構築
  buildLearningData();
  // Phase2-3: OHEREトレーサビリティバッジを各セクションヘッダーに表示
  renderOhereTraceBadges();
  // 履歴に自動保存してフィードバックUIを描画
  saveScoutHistory();
  renderFeedbackUI();
  // AIセルフレビューを非同期で実行（APIあれば本物、なければdemoで実行済み）
  S.reviewRound = 1;
  if (hasApiKey()) {
    const srBox = $('selfReviewBox');
    if (srBox) { srBox.innerHTML = '<div class="sr-loading"><div class="spin" style="width:20px;height:20px;border-width:2px;margin:0 auto 8px"></div><div style="font-size:12px;color:var(--muted)">AIがスカウト文を採点中...</div></div>'; srBox.style.display = 'block'; }
    callSelfReviewAPI().catch(() => {});
  }
}

/**
 * Phase2-3: OHEREトレーサビリティ
 * 各スカウトセクションが「OHEREのどのフェーズから来ているか」をバッジで可視化
 */
function renderOhereTraceBadges() {
  const a = S.analysis;
  if (!a) return;
  const oh = a.ohere || {};
  const strat = oh.scoutStrategy || {};
  const temp = a.temperature || {};
  const cs = a.careerStory || {};

  // セクション → OHERE根拠マッピング
  const traces = {
    subject: {
      ohereKey: 'O',
      label: 'Observation',
      color: '#2563eb',
      tooltip: `O（観察）: ${oh.observation ? oh.observation.slice(0, 60) + '...' : '候補者の経歴事実'}`,
      strategy: ''
    },
    intro: {
      ohereKey: 'H→S①②',
      label: '仮説 + 共感・能力承認',
      color: '#7c3aed',
      tooltip: `H（仮説）: ${oh.hypothesis ? oh.hypothesis.slice(0, 50) + '...' : '候補者の人物像仮説'}`,
      strategy: strat.step1_empathy ? `①共感: ${strat.step1_empathy.slice(0, 50)}...` : ''
    },
    why: {
      ohereKey: 'E→S②',
      label: '根拠 + 能力承認',
      color: '#0891b2',
      tooltip: `E（根拠）: ${oh.evidence ? oh.evidence.slice(0, 50) + '...' : '仮説の根拠'}`,
      strategy: strat.step2_recognition ? `②承認: ${strat.step2_recognition.slice(0, 50)}...` : ''
    },
    match: {
      ohereKey: 'R→S③',
      label: 'Recommendation + 未来提示',
      color: '#059669',
      tooltip: `R（推奨）: ${oh.recommendation ? oh.recommendation.slice(0, 50) + '...' : 'アプローチ推奨'}`,
      strategy: strat.step3_future ? `③未来: ${strat.step3_future.slice(0, 50)}...` : ''
    },
    benefit: {
      ohereKey: 'S④',
      label: 'IBM訴求フェーズ',
      color: '#d97706',
      tooltip: `S④IBM訴求: ${strat.step4_ibm ? strat.step4_ibm.slice(0, 60) + '...' : 'IBM訴求戦略'}`,
      strategy: strat.step4_ibm ? `④IBM: ${strat.step4_ibm.slice(0, 50)}...` : ''
    },
    cta: {
      ohereKey: 'S⑤',
      label: '面談誘導フェーズ',
      color: '#be185d',
      tooltip: `S⑤面談誘導: ${strat.step5_meeting ? strat.step5_meeting.slice(0, 60) + '...' : '面談誘導戦略'}`,
      strategy: strat.step5_meeting ? `⑤誘導: ${strat.step5_meeting.slice(0, 50)}...` : ''
    }
  };

  Object.entries(traces).forEach(([secId, trace]) => {
    const msHead = document.querySelector(`#ms-${secId} .ms-head`);
    if (!msHead) return;
    // 既存バッジを削除してから再追加
    msHead.querySelectorAll('.ohere-trace-badge').forEach(b => b.remove());
    const badge = document.createElement('span');
    badge.className = 'ohere-trace-badge';
    badge.setAttribute('title', trace.tooltip + (trace.strategy ? '\n\n' + trace.strategy : ''));
    badge.style.cssText = `background:${trace.color}1a;color:${trace.color};border:1px solid ${trace.color}40;`;
    badge.innerHTML = `<span style="font-weight:900">${trace.ohereKey}</span> ${trace.label}`;
    msHead.appendChild(badge);
  });
}

// ══════════════════════════════════════════
// STEP5: セルフレビュー レンダリング + Phase2: 改善ループ
// ══════════════════════════════════════════
function renderSelfReview() {
  const sr = S.selfReview;
  const box = $('selfReviewBox');
  if (!sr || !box) return;

  const sc = sr.scores || {};
  // v1.2 刷新: 5軸（返信率廃止）
  const axes = [
    { key: 'humanness',            label: 'AIっぽさ除去',     icon: '✍️', desc: '人間らしい文章か' },
    { key: 'candidateSpecificity', label: '候補者固有性',     icon: '👤', desc: 'この人だけに送れるか' },
    { key: 'consistency',          label: '判断の一貫性',     icon: '🔗', desc: 'OHERE→訴求→文章の流れ' },
    { key: 'ibmness',              label: 'IBMらしさ',        icon: '🔷', desc: 'IBMでなければ書けないか' },
    { key: 'evidenceQuality',      label: '根拠の妥当性',     icon: '📋', desc: '訴求に根拠があるか' },
    // 後方互換: 旧キーもフォールバックで表示
    { key: 'templateFreedom',      label: 'テンプレ感（旧）', icon: '📝', desc: '旧スコア', legacy: true },
    { key: 'appealConsistency',    label: '訴求一貫性（旧）', icon: '🎯', desc: '旧スコア', legacy: true },
    { key: 'motivationAlignment',  label: '動機整合（旧）',   icon: '💡', desc: '旧スコア', legacy: true },
  ].filter(a => !a.legacy || sc[a.key]);  // 旧キーは値がある時だけ表示

  const avgScore = Math.round(axes.reduce((s, a) => s + (parseInt(sc[a.key]) || 0), 0) / axes.length);
  const reviewRound = S.reviewRound || 1;

  // v1.2: 禁止表現違反の警告バナー
  const violations = S.bannedViolations || [];
  const violationBanner = violations.length > 0
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#dc2626">
        ⚠️ 禁止表現が検出されました（自動再生成を実行済み）: ${violations.map(v => `「${esc(v.phrase)}」`).join(' ')}
       </div>`
    : '';

  // v1.5: 高度品質チェック警告バナー
  const aq = S.advancedQuality || {};
  const aqWarnings = [];
  if ((aq.templateIssues || []).length > 0) aqWarnings.push(`テンプレ表現: ${aq.templateIssues.join(' / ')}`);
  if ((aq.longSentences || []).length > 0)  aqWarnings.push(`長文 ${aq.longSentences.length}文あり（平均${aq.avgSentenceLen}字）`);
  if ((aq.repetitions  || []).length > 0)   aqWarnings.push(`繰り返し: 「${aq.repetitions.join('」「')}」`);
  const advancedBanner = aqWarnings.length > 0
    ? `<div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:8px 12px;margin-bottom:10px;font-size:12px;color:#92400e">
        ⚡ AIっぽさチェック（v1.5）: ${aqWarnings.join('　/　')}
       </div>`
    : '';

  // 改善指摘 — v1.2: targetSection対応
  const secLabel = { subject:'件名', intro:'冒頭文', why:'理由', match:'接点', benefit:'メリット', cta:'誘導文' };
  const SEC_FALLBACK = {
    'AIっぽさ除去': 'intro', '候補者固有性': 'intro', '判断の一貫性': 'match',
    'IBMらしさ': 'benefit', '根拠の妥当性': 'why',
    // 旧キー後方互換
    'テンプレート感': 'intro', '訴求の一貫性': 'match', '転職動機との整合性': 'why'
  };
  const impHtml = (sr.improvements || []).map((imp, idx) => {
    const secId = imp.targetSection || SEC_FALLBACK[imp.axis] || 'benefit';
    return `
      <div class="sr-imp-item" id="sr-imp-${idx}">
        <div class="sr-imp-head">
          <div style="flex:1">
            <div class="sr-imp-axis">${esc(imp.axis)}</div>
            <div class="sr-imp-issue">⚠️ ${esc(imp.issue)}</div>
            <div class="sr-imp-fix">💡 改善案: ${esc(imp.fix)}</div>
          </div>
          <button class="sr-fix-btn" onclick="applyImprovementToSection('${secId}', ${idx})">
            ✦ ${esc(secLabel[secId] || secId)}を改善
          </button>
        </div>
      </div>`;
  }).join('');

  box.style.display = 'block';
  box.innerHTML = `
    <div class="sr-header">
      <div class="sr-title">
        <span class="sr-icon">✦</span>
        AIセルフレビュー <span class="sr-ibm-badge">v1.5</span>
        ${reviewRound > 1 ? `<span class="sr-round-badge">第${reviewRound}回</span>` : ''}
      </div>
    </div>
    ${violationBanner}${advancedBanner}
    <div class="sr-overall">${esc(sr.overallComment || '')}</div>
    <div class="sr-axes">
      ${axes.map(a => {
        const v = parseInt(sc[a.key]) || 0;
        const barClass = v >= 75 ? 'sr-bar-good' : v >= 50 ? 'sr-bar-mid' : 'sr-bar-low';
        return `<div class="sr-axis-row">
          <div class="sr-axis-label" title="${a.desc || ''}">${a.icon} ${a.label}</div>
          <div class="sr-axis-bar-wrap"><div class="sr-axis-bar ${barClass}" style="width:${v}%"></div></div>
          <div class="sr-axis-score">${v}</div>
        </div>`;
      }).join('')}
    </div>
    <div class="sr-avg-row">
      <span class="sr-avg-label">総合スコア</span>
      <span class="sr-avg-score">${avgScore}<span style="font-size:13px;font-weight:400">/100</span></span>
      <button class="sr-rerun-btn" onclick="rerunSelfReview()">↻ 再採点</button>
    </div>
    ${impHtml
      ? `<div class="sr-imp-section"><div class="sr-imp-title">改善指摘 — ボタンで1クリック改善</div>${impHtml}</div>`
      : `<div class="sr-imp-section" style="padding:10px 0"><div style="font-size:12px;color:#4ade80;padding:8px">✓ 改善指摘なし — 高品質なスカウトです</div></div>`}`;
}

/** Phase2: 改善指摘から対象セクションをAIで再生成 */
async function applyImprovementToSection(secId, impIdx) {
  const imp = (S.selfReview?.improvements || [])[impIdx];
  if (!imp) return;
  const btn = document.querySelector(`#sr-imp-${impIdx} .sr-fix-btn`);
  if (btn) { btn.textContent = '生成中...'; btn.disabled = true; }
  try {
    await regenSectionWithFix(secId, imp.fix);
    if (btn) { btn.textContent = '✓ 適用完了'; btn.style.background = '#059669'; }
    setTimeout(() => {
      if (btn) { btn.textContent = `✦ 再改善`; btn.style.background = ''; btn.disabled = false; }
      if (hasApiKey()) rerunSelfReview();
    }, 1500);
  } catch (e) {
    if (btn) { btn.textContent = 'エラー'; btn.disabled = false; }
  }
}

/** Phase2: 改善指示付きセクション再生成 */
async function regenSectionWithFix(sec, fixInstruction) {
  const c = S.candidate, j = S.job, a = S.analysis;
  const current = $('ta-' + sec)?.value || S.mail[sec] || '';
  const ibmAppeals = (S.selectedAppealIds || []).map(id => {
    const ap = IBM_APPEALS.find(x => x.id === id);
    return ap ? `${ap.name}: ${ap.ibmStrength.slice(0, 60)}` : '';
  }).filter(Boolean).join('\n');

  // v1.5 BUG FIX: API_URL直参照→getApiUrl(), OpenAI固定パース→parseApiResponse()
  const sp = S.storyPlan || {};
  const spCtx = sp.writingTone ? `文体指示: ${sp.writingTone}\n避けること: ${sp.avoidInThisScout || ''}` : '';
  const msgs = [
    { role: 'system', content: 'あなたは日本のIBMトップリクルーターです。スカウトメールの特定セクションを改善します。AIっぽい定型表現は一切使わないこと。JSONのみ返してください。' },
    { role: 'user', content: `## 改善対象セクション: ${sec}\n## 現在の文章:\n${current}\n\n## 改善指示（必ず反映すること）:\n${fixInstruction}\n\n## IBM訴求のヒント（自然に組み込む）:\n${ibmAppeals}\n${spCtx ? '\n## Story Planner指示\n' + spCtx : ''}\n\n## 候補者情報: ${c.role}（${c.company}）、スキル: ${c.skills}、志向: ${c.reason || '不明'}\n## 求人情報: ${j.position}（${j.company || 'IBM'}）\n\n改善指示を完全に反映した新しい文章を生成してください。JSON: {"${sec}": "改善後テキスト"}` }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(msgs, 0.8))
  });
  if (!res.ok) throw new Error('API error');
  const parsed = parseApiResponse(await res.json());
  S.mail[sec] = parsed[sec];
  const ta = $('ta-' + sec);
  if (ta) { ta.value = parsed[sec]; autoResize(ta); updateCC('ta-' + sec, 'cc-' + sec); }
  if ($('pvBox')?.classList.contains('on')) $('pvBox').textContent = buildFull();
}

/** Phase2: 改善後に再採点 */
async function rerunSelfReview() {
  S.reviewRound = (S.reviewRound || 1) + 1;
  const box = $('selfReviewBox');
  if (box) {
    box.innerHTML = `<div class="sr-loading"><div class="spin" style="width:20px;height:20px;border-width:2px;margin:0 auto 8px"></div><div style="font-size:12px;color:#94a3b8">第${S.reviewRound}回採点中...</div></div>`;
  }
  if (hasApiKey()) {
    try { await callSelfReviewAPI(); } catch { /* silent */ }
  }
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
  const name  = $('signName')?.value.trim()  || '[担当者名]';
  const comp  = $('signComp')?.value.trim()  || '[会社名]';
  const email = $('signEmail')?.value.trim();
  const sign  = email ? `${name}\n${comp} 採用担当\n${email}` : `${name}\n${comp} 採用担当`;
  return `件名：${$('ta-subject')?.value || ''}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n${['intro', 'why', 'match', 'benefit', 'cta'].map(s => $('ta-' + s)?.value || '').join('\n\n')}\n\n${sign}`;
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
  S.candidate = {}; S.job = {}; S.analysis = null; S.storyPlan = null; S.mail = null;
  S.selfReview = null; S.selectedAppeals = []; S.selectedAppealIds = []; S.learningData = {};
  S.bannedViolations = []; S._successExampleCache = null;
  S.currentHistoryId = null;
  S.currentProjectId = null;
  S.reviewRound = 1;
  // プロジェクト選択バーのアクティブ状態をリセット
  document.querySelectorAll('.proj-sel-btn').forEach(b => b.classList.remove('active'));
  go(1);
}

// ══════════════════════════════════════════
// プロフィール貼り付け自動解析 (v完成)
// ══════════════════════════════════════════

/** 貼り付けパネルの開閉 */
function togglePastePanel() {
  const panel = $('pastePanel');
  const btn   = $('pasteProfileBtn');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.classList.toggle('active', !isOpen);
  if (!isOpen) {
    // 開いたら貼り付けエリアにフォーカス
    setTimeout(() => $('profilePasteArea')?.focus(), 100);
  }
}

/** 貼り付けエリアをクリア */
function clearPasteArea() {
  const ta = $('profilePasteArea');
  if (ta) ta.value = '';
  const st = $('pasteStatus');
  if (st) { st.textContent = ''; st.className = 'paste-status'; }
}

/**
 * プロフィールテキストを解析してフォームを埋める
 * APIあり → parseProfileAPI() / APIなし → parseProfileFallback()
 */
async function parseProfile() {
  const text = $('profilePasteArea')?.value.trim();
  if (!text || text.length < 20) {
    setPasteStatus('プロフィールテキストを貼り付けてください。', 'error'); return;
  }

  const btn = $('parseProfileBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin" style="width:14px;height:14px;border-width:2px;margin:0 2px -2px 0;display:inline-block"></span> 解析中...'; }
  setPasteStatus('AIが解析中...', 'loading');

  let parsed;
  try {
    if (hasApiKey()) {
      parsed = await parseProfileAPI(text);
    } else {
      // デモモード：正規表現フォールバック
      await new Promise(r => setTimeout(r, 600)); // UI上の体感
      parsed = parseProfileFallback(text);
    }
  } catch (e) {
    // API失敗時もフォールバック
    parsed = parseProfileFallback(text);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<span style="font-size:14px">✦</span> AIが解析してフォームを埋める'; }
  }

  if (!parsed) { setPasteStatus('解析に失敗しました。テキストを確認してください。', 'error'); return; }

  // フォームに値を反映
  const fields = [
    { id: 'c_co',   val: parsed.company    },
    { id: 'c_role', val: parsed.role       },
    { id: 'c_exp',  val: parsed.experience },
    { id: 'c_sk',   val: parsed.skills     },
    { id: 'c_pj',   val: parsed.projects   },
    { id: 'c_why',  val: parsed.reason     },
  ];

  let filled = 0;
  fields.forEach(({ id, val }) => {
    if (!val) return;
    const el = $(id);
    if (!el) return;
    el.value = val;
    // フィールドハイライトアニメーション
    el.classList.remove('field-filled');
    void el.offsetWidth; // reflow
    el.classList.add('field-filled');
    setTimeout(() => el.classList.remove('field-filled'), 2000);
    filled++;
    // textareaのリサイズ
    if (el.tagName === 'TEXTAREA') autoResize(el);
  });

  // ステータス表示
  const sourceLabel = { bizreach: 'BizReach', linkedin: 'LinkedIn', wantedly: 'Wantedly', resume: '職務経歴書', unknown: 'プロフィール' };
  const sourceName = sourceLabel[parsed.sourceHint] || 'プロフィール';
  const confLabel  = { high: '高精度', medium: '中精度（一部推測あり）', low: '低精度（手動確認推奨）' };
  const missingTxt = (parsed.missingFields || []).length > 0
    ? `　/ 不足: ${parsed.missingFields.join('・')}` : '';

  const msg = `✓ ${sourceName}から${filled}項目を読み取りました（${confLabel[parsed.confidence] || ''}）${missingTxt}`;
  setPasteStatus(msg, parsed.confidence === 'low' ? 'error' : 'ok');

  // パネルを閉じる（high・medium の場合のみ）
  if (parsed.confidence !== 'low') {
    setTimeout(() => {
      togglePastePanel();
    }, 1200);
  }
}

/** ステータス表示ヘルパー */
function setPasteStatus(msg, type) {
  const el = $('pasteStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = `paste-status ${type}`;
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

  // v3.0: 成功したバッチ結果をIDBに保存
  BATCH_RESULTS.filter(r => !r.error).forEach(r => {
    const entry = {
      id: Date.now().toString() + '_' + Math.random().toString(36).slice(2, 7),
      savedAt: new Date().toISOString(),
      projectId: S.currentProjectId || null,
      candidate: { company: r.cand.company, role: r.cand.role, experience: r.cand.experience || '', skills: r.cand.skills || '', reason: r.cand.reason || '' },
      job: { position: j.position, company: j.company },
      analysis: { candidateTypeCategory: r.candidateTypeCategory || '', score: r.score || 0 },
      mail: { subject: r.subject, intro: r.mailBody || '', why: '', match: '', benefit: '', cta: '' },
      mailAi: { subject: r.subject, intro: r.mailBody || '' },
      selectedAppeals: [],
      result: { replied: null, meetingScheduled: null, hired: null, feedbackNote: '' }
    };
    idbPut('history', entry);
  });
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
// 機能D: スカウト履歴パネル (v3.0: タブ・検索・ダッシュボード)
// ══════════════════════════════════════════

let _currentHistoryTab = 'history';
let _historyAllCache   = [];  // IndexedDB全件キャッシュ

/** 履歴パネルを開く（全件をIDBから非同期取得） */
async function openHistory() {
  go('History');
  // 全件をIDBから取得してキャッシュ
  _historyAllCache = await loadScoutHistoryAll();
  switchHistoryTab(_currentHistoryTab);
}

/** タブ切り替え */
function switchHistoryTab(tab) {
  _currentHistoryTab = tab;
  ['history','dashboard','learning'].forEach(t => {
    const btn = $('htab-' + t);
    const con = $('htc-'  + t);
    if (btn) btn.classList.toggle('active', t === tab);
    if (con) con.classList.toggle('on',     t === tab);
  });
  if (tab === 'history')   { renderHistory(); }
  if (tab === 'dashboard') { renderDashboard(); }
  if (tab === 'learning')  { renderLearningDashboard(); }
}

/** 結果ラベル共通 */
const resultLabel = r => {
  if (r.hired === true)            return '<span class="hr-badge hb-hired">採用</span>';
  if (r.meetingScheduled === true) return '<span class="hr-badge hb-meeting">面談</span>';
  if (r.replied === true)          return '<span class="hr-badge hb-replied">返信あり</span>';
  if (r.replied === false)         return '<span class="hr-badge hb-no">返信なし</span>';
  return '<span class="hr-badge hb-wait">未記録</span>';
};

/** 履歴一覧を描画（フィルタ適用済み） */
function renderHistory() {
  const grid = $('historyGrid');
  if (!grid) return;

  const history = _historyAllCache.length > 0 ? _historyAllCache : loadScoutHistory();

  if (history.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:14px">まだスカウト履歴がありません。<br>スカウト文を生成すると自動的に保存されます。</div>';
    const cnt = $('historyCount'); if (cnt) cnt.textContent = '';
    return;
  }

  const filtered = applyHistoryFilters(history);
  const cnt = $('historyCount');
  if (cnt) cnt.textContent = `全 ${history.length} 件中 ${filtered.length} 件を表示`;

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--muted);font-size:14px">条件に一致する履歴がありません。</div>';
    return;
  }

  grid.innerHTML = filtered.map(h => {
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

/** フィルタ適用 */
function applyHistoryFilters(history) {
  const q    = ($('historySearch')?.value || '').toLowerCase();
  const res  = $('historyFilterResult')?.value || '';
  const type = $('historyFilterType')?.value || '';

  return history.filter(h => {
    // テキスト検索
    if (q) {
      const searchTarget = [
        h.candidate.role, h.candidate.company,
        h.job.position, h.job.company,
        h.analysis.candidateTypeCategory, h.mail?.subject
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchTarget.includes(q)) return false;
    }
    // 結果フィルタ
    if (res) {
      const r = h.result;
      if (res === 'hired'    && r.hired !== true)            return false;
      if (res === 'meeting'  && r.meetingScheduled !== true) return false;
      if (res === 'replied'  && r.replied !== true)          return false;
      if (res === 'no_reply' && r.replied !== false)         return false;
      if (res === 'pending'  && r.replied !== null)          return false;
    }
    // タイプフィルタ
    if (type && h.analysis.candidateTypeCategory !== type) return false;
    return true;
  });
}

/** 検索/フィルタ変更時に再描画 */
function filterHistory() { renderHistory(); }

function loadHistoryEntry(id) {
  const history = _historyAllCache.length > 0 ? _historyAllCache : loadScoutHistory();
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
  _historyAllCache = _historyAllCache.filter(h => h.id !== id);
  renderHistory();
}

// ══════════════════════════════════════════
// v3.0: ダッシュボード — 成果集計
// ══════════════════════════════════════════

function renderDashboard() {
  const history = _historyAllCache.length > 0 ? _historyAllCache : loadScoutHistory();
  if (history.length === 0) {
    ['dashKpiRow','appealEffectGrid','typeEffectGrid'].forEach(id => {
      const el = $(id); if (el) el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:16px 0">まだスカウト履歴がありません。</div>';
    });
    return;
  }

  // ── KPI 集計 ──
  const total   = history.length;
  const replied = history.filter(h => h.result.replied === true).length;
  const meeting = history.filter(h => h.result.meetingScheduled === true).length;
  const hired   = history.filter(h => h.result.hired === true).length;
  const recorded = history.filter(h => h.result.replied !== null).length;
  const avgScore = Math.round(history.reduce((s, h) => s + (h.analysis.score || 0), 0) / total);
  const replyRate = recorded > 0 ? Math.round(replied / recorded * 100) : 0;
  const meetRate  = recorded > 0 ? Math.round(meeting / recorded * 100) : 0;
  const hireRate  = recorded > 0 ? Math.round(hired   / recorded * 100) : 0;

  const kpiRow = $('dashKpiRow');
  if (kpiRow) kpiRow.innerHTML = [
    { val: total,             label: '総スカウト数',     color: 'var(--text)'   },
    { val: `${avgScore}点`,   label: '平均マッチスコア', color: avgScore >= 75 ? 'var(--green)' : 'var(--amber)' },
    { val: `${replyRate}%`,   label: `返信率\n(${replied}/${recorded}件)`, color: 'var(--accent)' },
    { val: `${meetRate}%`,    label: `面談率\n(${meeting}/${recorded}件)`, color: '#7c3aed' },
    { val: `${hireRate}%`,    label: `採用率\n(${hired}/${recorded}件)`,   color: 'var(--green)' },
    { val: `${total - recorded}`, label: 'フィードバック未記録', color: 'var(--muted)' },
  ].map(k => `
    <div class="dash-kpi">
      <div class="dash-kpi-val" style="color:${k.color}">${k.val}</div>
      <div class="dash-kpi-label">${k.label.replace('\n','<br>')}</div>
    </div>`).join('');

  // ── スコアトレンド SVG ──
  renderScoreTrend(history);

  // ── 訴求ポイント × 返信率 ──
  renderAppealEffect(history);

  // ── 候補者タイプ別成果 ──
  renderTypeEffect(history);
}

/** スコアトレンド（直近20件 折れ線グラフ SVG） */
function renderScoreTrend(history) {
  const svg = $('scoreTrendSvg'); if (!svg) return;
  const recent = history.slice(0, 20).reverse();
  if (recent.length < 2) {
    svg.innerHTML = '<text x="300" y="60" text-anchor="middle" fill="#9ca3af" font-size="12">データが2件以上になるとトレンドが表示されます</text>';
    return;
  }
  const W = 600, H = 100, PAD = 20;
  const scores = recent.map(h => h.analysis.score || 0);
  const minS = Math.min(...scores) - 5;
  const maxS = Math.max(...scores) + 5;
  const xStep = (W - PAD * 2) / (recent.length - 1);
  const yScale = s => PAD + (H - PAD * 2) * (1 - (s - minS) / (maxS - minS || 1));

  const points = scores.map((s, i) => `${PAD + i * xStep},${yScale(s)}`).join(' ');
  const areaPoints = `${PAD},${H - PAD} ` + points + ` ${PAD + (recent.length - 1) * xStep},${H - PAD}`;

  svg.innerHTML = `
    <polygon points="${areaPoints}" fill="rgba(37,99,235,.1)" />
    <polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="2" stroke-linejoin="round" />
    ${scores.map((s, i) => `
      <circle cx="${PAD + i * xStep}" cy="${yScale(s)}" r="3.5" fill="#2563eb" />
      <text x="${PAD + i * xStep}" y="${yScale(s) - 7}" text-anchor="middle" font-size="9" fill="#57606a">${s}</text>
    `).join('')}
    <text x="${PAD}" y="${H + 2}" font-size="9" fill="#9ca3af">${recent[0] ? new Date(recent[0].savedAt).toLocaleDateString('ja-JP',{month:'short',day:'numeric'}) : ''}</text>
    <text x="${W - PAD}" y="${H + 2}" text-anchor="end" font-size="9" fill="#9ca3af">${recent[recent.length-1] ? new Date(recent[recent.length-1].savedAt).toLocaleDateString('ja-JP',{month:'short',day:'numeric'}) : ''}</text>
  `;
}

/** 訴求ポイント × 返信率 棒グラフ */
function renderAppealEffect(history) {
  const el = $('appealEffectGrid'); if (!el) return;
  const recorded = history.filter(h => h.result.replied !== null);
  if (recorded.length === 0) {
    el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">フィードバックを記録すると表示されます。</div>';
    return;
  }
  // 訴求IDごとに集計
  const appealMap = {};
  recorded.forEach(h => {
    (h.selectedAppeals || []).forEach(name => {
      if (!appealMap[name]) appealMap[name] = { total: 0, replied: 0 };
      appealMap[name].total++;
      if (h.result.replied === true) appealMap[name].replied++;
    });
  });
  const sorted = Object.entries(appealMap)
    .filter(([, v]) => v.total >= 1)
    .sort((a, b) => (b[1].replied / b[1].total) - (a[1].replied / a[1].total))
    .slice(0, 10);

  if (sorted.length === 0) { el.innerHTML = '<div style="color:var(--muted);font-size:13px">データ不足です。</div>'; return; }

  el.innerHTML = sorted.map(([name, v]) => {
    const pct = Math.round(v.replied / v.total * 100);
    const color = pct >= 50 ? 'var(--green)' : pct >= 30 ? 'var(--accent)' : 'var(--amber)';
    return `
      <div class="appeal-effect-item">
        <div class="aei-name">${esc(name)}</div>
        <div class="aei-bar-wrap"><div class="aei-bar" style="width:${pct}%;background:${color}"></div></div>
        <div class="aei-pct" style="color:${color}">${pct}%</div>
        <div class="aei-count">${v.replied}/${v.total}件</div>
      </div>`;
  }).join('');
}

/** 候補者タイプ別成果グリッド */
function renderTypeEffect(history) {
  const el = $('typeEffectGrid'); if (!el) return;
  const typeMap = {};
  history.forEach(h => {
    const t = h.analysis.candidateTypeCategory || '不明';
    if (!typeMap[t]) typeMap[t] = { total: 0, replied: 0, meeting: 0, hired: 0, scoreSum: 0 };
    typeMap[t].total++;
    typeMap[t].scoreSum += h.analysis.score || 0;
    if (h.result.replied === true)          typeMap[t].replied++;
    if (h.result.meetingScheduled === true) typeMap[t].meeting++;
    if (h.result.hired === true)            typeMap[t].hired++;
  });
  const sorted = Object.entries(typeMap).sort((a, b) => b[1].total - a[1].total);
  el.innerHTML = sorted.map(([type, v]) => {
    const avgScore = Math.round(v.scoreSum / v.total);
    const scoreColor = avgScore >= 75 ? 'var(--green)' : 'var(--accent)';
    return `
      <div class="type-effect-item">
        <div class="tei-name">${esc(type)}</div>
        <div class="tei-stats">
          <div class="tei-stat"><div class="tei-stat-val">${v.total}</div><div class="tei-stat-lbl">件数</div></div>
          <div class="tei-stat"><div class="tei-stat-val" style="color:${scoreColor}">${avgScore}点</div><div class="tei-stat-lbl">平均スコア</div></div>
          <div class="tei-stat"><div class="tei-stat-val" style="color:var(--accent)">${v.replied}</div><div class="tei-stat-lbl">返信</div></div>
          <div class="tei-stat"><div class="tei-stat-val" style="color:#7c3aed">${v.meeting}</div><div class="tei-stat-lbl">面談</div></div>
          <div class="tei-stat"><div class="tei-stat-val" style="color:var(--green)">${v.hired}</div><div class="tei-stat-lbl">採用</div></div>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════════════
// v4.0: 学習状況ダッシュボード
// ══════════════════════════════════════════

function renderLearningDashboard() {
  const logs = loadEditLogs();
  const history = _historyAllCache.length > 0 ? _historyAllCache : loadScoutHistory();

  // ── KPI ──
  const kpiRow = $('learnKpiRow');
  const mailLogs = logs.filter(l => l.type !== 'storyPlanEdit' && l.edited && l.aiVersion);
  const spLogs   = logs.filter(l => l.type === 'storyPlanEdit');
  const sections = ['subject','intro','why','match','benefit','cta'];
  const secCounts = {};
  mailLogs.forEach(l => { secCounts[l.section] = (secCounts[l.section] || 0) + 1; });
  const topSec = Object.entries(secCounts).sort((a,b) => b[1]-a[1])[0];

  if (kpiRow) kpiRow.innerHTML = [
    { val: logs.length,      label: '総修正ログ数',           color: 'var(--text)' },
    { val: mailLogs.length,  label: 'スカウト文修正',          color: 'var(--accent)' },
    { val: spLogs.length,    label: 'Story Planner修正',      color: '#7c3aed' },
    { val: topSec ? `${({subject:'件名',intro:'冒頭',why:'理由',match:'接点',benefit:'訴求',cta:'CTA'}[topSec[0]] || topSec[0])}\n(${topSec[1]}件)` : '—', label: '最多修正箇所', color: 'var(--amber)' },
    { val: new Set(mailLogs.map(l => l.meta?.candidateType).filter(Boolean)).size, label: '学習済みタイプ数', color: 'var(--green)' },
  ].map(k => `
    <div class="dash-kpi">
      <div class="dash-kpi-val" style="color:${k.color};font-size:${k.val.toString().length > 6 ? '18px' : '24px'}">${k.val.toString().replace('\n','<br>')}</div>
      <div class="dash-kpi-label">${k.label}</div>
    </div>`).join('');

  // ── 修正パターン TOP ──
  const patEl = $('learnPatternList');
  if (patEl) {
    if (mailLogs.length === 0) {
      patEl.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">まだ修正ログがありません。スカウト文を編集すると学習データが蓄積されます。</div>';
    } else {
      // セクション×タイプでグループ化して頻度順
      const grouped = {};
      mailLogs.forEach(l => {
        const key = `${l.section}__${l.meta?.candidateType || '不明'}`;
        if (!grouped[key]) grouped[key] = { section: l.section, type: l.meta?.candidateType || '不明', logs: [] };
        grouped[key].logs.push(l);
      });
      const sorted = Object.values(grouped).sort((a, b) => b.logs.length - a.logs.length).slice(0, 5);
      const secLabel = { subject: '件名', intro: '冒頭文', why: '理由', match: '接点', benefit: '訴求', cta: 'CTA' };
      patEl.innerHTML = sorted.map((g, i) => {
        const sample = g.logs[0];
        const rankCls = i === 0 ? '' : i === 1 ? ' r2' : ' r3';
        return `
          <div class="learn-pattern-item">
            <div class="lpi-head">
              <div class="lpi-rank${rankCls}">${i + 1}</div>
              <span class="lpi-section">${secLabel[g.section] || g.section}</span>
              <span style="font-size:11px;color:var(--muted)">${esc(g.type)}</span>
              <span class="lpi-count">${g.logs.length}件</span>
            </div>
            <div class="lpi-ai">AI案: <span>${esc((sample.aiVersion || '').slice(0, 60))}...</span></div>
            <div class="lpi-edited">修正後: <span>${esc((sample.edited || '').slice(0, 60))}...</span></div>
          </div>`;
      }).join('');
    }
  }

  // ── 最近の修正ログ ──
  const recentEl = $('learnRecentLogs');
  if (recentEl) {
    if (logs.length === 0) {
      recentEl.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px 0">まだログがありません。</div>';
    } else {
      const secLabel = { subject: '件名', intro: '冒頭', why: '理由', match: '接点', benefit: '訴求', cta: 'CTA' };
      recentEl.innerHTML = logs.slice(0, 10).map(l => {
        const d = new Date(l.savedAt);
        const dateStr = `${d.getMonth()+1}/${d.getDate()}`;
        const isSpEdit = l.type === 'storyPlanEdit';
        const secName = isSpEdit ? 'Story Plan' : (secLabel[l.section] || l.section || '—');
        const bodyText = isSpEdit
          ? `Story Planner修正: ${esc(l.storyPlan?.flowSummary || '')}${l.recruiterNote ? ' / メモ: ' + esc(l.recruiterNote.slice(0, 40)) : ''}`
          : `${esc((l.aiVersion || '').slice(0, 30))}... → ${esc((l.edited || '').slice(0, 30))}...`;
        return `
          <div class="learn-log-item">
            <span class="lli-sec">${secName}</span>
            <span class="lli-type">${esc(l.meta?.candidateType || '—').slice(0, 10)}</span>
            <span class="lli-body">${bodyText}</span>
            <span class="lli-date">${dateStr}</span>
          </div>`;
      }).join('');
    }
  }
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

// ══════════════════════════════════════════
// watsonx 設定パネル制御
// ══════════════════════════════════════════

/** 設定パネルの開閉トグル */
function toggleWxPanel() {
  const panel = $('wxPanel');
  const isOpen = panel.classList.contains('wx-panel-open');
  if (isOpen) {
    panel.classList.remove('wx-panel-open');
  } else {
    initWxPanel();
    panel.classList.add('wx-panel-open');
  }
}

/** パネルを開く時に現在の設定値を読み込む */
function initWxPanel() {
  const backend = localStorage.getItem('bscout_backend') || 'openai';
  setBackendUI(backend);
  const apiKey  = localStorage.getItem('bscout_apikey') || '';
  const token   = localStorage.getItem('bscout_wx_token') || '';
  const url     = localStorage.getItem('bscout_wx_url') || '';
  const project = localStorage.getItem('bscout_wx_project') || '';
  const model   = localStorage.getItem('bscout_wx_model') || 'ibm/granite-13b-instruct-v2';
  if ($('wxApiKey'))  $('wxApiKey').value  = apiKey  ? '••••••••' : '';
  if ($('wxToken'))   $('wxToken').value   = token   ? '••••••••' : '';
  if ($('wxUrl'))     $('wxUrl').value     = url;
  if ($('wxProject')) $('wxProject').value = project;
  if ($('wxModel'))   $('wxModel').value   = model;
}

/** バックエンド切り替えボタンUI更新 */
function setBackendUI(backend) {
  const btnOai = $('wxBtnOpenai'), btnWx = $('wxBtnWatsonx');
  const oaiFields = $('wxOpenaiFields'), wxFields = $('wxWatsonxFields');
  if (!btnOai) return;
  if (backend === 'watsonx') {
    btnOai.classList.remove('wx-toggle-active');
    btnWx.classList.add('wx-toggle-active');
    oaiFields.style.display = 'none';
    wxFields.style.display  = 'block';
  } else {
    btnOai.classList.add('wx-toggle-active');
    btnWx.classList.remove('wx-toggle-active');
    oaiFields.style.display = 'block';
    wxFields.style.display  = 'none';
  }
}

/** バックエンド選択 */
function setBackend(backend) {
  localStorage.setItem('bscout_backend', backend);
  setBackendUI(backend);
}

/** 入力値を即座にlocalStorageへ保存（パスワード表示中は保存しない） */
function saveWxField(key, value) {
  if (value === '••••••••') return;
  if (value) {
    localStorage.setItem(key, value);
  }
}

/** 設定をクリア（確認あり） */
function clearWxSettings() {
  if (!confirm('バックエンド設定（APIキー・トークン含む）をすべてクリアしますか？')) return;
  ['bscout_apikey','bscout_wx_token','bscout_wx_url','bscout_wx_project','bscout_wx_model','bscout_backend'].forEach(k => localStorage.removeItem(k));
  initWxPanel();
  alert('設定をクリアしました。ページを再読み込みすると接続状態が更新されます。');
}

/** 設定適用してパネルを閉じる */
function applyWxSettings() {
  // 各フィールドの値を保存（マスク文字以外）
  const fields = [
    { id: 'wxApiKey',  key: 'bscout_apikey'    },
    { id: 'wxToken',   key: 'bscout_wx_token'  },
    { id: 'wxUrl',     key: 'bscout_wx_url'    },
    { id: 'wxProject', key: 'bscout_wx_project'},
    { id: 'wxModel',   key: 'bscout_wx_model'  },
  ];
  fields.forEach(({ id, key }) => {
    const el = $(id);
    if (el && el.value && el.value !== '••••••••') {
      localStorage.setItem(key, el.value.trim());
    }
  });
  $('wxPanel').classList.remove('wx-panel-open');
  // 接続状態を再表示するためリロード
  location.reload();
}

// ══════════════════════════════════════════
// v2.0: 接続テスト
// ══════════════════════════════════════════
/** watsonx / OpenAI への接続テストを実行し結果をUIに表示 */
async function runConnectionTest() {
  const btn    = $('wxTestBtn');
  const result = $('wxTestResult');
  if (!btn || !result) return;

  // 設定を先に保存
  applyWxSettingsOnly();

  btn.textContent  = '接続中...';
  btn.disabled     = true;
  result.textContent = '—';
  result.style.color = 'var(--muted)';

  try {
    const r = await testWatsonxConnection();
    if (r.ok) {
      result.textContent = '✓ 接続成功';
      result.style.color = 'var(--green)';
    } else {
      result.textContent = `✗ ${r.error || '接続失敗'}`;
      result.style.color = 'var(--red)';
    }
  } catch (e) {
    result.textContent = `✗ ${e.message}`;
    result.style.color = 'var(--red)';
  } finally {
    btn.textContent = '▶ テスト実行';
    btn.disabled    = false;
  }
}

/** パネルを閉じずに設定値だけ保存（接続テスト前呼び出し用） */
function applyWxSettingsOnly() {
  const fields = [
    { id: 'wxApiKey',  key: 'bscout_apikey'    },
    { id: 'wxToken',   key: 'bscout_wx_token'  },
    { id: 'wxUrl',     key: 'bscout_wx_url'    },
    { id: 'wxProject', key: 'bscout_wx_project'},
    { id: 'wxModel',   key: 'bscout_wx_model'  },
  ];
  fields.forEach(({ id, key }) => {
    const el = $(id);
    if (el && el.value && el.value !== '••••••••') {
      localStorage.setItem(key, el.value.trim());
    }
  });
}

// ══════════════════════════════════════════
// v2.0: 設定インポート
// ══════════════════════════════════════════
/** バックアップ JSON ファイルから設定・履歴を復元する */
async function handleSettingsImport(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const statusEl = $('importStatus');
  if (statusEl) { statusEl.style.display = 'block'; statusEl.textContent = 'インポート中...'; statusEl.style.color = 'var(--muted)'; }

  try {
    const { imported, skipped } = await importSettings(file);
    const msg = `✓ ${imported.length}件の設定を復元しました。ページを再読み込みして反映します。`;
    if (statusEl) { statusEl.textContent = msg; statusEl.style.color = 'var(--green)'; }
    // 3秒後に自動リロード
    setTimeout(() => location.reload(), 3000);
  } catch (e) {
    if (statusEl) { statusEl.textContent = `✗ ${e.message}`; statusEl.style.color = 'var(--red)'; }
  }
  // ファイル入力をリセット（同一ファイルを再インポートできるように）
  event.target.value = '';
}

// パネル外クリックで閉じる
document.addEventListener('click', (e) => {
  const panel = $('wxPanel');
  const btn   = $('wxSettingsBtn');
  if (!panel || !btn) return;
  if (panel.classList.contains('wx-panel-open') && !panel.contains(e.target) && e.target !== btn) {
    panel.classList.remove('wx-panel-open');
  }
});
