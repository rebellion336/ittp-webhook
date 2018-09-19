import * as functions from 'firebase-functions'
import * as express from 'express'
import * as request from 'request'
import * as line from '@line/bot-sdk' 
import * as cors from 'cors'
import * as admin from 'firebase-admin'

import * as dialogflow from 'dialogflow'

// create LINE SDK config from env variables
const config = {
  channelAccessToken: functions.config().line.channel_access_token,
  channelSecret: functions.config().line.channel_secret,
}

// create LINE SDK client
const client = new line.Client(config)


// dialogflow setup
const projectId = 'noburo-216104'
const sessionId = 'Line-Bot-ITTP' //ใส่อะไรก็ได้ ก็ไม่บอก หาไปเถอะไอ้บ้าเอ็ย
const languageCode = 'th'
// Instantiate a DialogFlow client.
const sessionClient = new dialogflow.SessionsClient()
// Define session path <DialogFlow>
const sessionPath = sessionClient.sessionPath(projectId, sessionId)


// create Express app
// about Express itself: https://expressjs.com/
const app = express()

app.use(cors({origin : true}))
admin.initializeApp(functions.config().firebase)

const db = admin.database()

// Domain/line/webhook
app.post('/webhook', (req, res) => {
    // check if the message sand from line
    if(line.validateSignature(JSON.stringify(req.body),config.channelSecret,req.get('x-line-signature'))){
        Promise
            .all(req.body.events.map(handleEvent))
            .then((result) => res.json(result))
            .catch((err) => {
                console.error(err)
                res.status(500).end()
                })
    }
    else{
        res.status(403).end()
    }
})

app.post('/bindId',(req,res)=>{
    const { userId , citizenId , userName , userLastName , phoneNumber} = req.body
    const ref = db.ref('Binding')

    const API_SERVER = 'http://45.77.47.114:7778'
    const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdSI6MzQsIl9yIjo1LCJpYXQiOjE1MzU2OTAzMTEsImV4cCI6MTU2NzIyNjMxMX0.sTBi7zA4g4_NWOUq98lmv25R2XojPU5ojI9bAfKdlWE'
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`
    }
    const body = JSON.stringify({
        id : userId,
        citizenId : citizenId,
        platform : 'line',
        name : `${userName} ${userLastName}`,
        phoneNumber : phoneNumber
    })

        try{
            //call API V2
            const resultFormApi:any = request.post({
                url: `${API_SERVER}/chats/line/binding`,
                headers :headers,
                body: body
            })
            
            resultFormApi.map(loans =>{
                const newUser = ref.child(loans.loanId)
                let name = `${userName} ${userLastName}`

                if(loans.firstName !== undefined && loans.lastName !== undefined){
                    name = `${loans.firstName} ${loans.lastName}`
                }

                newUser
                    .set({
                        citizenId : citizenId,
                        name : name,
                        phoneNumber : phoneNumber,
                        loanId : loans.loanId
                    })
                    .catch((error) => {
                        console.log('DataBase Error')
                        console.error(error)
                    })
            })

        }
        catch(error){
            console.log('DataBase Error')
            console.error(error)
        }
})

// Domain/line
exports.line = functions.https.onRequest(app)

// event handler
async function handleEvent(event) {
  
  switch(event.type){
    case 'follow' :{
        // create a echoing text message
        const echo:any = [
            { 
                type: 'text', text: 'ขอต้อนรับสู่ ittp' 
            },
            { 
                type: 'text', text: 'หากท่านเป็นผู้ที่แอดมาครั้งแรกโปรดลงทะเบียนกับเราตามลิงค์ด้านล่าง' 
            },
            {
                type: 'text', text: 'line://app/1587801164-8rZbbDOX' 
            }
        ]
        
        //seve data to DB
        const ref = db.ref('Contact')
        const id = event.source.userId
        const usersRef = ref.child(id)
            usersRef
                .set(event)
                .catch((err) => {
                    console.log('dataBase')
                    console.error(err)
                    })

        // use reply API
        return client.replyMessage(event.replyToken, echo)
    }
    case 'message':{
        const message = event.message.text
        const userId = event.source.userId
        
        const ref = db.ref('Message')
        const newMessage = ref.child(userId)
            try{
                newMessage.push({
                    platform : 'line',
                    customerMessage : message,
                    operatorMessage : '',
                    timeStamp : new Date()
                })
            }
            catch(error){
                console.log('DataBase Error')
                console.error(error)
            }

        // DialogFlow requset
        // The text query request.
        // this just a Ex cant use this right now
        
        const requestJson = {
            session: sessionPath,
            queryInput: {
                text: {
                    text: message,
                    languageCode: languageCode,
                }
            },
        }
        let echo:any

        // Send request and log result
        await sessionClient
            .detectIntent(requestJson)
            .then(responses => {
                const result = responses[0].queryResult

                // get response from dialogflow and ready to sand back to customer
                echo= [
                    {
                        type: 'text', text: result.fulfillmentText
                    }
                ]

                if (result.intent) {
                    // return Intent Name that macth in dialogFlow
                    console.log(`  Intent: ${result.intent.displayName}`)
                } else {
                    console.log(`  No intent matched.`)
                }
            })
            .catch(err => {
                console.error('ERROR:', err)
            })

        // reply message to line API
        return client.replyMessage(event.replyToken, echo)
    }

    default:{
        const echo:any = { type: 'text', text: event.type }
        return client.replyMessage(event.replyToken, echo)
    }
  }
}

  // listen on port
  const port = process.env.PORT || 3000
  app.listen(port, () => {
    console.log(`listening on ${port}`)
  })

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
