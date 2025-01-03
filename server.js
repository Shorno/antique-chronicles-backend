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
        // console.log(req.params)
        const result = await artifactCollection.findOne({name: req.params.artifactName});
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.patch("/api/artifacts/:artifactName", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        const result = await artifactCollection.updateOne({name: req.params.artifactName}, {$set: req.body});
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.delete("/api/artifacts/:artifactName", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        const likesCollection = await db.collection(LIKES_COLLECTION);

        const artifactResult = await artifactCollection.deleteOne({name: req.params.artifactName});
        const likesResult = await likesCollection.deleteOne({artifactName: req.params.artifactName});

        res.json({artifactResult, likesResult});
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

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
        const {artifactName} = req.params;

        const likesCollection = db.collection(LIKES_COLLECTION);

        const existingDoc = await likesCollection.findOne({artifactName});

        if (!existingDoc) {
            await likesCollection.insertOne({
                artifactName,
                likedBy: [userEmail],
                likeCount: 1
            });
            return res.json({liked: true, totalLikes: 1});
        }

        const hasLiked = existingDoc.likedBy.includes(userEmail);

        if (hasLiked) {
            await likesCollection.updateOne(
                {artifactName},
                {
                    $pull: {likedBy: userEmail},
                    $inc: {likeCount: -1}
                }
            );
            const updatedDoc = await likesCollection.findOne({artifactName});
            return res.json({
                liked: false,
                totalLikes: updatedDoc.likeCount
            });
        } else {
            await likesCollection.updateOne(
                {artifactName},
                {
                    $addToSet: {likedBy: userEmail},
                    $inc: {likeCount: 1}
                }
            );
            const updatedDoc = await likesCollection.findOne({artifactName});
            return res.json({
                liked: true,
                totalLikes: updatedDoc.likeCount
            });
        }
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.get("/api/artifacts/:artifactName/like-status", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const {userEmail} = req.query;
        const {artifactName} = req.params;

        const doc = await db.collection(LIKES_COLLECTION).findOne(
            {artifactName},
            {projection: {likedBy: 1, likeCount: 1}}
        );

        res.json({
            isLiked: doc?.likedBy?.includes(userEmail) || false,
            totalLikes: doc?.likeCount || 0
        });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.get("/api/featured-artifacts/", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const likesCollection = db.collection(LIKES_COLLECTION);
        const artifactCollection = db.collection("artifact");

        const mostLiked = await likesCollection
            .find()
            .sort({likeCount: -1})
            .limit(6)
            .toArray();

        const artifactDetails = await Promise.all(
            mostLiked.map(async (likeDoc) => {
                const artifact = await artifactCollection.findOne({name: likeDoc.artifactName});
                return {
                    ...artifact,
                    likeCount: likeDoc.likeCount,
                    likedBy: likeDoc.likedBy
                };
            })
        );
        res.json(artifactDetails);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
});

app.get("/api/artifacts/search/:artifactName", async (req, res) => {
    try {
        const db = await connectToDatabase();
        const artifactCollection = await db.collection("artifact");
        const result = await artifactCollection.find({
            name: {
                $regex: req.params.artifactName,
                $options: 'i'
            }
        }).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({error: error.message});
    }
})

app.listen(PORT, () => {
    console.log(`Local sever running on http://localhost:${PORT}/api `);
});

