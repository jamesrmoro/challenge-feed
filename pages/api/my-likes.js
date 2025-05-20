// pages/api/my-likes.js
import { Client, Databases, Query } from 'node-appwrite';

export default async function handler(req, res) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  const databaseId = process.env.APPWRITE_DATABASE_ID;
  const collectionId = process.env.APPWRITE_LIKES_COLLECTION_ID;

  let sessionId = req.cookies?.sessionId;
  if (!sessionId) return res.status(200).json({});

  try {
    const myLikes = await databases.listDocuments(databaseId, collectionId, [
      Query.equal('sessionId', sessionId),
      Query.limit(1000),
    ]);
    // Retorna um map de url: true
    const liked = {};
    myLikes.documents.forEach(doc => {
      liked[doc.url] = true;
    });
    res.status(200).json(liked);
  } catch (err) {
    res.status(500).json({});
  }
}
