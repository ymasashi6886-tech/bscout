// Netlify Function: OpenAI / IBM watsonx.ai 両対応プロキシ (v2.0)
// APIキー・認証情報は Netlify 環境変数で管理
//
// 環境変数:
//   OPENAI_API_KEY      — OpenAI APIキー
//   WX_URL              — watsonx.ai テキスト生成エンドポイント
//   WX_TOKEN            — watsonx.ai IAMトークン（Bearer〜）
//   WX_PROJECT_ID       — watsonx.ai プロジェクトID

exports.handler = async function (event) {
  // CORS プリフライト
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  // バックエンド判定: body に backend:"watsonx" が含まれる場合は watsonx 経由
  const backend = body.backend || "openai";

  if (backend === "watsonx") {
    return await handleWatsonx(body);
  } else {
    return await handleOpenAI(body);
  }
};

// ── OpenAI プロキシ ──────────────────────────
async function handleOpenAI(body) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "OPENAI_API_KEY が設定されていません。Netlifyの環境変数を確認してください。" }),
    };
  }

  // backend フィールドを除去してそのままOpenAIへ転送
  const { backend: _b, ...openaiBody } = body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(openaiBody),
    });

    const data = await response.json();
    return { statusCode: response.status, headers: corsHeaders(), body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
}

// ── IBM watsonx.ai プロキシ ───────────────────
async function handleWatsonx(body) {
  const wxUrl     = process.env.WX_URL;
  const wxToken   = process.env.WX_TOKEN;
  const wxProject = process.env.WX_PROJECT_ID;

  if (!wxUrl || !wxToken) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: "WX_URL / WX_TOKEN が設定されていません。Netlifyの環境変数を確認してください。" }),
    };
  }

  // OpenAI messages 形式 → watsonx.ai text generation 形式に変換
  const messages  = body.messages || [];
  const systemMsg = messages.find(m => m.role === "system")?.content || "";
  const userMsg   = messages.find(m => m.role === "user")?.content || "";
  const model     = body.model || "ibm/granite-13b-instruct-v2";

  const wxBody = {
    model_id:   model,
    project_id: body.project_id || wxProject || "",
    input:      systemMsg ? `${systemMsg}\n\n${userMsg}` : userMsg,
    parameters: {
      decoding_method: "greedy",
      max_new_tokens:  body.max_tokens || 2000,
      temperature:     body.temperature || 0.7,
      stop_sequences:  [],
    },
  };

  // IAMトークンの正規化（Bearer 付き・なし両対応）
  const authHeader = wxToken.startsWith("Bearer ") ? wxToken : `Bearer ${wxToken}`;

  try {
    const response = await fetch(wxUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:  authHeader,
      },
      body: JSON.stringify(wxBody),
    });

    const data = await response.json();

    // watsonx レスポンスをそのまま返す（フロントで parseApiResponse が処理）
    return { statusCode: response.status, headers: corsHeaders(), body: JSON.stringify(data) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: err.message }) };
  }
}

// ── CORS ヘッダー ────────────────────────────
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}
