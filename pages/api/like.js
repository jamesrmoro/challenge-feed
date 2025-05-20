import { Client, Databases, ID, Query } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não suportado' });
  }

  const { url, title, contestStart } = req.body;
  if (!url) return res.status(400).json({ error: 'Faltou o url!' });

  // Gera um sessionId simples para quem não tem login (salve no localStorage no front para persistir)
  let sessionId = req.cookies?.sessionId;
  if (!sessionId) {
    sessionId = Math.random().toString(36).substr(2, 10);
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly; Max-Age=31536000`);
  }

  // Appwrite init
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const collectionId = process.env.APPWRITE_LIKES_COLLECTION_ID;

  try {
    // Só deixa 1 like por jam por sessionId/browser
    const existing = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('url', url),
      Query.equal('sessionId', sessionId),
      Query.limit(1)
    ]);

    let liked = false;

    if (existing.total > 0) {
      // Se já existe, deslike (apaga)
      await databases.deleteDocument(databaseId, collectionId, existing.documents[0].$id);
      liked = false;
    } else {
      // Se não existe, cria like
      await databases.createDocument(databaseId, collectionId, ID.unique(), {
        url,
        title: title || '',
        contestStart: contestStart || '',
        sessionId,
        createdAt: new Date().toISOString()
      });
      liked = true;
    }

    return res.status(200).json({ liked });
  } catch (err) {
    console.error('Erro Appwrite:', err.message, err);
    return res.status(500).json({ error: 'Falha ao gravar/remover like.' });
  }
}
