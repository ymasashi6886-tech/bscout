/**
 * storage.js — ローカルストレージ管理・learningData 構造
 *
 * 将来的な拡張ポイント:
 *   - exportLearningData() : 学習データのエクスポート
 *   - IBM watsonx / DB 接続時は fetch() をここに集約
 */

const HISTORY_KEY = 'bscout_history';

// ── アプリ全体の状態オブジェクト ──
const S = {
  candidate: {},
  job: {},
  analysis: null,      // ohere / careerStory / temperature フィールドを含む
  selectedAppeals: [],
  mail: null,
  selfReview: null,    // callSelfReviewAPI() の結果（IBM専用6軸採点）
  processLog: {},
  learningData: {},
  currentHistoryId: null   // 保存済み履歴ID（フィードバック更新時に使用）
};

// ── learningData 構築（分析完了時に呼ぶ） ──
function buildLearningData() {
  const a = S.analysis, c = S.candidate, j = S.job;
  S.learningData = {
    version: '1.0',
    createdAt: new Date().toISOString(),
    candidate: {
      company: c.company,
      role: c.role,
      skills: c.skills,
      experience: c.experience,
      reason: c.reason
    },
    analysis: {
      candidateTypeCategory: a.candidateTypeCategory || a.candidateType || '',
      candidateTypeReason:   a.candidateTypeReason   || a.typeReason   || '',
      motivationHypothesis:  a.motivationHypothesis,
      matchScore:            a.score,
      scoreReason:           a.scoreReason,
      appealPriority:        a.appealPriority || [],
      otherRecommendedAppeals: a.otherRecommendedAppeals || [],
      avoidPoints:           a.avoidPoints,
      recruiterGuidance:     a.recruiterGuidance || [],
      // Phase1: 新フィールド
      ohere:          a.ohere          || null,
      careerStory:    a.careerStory    || null,
      temperature:    a.temperature    || null
    },
    job: {
      position:    j.position,
      company:     j.company,
      description: j.description
    },
    // スカウト実施後に result を書き込む
    scoutAction: {
      selectedAppeals:  [],
      generatedSubject: '',
      sentAt: null,
      result: {
        replied:          null,  // boolean
        meetingScheduled: null,  // boolean
        hired:            null,  // boolean
        feedbackNote:     ''
      }
    }
  };
}

// ── 履歴保存 ──
function saveScoutHistory() {
  const history = loadScoutHistory();
  const id = S.currentHistoryId || Date.now().toString();
  S.currentHistoryId = id;

  const entry = {
    id,
    savedAt: new Date().toISOString(),
    candidate: { ...S.candidate },
    job:       { position: S.job.position, company: S.job.company },
    analysis: {
      candidateTypeCategory: (S.analysis || {}).candidateTypeCategory || '',
      score: (S.analysis || {}).score || 0
    },
    mail:    { ...(S.mail || {}) },
    selectedAppeals: [...(S.selectedAppeals || [])],
    result: {
      replied:          null,
      meetingScheduled: null,
      hired:            null,
      feedbackNote:     ''
    }
  };

  // 既存IDなら上書き、なければ先頭に追加
  const idx = history.findIndex(h => h.id === id);
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);

  // 最大50件
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  return id;
}

// ── 履歴読み込み ──
function loadScoutHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

// ── 履歴のフィードバック更新 ──
function updateHistoryResult(id, result) {
  const history = loadScoutHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  entry.result = { ...entry.result, ...result };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

// ── 履歴1件削除 ──
function deleteHistoryEntry(id) {
  const history = loadScoutHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
