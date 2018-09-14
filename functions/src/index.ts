import * as functions from 'firebase-functions'
import * as express from 'express'
import * as request from 'request'
import * as line from '@line/bot-sdk' 
import * as cors from 'cors'
import * as admin from 'firebase-admin';

// create LINE SDK config from env variables
const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
};

// create LINE SDK client
const client = new line.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express()

app.use(cors({origin : true}))
admin.initializeApp(functions.config().firebase)

const db = admin.database();

// Domain/line/webhook
app.post('/webhook', (req, res) => {
    if(line.validateSignature(JSON.stringify(req.body),config.channelSecret,req.get('x-line-signature'))){
        Promise
            .all(req.body.events.map(handleEvent))
            .then((result) => res.json(result))
            .catch((err) => {
                console.error(err);
                res.status(500).end();
                })
    }
    else{
        res.status(403).end()
    }
})
// Domain/line
exports.line = functions.https.onRequest(app)


// event handler
function handleEvent(event) {
  
  switch(event.type){
    case 'follow' :{
        // create a echoing text message
        const echo:any = [
            { 
                type: 'text', text: 'Hello Na Ja' 
            },
            {
                type: 'text', text: 'line://app/1587801164-8rZbbDOX' 
            }
        ]
        
        //seve data to DB
        const ref = db.ref('Contact');
        const id = event.source.userId
        const usersRef = ref.child(id)
            usersRef
                .set(event)
                .catch((err) => {
                    console.log('dataBase')
                    console.error(err);
                    })

        // use reply API
        return client.replyMessage(event.replyToken, echo)
    }
    case 'message':{
        const message = event.message.text
        const userId = event.source.userId

        const ref = db.ref('Message')
        const newMessage = ref.child(userId)
            newMessage
                .set({
                    platform : 'line',
                    phoneNumber : '0918838567',
                    customerName : 'Bas' ,
                    customerMessage : message,
                    operatorMessage : '',
                    timeStamp : new Date()
                })
                .catch((err) => {
                    console.log('dataBaseError')
                    console.error(err);
                    })

        const echo:any = [
        { 
            type: 'text', text: 'TEST Retrun what you type' 
        },
        {
            type: 'text', text: message
        }
        ]

        return client.replyMessage(event.replyToken, echo)
    }

    default:{
        const echo:any = { type: 'text', text: event.type }
        return client.replyMessage(event.replyToken, echo)
    }
  }
}

  // listen on port
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`listening on ${port}`)
  });

// end

function callIttpApiV2 (id,message){
    const API_SERVER = 'http://45.77.47.114:7778'
    const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdSI6MzQsIl9yIjo1LCJpYXQiOjE1MzU2OTAzMTEsImV4cCI6MTU2NzIyNjMxMX0.sTBi7zA4g4_NWOUq98lmv25R2XojPU5ojI9bAfKdlWE'

    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`
    }
    // headers.Authorization = `Bearer ${API_TOKEN}`

    const body = JSON.stringify({
        id : id,
        platform : 'line',
        message : message
    })

    request.post({
        url: `${API_SERVER}/chats/receiveMessage`,
        headers :headers,
        body: body
    })
}
