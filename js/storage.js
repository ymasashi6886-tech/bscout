/**
 * storage.js — ローカルストレージ管理・learningData 構造
 *
 * 将来的な拡張ポイント:
 *   - exportLearningData() : 学習データのエクスポート
 *   - IBM watsonx / DB 接続時は fetch() をここに集約
 */

const HISTORY_KEY  = 'bscout_history';
const PROJECT_KEY  = 'bscout_projects';   // Phase1.5: 求人プロジェクト
const EDITLOG_KEY  = 'bscout_editlogs';   // Phase1.5: リクルーター修正ログ

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
  currentHistoryId: null,  // 保存済み履歴ID（フィードバック更新時に使用）
  currentProjectId: null   // Phase1.5: 選択中の求人プロジェクトID
};

// ══════════════════════════════════════════
// Phase1.5: 求人プロジェクト管理
// ══════════════════════════════════════════

/** プロジェクト一覧を取得 */
function loadProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECT_KEY) || '[]'); }
  catch { return []; }
}

/** プロジェクトを保存（新規 or 上書き） */
function saveProject(proj) {
  const projects = loadProjects();
  const id = proj.id || Date.now().toString();
  proj.id = id;
  proj.updatedAt = new Date().toISOString();
  if (!proj.createdAt) proj.createdAt = proj.updatedAt;

  const idx = projects.findIndex(p => p.id === id);
  if (idx >= 0) projects[idx] = proj;
  else projects.unshift(proj);

  localStorage.setItem(PROJECT_KEY, JSON.stringify(projects.slice(0, 30)));
  return id;
}

/** プロジェクトを削除 */
function deleteProject(id) {
  const projects = loadProjects().filter(p => p.id !== id);
  localStorage.setItem(PROJECT_KEY, JSON.stringify(projects));
}

/** S.job から現在のフォーム値でプロジェクトオブジェクトを作成 */
function buildProjectFromForm() {
  return {
    id:              S.currentProjectId || null,
    name:            $('j_proj_name')?.value.trim() || $('j_pos').value.trim(),
    position:        $('j_pos').value.trim(),
    company:         $('j_co').value.trim(),
    description:     $('j_desc').value.trim(),
    requirements:    $('j_req').value.trim(),
    preferred:       $('j_pref')?.value.trim() || '',
    appeal:          $('j_ap').value.trim(),
    successExamples: $('j_success')?.value.trim() || ''
  };
}

/** プロジェクトをフォームに反映 */
function applyProjectToForm(proj) {
  const set = (id, val) => { const el = $(id); if (el) el.value = val || ''; };
  set('j_proj_name', proj.name);
  set('j_pos',       proj.position);
  set('j_co',        proj.company);
  set('j_desc',      proj.description);
  set('j_req',       proj.requirements);
  set('j_pref',      proj.preferred);
  set('j_ap',        proj.appeal);
  set('j_success',   proj.successExamples);
  S.currentProjectId = proj.id;
}

// ══════════════════════════════════════════
// Phase1.5: リクルーター修正ログ
// ══════════════════════════════════════════

/** 修正ログ一覧を取得 */
function loadEditLogs() {
  try { return JSON.parse(localStorage.getItem(EDITLOG_KEY) || '[]'); }
  catch { return []; }
}

/**
 * 修正ログを1件保存
 * @param {string} historyId  - 紐づくスカウト履歴ID
 * @param {string} section    - 修正したセクション（subject/intro/why/match/benefit/cta）
 * @param {string} aiVersion  - AI生成の原文
 * @param {string} edited     - 修正後のテキスト
 * @param {string} reason     - 修正理由（任意）
 */
function saveEditLog(historyId, section, aiVersion, edited, reason) {
  const logs = loadEditLogs();
  const entry = {
    id:        Date.now().toString(),
    savedAt:   new Date().toISOString(),
    historyId,
    section,
    aiVersion,
    edited,
    reason:    reason || '',
    // 学習データ用メタ情報
    meta: {
      candidateType:  (S.analysis || {}).candidateTypeCategory || '',
      temperature:    ((S.analysis || {}).temperature || {}).stars || null,
      selectedAppeals: S.selectedAppeals || []
    }
  };
  logs.unshift(entry);
  // 最大200件
  localStorage.setItem(EDITLOG_KEY, JSON.stringify(logs.slice(0, 200)));
  return entry.id;
}

/** 修正ログをエクスポート（将来の学習用） */
function exportEditLogs() {
  const logs = loadEditLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `bscout_editlogs_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════
// learningData 構築（分析完了時に呼ぶ）
// ══════════════════════════════════════════
function buildLearningData() {
  const a = S.analysis, c = S.candidate, j = S.job;
  S.learningData = {
    version: '1.1',
    createdAt: new Date().toISOString(),
    projectId: S.currentProjectId || null,
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
      ohere:                 a.ohere          || null,
      careerStory:           a.careerStory    || null,
      temperature:           a.temperature    || null
    },
    job: {
      position:    j.position,
      company:     j.company,
      description: j.description
    },
    scoutAction: {
      selectedAppeals:  [],
      generatedSubject: '',
      sentAt: null,
      result: {
        replied:          null,
        meetingScheduled: null,
        hired:            null,
        feedbackNote:     ''
      }
    }
  };
}

// ══════════════════════════════════════════
// スカウト履歴管理（既存）
// ══════════════════════════════════════════

function saveScoutHistory() {
  const history = loadScoutHistory();
  const id = S.currentHistoryId || Date.now().toString();
  S.currentHistoryId = id;

  const entry = {
    id,
    savedAt: new Date().toISOString(),
    projectId: S.currentProjectId || null,
    candidate: { ...S.candidate },
    job:       { position: S.job.position, company: S.job.company },
    analysis: {
      candidateTypeCategory: (S.analysis || {}).candidateTypeCategory || '',
      score: (S.analysis || {}).score || 0
    },
    mail:    { ...(S.mail || {}) },
    mailAi:  { ...(S.mail || {}) },   // Phase1.5: AI生成原文を保持
    selectedAppeals: [...(S.selectedAppeals || [])],
    result: {
      replied:          null,
      meetingScheduled: null,
      hired:            null,
      feedbackNote:     ''
    }
  };

  const idx = history.findIndex(h => h.id === id);
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  return id;
}

function loadScoutHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function updateHistoryResult(id, result) {
  const history = loadScoutHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  entry.result = { ...entry.result, ...result };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function deleteHistoryEntry(id) {
  const history = loadScoutHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}
