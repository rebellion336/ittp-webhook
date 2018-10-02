import * as functions from 'firebase-functions'
import * as express from 'express'
import * as e6p from "es6-promise"
(e6p as any).polyfill();
import * as fetch from 'isomorphic-fetch'
import * as line from '@line/bot-sdk' 
import * as cors from 'cors'
import * as admin from 'firebase-admin'
import * as dialogflow from 'dialogflow'
import { comma } from './SatangToBath'
const bwipjs = require('bwip-js')

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
// admin.initializeApp({
//     databaseURL: "https://noburo-216104.firebaseio.com/",
//     storageBucket: "noburo-216104.appspot.com"
// })
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

// encode Barcode
const code128 = new (require('code-128-encoder'))()
const encodeBarcode = string => {
    const ascii = code128
      .encode(string) // Encode to either Code128B or Code128C string.
      .split('') // Chop one by one
      .map(char => char.charCodeAt(0)) // Convert characters to ASCII code.
      .slice(0, -2) // Slice checksum + stop character out
    // -> Replace <SPACE> with <CR>
    // Which have 2 cases, one is only <SPACE> and other one is having residue from converting number to Code128C
    ascii.forEach((char, index, array) => {
      const dataArray = array
      if (char === 205 && dataArray[index + 1] === 32) {
        // if <CODE B><SPACE> found.
        dataArray[index] = 206 // change <CODE B> => <CODE A>
        dataArray[index + 1] = 109 // change <SPACE> => <CR>
      } else if (char === 205 && dataArray[index + 2] === 32) {
        // elif <CODE B><NUMBER><SPACE> found.
        dataArray[index + 2] = 206 // change <SPACE> => <CODE A>
        dataArray.splice(index + 3, 0, 109) // push <CR> after <CODE A>
      } else if (
        char === 32 &&
        dataArray[index - 1] === 109 &&
        dataArray[index - 2] === 206
      ) {
        // if only <SPACE> found in any other case
        dataArray[index] = 109
        // array.splice(index + 1, 0, 109)
      }
    })
  
    // -> Get Barcode checksum by convert all characters to Code128's value and sum then mod by 103
    const checksum =
      ascii
        .map(c => code128.getCodeFromASCII(c))
        .reduce((sum, x, i) => sum + x * (i === 0 ? 1 : i), 0) % 103
  
    // -> Convert checksum in Code128's value to ASCII code and push it to ASCII array together with <STOP> character
    ascii.push(code128.getASCIIFromCode(checksum), 211)
  
    // -> Return ASCII code to actual characters string.
    return ascii.map(char => String.fromCharCode(char)).join('')
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
                console.log('resultFromAPI',resultFormApi)
                console.log('resultFromAPI',resultFormApi[0].loanId)
            
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
                        userId : userId,
                        loanId : resultFormApi[0].loanId,
                        loanType : resultFormApi[0].loanType
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

app.get('/getChat/:userId',async(req,res)=>{
    const { userId } = req.params
    // get data from firebase
    const dataBaseRef = db.ref(`Message/${userId}`)
    let chatLog 
    await dataBaseRef.on("value", (snapshot) => {
        console.log('Value get from firebase >>>>',snapshot.val())
        snapshot.forEach((childSnapshot) => {
            chatLog.push(childSnapshot.val())
            return false
        })
      }, function (errorObject) {
        console.log("The read failed: " + errorObject.code)
        throw Error('DataBase Error In getChat method')
      })
      return chatLog
      //end get data
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
                type: "template",
                altText: "ลงทะเบียนกับ ITTP",
                template: {
                    type: "buttons",
                    thumbnailImageUrl: "https://storage.googleapis.com/noburo-public/logo-ittp.png",
                    imageAspectRatio: "square",
                    imageSize: "cover",
                    imageBackgroundColor: "#FFFFFF",
                    text: "ระบบลงทะเบียน ITTP",
                    defaultAction: {
                        "type": "uri",
                        "label": "คลิกที่นี้เพื่อลงทะเบียน",
                        "uri": "line://app/1587801164-8rZbbDOX"
                    },
                    actions: [
                        {
                          "type": "uri",
                          "label": "คลิกที่นี้เพื่อลงทะเบียน",
                          "uri": "line://app/1587801164-8rZbbDOX"
                        }
                    ]
                }
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
        const userId = event.source.userId
        let echo:any
        
        // log message to firebase
        const ref = db.ref('Message')
        const newMessage = ref.child(userId)
        
       
        // text message hendle
        if(event.message.type === 'text'){
            const message = event.message.text
            try{
                newMessage.push({
                    platform : 'line',
                    messageType : event.message.type,
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

        // Send request and log result
        await sessionClient
            .detectIntent(requestJson)
            .then(async responses => {
                const result = responses[0].queryResult

                //handle Ask Debt balance Intent
                if(result.intent.displayName === 'Ask Debt balance'){
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
                    const totalAmount = comma(((minDue - minPaid)/100).toFixed(2))
                    let {statementDate} = customerInfo[0]
                    statementDate = statementDate + 15;
                    if(statementDate > 31){
                        statementDate = 5
                    }

                    echo= [
                        {
                            type: 'text', text: `ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท โปรดชำระก่อนวันที่ ${statementDate} นะคะ`
                        },
                    ]

                    // log message to firebase
                        try{
                            newMessage.push({
                                platform : 'line',
                                messageType : 'text',
                                customerMessage : '',
                                operatorMessage : echo[0].text,
                                timeStamp : new Date()
                            })
                        }
                        catch(error){
                            console.log('DataBase Error')
                            console.error(error)
                        }

                    return client.replyMessage(event.replyToken, echo)
                } // end ask Debt handle

                // ask for barcode handle
                if(result.intent.displayName === 'Ask for barcode'){
                    // get data from firebase
                    const dataBaseRef = db.ref(`Binding/${userId}`)
                    let data
                    let loanId
                    let loanType
                    let barcodeString
                    
                    // get data from firebase
                    await dataBaseRef.on("value", (snapshot) => {
                        
                        data = snapshot.val()
                        loanId = snapshot.val().loanId
                        loanType = snapshot.val().loanType
                        let prefix = '00'
                        if (loanType === 'nano') {
                            prefix = '01'
                        }
                        barcodeString = `|0105554146049${prefix}\n${loanId.replace(/-/g, '')}\n\n0`

                    }, function (errorObject) {
                        console.log("The read failed: " + errorObject.code) 
                        throw Error('DataBase Error In getChat method')
                    })
                    
                    // generate barcode
                    const name = `barcode-${loanId}`
                    // const base64Stringencoded = await encodeBarcode(barcodeString)

                    bwipjs.toBuffer({
                        bcid: 'code128',    // Barcode type
                        text: ''+barcodeString,
                        scale: 2,
                        showborder: true,
                        borderwidth: 1,
                        borderbottom: 10,
                        borderleft: 10,
                        borderright: 10,
                        bordertop: 10,
                        backgroundcolor: 'ffffff',
                        paddingwidth: 10,
                        paddingheight: 10,
                        includetext: true,  // Show human-readable text
                        textxalign: 'center',   // Always good to set this
                    }, function (err, png) {
                        console.log('generating barcodef')
                        if (!err) {
                            // upload file
                            // firebase Stoage setup
                            const bucket = admin.storage().bucket()
                            const barcode = bucket.file(name)
                            try{
                                barcode.save(png,
                                    {
                                    metadata: { contentType: "image/png" }
                                    },
                                )
                                console.log('barcode width',png.readUInt32BE(16))
                                console.log('barcode height',png.readUInt32BE(20))
                            }
                            catch(error){
                                console.log('error 366')
                                console.error(error)
                            }

                            // `png` is a Buffer
                            // png.length           : PNG file length
                            // png.readUInt32BE(16) : PNG image width
                            // png.readUInt32BE(20) : PNG image height
                        } else {
                            console.log('error 351')
                            console.error('Error 351',err)
                        }
                    })
                    // end generate barcode

                    // return barcode to customer
                    return client.replyMessage(event.replyToken, {
                        type: 'image',
                        originalContentUrl: 'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/barcode-59-08-03-0242?alt=media&token=da5a6d23-a302-407c-8ec3-20c8b8b30426',
                        previewImageUrl: 'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/barcode-59-08-03-0242?alt=media&token=da5a6d23-a302-407c-8ec3-20c8b8b30426'
                      })
                }
                //end ask for barcode handle

                echo= [
                    {
                        type: 'text', text: result.fulfillmentMessages[0].text.text[0]
                    }
                ]

                // log message that bot response to customer to firebase
                try{
                    newMessage.push({
                        platform : 'line',
                        messageType : 'text',
                        customerMessage : '',
                        operatorMessage : echo[0].text,
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
        }
        //end text message handle

        // reply message to line API
        return client.replyMessage(event.replyToken, echo)
    }

    case 'postback' :{
        const userId = event.source.userId

        // log message to firebase
        const ref = db.ref('Message')
        const newMessage = ref.child(userId)

        if(event.postback.data === 'action=askDebt'){
                    
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
                    const totalAmount = comma(((minDue - minPaid)/100).toFixed(2))
                    let {statementDate} = customerInfo[0]
                    statementDate = statementDate + 15;
                    if(statementDate > 31){
                        statementDate = 5
                    }

                    let echo

                    echo= [
                        {
                            type: 'text', text: `ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท โปรดชำระก่อนวันที่ ${statementDate} นะคะ`
                        },
                    ]

                    // log message to firebase
                        try{
                            newMessage.push({
                                platform : 'line',
                                messageType : 'text',
                                customerMessage : '',
                                operatorMessage : echo[0].text,
                                timeStamp : new Date()
                            })
                        }
                        catch(error){
                            console.log('DataBase Error')
                            console.error(error)
                        }

                    return client.replyMessage(event.replyToken, echo)
        }
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