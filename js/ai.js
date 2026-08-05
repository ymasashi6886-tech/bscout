/**
 * ai.js — OpenAI API 通信・プロンプト管理
 *
 * 将来的な拡張ポイント:
 *   - IBM watsonx.ai への切り替えは API_URL と apiHeaders() を変更するだけ
 *   - モデル選択の拡張（Llama, Granite 等）
 *   - ストリーミングレスポンス対応
 */

// ── エンドポイント自動判定 ──
// Netlify上: /api/proxy 経由（APIキーはサーバー側で管理）
// ローカル:  OpenAI APIに直接接続
const IS_NETLIFY = location.hostname !== 'localhost'
  && location.protocol === 'https:'
  && !location.hostname.includes('127.0.0.1');

const API_URL = IS_NETLIFY
  ? '/api/proxy'
  : 'https://api.openai.com/v1/chat/completions';

// ── APIキー管理ユーティリティ ──
function hasApiKey()  { return IS_NETLIFY || !!localStorage.getItem('bscout_apikey'); }

function apiHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (!IS_NETLIFY) {
    const k = localStorage.getItem('bscout_apikey');
    if (k) h['Authorization'] = 'Bearer ' + k;
  }
  return h;
}

function ensureLocalKey() {
  if (IS_NETLIFY) return true;
  let k = localStorage.getItem('bscout_apikey');
  if (!k) {
    k = window.prompt('OpenAI APIキーを入力してください（ローカル実行時のみ）:') || '';
    if (!k) return false;
    localStorage.setItem('bscout_apikey', k);
  }
  return true;
}

// ── 接続モード表示（ページ読み込み時に自動実行） ──
(async function checkMode() {
  const dot = $('modeDot'), lbl = $('modeLabel');
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
  } else {
    dot.className = 'mode-dot demo';
    lbl.innerHTML = '<strong>ローカル</strong> — デモ動作中';
  }
})();

// ══════════════════════════════════════════
// STEP2: 候補者分析 API
// ══════════════════════════════════════════
async function callAnalysisAPI() {
  const c = S.candidate, j = S.job;
  if (!IS_NETLIFY && !ensureLocalKey()) { demoAnalysis(); throw new Error('demo'); }

  const prompt = `あなたは日本のトップヘッドハンターです。以下の候補者情報と求人情報を分析し、正確なJSONのみを返してください。

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

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({
      model: md(),
      messages: [
        { role: 'system', content: 'あなたは優秀なヘッドハンターです。JSONのみ返してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API error ${res.status}`); }
  const d = await res.json();
  S.analysis = JSON.parse(d.choices[0].message.content);
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
  // IBM訴求ライブラリから選択訴求のibmStrengthを取得してプロンプトに埋め込む（Phase2）
  // S.selectedAppealIds はフロント側で設定されるが、callMailAPIはS参照なのでここで取得
  const ibmStrengthHints = sel.map(name => {
    // nameからIBM_APPEALSを逆引き（ai.jsからはwindow経由でアクセス）
    if (typeof IBM_APPEALS !== 'undefined') {
      const ap = IBM_APPEALS.find(x => x.name === name);
      return ap ? `【${ap.name}】${ap.ibmStrength}` : name;
    }
    return name;
  }).join('\n');

  const prompt = `あなたは日本のトップリクルーターです。以下の情報をもとに、AIっぽさのないスカウトメールを生成してください。JSONのみ返してください。

## 候補者情報
- 氏名候補者: ${c.role}（${c.company}）
- スキル: ${c.skills}
- 転職志向: ${c.reason || '不明'}
- 候補者タイプ: ${typeCategory}
- 転職温度感: ${temp.label || '不明'}（★${temp.stars || '?'}）

## 求人情報
- ポジション: ${j.position}（${j.company || ''}）
- 内容: ${j.description}
- 歓迎要件: ${j.preferred || '未記入'}
- 魅力: ${j.appeal}
${successExamples ? `\n## 過去の成功スカウト例（参考にして同水準の切り口を使うこと）\n${successExamples}` : ''}

## AI分析結果（スカウト文に反映すること）
- キャリアストーリー: ${story.narrative || a.motivationHypothesis || ''}
- 訴求優先順位:
${priText}
- 選択した訴求ポイント: ${sel.join('、')}
- IBM訴求の具体的内容（benefitセクションで必ず1〜2つ自然に言及すること）:
${ibmStrengthHints}
- 避けるべき訴求: ${a.avoidPoints || ''}
- スカウト戦略:
  ①共感: ${strat.step1_empathy || ''}
  ②能力承認: ${strat.step2_recognition || ''}
  ③未来提示: ${strat.step3_future || ''}
  ④IBM訴求: ${strat.step4_ibm || ''}
  ⑤面談誘導: ${strat.step5_meeting || ''}

## 絶対に守るルール（違反禁止）
1. 「突然のご連絡失礼します」「プロフィールを拝見しました」「貴殿」など定型表現を使わない
2. 冒頭文は必ず候補者の「具体的な経歴・実績・スキル」への言及から始める
3. 件名は候補者固有の内容（職種・実績・スキル）を必ず入れる
4. テンプレ的な文章にしない。この候補者だけに送るメールとして書く
5. 読んだ相手が「自分のことをちゃんと見てくれている」と感じる文体にする
6. ストーリー構造（共感→能力承認→未来→IBM→面談）を自然な流れで組み込む

## 返すJSONの構造
{
  "subject": "件名（40字以内・候補者固有の実績や強みに言及）",
  "intro": "冒頭文（3〜4文・候補者固有の経験・実績から始まる・共感＋能力承認フェーズ）",
  "why": "なぜ声をかけたか（2〜3文・具体的な経歴への言及・候補者固有）",
  "match": "ポジションとの接点（2〜3文・スキルマッチを具体的に・未来提示を含む）",
  "benefit": "候補者へのメリット（2〜3文・IBM訴求を反映・選択した訴求を自然に組み込む）",
  "cta": "カジュアル面談への誘導（2文・プレッシャーなし・選考なしのカジュアルな誘い）"
}`;

  const res = await fetch(API_URL, {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify({ model: md(), messages: [{ role: 'system', content: 'あなたは日本のトップリクルーターです。AIっぽさを排除した人間らしいスカウトメールを書くことが得意です。JSONのみ返してください。' }, { role: 'user', content: prompt }], temperature: 0.8, response_format: { type: 'json_object' } })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  S.mail = JSON.parse((await res.json()).choices[0].message.content);
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

  const res = await fetch(API_URL, {
    method: 'POST', headers: apiHeaders(),
    body: JSON.stringify({
      model: md(),
      messages: [
        { role: 'system', content: 'あなたはスカウトメール採点の専門家です。IBMのスカウトメールを厳格に採点します。JSONのみ返してください。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `API ${res.status}`); }
  S.selfReview = JSON.parse((await res.json()).choices[0].message.content);
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
