import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { Client, Databases, ID, Query, Account } from 'node-appwrite';

// Mapeie aqui os coletores e seus nomes amigáveis:
const collectorMap = {
  [process.env.BRIGHT_COLLECTOR1]: 'site-dev.to',
  [process.env.BRIGHT_COLLECTOR2]: 'site-itch.io',
};

export default async function handler(req, res) {
  // ---- AUTENTICAÇÃO JWT APPWRITE ----
  const jwt = req.headers.authorization?.replace('Bearer ', '');
  if (!jwt) {
    return res.status(401).json({ error: 'Unauthorized: missing JWT' });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID);

  const account = new Account(client);

  let user;
  try {
    client.setJWT(jwt);
    user = await account.get();
    // Se quiser filtrar só admin, adicione abaixo:
    // if (user.email !== 'admin@seudominio.com') {
    //   return res.status(403).json({ error: 'Forbidden: not admin' });
    // }
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired JWT', details: e.message });
  }
  // ---- FIM AUTENTICAÇÃO ----

  // Resto do código igual ao original
  const token = process.env.BRIGHT_TOKEN;
  const collectors = [
    process.env.BRIGHT_COLLECTOR1,
    process.env.BRIGHT_COLLECTOR2,
  ];

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const collectionId = process.env.APPWRITE_COLLECTION_ID;

  try {
    const allResults = [];

    for (const [idx, collector] of collectors.entries()) {
      const collectorName = collectorMap[collector] || collector;

      console.log(`🔹 [${idx + 1}/${collectors.length}] Disparando coletor: ${collectorName} (${collector})`);
      const triggerRes = await axios.post(
        `https://api.brightdata.com/dca/trigger?collector=${collector}`,
        {},
        { headers }
      );

      const thisCollectionId = triggerRes.data.collection_id;
      if (!thisCollectionId) {
        console.warn(`⚠️ [${collectorName}] Não retornou collection_id.`);
        continue;
      }

      console.log(`📡 [${collectorName}] Coleta iniciada: ${thisCollectionId}`);

      let result;
      let retries = 10;
      while (retries--) {
        console.log(`⏳ [${collectorName}] Polling (${10 - retries}/10)...`);
        const pollRes = await axios.get(
          `https://api.brightdata.com/dca/dataset?id=${thisCollectionId}`,
          { headers }
        );

        if (Array.isArray(pollRes.data)) {
          result = pollRes.data;
          break;
        }

        await new Promise((r) => setTimeout(r, 30000));
      }

      if (!result) {
        console.warn(`❌ [${collectorName}] Sem dados após timeout.`);
        continue;
      }

      console.log(`📥 [${collectorName}] Resultados obtidos: ${result.length}`);

      allResults.push(...result);
    }

    const uniqueResults = Array.from(
      new Map(allResults.map((item) => [item.url, item])).values()
    );

    console.log(`📊 ${uniqueResults.length} dados únicos coletados.`);

    // Gravar no Appwrite: se já existir, atualizar; senão, criar novo
    let writtenCount = 0;
    let updatedCount = 0;

    for (const item of uniqueResults) {
      try {
        const existing = await databases.listDocuments(databaseId, collectionId, [
          Query.equal('url', item.url),
          Query.limit(1),
        ]);
        delete item.input;

        if (existing.total > 0) {
          const docId = existing.documents[0].$id;
          await databases.updateDocument(databaseId, collectionId, docId, item);
          updatedCount++;
          console.log(`♻️ Atualizado: ${item.url}`);
        } else {
          await databases.createDocument(databaseId, collectionId, ID.unique(), item);
          writtenCount++;
          console.log(`✅ Gravado: ${item.url}`);
        }
      } catch (err) {
        console.warn(`❌ Falha ao gravar/atualizar no Appwrite: ${item.url}`, err.message);
      }
    }

    // Remover URLs que não estão mais nos dados coletados!
    const urlsValidas = uniqueResults.map(item => item.url);
    try {
      const todosDocs = await databases.listDocuments(databaseId, collectionId, [
        Query.limit(2000)
      ]);
      const docs = todosDocs.documents;
      const docsParaApagar = docs.filter(doc => !urlsValidas.includes(doc.url));
      let removedCount = 0;

      for (const doc of docsParaApagar) {
        try {
          await databases.deleteDocument(databaseId, collectionId, doc.$id);
          removedCount++;
          console.log('🗑️ Removido:', doc.url);
        } catch (e) {
          console.warn('❌ Falha ao remover:', doc.url, e.message);
        }
      }

      console.log(`🧹 Limpeza: ${removedCount} documentos removidos do Appwrite.`);
    } catch (err) {
      console.warn('⚠️ Falha ao buscar/apagar docs antigos:', err.message);
    }

    // Salvar também em jams.json
    const filePath = path.join(process.cwd(), 'public', 'jams.json');
    await fs.writeFile(filePath, JSON.stringify(uniqueResults, null, 2), 'utf-8');

    return res.status(200).json({
      ok: true,
      count: uniqueResults.length,
      writtenToAppwrite: writtenCount,
      updatedInAppwrite: updatedCount,
      // opcional: removedFromAppwrite: removedCount
    });

  } catch (error) {
    console.error('🔥 Erro geral:', error?.response?.data || error);
    return res.status(500).json({
      error: 'Erro ao atualizar dados',
      details: error?.response?.data || error?.message || error
    });
  }
}
