// pages/api/likes-count.js
import { Client, Databases, Query } from 'node-appwrite';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const collectionId = process.env.APPWRITE_LIKES_COLLECTION_ID;

  try {
    const allLikes = await databases.listDocuments(databaseId, collectionId, [
      Query.limit(1000), // aumente se tiver muitos likes
    ]);
    const likeCounts = {};
    allLikes.documents.forEach(like => {
      likeCounts[like.url] = (likeCounts[like.url] || 0) + 1;
    });
    res.status(200).json(likeCounts);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar likes', detail: err.message });
  }
}
