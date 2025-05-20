import { Client, Databases, Query } from 'node-appwrite';

export default async function handler(req, res) {
  console.log('🧪 Appwrite config:', {
    endpoint: process.env.APPWRITE_ENDPOINT,
    project: process.env.APPWRITE_PROJECT_ID,
    db: process.env.APPWRITE_DATABASE_ID,
    collection: process.env.APPWRITE_COLLECTION_ID,
    key: !!process.env.APPWRITE_API_KEY
  });

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const result = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      [Query.limit(200)]
    );

    console.log('🔍 Resultado bruto do Appwrite:', JSON.stringify(result, null, 2));

    const jams = result.documents || [];

    // ✅ RESPOSTA CORRETA:
    res.status(200).json(
      jams.map(jam => ({
        title: jam.title,
        url: jam.url,
        description: jam.description,
        contestStart: jam.contestStart,
        submissionsDue: jam.submissionsDue,
        winnersAnnounced: jam.winnersAnnounced,
        image: jam.image || null,
      }))
    );

  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro ao buscar dados no Appwrite' });
  }
}
