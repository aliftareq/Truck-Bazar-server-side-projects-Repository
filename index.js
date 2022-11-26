const { MongoClient, ServerApiVersion } = require('mongodb');
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');

require('colors')
require('dotenv').config()

// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express()
const port = process.env.PORT || 5000;

//middlewares
app.use(cors())
app.use(express.json())

//uri & client
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.preca8g.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


//db connection function
async function run() {
    try {
        client.connect()
        console.log('Database connected succesfully'.yellow.bold);
    }
    catch (error) {
        console.log(error.message.red.bold);
    }
}
run().catch(err => console.log(err.message.red.bold))

//collections
const usersCollection = client.db('TruckBazar').collection('users')
const ProductsCollection = client.db('TruckBazar').collection('Products')
const BookingsCollection = client.db('TruckBazar').collection('Bookings')

//common funcions 

//1
function verifyJwt(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }

    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded
        next()
    })
}

//api's / endspoints

//root api
app.get('/', (req, res) => {
    res.send('truck-Bazar-server is running')
})

//api for getting categories
app.get('/category/:id', verifyJwt, async (req, res) => {
    try {
        const id = req.params.id
        const query = { CategoryName: id }
        const categories = await ProductsCollection.find(query).toArray()
        res.send(categories)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for posting user info in db
app.post('/users', async (req, res) => {
    try {
        const user = req.body
        const result = await usersCollection.insertOne(user)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for verifying user admin or not from db
app.get('/users/admin/:email', async (req, res) => {
    try {
        const email = req.params.email
        const query = { email }
        const user = await usersCollection.findOne(query)
        res.send({ isAdmin: user?.role === 'admin' })
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for verifying user seller or not from db
app.get('/users/seller/:email', async (req, res) => {
    try {
        const email = req.params.email
        const query = { email }
        const user = await usersCollection.findOne(query)
        res.send({ isSeller: user?.role === 'Seller' })
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for posting bboking info in db
app.post('/bookings', async (req, res) => {
    try {
        const booking = req.body
        const result = await BookingsCollection.insertOne(booking)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for issue a access token
app.get('/jwt', async (req, res) => {
    try {
        const email = req.query.email
        const query = { email: email }
        const user = await usersCollection.findOne(query)
        if (user) {
            const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '5h' })
            return res.send({ accessToken: token })
        }
        res.status(403).send({ accessToken: '' })
    }
    catch (error) {
        res.send({ message: error.message })
    }
})

app.listen(port, () => {
    console.log(`This server is running on ${port}`);
})