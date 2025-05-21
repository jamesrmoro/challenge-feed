// pages/api/ask.js
import Together from 'together-ai';
import { Client, Databases, Query } from 'node-appwrite';

const together = new Together({ apiKey: process.env.TOGETHER_API_KEY });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_COLLECTION_ID;

// Função robusta para calcular dias restantes aceitando qualquer formato
function getDaysLeft(submissionsDue) {
  if (!submissionsDue) return 'date not informed';
  let parsed = submissionsDue;
  parsed = parsed.replace(/(\d+)(st|nd|rd|th)/, '$1');
  parsed = parsed.replace(/ at .*$/, '');
  let date;
  try {
    date = new Date(parsed);
    if (isNaN(date.getTime())) {
      const parts = parsed.match(/([A-Za-z]+) (\d{1,2}),? (\d{4})/);
      if (parts) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const month = (months.findIndex(m => parts[1].toLowerCase().startsWith(m.toLowerCase())) + 1).toString().padStart(2,'0');
        const str = `${parts[3]}-${month}-${parts[2].padStart(2,'0')}`;
        date = new Date(str);
      }
    }
  } catch(e) {
    return 'date not informed';
  }
  if (isNaN(date.getTime())) return 'date not informed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const msDiff = date - today;
  const daysLeft = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    // Mostra quando terminou
    const ended = date;
    return `ended on ${ended.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
  }
  if (daysLeft === 0) return 'last day';
  return `${daysLeft} days left`;
}

// Calcula dias até o início
function getStartInfo(contestStart) {
  if (!contestStart) return '';
  let parsed = contestStart;
  parsed = parsed.replace(/(\d+)(st|nd|rd|th)/, '$1');
  parsed = parsed.replace(/ at .*$/, '');
  let date;
  try {
    date = new Date(parsed);
    if (isNaN(date.getTime())) {
      const parts = parsed.match(/([A-Za-z]+) (\d{1,2}),? (\d{4})/);
      if (parts) {
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const month = (months.findIndex(m => parts[1].toLowerCase().startsWith(m.toLowerCase())) + 1).toString().padStart(2,'0');
        const str = `${parts[3]}-${month}-${parts[2].padStart(2,'0')}`;
        date = new Date(str);
      }
    }
  } catch(e) {
    return '';
  }
  if (isNaN(date.getTime())) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const msDiff = date - today;
  const daysToStart = Math.ceil(msDiff / (1000 * 60 * 60 * 24));
  if (daysToStart > 1) return `starts in ${daysToStart} days`;
  if (daysToStart === 1) return `starts tomorrow`;
  if (daysToStart === 0) return `starts today`;
  return ''; // já começou
}

// Identifica eventos para equipes
function hasTeamSupport(jam) {
  return (jam.plataform && jam.plataform.includes('dev.to')) ||
    (jam.tags && Array.isArray(jam.tags) && jam.tags.some(tag => /team|collab|equipe|grupo|parceria/i.test(tag)));
}

// Identifica eventos de AI
function hasAI(jam) {
  const aiRegex = /\b(ai|artificial intelligence|machine learning|ml|deep learning)\b/i;
  return aiRegex.test(jam.title || '') ||
         aiRegex.test(jam.description || '') ||
         (jam.tags && Array.isArray(jam.tags) && jam.tags.some(tag => aiRegex.test(tag)));
}

// Detecta domínio citado na pergunta
function getRequestedDomain(question) {
  if (!question) return null;
  const q = question.toLowerCase();
  if (q.includes("itch.io")) return "itch.io";
  if (q.includes("dev.to")) return "dev.to";
  // Adicione outros domínios se quiser
  return null;
}

// Pós-processamento para forçar links nos títulos (cobre frases soltas)
function forceLinksInAnswer(answer, jams) {
  let output = answer;
  function normalizeString(str) {
    return str.normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^\w\s]/g, "") // Remove pontuação
      .toLowerCase()
      .trim();
  }
  jams.forEach(jam => {
    const markdownLink = `[${jam.title}](${jam.url})`;
    const titleNorm = normalizeString(jam.title);
    output = output.replace(
      new RegExp(`\\[?${escapeRegExp(jam.title)}\\]?\\([^)]+\\)?`, "gi"),
      markdownLink
    );
    output = output.replace(
      new RegExp(`(^|\\n|\\d+\\.\\s*|-\\s*)${escapeRegExp(jam.title)}(?!\\]\\()`, "gi"),
      `$1${markdownLink}`
    );
    output = output.replace(
      new RegExp(titleNorm, "gi"),
      markdownLink
    );
  });

  // Corrige links markdown aninhados e malformados
  while (/\[\[([^\]]+)\]\((https?:\/\/[^\)\]]+)\)\]/.test(output)) {
    output = output.replace(/\[\[([^\]]+)\]\((https?:\/\/[^\)\]]+)\)\]/g, '[$1]($2)');
  }
  output = output.replace(/\[([^\[\]]+)\((https?:\/\/[^\)\]]+)\)\]/g, '[$1]($2)');

  // NOVO: Converte Title(link) para [Title](link), mas só se não estiver já em Markdown
  // (não pega casos já com [Title](link) nem imagens ![])
  output = output.replace(/(^|[^!\[\]])\b([A-Z][A-Za-z0-9 .\-:'"]{2,100})\((https?:\/\/[^\)]+)\)/g, '$1[$2]($3)');

  return output;
}


function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default async function handler(req, res) {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Missing question.' });

  try {
    // Busca os documentos do Appwrite
    const { documents } = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]
    );
    const jams = documents;

    // Tipos de perguntas especiais
    const isTeamQuestion = question.toLowerCase().includes('team') ||
                           question.toLowerCase().includes('equipe') ||
                           question.toLowerCase().includes('collab') ||
                           question.toLowerCase().includes('colaboração') ||
                           question.toLowerCase().includes('grupo');

    const isAIQuestion = question.toLowerCase().includes('ai') ||
                         question.toLowerCase().includes('artificial intelligence') ||
                         question.toLowerCase().includes('machine learning') ||
                         question.toLowerCase().includes('hackathon');

    const requestedDomain = getRequestedDomain(question);

    // Detecta perguntas históricas ou sobre local/data
    const isHistoryQuestion =
      /\b(where|held|happened|past|ended|ran|history|finished|location|took place|when was|about)\b/i.test(question);

    // Filtro por nome do evento, se aparecer na pergunta (ajuda para where/when/held)
    const normalizedQuestion = question.trim().toLowerCase();
    const jamByTitle = jams.find(j =>
      j.title && normalizedQuestion.includes(j.title.toLowerCase().slice(0, 18)) // 18 para pegar até nomes longos
    );

    let filteredJams;
    if (jamByTitle) {
      filteredJams = [jamByTitle];
    } else if (requestedDomain) {
      filteredJams = jams.filter(j =>
        j.url && j.url.includes(requestedDomain) &&
        (isHistoryQuestion || !['date not informed'].includes(getDaysLeft(j.submissionsDue)))
      );
    } else if (isAIQuestion) {
      filteredJams = jams.filter(j =>
        hasAI(j) && (isHistoryQuestion || !['date not informed'].includes(getDaysLeft(j.submissionsDue)))
      );
    } else if (isTeamQuestion) {
      filteredJams = jams.filter(j =>
        hasTeamSupport(j) && (isHistoryQuestion || !['date not informed'].includes(getDaysLeft(j.submissionsDue)))
      );
    } else {
      filteredJams = jams.filter(j =>
        (isHistoryQuestion || !['date not informed'].includes(getDaysLeft(j.submissionsDue)))
      );
    }

    // Monta contexto, destacando eventos para equipes
    const context = filteredJams.map(j => {
      const daysLeft = getDaysLeft(j.submissionsDue);
      const startInfo = getStartInfo(j.contestStart);
      let info = '';
      if (startInfo) {
        info = `${startInfo}, ends in ${daysLeft}`;
      } else {
        info = `${daysLeft}`;
      }
      const teamLabel = hasTeamSupport(j) ? ' [team/collab available]' : '';
      return `- [${j.title}](${j.url}) (${info})${teamLabel}`;
    }).join('\n');

    // Prompt em inglês, com instrução explícita de idioma
    const finalPrompt = `
IMPORTANT: Answer everything in ENGLISH only, no matter what the question language is.

You are an assistant specializing in game jams and hackathons. Answer ONLY based on the information below, exactly in the requested format.

Available events:
${context}

Question: "${question}"

Instructions for the answer:
- Always use a numbered Markdown list with each event as one item.
- If asked about events for teams or collaboration, highlight especially the events marked as '[team/collab available]'.
- If asked about AI, artificial intelligence, or hackathons, highlight events related to AI or machine learning.
- If the question asks about a specific site (like itch.io or dev.to), ONLY list events from that site.
- If the question is specifically about where or when a single challenge happened, answer with just the relevant event and date.
- Answer in Markdown, listing the events and their links. Explain how to find or form teams if possible.
- For specific questions (like the biggest event, or the next one), answer in a single short sentence, always including the event link in Markdown format.

Example response for team events:
1. [Frontend Challenge](https://dev.to/challenges/frontend-2024-06-10) _(starts in 5 days, ends in 12 days left)_ [team/collab available]
2. [Trans Representation Jam 25](https://itch.io/jam/trans-representation-jam-25) _(starts in 10 days, ends in 30 days left)_

You can find teams or form a group in events marked as '[team/collab available]'. Also, look for the collaboration section on the event websites.

Answer (in Markdown):`;

    let model = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    let response;

    try {
      response = await together.chat.completions.create({
        model,
        stream: false,
        messages: [{ role: 'user', content: finalPrompt }]
      });
    } catch (error) {
      console.warn('⚠️ Primary model failed, trying fallback.');
      model = 'meta-llama/Llama-3-8b-chat-hf';
      response = await together.chat.completions.create({
        model,
        stream: false,
        messages: [{ role: 'user', content: finalPrompt }]
      });
    }

    const answer = response.choices?.[0]?.message?.content.trim() || '❌ No answer.';
    const answerWithLinks = forceLinksInAnswer(answer, filteredJams);
    res.status(200).json({ answer: answerWithLinks });

  } catch (err) {
    console.error('❌ Error:', err);
    res.status(500).json({ answer: '❌ Error while querying AI.' });
  }
}
