import { MongoClient, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

let cachedDb = null;

export async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }

    const client = new MongoClient(process.env.DATABASE_URL, {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        },
    });

    try {
        await client.connect();
        const db = client.db("visaDB");
        cachedDb = db;
        console.log("🌿 MongoDB Connection Successful!");
        console.log("Database Name:", db.namespace);
        const collections = await db.listCollections().toArray();
        console.log("Available Collections:", collections.map(c => c.name));
        return db;
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error);
        throw error;
    }
}
