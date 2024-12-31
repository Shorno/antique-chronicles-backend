import express from "express";
import cors from "cors";
import {connectToDatabase} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.send("Check api routes at /api");
});

app.get("/api", (req, res) => {
    res.send("Hello World");
})

const LIKES_COLLECTION = 'likes';

app.post("/api/artifacts", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifact = req.body;
        console.log(artifact);
        const artifactCollection = await db.collection("artifact");
        const result = await artifactCollection.insertOne(artifact);
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.get("/api/artifacts", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        const result = await artifactCollection.find().toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.get("/api/artifacts/:artifactName", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        console.log(req.params)
        const result = await artifactCollection.findOne({name: req.params.artifactName});
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})


app.get("/api/artifacts/user/:email", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        const result = await artifactCollection.find({adderEmail: req.params.email}).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.post("/api/artifacts/:artifactName/toggle-like", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { userEmail } = req.body;
        const { artifactName } = req.params;

        const likesCollection = db.collection(LIKES_COLLECTION);

        const existingDoc = await likesCollection.findOne({ artifactName });

        if (!existingDoc) {
            await likesCollection.insertOne({
                artifactName,
                likedBy: [userEmail],
                likeCount: 1
            });
            return res.json({ liked: true, totalLikes: 1 });
        }

        const hasLiked = existingDoc.likedBy.includes(userEmail);

        if (hasLiked) {
            await likesCollection.updateOne(
                { artifactName },
                {
                    $pull: { likedBy: userEmail },
                    $inc: { likeCount: -1 }
                }
            );
            const updatedDoc = await likesCollection.findOne({ artifactName });
            return res.json({
                liked: false,
                totalLikes: updatedDoc.likeCount
            });
        } else {
            await likesCollection.updateOne(
                { artifactName },
                {
                    $addToSet: { likedBy: userEmail },
                    $inc: { likeCount: 1 }
                }
            );
            const updatedDoc = await likesCollection.findOne({ artifactName });
            return res.json({
                liked: true,
                totalLikes: updatedDoc.likeCount
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/artifacts/:artifactName/like-status", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { userEmail } = req.query;
        const { artifactName } = req.params;

        const doc = await db.collection(LIKES_COLLECTION).findOne(
            { artifactName },
            { projection: { likedBy: 1, likeCount: 1 } }
        );

        res.json({
            isLiked: doc?.likedBy?.includes(userEmail) || false,
            totalLikes: doc?.likeCount || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
async function setupIndexes(db) {
    await db.collection(LIKES_COLLECTION).createIndex(
        { artifactName: 1 },
        { unique: true }
    );
}

app.listen(PORT, () => {
    console.log(`Local sever running on http://localhost:${PORT}/api `);
});

