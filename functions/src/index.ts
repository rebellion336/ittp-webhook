import * as functions from 'firebase-functions'
import * as express from 'express'
import * as e6p from "es6-promise"
(e6p as any).polyfill();
import * as fetch from 'isomorphic-fetch'
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

// fireBase setup
const db = admin.database()

const API_SERVER = 'http://45.77.47.114:7778'
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdSI6MzQsIl9yIjo1LCJpYXQiOjE1MzU2OTAzMTEsImV4cCI6MTU2NzIyNjMxMX0.sTBi7zA4g4_NWOUq98lmv25R2XojPU5ojI9bAfKdlWE'
const mode = 'cors'
const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_TOKEN}`
}

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

app.post('/bindId',async(req,res)=>{
    const { userId , citizenId , userName , userLastName , phoneNumber} = req.body
    const ref = db.ref('Binding')

    const body = JSON.stringify({
        id : userId,
        citizenId : citizenId,
        platform : 'line',
        name : `${userName} ${userLastName}`,
        phoneNumber : phoneNumber
    })
        try{
            //call API V2
            // resultFornApi Content {loanID,name, lastName, phoneNumber} that this citizenId have
            const resultFormApi:any =  await fetch(
                `${API_SERVER}/chats/line/binding`,
                {
                    method: 'POST',
                    headers: headers,
                    mode,
                    body: body
                }).then(response => response.json())
            
            //*********** code here use to be a binding that bind lineID with loanID ************
            //*********** but it cant be use because not all customer have a loanId *************
            // for (const loan of resultFormApi) {
            //     console.log('resultAPI in forOf',loan)
            //     const loanId = loan.loanId
                
            //     // if in loan dosent have a phoneNumber this will use phoneNumber that user input in register liff 
            //     let phoneNumber2DB = phoneNumber
            //     if(loan.phoneNumber){
            //         phoneNumber2DB = loan.phoneNumber
            //     }

            //     // if in loan dosent have a name <not have loan> this will use name that user input in register liff 
            //     let name = `${userName} ${userLastName}`
            //     if(loan.firstName !== undefined && loan.lastName !== undefined){
            //         name = `${loan.firstName} ${loan.lastName}`
            //     }
            // }
            
            //'*************Begin SAVE DATA**************'
            const newUser = ref.child(userId)
                newUser
                    .set({
                        citizenId : citizenId,
                        name : `${userName} ${userLastName}`,
                        phoneNumber : phoneNumber,
                        userId : userId
                    })
                    .catch((error) => {
                        console.log('DataBase Error')
                        console.error(error)
                    })
            //'**************DATA SAVED********************

        }
        catch(error){
            console.log('DataBase Error')
            console.error(error)
        }
})

app.get('/getChat/:id',(req,res)=>{
    const { id } = req.params

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
        
        // log message to firebase
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
            .then(async responses => {
                const result = responses[0].queryResult

                //handle Ask Debt balance Intent
                if(result.intent.displayName === 'Ask Debt balance'){
                    const dataBaseRef = db.ref(`Binding/${userId}`)

                    let data 
                    // get data from firebase
                    await dataBaseRef.on("value", (snapshot) => {
                        data = snapshot.val()
                      }, function (errorObject) {
                        console.log("The read failed: " + errorObject.code)
                      })
                    
                    // fecth data from apiV2
                    // now can handle only 1 loan if customer have 2 loan this code have to fix

                    const customerInfo = await fetch(
                        `${API_SERVER}/chats/${userId}`,
                        {
                            method: 'GET',
                            headers: headers,
                            mode,
                        }).then(async response => await response.json())
                    const { minDue , minPaid  } = customerInfo[0]
                    const totalAmount = (minDue - minPaid)/100
                    let {statementDate} = customerInfo[0]
                    statementDate = statementDate + 15;
                    if(statementDate > 31){
                        statementDate = 5
                    }

                    echo= [
                        {
                            type: 'text', text: `ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาทคะ`
                        },
                        {
                            type: 'text', text: `โปรดชำระก่อนวันที่ ${statementDate} นะคะ`
                        },
                    ]

                    // log message to firebase
                    echo.forEach(echo => {
                        try{
                            newMessage.push({
                                platform : 'line',
                                customerMessage : '',
                                operatorMessage : echo.text,
                                timeStamp : new Date()
                            })
                        }
                        catch(error){
                            console.log('DataBase Error')
                            console.error(error)
                        }
                    }) 

                    return client.replyMessage(event.replyToken, echo)
                }

                // get response from dialogflow and ready to sand back to customer (intent : def fallback)
                echo= [
                    {
                        type: 'text', text: result.fulfillmentText
                    }
                ]

                // log message that bot response to customer to firebase
                try{
                    newMessage.push({
                        platform : 'line',
                        customerMessage : '',
                        operatorMessage : echo,
                        timeStamp : new Date()
                    })
                }
                catch(error){
                    console.log('DataBase Error')
                    console.error(error)
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

// function callIttpApiV2 (id,message){
//     const API_SERVER = 'http://45.77.47.114:7778'
//     const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdSI6MzQsIl9yIjo1LCJpYXQiOjE1MzU2OTAzMTEsImV4cCI6MTU2NzIyNjMxMX0.sTBi7zA4g4_NWOUq98lmv25R2XojPU5ojI9bAfKdlWE'

//     const headers = {
//         Accept: 'application/json',
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${API_TOKEN}`
//     }
//     // headers.Authorization = `Bearer ${API_TOKEN}`

//     const body = JSON.stringify({
//         id : id,
//         platform : 'line',
//         message : message
//     })

//     request.post({
//         url: `${API_SERVER}/chats/receiveMessage`,
//         headers :headers,
//         body: body
//     })
// }
