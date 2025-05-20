require('dotenv').config({ path: '.env.local' });
console.log('🔍 Loaded APPWRITE_ENDPOINT:', process.env.APPWRITE_ENDPOINT);
const { Client, Databases, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

const databaseId = process.env.APPWRITE_DATABASE_ID;
const collectionId = process.env.APPWRITE_COLLECTION_ID;

async function clearCollection() {
  try {
    const allDocs = await databases.listDocuments(databaseId, collectionId, [Query.limit(100)]);

    if (!allDocs.documents.length) {
      console.log('✅ Nenhum documento encontrado para deletar.');
      return;
    }

    for (const doc of allDocs.documents) {
      await databases.deleteDocument(databaseId, collectionId, doc.$id);
      console.log(`🗑️ Documento deletado: ${doc.$id}`);
    }

    console.log('✅ Todos os documentos foram removidos com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao limpar documentos:', err.message);
  }
}

clearCollection();

