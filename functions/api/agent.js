// =========================================================================
// ALMODARRESIEH — ONTURGIST AGENT API
// Cloudflare Pages Function (server-side)
//
// SECURITY: OPENROUTER_API_KEY is read from Cloudflare environment variables.
//           It is NEVER exposed to the browser.
//           If absent, returns { status: "offline" }.
//
// Architecture:
//   BROWSER → /api/agent → THIS FUNCTION → OPENROUTER → MODEL → AGENT → RESPONSE
// =========================================================================

const AGENT_PROMPTS = {
  Q: `You are the QUESTIONER in an Onturgic research system. Your purpose is to MAKE THE QUESTION HARDER. Never give answers. Identify assumptions, expose ambiguity, question definitions, generate second-order questions, identify missing variables, challenge premature conclusions. Output 1-3 sharpened questions, each harder than the original. Be concise. Be precise. Be uncomfortable. Respond in HTML-safe text (no markdown).`,

  C: `You are the CONSTRUCTOR in an Onturgic research system. Your purpose is to TURN IDEAS INTO STRUCTURES. Build the smallest thing that can be wrong: a specification, an architecture, a model, an experiment design, a prototype outline. Do not explain at length. Construct. Output: a structured construction in under 200 words. Respond in HTML-safe text. BUILD TO UNDERSTAND.`,

  A: `You are the ADVERSARY in an Onturgic research system. Your purpose is to BREAK THE CONSTRUCTION. Find contradictions, hidden assumptions, edge cases, technical failure modes, epistemic weaknesses, governance problems, ethical problems, unintended consequences. You MUST be allowed to say: THIS CONSTRUCTION FAILS. Do not hide failure. Output 1-3 specific resistance points. Be precise about WHERE and WHY it fails. Respond in HTML-safe text.`,

  R: `You are the REVISER in an Onturgic research system. Input: CONSTRUCTION + RESISTANCE. Output: REVISED CONSTRUCTION. Incorporate the resistance. Do not ignore it. Do not seek perfection. Seek better construction through resistance. Output: the revised construction in under 200 words. Note what changed and why. Respond in HTML-safe text.`,

  T: `You are the TRACER in an Onturgic research system. Your purpose is to CONNECT the current idea to the wider body of work. Look for relationships to: philosophy of technology, AI safety, software provenance, biological computing, multi-agent systems, Onturgism, ONTacture, petroleum trading, clinical evidence. Output: 1-3 connections, each with a brief reason why they relate. THE WORK IS SCATTERED. THE METHOD CONNECTS IT. Respond in HTML-safe text.`,

  M: `You are the CARTOGRAPHER in an Onturgic research system. Your purpose is to BUILD THE MAP OF POSSIBILITY. Given the current construction and its revisions, reveal new possibilities at the edges. What becomes possible now that this construction exists? What new questions does it open? Output: 1-3 new possibilities, each as a question. The field expands. Respond in HTML-safe text.`,

  X: `You are the ARCHIVIST in an Onturgic research system. Assign research identifiers and maintain the hidden architecture. Output: stable identifiers for the intellectual objects in the input. Respond in HTML-safe text.`
};

const AGENT_MODELS = {
  Q: 'OPENROUTER_MODEL_QUESTIONER',
  C: 'OPENROUTER_MODEL_CONSTRUCTOR',
  A: 'OPENROUTER_MODEL_ADVERSARY',
  R: 'OPENROUTER_MODEL_REVISER',
  T: 'OPENROUTER_MODEL_TRACER',
  M: 'OPENROUTER_MODEL_CARTOGRAPHER'
};

export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check if API key exists
  if (!env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({
      status: 'offline',
      message: 'AGENT NETWORK OFFLINE'
    }), { headers: corsHeaders });
  }

  // Parse request body
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid JSON body'
    }), { headers: corsHeaders });
  }

  const { agent, input, state } = body;

  // Ping check
  if (agent === 'ping') {
    return new Response(JSON.stringify({
      status: 'ok',
      message: 'Agent network online'
    }), { headers: corsHeaders });
  }

  // Validate agent
  if (!agent || !AGENT_PROMPTS[agent]) {
    return new Response(JSON.stringify({
      status: 'error',
      message: 'Invalid agent. Valid agents: Q, C, A, R, T, M, X'
    }), { headers: corsHeaders });
  }

  // Get model for this agent
  const modelEnvVar = AGENT_MODELS[agent];
  const defaultModel = env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
  const model = (modelEnvVar && env[modelEnvVar]) || defaultModel;

  // Build the user message from input + state
  let userMessage = input || '';
  if (state) {
    if (state.question_id) userMessage += `\n\nQuestion ID: ${state.question_id}`;
    if (state.construction_id) userMessage += `\nConstruction ID: ${state.construction_id}`;
    if (state.resistance_ids && state.resistance_ids.length > 0) {
      userMessage += `\nResistance IDs: ${state.resistance_ids.join(', ')}`;
    }
    if (state.evidence_ids && state.evidence_ids.length > 0) {
      userMessage += `\nEvidence IDs: ${state.evidence_ids.join(', ')}`;
    }
  }

  // Call OpenRouter
  try {
    const orResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.SITE_URL || 'https://almodarresieh.github.io',
        'X-Title': 'Almodarresieh Onturgic Field'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: AGENT_PROMPTS[agent] },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!orResponse.ok) {
      const errText = await orResponse.text();
      console.error('OpenRouter error:', orResponse.status, errText);
      return new Response(JSON.stringify({
        status: 'offline',
        message: 'Agent network error. The Field continues.'
      }), { headers: corsHeaders });
    }

    const orData = await orResponse.json();
    const output = orData.choices?.[0]?.message?.content || '';

    // Update state
    const newState = { ...state };
    switch (agent) {
      case 'Q':
        if (!newState.question_id) newState.question_id = `Q-${Date.now().toString().slice(-3)}`;
        newState.next_agent = 'C';
        break;
      case 'C':
        if (!newState.construction_id) newState.construction_id = `C-${Date.now().toString().slice(-3)}`;
        newState.next_agent = 'A';
        break;
      case 'A':
        newState.resistance_ids = newState.resistance_ids || [];
        newState.resistance_ids.push(`A-${Date.now().toString().slice(-3)}`);
        newState.revision_status = 'required';
        newState.next_agent = 'R';
        break;
      case 'R':
        newState.revision_status = 'completed';
        newState.next_agent = 'T';
        break;
      case 'T':
        newState.evidence_ids = newState.evidence_ids || [];
        newState.evidence_ids.push(`E-${Date.now().toString().slice(-3)}`);
        newState.next_agent = 'M';
        break;
      case 'M':
        newState.next_agent = null;
        break;
    }

    return new Response(JSON.stringify({
      status: 'ok',
      agent: agent,
      output: output,
      state: newState,
      model: model
    }), { headers: corsHeaders });

  } catch (error) {
    console.error('Agent API error:', error);
    return new Response(JSON.stringify({
      status: 'offline',
      message: 'Connection failed. Agent network offline.'
    }), { headers: corsHeaders });
  }
}

// Handle GET requests (health check)
export async function onRequestGet(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (!env.OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({
      status: 'offline',
      message: 'AGENT NETWORK OFFLINE'
    }), { headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    status: 'ok',
    message: 'Agent network online'
  }), { headers: corsHeaders });
}
