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

const LIKES_COLLECTION = "artifact_likes";


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
        const {userEmail} = req.body;
        const artifactName = req.params.artifactName;
        const likesCollection =  await db.collection(LIKES_COLLECTION);
        const artifactCollection = await db.collection("artifact");


        const existingLike = await likesCollection.findOne({artifactName, userEmail});
        if (existingLike) {
            await likesCollection.deleteOne({artifactName, userEmail});
            res.json({ liked: false });

        } else {
            await likesCollection.insertOne({artifactName, userEmail});
            res.json({ liked: true });
        }
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.get("/api/artifacts/:artifactName/like-status", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const { userEmail } = req.query;
        const { artifactName } = req.params;
        const likesCollection = db.collection(LIKES_COLLECTION);

        const totalLikes = await likesCollection.countDocuments({ artifactName });

        const userLiked = await likesCollection.findOne({ artifactName, userEmail });

        res.json({
            isLiked: !!userLiked,
            totalLikes
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Local sever running on http://localhost:${PORT}/api `);
});

export default app;