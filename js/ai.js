/**
 * ai.js — OpenAI API / IBM watsonx.ai 通信・プロンプト管理
 *
 * Phase3a: プロンプト強化・watsonx切り替えロジック・修正ログfew-shot注入
 * v1.2: AIっぽさ除去エンジン・冒頭ライブラリ・文体ライブラリ・成功例分析・セルフレビュー刷新
 *
 * バックエンド切り替え方法:
 *   1. BSCOUT_BACKEND = 'openai' | 'watsonx' を localStorage に設定
 *   2. watsonx選択時: BSCOUT_WX_URL / BSCOUT_WX_TOKEN も設定が必要
 *   3. IS_NETLIFY=true 時はサーバー側プロキシが自動判定
 */

// ══════════════════════════════════════════
// v1.2 実装① — AIっぽさ除去エンジン
// ══════════════════════════════════════════

/**
 * 禁止表現リスト（30語）
 * トップリクルーターが絶対に使わない定型・AI臭い表現
 */
const BANNED_PHRASES = [
  // 冒頭定型
  'プロフィールを拝見しました',
  'ご経歴を拝見し',
  'ご経歴を拝見いたしました',
  '突然のご連絡失礼します',
  '突然のご連絡大変失礼いたします',
  '初めてご連絡いたします',
  'はじめまして',
  // 過剰敬語・古い表現
  '貴殿',
  '貴職',
  'ご芳名',
  '拝察いたします',
  // AI臭い婉曲表現
  'ご活躍',
  'ご縁',
  'ご縁があれば',
  '興味を持ちました',
  '興味を持ちいたしました',
  'ご経験に魅力を感じました',
  '魅力を感じ',
  'ぜひ一度',
  'お声がけさせていただきました',
  'ご連絡させていただきました',
  'スカウトをお送りしました',
  // 弱い誘導
  'お時間をいただけませんか',
  'ご多忙のところ',
  '差し支えなければ',
  'もしよろしければ',
  'もしご興味があれば',
  'ご検討いただけますと幸いです',
  'ご一考いただければ幸いです',
  // 過剰配慮
  'ご迷惑をおかけするかもしれませんが',
  'お忙しいところ大変恐縮ですが',
];

/**
 * 禁止表現スキャナー
 * @param {string} text — チェックするテキスト
 * @returns {string[]} 見つかった禁止表現の配列（空なら合格）
 */
function checkBannedPhrases(text) {
  if (!text) return [];
  return BANNED_PHRASES.filter(phrase => text.includes(phrase));
}

/**
 * スカウト全セクションをスキャンして違反リストを返す
 * @param {object} mail — {subject, intro, why, match, benefit, cta}
 * @returns {{ section: string, phrase: string }[]}
 */
function scanMailForBanned(mail) {
  const sections = { subject: '件名', intro: '冒頭文', why: '理由', match: '接点', benefit: 'メリット', cta: '誘導文' };
  const violations = [];
  for (const [key, label] of Object.entries(sections)) {
    const found = checkBannedPhrases(mail[key] || '');
    found.forEach(phrase => violations.push({ section: key, label, phrase }));
  }
  return violations;
}

/**
 * 禁止表現が含まれるセクションのみ再生成（最大2回）
 * 違反フレーズをプロンプトに明示して再生成を強制
 */
async function fixBannedSections(violations) {
  // section別にグループ化
  const bySection = {};
  violations.forEach(v => {
    if (!bySection[v.section]) bySection[v.section] = { label: v.label, phrases: [] };
    bySection[v.section].phrases.push(v.phrase);
  });

  for (const [secId, { phrases }] of Object.entries(bySection)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const violationNote = `前回の生成では「${phrases.join('」「')}」という禁止表現が含まれていました。今回は絶対に使用しないでください。`;
      const c = S.candidate, j = S.job, a = S.analysis;
      const typeCategory = a?.candidateTypeCategory || '';
      const msgs = [
        { role: 'system', content: 'IBMトップリクルーターとしてJSONのみ返してください。AIっぽい定型表現は一切使いません。' },
        { role: 'user', content: `${violationNote}\n\n候補者:${c.role}(${c.company})、スキル:${c.skills}、志向:${c.reason || '不明'}\n求人:${j.position}、魅力:${j.appeal}\nタイプ:${typeCategory}、選択訴求:${(S.selectedAppeals||[]).join('・')}\n\n「${secId}」セクションを1つ生成。絶対に禁止表現を使わないこと。JSON: {"${secId}": "テキスト"}` }
      ];
      try {
        const res = await fetch(getApiUrl(), { method: 'POST', headers: apiHeaders(), body: JSON.stringify(buildRequestBody(msgs, 0.9)) });
        if (!res.ok) break;
        const parsed = parseApiResponse(await res.json());
        if (parsed[secId]) {
          // 再チェック
          const stillBanned = checkBannedPhrases(parsed[secId]);
          S.mail[secId] = parsed[secId];
          const ta = $('ta-' + secId);
          if (ta) { ta.value = parsed[secId]; autoResize(ta); updateCC('ta-' + secId, 'cc-' + secId); }
          if (stillBanned.length === 0) break; // クリアしたら終了
        }
      } catch { break; }
    }
  }
}

// ══════════════════════════════════════════
// v1.2 実装② — 冒頭パターンライブラリ
// ══════════════════════════════════════════

/**
 * 候補者タイプ別の冒頭パターン例
 * AIに「このパターンで始めること」を指示する際のヒント集
 * 毎回ランダムに3パターン選んでプロンプトに注入
 */
const OPENING_PATTERNS = {
  '技術スペシャリスト型': [
    '${role}まで担当されている方は、実はかなり少ないんです。',
    '${skill}の実装経験、業界でも珍しいですね。',
    '${project}を読んで、一番印象に残りました。',
    '${role}として${experience_short}という経験は、私が会ってきた中でもトップクラスです。',
    'ちょうど${role}の経験者を探していたところに、${c_name}さんのプロフィールを見て驚きました。',
    '${skill}をここまで深く扱える方を探していました。',
    '${experience_short}という実績、率直にすごいと思いました。',
    '技術的にここまでやり切っている方は少ない。それが第一印象でした。',
    '${role}でこれだけの規模を経験された方、なかなかいないんですよね。',
    '${project}のアーキテクチャ設計まで担当されているんですね。',
  ],
  'PM・マネジメント型': [
    '${experience_short}という規模のプロジェクトを率いている点が気になりました。',
    '${project}というご経験は、IBMでもかなり活かせそうです。',
    'PM・マネジメントとして${experience_short}まで経験している方を探していました。',
    '${role}として${experience_short}という経験は、この規模の案件では貴重です。',
    '事業側と技術側を両方見てきた経験、今のIBMに一番刺さる人物像です。',
    'チームを${experience_short}という経験、次のフェーズに直結しそうです。',
    '${experience_short}の経験、読んでいてリアルさが伝わってきました。',
    'PMとして意思決定レイヤーに入ってきた経験が、刺さりました。',
    '${project}プロジェクト、規模感が今回のポジションとかなり近いです。',
    'マネジメントと現場の両方を知っているPM、正直なかなか出会えません。',
  ],
  'キャリアアップ型': [
    '次の挑戦を考えているタイミングかもしれないと思ってご連絡しました。',
    '${role}として積んできた経験、そろそろ次のステージに持っていきたい時期では？',
    '${experience_short}という経験があれば、もう一段上のポジションが見えてきます。',
    '${skill}の経験を活かしつつ、新しい環境で試したいと思っていませんか？',
    '今のキャリアの延長線ではなく、別の角度から見てみると面白いかもしれません。',
    'ちょうど${role}経験者をステップアップさせたいポジションがあります。',
    '${experience_short}をここまでやり切った方が次に何をするか、気になりました。',
    '今いる会社ではできない経験が、ここにあると思っています。',
    'スキルは十分。あとは「場所」だけだと思います。',
    '${role}の次のキャリアとして、具体的にどんな選択肢があるか話しませんか。',
  ],
  '市場価値向上型': [
    '${skill}の経験を、もっと市場価値に変えられる場所があります。',
    '${experience_short}という経験は、正直まだ市場で過小評価されています。',
    '${role}としての経験を、次のキャリアでどう使うかを一緒に考えたいです。',
    'IBMという肩書きが、${skill}の価値をさらに引き上げます。',
    '${experience_short}をIBMの環境でやると、市場での見え方が変わります。',
    '技術の価値を正しく評価してもらえる環境に移る時期かもしれません。',
    '${role}としての市場価値、もっと上げられると思っています。',
    '${skill}は今後5年で確実に価値が上がる。そのタイミングでIBMに来るのは早すぎない。',
    '今の会社でできることはやり切った感があるなら、そのタイミングかもしれません。',
    '${experience_short}という経験を持って外に出る前に、一度話を聞いてください。',
  ],
  '安定志向型': [
    '${role}として積んできた経験を、長く・深く活かせる環境があります。',
    '外資系の中でも、IBMの安定感はかなり別格です。創業112年の話をしてもいいですか。',
    '${experience_short}という経験は、IBMのような規模の会社でこそ活かせます。',
    '専門性を活かしながら、腰を据えてキャリアを積める場所を探していませんか。',
    '${skill}を深掘りし続けられる環境、IBMにはあります。',
    '転職リスクを最小化しながら、確実にキャリアを積む方法があります。',
    '${role}の専門家として長期的に評価される環境に移りませんか。',
    '大きな組織の安心感を持ちながら、新しいことに挑戦できる。それがIBMです。',
    '${experience_short}という実績があれば、IBMでは安定した立場が約束されます。',
    '専門性と安定、両方を諦めなくていい選択肢があります。',
  ],
};

/**
 * 候補者タイプに合う冒頭パターンをランダムに3件選んでプロンプト注入文を生成
 */
function selectOpeningPatterns(typeCategory, candidate) {
  const patterns = OPENING_PATTERNS[typeCategory] || OPENING_PATTERNS['技術スペシャリスト型'];
  // プレースホルダーを候補者情報で置換
  const filled = patterns.map(p =>
    p.replace(/\${role}/g, candidate.role || '')
     .replace(/\${skill}/g, (candidate.skills || '').split(/[,、\s]/)[0] || '')
     .replace(/\${project}/g, candidate.projects || candidate.experience?.slice(0, 20) || '')
     .replace(/\${experience_short}/g, (candidate.experience || '').slice(0, 30))
     .replace(/\${c_name}/g, '候補者')
  );
  // ランダムに3件
  const shuffled = filled.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

// ══════════════════════════════════════════
// v1.2 実装③ — リクルーター文体ライブラリ
// ══════════════════════════════════════════

/**
 * スタイルライブラリ
 * 候補者タイプ・ポジション・温度感に応じて文体を変える
 */
const STYLE_LIBRARY = {
  engineer: {
    label: 'エンジニア向け',
    tone: 'フラット・論理的・具体数値重視',
    sentenceLength: '短め（1文30〜40字）',
    lineBreak: '適度に段落を分ける',
    distance: 'やや近め（敬語は保ちつつ話しかける感じ）',
    avoid: '過剰な敬語、回りくどい表現、IBMの自慢話の羅列',
    example: '技術スタックを見て気になりました。Javaのマイクロサービス設計まで担当されているんですね。',
  },
  pm: {
    label: 'PM・コンサル向け',
    tone: '論理的・成果志向・課題解決フレーム',
    sentenceLength: 'やや長め（1文50字程度、接続詞で論理展開）',
    lineBreak: 'セクション間は1行空ける',
    distance: '対等なプロフェッショナル同士',
    avoid: '感情的な言葉、抽象的な未来語り',
    example: '銀行系基幹システムのPMを経験されているということで、今回のポジションと重なる部分が多いと感じました。',
  },
  executive: {
    label: '役員・ハイクラス向け',
    tone: '簡潔・格調・対等感',
    sentenceLength: '短く力強く（1文20〜35字）',
    lineBreak: '短い段落を積み上げる',
    distance: '対等以上（リクルーターが下手に出ない）',
    avoid: '長い説明、お願い口調、言い訳めいた表現',
    example: 'この規模のPJをリードできる方は少ない。率直にそう思いました。',
  },
  casual: {
    label: 'カジュアル・スタートアップ経験者向け',
    tone: 'テンポ良く・フランク・体言止め多用',
    sentenceLength: '短め（体言止め・1文20〜35字）',
    lineBreak: '細かく改行・テンポ重視',
    distance: '近め（「ですます」だが話しかける感じ）',
    avoid: '固い敬語、長い段落、説明的すぎる文',
    example: 'プロダクト開発経験、かなり珍しいです。IBMでもちょうど同じ経験値を探していました。',
  },
  logical: {
    label: '論理的・データサイエンティスト向け',
    tone: '根拠重視・数値具体的・因果明示',
    sentenceLength: '中程度（根拠を添えるため少し長め）',
    lineBreak: '論点ごとに段落',
    distance: '中立・プロ同士',
    avoid: '曖昧な表現、感情訴求、根拠のない断言',
    example: '機械学習モデルの本番運用まで担当されているのは、業界でも上位5%程度の経験です。',
  },
};

/**
 * 候補者タイプから最適なスタイルを選択
 */
function selectStyle(typeCategory, candidate) {
  const hasExec = (candidate.role || '').includes('部長') || (candidate.role || '').includes('マネージャー') || (candidate.role || '').includes('VP');
  if (hasExec) return STYLE_LIBRARY.executive;
  const map = {
    '技術スペシャリスト型': STYLE_LIBRARY.engineer,
    'PM・マネジメント型':   STYLE_LIBRARY.pm,
    'キャリアアップ型':      STYLE_LIBRARY.casual,
    '市場価値向上型':        STYLE_LIBRARY.logical,
    '安定志向型':            STYLE_LIBRARY.pm,
  };
  return map[typeCategory] || STYLE_LIBRARY.engineer;
}

// ══════════════════════════════════════════
// v1.2 実装④ — 成功スカウト例の特徴抽出
// ══════════════════════════════════════════

/**
 * 成功スカウト例からAIが特徴を抽出するプロンプトを生成
 * 丸写しではなく「何が良いか」を構造化して活用する
 */
async function analyzeSuccessExample(exampleText) {
  if (!exampleText || !hasApiKey()) return null;
  const msgs = [
    { role: 'system', content: 'スカウトメール分析の専門家です。JSONのみ返してください。' },
    { role: 'user', content: `以下の成功スカウト例を分析し、「何が良いのか」を構造化してください。

## 成功スカウト例
${exampleText}

## 返すJSONの構造
{
  "openingStyle": "冒頭の書き方の特徴（1文）",
  "toneKeywords": ["文体を表すキーワード3〜5個"],
  "strongPoints": ["良い点を3〜5個、各15字以内"],
  "usableExpressions": ["そのまま転用できる表現・フレーズを2〜4個"],
  "structurePattern": "全体の構成パターンの説明（2〜3文）"
}` }
  ];
  try {
    const res = await fetch(getApiUrl(), { method: 'POST', headers: apiHeaders(), body: JSON.stringify(buildRequestBody(msgs, 0.5)) });
    if (!res.ok) return null;
    return parseApiResponse(await res.json());
  } catch { return null; }
}

/**
 * 成功例分析結果をプロンプト注入文に変換
 */
function buildSuccessExampleHint(analysis) {
  if (!analysis) return '';
  return `## 過去の成功スカウト例から学んだパターン（参考にして自然に活かすこと）
- 冒頭スタイル: ${analysis.openingStyle || ''}
- 文体の特徴: ${(analysis.toneKeywords || []).join('・')}
- 良かった点: ${(analysis.strongPoints || []).join(' / ')}
- 活かせる表現例: 「${(analysis.usableExpressions || []).join('」「')}」
- 構成パターン: ${analysis.structurePattern || ''}
※ 上記はあくまで参考。コピーではなくエッセンスを自分の文章に自然に組み込むこと。`;
}

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
// STEP5: スカウト文生成 API（v1.2強化版）
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

  // Phase3a: IBM知識注入
  const ibmKnowledge = selectIbmKnowledge(typeCategory, S.selectedAppealIds || []);
  // Phase3a: 修正ログfew-shot注入
  const fewShotExamples = buildFewShotFromEditLogs(typeCategory, sel);
  // IBM訴求ibmStrengthヒント
  const ibmStrengthHints = sel.map(name => {
    if (typeof IBM_APPEALS !== 'undefined') {
      const ap = IBM_APPEALS.find(x => x.name === name);
      return ap ? `【${ap.name}】${ap.ibmStrength}` : name;
    }
    return name;
  }).join('\n');

  // v1.2: 冒頭パターン選択（ランダム3件）
  const openingPatterns = selectOpeningPatterns(typeCategory, c);
  // v1.2: 文体スタイル選択
  const style = selectStyle(typeCategory, c);
  // v1.2: 成功スカウト例の特徴抽出（キャッシュ or 実行）
  let successExampleHint = '';
  if (j.successExamples) {
    // キャッシュがなければ分析実行（非同期だが既に呼ばれている前提でキャッシュを参照）
    if (!S._successExampleCache || S._successExampleCache.src !== j.successExamples) {
      S._successExampleCache = { src: j.successExamples, result: await analyzeSuccessExample(j.successExamples) };
    }
    successExampleHint = buildSuccessExampleHint(S._successExampleCache?.result);
  }

  const bannedList = BANNED_PHRASES.slice(0, 12).join('、');

  const prompt = `あなたは日本のIBMトップリクルーターです。以下の情報をもとに、本当に人間が書いたように見えるスカウトメールを生成してください。JSONのみ返してください。

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
${successExampleHint ? `\n${successExampleHint}` : ''}

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

## IBM実績ナレッジ（自分の言葉で自然に組み込む — コピペ禁止）
${ibmKnowledge}
${fewShotExamples ? `\n## 過去のリクルーター修正パターン（参考 — 同じ方向性で書くこと）\n${fewShotExamples}` : ''}

## 文体スタイル指示（${style.label}）
- トーン: ${style.tone}
- 文長: ${style.sentenceLength}
- 段落改行: ${style.lineBreak}
- 距離感: ${style.distance}
- 避けること: ${style.avoid}
- 例文イメージ: 「${style.example}」

## 冒頭の書き出しパターン（以下の3つのうち最も自然なものをベースに冒頭文を書くこと）
${openingPatterns.map((p, i) => `パターン${i + 1}: 「${p}」`).join('\n')}

## 絶対禁止表現（1語でも使ったら失格）
${bannedList}
その他: AIっぽい婉曲表現・過剰敬語・回りくどい誘導 すべて禁止。

## 生成ルール
1. 冒頭は必ず候補者の具体的な経歴・実績・スキルへの言及から始める
2. 「プロフィールを拝見」「ご活躍」「ご縁」など定型表現を一切使わない
3. 件名は候補者固有の実績・スキルを入れる（40字以内）
4. この候補者だけに送るメールとして書く。テンプレ感ゼロ
5. IBMの強みは「概念」ではなく「具体的数値・事例」で語る
6. ストーリー構造（共感→能力承認→未来→IBM→面談）を自然な流れで

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
    { role: 'system', content: 'あなたは日本のIBMトップリクルーターです。本当に人間が書いたように見えるスカウトメールを書きます。AIっぽい定型表現は一切使いません。IBMの具体的事実・数値を使って語ります。JSONのみ返してください。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(mailMessages, 0.85))
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  S.mail = parseApiResponse(await res.json());
  if (S.learningData.scoutAction) { S.learningData.scoutAction.selectedAppeals = S.selectedAppeals; S.learningData.scoutAction.generatedSubject = S.mail.subject || ''; }

  // v1.2 実装① — 禁止表現スキャン → 自動再生成
  const violations = scanMailForBanned(S.mail);
  if (violations.length > 0 && hasApiKey()) {
    // バックグラウンドで違反セクションを修正（UIは既に表示済み）
    fixBannedSections(violations).catch(() => {});
  }
  // 違反情報をステートに保存（UIで警告表示に使用）
  S.bannedViolations = violations;

  hideLoad(); renderMail(); renderProcessLog(); go(5);
}

// ══════════════════════════════════════════
// STEP5: セルフレビュー API（v1.2刷新版）
// 返信率予測を廃止 → 5軸 + 改善コメント
// ══════════════════════════════════════════
async function callSelfReviewAPI() {
  const c = S.candidate, j = S.job, a = S.analysis, m = S.mail;
  const fullMail = `件名: ${m.subject || ''}\n\n${m.intro || ''}\n\n${m.why || ''}\n\n${m.match || ''}\n\n${m.benefit || ''}\n\n${m.cta || ''}`;
  const typeCategory = a.candidateTypeCategory || '';
  const temp = a.temperature || {};
  // v1.2: 禁止表現チェック結果をレビューに渡す
  const bannedFound = (S.bannedViolations || []).map(v => `「${v.phrase}」(${v.label})`).join('、') || 'なし';

  const prompt = `あなたはIBMスカウトメール品質評価の専門家です。以下のスカウトメールを5軸で採点し、JSONのみ返してください。

## 評価するスカウトメール
${fullMail}

## 候補者・分析情報
- 候補者タイプ: ${typeCategory}
- 転職温度感: ${temp.label || '不明'}（★${temp.stars || '?'}）
- 転職理由: ${c.reason || '不明'}
- 避けるべき訴求: ${a.avoidPoints || ''}
- 選択した訴求: ${(S.selectedAppeals || []).join('、')}
- 禁止表現スキャン結果: ${bannedFound}

## 評価基準（5軸・各0〜100点）

1. **AIっぽさ除去スコア（0=明らかにAI生成、100=完全に人間の文章）**
   定型表現・テンプレ感・AI特有の冗長さがないか。文章のリズム・温度感・個性があるか。
   禁止表現が含まれる場合は大幅減点（1語あたり-15点）。

2. **候補者固有性スコア（0=誰にでも送れる、100=この人だけに送れる）**
   候補者の具体的な経歴・スキル・実績数値・転職理由への言及があるか。

3. **判断の一貫性スコア（0=バラバラ、100=全体で一本の軸が通っている）**
   選択した訴求ポイントがスカウト文全体を通じて一貫しているか。矛盾・不自然なズレがないか。
   OHEREの分析 → 訴求選択 → スカウト文という論理の流れが崩れていないか。

4. **IBMらしさスコア（0=IBM感ゼロ、100=IBMでなければ書けない文章）**
   IBMの強み（watsonx・グローバル・社会貢献・AI・規模・育成・OSS・安定）が自然に組み込まれているか。
   「IBMだからこそ」という必然性が伝わるか。抽象的な「大企業の強み」にとどまっていないか。

5. **根拠の妥当性スコア（0=根拠なし、100=全ての訴求に根拠がある）**
   スカウト文の各訴求が候補者の実際の経歴・転職理由と紐づいているか。
   「なぜあなたに声をかけたか」の根拠が明確か。

## 返すJSONの構造
{
  "scores": {
    "humanness": 0〜100の整数,
    "candidateSpecificity": 0〜100の整数,
    "consistency": 0〜100の整数,
    "ibmness": 0〜100の整数,
    "evidenceQuality": 0〜100の整数
  },
  "overallComment": "総合評価コメント（3〜4文。良い点と改善点をバランスよく。改善点には具体的な修正方向を含む）",
  "improvements": [
    { "axis": "軸名", "issue": "具体的な問題点（1〜2文）", "fix": "具体的な改善案（1〜2文）", "targetSection": "subject/intro/why/match/benefit/ctaのいずれか" }
  ]
}

improvementsは改善すべき点を2〜3点のみ。高品質な場合は1点でも可。targetSectionには最も改善効果の高いセクションを指定。`;

  const srMessages = [
    { role: 'system', content: 'あなたはIBMスカウトメール品質評価の専門家です。5軸で厳格に評価します。「返信率」の予測はしません。JSONのみ返してください。' },
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
  const regenMessages = [
    { role: 'system', content: '優秀な採用担当者としてJSONのみ返してください。' },
    { role: 'user', content: `候補者:${c.role}(${c.company})、スキル:${c.skills}、志向:${c.reason || '不明'}\n求人:${j.position}(${j.company || ''})、魅力:${j.appeal}\nタイプ:${typeCategory}、訴求優先順位:${(a.appealPriority || []).map(p => p.rank + '位:' + p.appealName).join('・')}、選択訴求:${S.selectedAppeals.join('・')}\n「${desc[sec]}」を1つ生成。JSON:{"${sec}":"テキスト"}` }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(regenMessages, 0.9))
  });
  if (!res.ok) throw new Error('API error');
  const parsed = parseApiResponse(await res.json());
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

  const batchMessages = [
    { role: 'system', content: '優秀なヘッドハンターとしてJSONのみ返してください。' },
    { role: 'user', content: prompt }
  ];
  const res = await fetch(getApiUrl(), {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify(buildRequestBody(batchMessages, 0.7))
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  const data = parseApiResponse(await res.json());
  return { cand: c, ...data };
}
