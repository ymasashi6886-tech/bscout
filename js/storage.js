/**
 * storage.js — ローカルストレージ管理・learningData 構造
 *
 * v2.0 変更点:
 *   - IndexedDB 永続化レイヤー追加（IDB_VERSION=1、DB名=bscout_db）
 *   - 設定バックアップ/インポート（exportSettings / importSettings）
 *   - スカウト履歴は localStorage（最大50件）+ IndexedDB（無制限）の二重保存
 *   - 既存APIはすべて後方互換を維持
 */

const HISTORY_KEY  = 'bscout_history';
const PROJECT_KEY  = 'bscout_projects';   // Phase1.5: 求人プロジェクト
const EDITLOG_KEY  = 'bscout_editlogs';   // Phase1.5: リクルーター修正ログ

// ══════════════════════════════════════════
// v2.0: IndexedDB 永続化レイヤー
// ══════════════════════════════════════════

const IDB_NAME    = 'bscout_db';
const IDB_VERSION = 1;
const IDB_STORES  = { history: 'id', editlogs: 'id', projects: 'id' };

let _idb = null;

/**
 * IndexedDB を開く（初回のみ）
 * @returns {Promise<IDBDatabase>}
 */
function openIDB() {
  if (_idb) return Promise.resolve(_idb);
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('IndexedDB 非対応')); return; }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      Object.entries(IDB_STORES).forEach(([name, keyPath]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
        }
      });
    };
    req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
    req.onerror   = e => reject(e.target.error);
  });
}

/**
 * IndexedDB にレコードを upsert する
 * @param {string} storeName - ストア名
 * @param {Object} record    - keyPath フィールドを含むオブジェクト
 */
async function idbPut(storeName, record) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).put(record);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = e => reject(e.target.error);
    });
  } catch { /* IndexedDB 非対応環境は無視 */ }
}

/**
 * IndexedDB から全件取得（新しい順）
 * @param {string} storeName
 * @returns {Promise<Array>}
 */
async function idbGetAll(storeName) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => (b.savedAt || '') > (a.savedAt || '') ? 1 : -1));
      req.onerror   = e => reject(e.target.error);
    });
  } catch { return []; }
}

/**
 * IndexedDB からレコードを削除
 * @param {string} storeName
 * @param {string} id
 */
async function idbDelete(storeName, id) {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(storeName, 'readwrite');
      const req = tx.objectStore(storeName).delete(id);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e.target.error);
    });
  } catch { /* 無視 */ }
}

// ══════════════════════════════════════════
// v2.0: 設定バックアップ / インポート
// ══════════════════════════════════════════

/** バックアップ対象の localStorage キー */
const BACKUP_KEYS = [
  'bscout_backend',
  'bscout_apikey',
  'bscout_wx_token',
  'bscout_wx_url',
  'bscout_wx_project',
  'bscout_wx_model',
  'bscout_history',
  'bscout_projects',
  'bscout_editlogs'
];

/**
 * 設定・履歴をすべて JSON ファイルとしてダウンロード
 * （APIキー・トークンも含まれるため取り扱い注意の警告を付ける）
 */
function exportSettings() {
  const data = {
    version:    '2.0',
    exportedAt: new Date().toISOString(),
    warning:    'このファイルにはAPIキーが含まれます。安全な場所に保管してください。',
    settings:   {}
  };
  BACKUP_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) data.settings[key] = val;
  });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `bscout_backup_${Date.now()}.json`; a.click();
  URL.revokeObjectURL(url);
}

/**
 * JSON バックアップファイルから設定・履歴を復元
 * @param {File} file - input[type=file] から取得した File オブジェクト
 * @returns {Promise<{imported: string[], skipped: string[]}>}
 */
async function importSettings(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.settings) { reject(new Error('不正なバックアップファイルです')); return; }
        const imported = [], skipped = [];
        Object.entries(data.settings).forEach(([key, val]) => {
          if (BACKUP_KEYS.includes(key)) {
            localStorage.setItem(key, val);
            imported.push(key);
          } else {
            skipped.push(key);
          }
        });
        resolve({ imported, skipped });
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file, 'UTF-8');
  });
}

// ── アプリ全体の状態オブジェクト ──
const S = {
  candidate: {},
  job: {},
  analysis: null,      // ohere / careerStory / temperature フィールドを含む
  selectedAppeals: [],
  selectedAppealIds: [],
  storyPlan: null,     // v1.3: Story Planner（会話設計）の結果
  mail: null,
  selfReview: null,    // callSelfReviewAPI() の結果（5軸採点）
  bannedViolations: [], // v1.2: 禁止表現スキャン結果
  processLog: {},
  learningData: {},
  reviewRound: 1,
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
    version: '1.3',
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
    // v1.3: Story Planner（会話設計）を学習データに保存
    storyPlan: S.storyPlan ? {
      openingFocus:              S.storyPlan.openingFocus || '',
      capabilityToAcknowledge:   S.storyPlan.capabilityToAcknowledge || '',
      careerHypothesis:          S.storyPlan.careerHypothesis || '',
      closingStyle:              S.storyPlan.closingStyle || '',
      writingTone:               S.storyPlan.writingTone || '',
      ibmAppealsRanking:         (S.storyPlan.ibmAppeals || []).map(a => ({ rank: a.rank, appeal: a.appeal })),
      conversationFlowSummary:   (S.storyPlan.conversationFlow || []).map(f => f.phase).join(' → '),
      recruiterNote:             S.storyPlan._recruiterNote || '',
      // 採用担当者が設計を修正した場合の差分（次の storyPlanEdits で上書き）
      wasEdited:                 false
    } : null,
    scoutAction: {
      selectedAppeals:  [],
      selectedAppealIds: [],
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

/**
 * v1.3: Story Planner の修正ログを保存
 * 採用担当者がメモや再設計を行った場合に呼ぶ
 */
function saveStoryPlanEdit(originalPlan, note) {
  if (!originalPlan) return;
  const logs = loadEditLogs();
  const entry = {
    id:        Date.now().toString(),
    savedAt:   new Date().toISOString(),
    type:      'storyPlanEdit',
    meta: {
      candidateType:  (S.analysis || {}).candidateTypeCategory || '',
      temperature:    ((S.analysis || {}).temperature || {}).stars || null,
      selectedAppeals: S.selectedAppeals || []
    },
    storyPlan: {
      openingFocus:    originalPlan.openingFocus || '',
      closingStyle:    originalPlan.closingStyle || '',
      ibmAppealsTop1:  (originalPlan.ibmAppeals || [])[0]?.appeal || '',
      flowSummary:     (originalPlan.conversationFlow || []).map(f => f.phase).join(' → ')
    },
    recruiterNote: note || ''
  };
  logs.unshift(entry);
  localStorage.setItem(EDITLOG_KEY, JSON.stringify(logs.slice(0, 200)));
}

// ══════════════════════════════════════════
// スカウト履歴管理（v2.0: IndexedDB二重保存）
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

  // localStorage（最大50件・高速アクセス用）
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50)));
  // v2.0: IndexedDB（無制限・永続化）
  idbPut('history', entry);
  return id;
}

function loadScoutHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

/**
 * v2.0: IndexedDB から全履歴を取得（localStorage の上限を超えた履歴を含む）
 * @returns {Promise<Array>}
 */
async function loadScoutHistoryAll() {
  const idbEntries = await idbGetAll('history');
  if (idbEntries.length === 0) return loadScoutHistory();  // fallback
  return idbEntries;
}

function updateHistoryResult(id, result) {
  const history = loadScoutHistory();
  const entry = history.find(h => h.id === id);
  if (!entry) return;
  entry.result = { ...entry.result, ...result };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  // v2.0: IndexedDB にも反映
  idbPut('history', entry);
}

function deleteHistoryEntry(id) {
  const history = loadScoutHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  // v2.0: IndexedDB からも削除
  idbDelete('history', id);
}

// ══════════════════════════════════════════
// Phase3a: 修正ログfew-shot構築
// ══════════════════════════════════════════

/**
 * 蓄積した修正ログから「AI案 → リクルーター修正版」のfew-shotを構築
 * 同じ候補者タイプ・同じセクションの修正パターンを最大3件返す
 *
 * @param {string} typeCategory - 候補者タイプ
 * @param {string[]} selectedAppeals - 選択した訴求名リスト
 * @returns {string} few-shotテキスト（プロンプト注入用）
 */
function buildFewShotFromEditLogs(typeCategory, selectedAppeals) {
  const logs = loadEditLogs();
  if (!logs || logs.length === 0) return '';

  // 同タイプのログを優先、最大3件
  const relevant = logs
    .filter(l => l.meta?.candidateType === typeCategory && l.edited && l.aiVersion)
    .slice(0, 3);

  if (relevant.length === 0) return '';

  return relevant.map((l, i) => {
    const secLabel = { subject: '件名', intro: '冒頭文', why: '理由', match: '接点', benefit: 'メリット', cta: '誘導文' };
    return `参考例${i + 1}【${secLabel[l.section] || l.section}】
AI案: ${(l.aiVersion || '').slice(0, 80)}...
修正後: ${(l.edited || '').slice(0, 80)}...`;
  }).join('\n\n');
}
