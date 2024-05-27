const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
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
        const paymentCollection = client.db("bistroDB").collection("payment");

        // ! JWT related APi --->
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "1h",
            });
            res.send({ token });
        });

        // ? MIDDLEWARE ------->
        const verifyToken = (req, res, next) => {
            console.log("inside verify token", req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: "unauthorized access" });
            }
            const token = req.headers.authorization.split(" ")[1];
            jwt.verify(
                token,
                process.env.ACCESS_TOKEN_SECRET,
                (err, decoded) => {
                    if (err) {
                        return res
                            .status(401)
                            .send({ message: "unauthorized access" });
                    }
                    req.decoded = decoded;
                    next();
                }
            );
        };

        // ! Use verify admin after verifyToken---->
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === "admin";
            if (!isAdmin) {
                return res.status(403).send({ message: "forbidden access" });
            }
            next();
        };

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
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.get("/users/admin/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: "forbidden access" });
            }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === "admin";
            }
            res.send({ admin });
        });

        // delete user ---------->
        app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        });

        // *making admin----------.>
        app.patch(
            "/users/admin/:id",
            verifyToken,
            verifyAdmin,
            async (req, res) => {
                const id = req.params.id;
                const filter = { _id: new ObjectId(id) };
                const updateDoc = {
                    $set: {
                        role: "admin",
                    },
                };
                const result = await usersCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.send(result);
            }
        );

        // ! Menu related APIs ------------>
        // get all menu data from db -------------->
        app.get("/menu", async (req, res) => {
            result = await menuCollection.find().toArray();
            res.send(result);
        });

        app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        });

        // * Get menu item by id ---------->
        app.get("/menu/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.findOne(query);
            res.send(result);
        });

        // !Delete menu item --------->
        app.delete("/menu/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        });

        // ? Update menu item by id ----------->
        app.patch("/menu/:id", async (req, res) => {
            const item = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    name: item.name,
                    category: item.category,
                    recipe: item.recipe,
                    price: item.price,
                    image: item.image,
                },
            };
            const result = await menuCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // ! Cart Api ---------->
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

        // TODO: Payment Intent -------------- .>

        app.post("/create-payment-intent", async (req, res) =>{
            const { price } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card'], 
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        // todo: Payment API ---------> 

        app.get("/payments/:email", verifyToken, async (req, res) => {
            const query = {email: req.params.email}
            if(req.params.email !== req.decoded.email){
                return res.status(403).send({message: 'forbidden access'})
            }
            const result = await paymentCollection.find(query).toArray()
            res.send(result)
        })

        app.post("/payments", async (req, res) => {
            const payment = req.body;
            const paymentResult = await paymentCollection.insertOne(payment)
            console.log('payment info', payment);

            // *Carefully delete each item from the cart -----> 
            const query = { _id: {
                $in: payment.cartIds.map(id => new ObjectId(id))
            }}
            const deleteResult = await cartCollection.deleteMany(query)
            
            res.send({paymentResult, deleteResult})
        })

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
