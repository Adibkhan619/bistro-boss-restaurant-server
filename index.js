const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vfffbgl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        //  DATABASES------------->
        const usersCollection = client.db("bistroDB").collection("users");
        const menuCollection = client.db("bistroDB").collection("menu");
        const reviewCollection = client.db("bistroDB").collection("review");
        const cartCollection = client.db("bistroDB").collection("cart");

        // pOst user data into db ----------->
        app.post("/users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);
            if (existingUser) {
                return res.send({
                    message: "user already exist",
                    insertedId: null,
                });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // get users from db------->
        app.get("/users", async (req, res) => {
            result = await usersCollection.find().toArray();
            res.send(result);
        });

        // delete user ---------->
        app.delete("/users/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // *makeing admin----------.>
        app.patch("/users/admin/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: "admin",
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        // ! Menu related APIs ------------>
        // get all menu data from db -------------->
        app.get("/menu", async (req, res) => {
            result = await menuCollection.find().toArray();
            res.send(result);
        });

        // post cart data into db-------------------->
        app.post("/carts", async (req, res) => {
            cartItem = req.body;
            result = await cartCollection.insertOne(cartItem);
            res.send(result);
        });

        // get cart data from db --------->
        app.get("/carts", async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        // delete cart data from db --------->
        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartCollection.deleteOne(query);
            res.send(result);
        });

        app.get("/", (req, res) => {
            res.send("App is running");
        });

        app.listen(port, () => {
            console.log(`App is running on port : ${port}`);
        });

        // Send a ping to confirm a successful connection

        // await client.db("admin").command({ ping: 1 });

        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
