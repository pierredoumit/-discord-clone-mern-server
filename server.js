const express = require('express');
const mongoose = require('mongoose');
const cors = require("cors")
const mongoData = require('./mongoData.js');
const Pusher = require('pusher')

//app config
const app = express();
const port = process.env.PORT || 8002;

const pusher = new Pusher({
    appId: '1095360',
    key: '7d2b6c1fbc4cbcf6c3a5',
    secret: '136c9a4db08fd1a90dd9',
    cluster: 'ap2',
    encrypted: true
});

//middleware
app.use(express.json());
app.use(cors())


//db config

const dbUrl = 'mongodb+srv://admin:7jYjho5WACwNZc6x@cluster0.sdlbq.mongodb.net/discord-mern?retryWrites=true&w=majority';
//const dbUrl = 'mongodb://localhost/discord-mern';
//connecting to mongoose
mongoose.connect(dbUrl, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true }, (err, data) => {
    console.log('mongo db connection', err);
});

mongoose.connection.once('open', () => {
    console.log('DB Connected');

    const db = mongoose.connection;
    const convCollection = db.collection('conversations')
    const changeStream = convCollection.watch();

    changeStream.on('change', (change) => {
        if (change.operationType === 'insert') {
            pusher.trigger('channels', 'newChannel', {
                'change': change
            });
        }
        else if (change.operationType === 'update') {
            pusher.trigger('conversation', 'newMessage', {
                'change': change
            });
        }
        else {
            console.log("Error triggering Pusher")
        }
    })

})


//api routes
app.get('/', (req, res) => res.status(200).send("hello"))

app.post('/new/channel', (req, res) => {
    const dbData = req.body;
    mongoData.create(dbData, (err, data) => {
        if (err) {
            res.status(500).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
});

app.get('/get/channelList', (req, res) => {
    mongoData.find((err, data) => {
        if (err) {
            res.status(500).send(err);
        }
        else {
            let channels = [];
            data.map((channelData) => {
                const channelInfo = {
                    id: channelData._id,
                    name: channelData.channelName,
                }
                channels.push(channelInfo);
            })
            res.status(200).send(data)
        }
    })
});

app.post('/new/message', (req, res) => {
    const newMessage = req.body;

    const query = { _id: req.query.id }

    mongoData.updateOne(query, { $push: { conversation: newMessage } }, (err, data) => {
        if (err) {
            res.status(500).send(err)
        }
        else {
            res.status(201).send(data)
        }
    })
});

app.get('/get/conversation', (req, res) => {
    const id = req.query.id;
    const query = { _id: id }
    mongoData.find(query, (err, data) => {
        if (err) {
            res.status(500).send(err)
        }
        else {
            res.status(200).send(data)
        }
    })
})


//listened

app.listen(port, () => console.log("listening on localhost" + port))