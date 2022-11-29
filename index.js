const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken');

require('colors')
require('dotenv').config()

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
const PaymentsCollection = client.db('TruckBazar').collection('payments')

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

//2 (admin varifying function)
const verifyAdmin = async (req, res, next) => {
    const decodedEmail = req.decoded.email
    const query = { email: decodedEmail }
    const user = await usersCollection.findOne(query)
    if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
    }
    next()
}

//api's / endspoints

//root api
app.get('/', (req, res) => {
    res.send('truck-Bazar-server is running')
})

//api for getting category base product
app.get('/category/:id', verifyJwt, async (req, res) => {
    try {
        const id = req.params.id
        const query1 = { CategoryName: id }
        const query2 = { CategoryName: id, paid: true }
        const allProducts = await ProductsCollection.find(query1).toArray()
        let remainingProducts = allProducts.filter(product => product.paid !== true)
        res.send(remainingProducts)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting products for a single seller
app.get('/myproducts', async (req, res) => {
    try {
        const email = req.query.email
        const query = { seller_email: email }
        const products = await ProductsCollection.find(query).toArray()
        res.send(products)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for adding products
app.post('/addproduct', async (req, res) => {
    try {
        const product = req.body
        const result = await ProductsCollection.insertOne(product)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for deleting products
app.delete('/deleteproduct/:id', async (req, res) => {
    try {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const result = await ProductsCollection.deleteOne(query)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for updating advertising status of a products .
app.put('/product/advertise/:id', async (req, res) => {
    try {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const option = { upsert: true }
        const updatedDoc = { $set: { advertise: true } }
        const result = await ProductsCollection.updateOne(filter, updatedDoc, option)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting advertise product
app.get('/advertiseProducts', async (req, res) => {
    try {
        const query = { advertise: true }
        const products = await ProductsCollection.find(query).toArray()
        const NonadvertiseProducts = products.filter(product => product.paid !== true)
        res.send(NonadvertiseProducts)
    }
    catch (error) {
        res.send(error.message)
    }
})


//----------following api's are for managing users(buyer,seller/admin)-----------------//

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

//api for getting a single user info from db
app.get('/user', async (req, res) => {
    try {
        const email = req.query.email
        const query = { email }
        const result = await usersCollection.findOne(query)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting all sellers info from db
app.get('/sellers', async (req, res) => {
    try {
        const query = { role: "Seller" }
        const users = await usersCollection.find(query).toArray()
        res.send(users)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting all sellers info from db
app.get('/buyers', async (req, res) => {
    try {
        const query = { role: "Buyer" }
        const users = await usersCollection.find(query).toArray()
        res.send(users)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting all sellers info from db
app.get('/admin', async (req, res) => {
    try {
        const query = { role: "admin" }
        const users = await usersCollection.find(query).toArray()
        res.send(users)
    }
    catch (error) {
        res.send(error.message)
    }
})

//-------------------------------------------//


//-----------------------api's for update and delete operation----------------------//

//api for updating user role to admin .
app.put('/users/admin/:id', verifyJwt, verifyAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const option = { upsert: true }
        const updatedDoc = { $set: { role: 'admin' } }
        const result = await usersCollection.updateOne(filter, updatedDoc, option)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for updating user role admin to buyer(removing from admin) .
app.put('/users/remove-from-admin/:id', verifyJwt, verifyAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const option = { upsert: true }
        const updatedDoc = { $set: { role: 'Buyer' } }
        const result = await usersCollection.updateOne(filter, updatedDoc, option)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for updating user varification(varified or not varified).
app.put('/users/verify/:id', verifyJwt, verifyAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const filter = { _id: ObjectId(id) }
        const option = { upsert: true }
        const updatedDoc = { $set: { seller_verification: true } }
        const result = await usersCollection.updateOne(filter, updatedDoc, option)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for deleting user from database( N.B. : user will be only remove from database not from firebase) .
app.delete('/users/delete/:id', verifyJwt, verifyAdmin, async (req, res) => {
    try {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        const result = await usersCollection.deleteOne(query)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})


//------------------------------api's for verification for hooks-------------------//

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

//api for verifying user buyers or not from db
app.get('/users/buyer/:email', async (req, res) => {
    try {
        const email = req.params.email
        const query = { email }
        const user = await usersCollection.findOne(query)
        res.send({ isSeller: user?.role === 'Buyer' })
    }
    catch (error) {
        res.send(error.message)
    }
})

//----------------------------------------------------------------------------//

//api for posting booking info in db
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

//api for getting booking info for a singel user
app.get('/bookings', async (req, res) => {
    try {
        const email = req.query.email
        const query = { buyer_email: email }
        const result = await BookingsCollection.find(query).toArray()
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for getting booking info for a singel product
app.get('/booking/:id', async (req, res) => {
    try {
        const id = req.params.id
        const query = { _id: ObjectId(id) }
        console.log(query);
        const result = await BookingsCollection.findOne(query)
        res.send(result)
    }
    catch (error) {
        res.send(error.message)
    }
})


//---------------api's for payment task--------------------------//

//api for payment gateway...
app.post('/create-payment-intent', async (req, res) => {
    try {
        const booking = req.body
        const price = booking.product_price
        const amount = parseInt(price * 100)

        const paymentIntent = await stripe.paymentIntents.create({
            currency: 'BDT',
            amount: amount,
            "payment_method_types": [
                "card"
            ],
        });
        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    }
    catch (error) {
        res.send(error.message)
    }
})

//api for store payments data
app.post('/payments', async (req, res) => {
    try {
        const payment = req.body
        const result = await PaymentsCollection.insertOne(payment)
        const id = payment.bookingId
        const prodId = payment.product_id

        //updaing paid status in booking
        const filter = { _id: ObjectId(id) }
        const updateDoc = {
            $set: {
                paid: true,
                transactionId: payment.transactionId
            }
        }
        const updateResult = await BookingsCollection.updateOne(filter, updateDoc)

        //updaing paid status in productscollection
        const filter2 = { _id: ObjectId(prodId) }
        const updateDoc2 = {
            $set: {
                paid: true,
            }
        }
        const updateResult2 = await ProductsCollection.updateOne(filter2, updateDoc2)

        //sending the result of inserting data in payment.
        res.send(result)

    }
    catch (error) {
        res.send({ message: result })
    }
})


//-----------------------JWT token ---------------------//

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
