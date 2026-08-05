/**
 * ai.js — OpenAI API / IBM watsonx.ai 通信・プロンプト管理
 *
 * Phase3a: プロンプト強化・watsonx切り替えロジック・修正ログfew-shot注入
 *
 * バックエンド切り替え方法:
 *   1. BSCOUT_BACKEND = 'openai' | 'watsonx' を localStorage に設定
 *   2. watsonx選択時: BSCOUT_WX_URL / BSCOUT_WX_TOKEN も設定が必要
 *   3. IS_NETLIFY=true 時はサーバー側プロキシが自動判定
 */

// ══════════════════════════════════════════
// Phase3b: バックエンド切り替えロジック
// ══════════════════════════════════════════

/** 現在のバックエンド: 'openai' | 'watsonx' */
function currentBackend() {
  return localStorage.getItem('bscout_backend') || 'openai';
}

/** watsonxエンドポイント（設定されていれば使用） */
function watsonxUrl() {
  return localStorage.getItem('bscout_wx_url') ||
    'https://us-south.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-29';
}

// ── エンドポイント自動判定 ──
const IS_NETLIFY = location.hostname !== 'localhost'
  && location.protocol === 'https:'
  && !location.hostname.includes('127.0.0.1');

function getApiUrl() {
  if (IS_NETLIFY) return '/api/proxy';
  if (currentBackend() === 'watsonx') return watsonxUrl();
  return 'https://api.openai.com/v1/chat/completions';
}
// 後方互換
const API_URL = 'https://api.openai.com/v1/chat/completions';

// ── APIキー管理ユーティリティ ──
function hasApiKey()  { return IS_NETLIFY || !!localStorage.getItem('bscout_apikey') || !!localStorage.getItem('bscout_wx_token'); }

function apiHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (!IS_NETLIFY) {
    if (currentBackend() === 'watsonx') {
      const tok = localStorage.getItem('bscout_wx_token');
      if (tok) h['Authorization'] = 'Bearer ' + tok;
    } else {
      const k = localStorage.getItem('bscout_apikey');
      if (k) h['Authorization'] = 'Bearer ' + k;
    }
  }
  return h;
}

/**
 * Phase3b: watsonx用リクエストボディへの変換
 * OpenAI形式のmessages → watsonx Granite/Llama形式に変換
 */
function buildRequestBody(messages, temperature, model) {
  if (currentBackend() === 'watsonx' && !IS_NETLIFY) {
    // watsonx text generation API形式
    const systemMsg = messages.find(m => m.role === 'system')?.content || '';
    const userMsg   = messages.find(m => m.role === 'user')?.content || '';
    const wxModel   = localStorage.getItem('bscout_wx_model') || 'ibm/granite-13b-instruct-v2';
    return {
      model_id: wxModel,
      project_id: localStorage.getItem('bscout_wx_project') || '',
      input: `${systemMsg}\n\n${userMsg}`,
      parameters: {
        decoding_method: 'greedy',
        max_new_tokens: 2000,
        temperature: temperature || 0.7,
        stop_sequences: []
      }
    };
  }
  // OpenAI形式（デフォルト）
  return {
    model: model || md(),
    messages,
    temperature: temperature || 0.7,
    response_format: { type: 'json_object' }
  };
}

/**
 * Phase3b: watsonxレスポンスをOpenAI形式に正規化
 */
function parseApiResponse(data) {
  if (currentBackend() === 'watsonx' && !IS_NETLIFY) {
    // watsonx形式: { results: [{ generated_text: "..." }] }
    const text = data?.results?.[0]?.generated_text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text);
  }
  // OpenAI形式
  return JSON.parse(data.choices[0].message.content);
}

function ensureLocalKey() {
  if (IS_NETLIFY) return true;
  if (currentBackend() === 'watsonx') {
    let tok = localStorage.getItem('bscout_wx_token');
    if (!tok) {
      tok = window.prompt('IBM watsonx IAMトークンを入力してください:') || '';
      if (!tok) return false;
      localStorage.setItem('bscout_wx_token', tok);
    }
    return true;
  }
  let k = localStorage.getItem('bscout_apikey');
  if (!k) {
    k = window.prompt('OpenAI APIキーを入力してください（ローカル実行時のみ）:') || '';
    if (!k) return false;
    localStorage.setItem('bscout_apikey', k);
  }
  return true;
}

// ── 接続モード表示 ──
(async function checkMode() {
  const dot = $('modeDot'), lbl = $('modeLabel');
  const backend = currentBackend();
  if (IS_NETLIFY) {
    try {
      const r = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
      });
      if (r.ok || r.status === 400) {
        dot.className = 'mode-dot ai';
        lbl.innerHTML = '<strong>AI接続済み</strong> — チーム共有モード';
      } else { throw new Error(); }
    } catch {
      dot.className = 'mode-dot demo';
      lbl.innerHTML = '<strong>デモモード</strong> — 環境変数未設定';
    }
  } else if (backend === 'watsonx') {
    const hasTok = !!localStorage.getItem('bscout_wx_token');
    dot.className = hasTok ? 'mode-dot ai' : 'mode-dot demo';
    lbl.innerHTML = hasTok
      ? '<strong>watsonx接続済み</strong> — IBM Cloud'
      : '<strong>watsonx未設定</strong> — トークン入力要';
  } else {
    const hasKey = !!localStorage.getItem('bscout_apikey');
    dot.className = hasKey ? 'mode-dot ai' : 'mode-dot demo';
    lbl.innerHTML = hasKey ? '<strong>OpenAI接続済み</strong> — ローカル' : '<strong>デモモード</strong> — APIキー未設定';
  }
})();

// ══════════════════════════════════════════
// Phase3a: IBM実績ナレッジベース（プロンプト注入用）
// ══════════════════════════════════════════
/**
 * IBMの具体的強み・数値・事例をプロンプトに埋め込むことで
 * AIが「IBMらしい」具体的な文章を生成できるようになる
 */
const IBM_KNOWLEDGE = {
  scale:    '170カ国・28万人・Fortune500の90%以上がIBMの顧客。日本IBMは約7000名。',
  ai:       'watsonx.aiはGranite・Llama3等OSSモデルを企業データで動かすエンタープライズAI基盤。2023年より本格展開。金融・医療・製造分野で国内外の大手企業に導入実績。',
  cloud:    'IBM CloudはRed Hat OpenShiftベースのハイブリッドクラウド。AWSやAzureと並ぶエンタープライズクラウドの一角。Kubernetes普及の立役者であるRed Hatを2019年340億ドルで買収。',
  oss:      'Red Hat / OpenShift / Kubernetes / Terraform / Ansible / Qiskit など業界標準OSSの中核を担う。IBMに転職=OSSエコシステムの中心に立つことを意味する。',
  global:   'プロジェクトは日本発でも海外チームと協業が常態。英語メール・Slack・週次英語会議は入社初日から。TOEIC600点台でも入社後に伸びるケースが多い。',
  training: 'IBM Skills Build・SkillsBadge認定は400種以上。年間トレーニング予算は1人あたり数十万円規模。社内公募制度で2〜3年ごとに別チームへの異動も一般的。',
  social:   '2021年よりESGコミットメント強化。気候変動・医療アクセス・デジタルデバイド解消のプロジェクトに技術者として関与できる。IBMのProject Debaterは教育領域でも活用中。',
  stability:'1911年創業・112年の実績。リーマンショック・コロナ禍も黒字継続。外資系の中では最も雇用安定性が高い部類。平均勤続年数は日系大手に匹敵。',
  salary:   '東京基準でエンジニア中途採用の年収レンジは700万〜1500万円。グレード制で透明性が高く、評価による昇給が明確。確定拠出年金・RSU（株式報酬）も充実。',
  workstyle:'フレックスタイム・週3〜4日リモート標準。コアタイムなし（チーム合意ベース）。育休取得率は男性30%以上。副業原則OKの部門が増加中。',
};

/**
 * 候補者タイプ・選択訴求から最も有効なIBM知識を3〜4件選んで返す
 */
function selectIbmKnowledge(typeCategory, appealIds) {
  const MAP = {
    '技術スペシャリスト型': ['ai','oss','cloud','global'],
    'PM・マネジメント型':   ['scale','ai','global','social'],
    'キャリアアップ型':      ['training','scale','stability','salary'],
    '市場価値向上型':        ['ai','oss','global','training'],
    '安定志向型':            ['stability','salary','workstyle','training'],
  };
  const appealMap = {
    'ai_transformation': ['ai','cloud'],
    'watsonx':           ['ai','oss'],
    'global':            ['global','scale'],
    'scale':             ['scale','stability'],
    'social':            ['social'],
    'training':          ['training'],
    'workstyle':         ['workstyle'],
    'benefits':          ['salary','stability'],
    'brand':             ['stability','scale'],
    'autonomy':          ['oss','ai'],
    'tech_env':          ['oss','cloud'],
  };
  const keys = new Set([
    ...(MAP[typeCategory] || ['ai','scale','global']),
    ...(appealIds || []).flatMap(id => appealMap[id] || [])
  ]);
  return [...keys].slice(0, 4).map(k => IBM_KNOWLEDGE[k]).filter(Boolean).join('\n');
}

// ══════════════════════════════════════════
// STEP2: 候補者分析 API（Phase3a: IBM知識注入）
// ══════════════════════════════════════════
async function callAnalysisAPI() {
  const c = S.candidate, j = S.job;
  if (!IS_NETLIFY && !ensureLocalKey()) { demoAnalysis(); throw new Error('demo'); }

  // Phase3a: 分析プロンプトにIBM知識を注入（まだタイプ未確定なので全軸の代表を投入）
  const ibmKnowledgeForAnalysis = [IBM_KNOWLEDGE.ai, IBM_KNOWLEDGE.scale, IBM_KNOWLEDGE.global, IBM_KNOWLEDGE.training].join('\n');

  const prompt = `あなたは日本のIBMトップリクルーターです。以下の候補者情報と求人情報を分析し、正確なJSONのみを返してください。

## IBM基礎情報（分析・訴求選択の参考に）
${ibmKnowledgeForAnalysis}


## 候補者情報
- 現在の会社: ${c.company}
- 現在の職種: ${c.role}
- 経験概要: ${c.experience}
- スキル: ${c.skills}
- 過去プロジェクト: ${c.projects || '未記入'}
- 転職理由・志向: ${c.reason || '未記入'}

## 求人情報
- ポジション: ${j.position}
- 会社名: ${j.company || '未記入'}
- 仕事内容: ${j.description}
- 求める経験: ${j.requirements}
- 会社の魅力: ${j.appeal}

## 返すJSONの構造（厳守）
{
  "candidateTypeCategory": "以下の5分類のいずれか1つだけ: 技術スペシャリスト型 / PM・マネジメント型 / キャリアアップ型 / 市場価値向上型 / 安定志向型",
  "candidateTypeReason": "その分類に判断した根拠を2〜3文で具体的に",

  "ohere": {
    "observation": "経歴から読み取れる客観的事実を箇条書き5〜7点（・で始める。推測や感想を入れない）",
    "hypothesis": "この候補者はどんな人物か？AIが立てる仮説を2〜3文で（例: 〜という人ではないか）",
    "evidence": "仮説の根拠を経歴・スキル・転職理由と必ず紐づけて3〜4点（・で始める）",
    "recommendation": "トップリクルーターならどのようにアプローチするか（具体的なトーク・切り口・タイミングを含む2〜3文）",
    "scoutStrategy": {
      "step1_empathy": "①共感フェーズ: 候補者の現状・課題への共感メッセージ（1〜2文）",
      "step2_recognition": "②能力承認フェーズ: 候補者の具体的な強み・実績への言及（1〜2文）",
      "step3_future": "③未来提示フェーズ: このポジションで実現できる未来の描写（1〜2文）",
      "step4_ibm": "④IBM訴求フェーズ: IBMならではの強みと候補者への適合性（1〜2文）",
      "step5_meeting": "⑤面談誘導フェーズ: プレッシャーを与えない面談への誘い方（1〜2文）"
    }
  },

  "careerStory": {
    "past": "過去: 候補者がどんな経験を積んできたか（1〜2文。数値・具体的成果を含む）",
    "present": "現在: 現職でどんな価値を発揮しているか（1〜2文）",
    "future": "未来: このポジションでどんな活躍が期待できるか（1〜2文。希望的観測ではなく根拠ある予測）",
    "narrative": "3つを繋いだ一本のストーリー（3〜4文。スカウト文の冒頭に使える文体で）"
  },

  "temperature": {
    "stars": 1から5の整数,
    "label": "今すぐ転職 / 半年以内 / 情報収集 / 受け身 / 転職意思ほぼなし のいずれか",
    "reason": "その温度感と判断した根拠を2〜3文（転職理由・経歴・在職期間などから推測）",
    "approach": "この温度感の候補者への最適なアプローチ方法（1〜2文）"
  },

  "motivationHypothesis": "次のキャリアで実現したいことを3点、改行区切りで（各点を・で始める）",
  "whyContact": "なぜ今この候補者にアプローチする価値があるか（150字程度）",
  "matchPoints": "候補者の経験とポジションの具体的な接点を3〜5点、改行区切りで（各点を・で始める）",
  "avoidPoints": "この候補者には刺さらない可能性が高い訴求を2〜3点と理由（各点を・で始める）",
  "appealPriority": [
    { "rank": 1, "appealId": "IDを指定", "appealName": "訴求名", "reason": "なぜ1位なのか。候補者の具体的な経歴・志向と紐づけて説明（2〜3文）" },
    { "rank": 2, "appealId": "IDを指定", "appealName": "訴求名", "reason": "なぜ2位なのか（2〜3文）" },
    { "rank": 3, "appealId": "IDを指定", "appealName": "訴求名", "reason": "なぜ3位なのか（2〜3文）" }
  ],
  "otherRecommendedAppeals": ["1〜3位以外で有効な訴求IDを1〜2つ"],
  "recruiterGuidance": [
    { "judgment": "AIが判断したこと", "judgmentReason": "その根拠", "approach": "採用担当者が取るべきアプローチ" },
    { "judgment": "2つ目", "judgmentReason": "2つ目の根拠", "approach": "2つ目のアプローチ" },
    { "judgment": "3つ目", "judgmentReason": "3つ目の根拠", "approach": "3つ目のアプローチ" }
  ],
  "recommendedAppeals": ["appealPriorityの1〜3位のIDとotherRecommendedAppealsを合わせた配列"],
  "score": 0〜100の整数,
  "scoreReason": "スコアの根拠を1文で",
  "reason": "この候補者にスカウトを送るべき総合的な根拠（200字程度）",
  "strategyNote": "今回のアプローチで採用担当者が意識すべき戦略的ポイント（1〜2文）"
}

appealPriority/recommendedAppealsに使えるIDは（IBM専用11軸）:
ai_transformation（AI変革）, watsonx（watsonx）, global（グローバル環境）, scale（大規模案件）,
social（社会貢献）, training（育成制度）, workstyle（働き方）, benefits（福利厚生）,
brand（IBMブランド）, autonomy（裁量）, tech_env（技術環境）

上記IBM専用IDのみ使用。旧ID（tech/career/startup等）は使わないこと。`;

  const messages = [
    { role: 'system', content: 'あなたはIBM日本の採用担当トップリクルーターです。候補者分析の専門家として、IBM専用の11軸訴求マスタを使ってJSONのみ返してください。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(messages, 0.7))
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${res.status}`); }
  S.analysis = parseApiResponse(await res.json());
  hideLoad(); renderAnalysis(); go(2);
}

// ══════════════════════════════════════════
// STEP5: スカウト文生成 API
// ══════════════════════════════════════════
async function callMailAPI() {
  const c = S.candidate, j = S.job, a = S.analysis, sel = S.selectedAppeals;
  const typeCategory = a.candidateTypeCategory || a.candidateType || '';
  const pri = a.appealPriority || [];
  const priText = pri.map(p => `${p.rank}位:${p.appealName}（${p.reason || ''}）`).join('\n');
  const story = a.careerStory || {};
  const ohere = a.ohere || {};
  const strat = ohere.scoutStrategy || {};
  const temp = a.temperature || {};

  const successExamples = j.successExamples || '';

  // Phase3a: IBM知識注入（候補者タイプ + 訴求IDに基づいて最適な知識を選択）
  const ibmKnowledge = selectIbmKnowledge(typeCategory, S.selectedAppealIds || []);

  // Phase3a: 修正ログfew-shot注入（同タイプの過去修正パターンを参考例として渡す）
  const fewShotExamples = buildFewShotFromEditLogs(typeCategory, sel);

  // IBM訴求ibmStrengthヒント（Phase2から継続）
  const ibmStrengthHints = sel.map(name => {
    if (typeof IBM_APPEALS !== 'undefined') {
      const ap = IBM_APPEALS.find(x => x.name === name);
      return ap ? `【${ap.name}】${ap.ibmStrength}` : name;
    }
    return name;
  }).join('\n');

  const prompt = `あなたは日本のIBMトップリクルーターです。以下の情報をもとに、AIっぽさのないスカウトメールを生成してください。JSONのみ返してください。

## 候補者情報
- 候補者プロフィール: ${c.role}（${c.company}）
- スキル: ${c.skills}
- 転職志向: ${c.reason || '不明'}
- 候補者タイプ: ${typeCategory}
- 転職温度感: ${temp.label || '不明'}（★${temp.stars || '?'}）

## 求人情報
- ポジション: ${j.position}（${j.company || 'IBM'}）
- 内容: ${j.description}
- 歓迎要件: ${j.preferred || '未記入'}
- 魅力: ${j.appeal}
${successExamples ? `\n## 過去の成功スカウト例（同水準の切り口を使うこと）\n${successExamples}` : ''}

## AI分析結果（スカウト文に必ず反映すること）
- キャリアストーリー: ${story.narrative || a.motivationHypothesis || ''}
- 訴求優先順位:
${priText}
- 選択した訴求ポイント: ${sel.join('、')}
- IBM訴求の具体的内容（benefitで1〜2つ自然に言及）:
${ibmStrengthHints}
- 避けるべき訴求: ${a.avoidPoints || ''}
- スカウト戦略:
  ①共感: ${strat.step1_empathy || ''}
  ②能力承認: ${strat.step2_recognition || ''}
  ③未来提示: ${strat.step3_future || ''}
  ④IBM訴求: ${strat.step4_ibm || ''}
  ⑤面談誘導: ${strat.step5_meeting || ''}

## IBM実績ナレッジ（文章に自然に組み込むこと — コピペ禁止・自分の言葉で）
${ibmKnowledge}
${fewShotExamples ? `\n## 過去のリクルーター修正パターン（参考例 — 同じ方向性で書くこと）\n${fewShotExamples}` : ''}

## 絶対に守るルール（違反禁止）
1. 「突然のご連絡失礼します」「プロフィールを拝見しました」「貴殿」など定型表現を使わない
2. 冒頭文は必ず候補者の「具体的な経歴・実績・スキル」への言及から始める
3. 件名は候補者固有の内容（職種・実績・スキル）を必ず入れる
4. テンプレ的な文章にしない。この候補者だけに送るメールとして書く
5. 読んだ相手が「自分のことをちゃんと見てくれている」と感じる文体にする
6. ストーリー構造（共感→能力承認→未来→IBM→面談）を自然な流れで組み込む
7. IBMの強みを「概念」ではなく「具体的数値・事例」で語る（IBM知識を活用すること）

## 返すJSONの構造
{
  "subject": "件名（40字以内・候補者固有の実績や強みに言及）",
  "intro": "冒頭文（3〜4文・候補者固有の経験・実績から始まる・共感＋能力承認フェーズ）",
  "why": "なぜ声をかけたか（2〜3文・具体的な経歴への言及・候補者固有）",
  "match": "ポジションとの接点（2〜3文・スキルマッチを具体的に・未来提示を含む）",
  "benefit": "候補者へのメリット（2〜3文・IBM訴求をIBM実績ナレッジを使って具体的に語る）",
  "cta": "カジュアル面談への誘導（2文・プレッシャーなし・選考なしのカジュアルな誘い）"
}`;

  const mailMessages = [
    { role: 'system', content: 'あなたは日本のIBMトップリクルーターです。AIっぽさを排除した人間らしいスカウトメールを書きます。IBMの具体的事実・数値を使って語ることが得意です。JSONのみ返してください。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(mailMessages, 0.8))
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  S.mail = parseApiResponse(await res.json());
  if (S.learningData.scoutAction) { S.learningData.scoutAction.selectedAppeals = S.selectedAppeals; S.learningData.scoutAction.generatedSubject = S.mail.subject || ''; }
  hideLoad(); renderMail(); renderProcessLog(); go(5);
}

// ══════════════════════════════════════════
// STEP5: セルフレビュー API（IBM専用版）
// ══════════════════════════════════════════
async function callSelfReviewAPI() {
  const c = S.candidate, j = S.job, a = S.analysis, m = S.mail;
  const fullMail = `件名: ${m.subject || ''}\n\n${m.intro || ''}\n\n${m.why || ''}\n\n${m.match || ''}\n\n${m.benefit || ''}\n\n${m.cta || ''}`;
  const typeCategory = a.candidateTypeCategory || '';
  const temp = a.temperature || {};

  const prompt = `あなたはスカウトメールの採点専門AIです。以下のスカウトメールを6軸で採点し、JSONのみ返してください。

## 採点するスカウトメール
${fullMail}

## 候補者・分析情報
- 候補者タイプ: ${typeCategory}
- 転職温度感: ${temp.label || '不明'}（★${temp.stars || '?'}）
- 転職理由: ${c.reason || '不明'}
- 避けるべき訴求: ${a.avoidPoints || ''}
- 選択した訴求: ${(S.selectedAppeals || []).join('、')}

## 採点基準（IBMスカウト専用版）

採点は以下の6軸。各軸0〜100点で採点し、厳格に評価してください。

1. **テンプレート感スコア（0=完全テンプレ、100=完全固有）**
   「突然のご連絡」「プロフィールを拝見」「ご活躍」などの定型表現がないか。候補者固有の内容から始まっているか。

2. **候補者固有性スコア（0=誰にでも送れる、100=この人だけに送れる）**
   候補者の具体的な経歴・スキル・実績・転職理由への言及があるか。

3. **IBMらしさスコア（0=IBM感ゼロ、100=IBMらしさ満載）**
   IBMの強み（グローバル・テクノロジー・社会貢献・AI・規模・育成・安定）が自然に組み込まれているか。IBMである必然性が伝わるか。

4. **訴求の一貫性スコア（0=バラバラ、100=完全一貫）**
   選択した訴求ポイントがスカウト文全体を通じて一貫しているか。矛盾や不自然なズレがないか。

5. **転職動機との整合性スコア（0=全く合っていない、100=完璧に合っている）**
   候補者の転職理由・志向に対してメールの内容が整合しているか。避けるべき訴求を使っていないか。

6. **返信率予測（0〜100%）**
   上記5軸の総合評価から、このスカウトに対して候補者が返信する確率を予測。

## 返すJSONの構造
{
  "scores": {
    "templateFreedom": 0〜100の整数,
    "candidateSpecificity": 0〜100の整数,
    "ibmness": 0〜100の整数,
    "appealConsistency": 0〜100の整数,
    "motivationAlignment": 0〜100の整数
  },
  "replyRate": 0〜100の整数,
  "overallComment": "総合評価コメント（2〜3文。良い点と改善点をバランスよく）",
  "improvements": [
    { "axis": "テンプレート感", "issue": "具体的な問題点（1文）", "fix": "具体的な改善案（1〜2文）" },
    { "axis": "候補者固有性", "issue": "具体的な問題点（1文）", "fix": "具体的な改善案（1〜2文）" }
  ]
}

improvementsは最も改善すべき2〜3点のみ。問題がない軸は含めない。`;

  const srMessages = [
    { role: 'system', content: 'あなたはIBMスカウトメール採点の専門家です。厳格に採点します。JSONのみ返してください。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(srMessages, 0.5))
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  S.selfReview = parseApiResponse(await res.json());
  renderSelfReview();
}

// ── セクション個別再生成 ──
async function regenSection(sec) {
  const c = S.candidate, j = S.job, a = S.analysis;
  const typeCategory = a.candidateTypeCategory || a.candidateType || '';
  const desc = {
    subject: '件名（40字以内・候補者固有の経験に言及）',
    intro:   '冒頭文（3〜4文・候補者固有の経験・成果への言及から始める）',
    why:     'なぜこの候補者に声をかけたか（2〜3文・具体的な経歴への言及）',
    match:   'ポジションとの接点（2〜3文・具体的なスキルマッチ）',
    benefit: '候補者にとってのメリット（2〜3文・訴求ポイント:' + S.selectedAppeals.join('・') + 'を反映）',
    cta:     'カジュアル面談への誘導（2文・プレッシャーなし）'
  };
  const res = await fetch(API_URL, {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify({
      model: md(),
      messages: [
        { role: 'system', content: '優秀な採用担当者としてJSONのみ返してください。' },
        { role: 'user', content: `候補者:${c.role}(${c.company})、スキル:${c.skills}、志向:${c.reason || '不明'}\n求人:${j.position}(${j.company || ''})、魅力:${j.appeal}\nタイプ:${typeCategory}、訴求優先順位:${(a.appealPriority || []).map(p => p.rank + '位:' + p.appealName).join('・')}、選択訴求:${S.selectedAppeals.join('・')}\n「${desc[sec]}」を1つ生成。JSON:{"${sec}":"テキスト"}` }
      ],
      temperature: 0.9, response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error('API error');
  const parsed = JSON.parse((await res.json()).choices[0].message.content);
  S.mail[sec] = parsed[sec];
  const ta = $('ta-' + sec); ta.value = parsed[sec]; autoResize(ta); updateCC('ta-' + sec, 'cc-' + sec);
}

// ══════════════════════════════════════════
// バッチ処理: 1候補者を1APIコールで処理
// ══════════════════════════════════════════
async function runBatchSingle(c, j) {
  const prompt = `あなたは日本のトップヘッドハンターです。以下の候補者情報と求人情報を分析し、スカウトメールまで生成してください。JSONのみ返してください。

## 候補者
- 会社: ${c.company} / 職種: ${c.role}
- 経験: ${c.experience}
- スキル: ${c.skills}
- 転職志向: ${c.reason || '未記入'}

## 求人
- ポジション: ${j.position}${j.company ? ' / ' + j.company : ''}
- 内容: ${j.description}
- 求める経験: ${j.requirements}
- 魅力: ${j.appeal}

## 返すJSONの構造
{
  "candidateTypeCategory": "技術スペシャリスト型 / PM・マネジメント型 / キャリアアップ型 / 市場価値向上型 / 安定志向型 のいずれか",
  "score": 0〜100の整数,
  "topAppeal": "最も有効な訴求ポイント名（1つ）",
  "topAppealReason": "その理由（1〜2文）",
  "avoidPoint": "避けるべき訴求（1点）",
  "subject": "件名（40字以内・候補者固有）",
  "mailBody": "スカウト本文（冒頭文〜CTA、改行で区切った1つの文章、250〜350字）"
}`;

  if (!hasApiKey()) return batchDemoResult(c, j);

  const res = await fetch(API_URL, {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify({ model: md(), messages: [{ role: 'system', content: '優秀なヘッドハンターとしてJSONのみ返してください。' }, { role: 'user', content: prompt }], temperature: 0.7, response_format: { type: 'json_object' } })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  const data = JSON.parse((await res.json()).choices[0].message.content);
  return { cand: c, ...data };
}
