import * as functions from 'firebase-functions'
import * as express from 'express'
import * as e6p from 'es6-promise'
;(e6p as any).polyfill()
import * as fetch from 'isomorphic-fetch'
import * as line from '@line/bot-sdk'
import * as cors from 'cors'
import * as dialogflow from 'dialogflow'
import { comma } from './SatangToBath'
const bwipjs = require('bwip-js')
const UUID = require('uuidv4')
import {
  saveContact,
  saveBindingData,
  saveCustomerMessage,
  saveResponseMessage,
  generateBarcode,
} from './dbFunctions'

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

app.use(cors({ origin: true }))

const API_SERVER = 'http://45.77.47.114:7778'
const API_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfdSI6MzQsIl9yIjo1LCJpYXQiOjE1MzU2OTAzMTEsImV4cCI6MTU2NzIyNjMxMX0.sTBi7zA4g4_NWOUq98lmv25R2XojPU5ojI9bAfKdlWE'
const mode = 'cors'
const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
}

// Domain/line/webhook
app.post('/webhook', (req, res) => {
  // check if the message sand from line
  if (
    line.validateSignature(
      JSON.stringify(req.body),
      config.channelSecret,
      req.get('x-line-signature')
    )
  ) {
    Promise.all(req.body.events.map(handleEvent))
      .then(result => res.json(result))
      .catch(err => {
        console.error(err)
        res.status(500).end()
      })
  } else {
    res.status(403).end()
  }
})

app.post('/bindId', async (req, res) => {
  const { userId, citizenId, userName, userLastName, phoneNumber } = req.body

  const body = JSON.stringify({
    id: userId,
    citizenId: citizenId,
    platform: 'line',
    name: `${userName} ${userLastName}`,
    phoneNumber: phoneNumber,
  })
  try {
    //call API V2
    // resultFornApi Content {loanID,name, lastName, phoneNumber} that this citizenId have
    const resultFormApi: any = await fetch(`${API_SERVER}/chats/line/binding`, {
      method: 'POST',
      headers: headers,
      mode,
      body: body,
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
    saveBindingData(
      userId,
      citizenId,
      userName,
      userLastName,
      phoneNumber,
      resultFormApi[0].loanId,
      resultFormApi[0].loanType
    )
    //'**************DATA SAVED********************
  } catch (error) {
    console.log('DataBase Error')
    console.error(error)
  }
})

// app.get('/getChat/:userId', async (req, res) => {
//   const { userId } = req.params
//   // get data from firebase
//   const dataBaseRef = db.ref(`Message/${userId}`)
//   let chatLog = 'hello'
//   await dataBaseRef.on(
//     'value',
//     snapshot => {
//       console.log('Value get from firebase >>>>', snapshot.val())
//       snapshot.forEach(childSnapshot => {
//         const childData = childSnapshot.val()
//         console.log('childData', childData)
//         return false
//       })
//       console.log('chatLog>>>>>', chatLog)
//     },
//     function(errorObject) {
//       console.log('The read failed: ' + errorObject.code)
//       throw Error('DataBase Error In getChat method')
//     }
//   )
//   return chatLog
//   //end get data
// })

// Domain/line
exports.line = functions.https.onRequest(app)

// event handler
async function handleEvent(event) {
  switch (event.type) {
    case 'follow': {
      // create a echoing text message
      const echo: any = [
        {
          type: 'text',
          text: 'ขอต้อนรับสู่ ittp',
        },
        {
          type: 'text',
          text:
            'หากท่านเป็นผู้ที่แอดมาครั้งแรกโปรดลงทะเบียนกับเราตามลิงค์ด้านล่าง',
        },
        {
          type: 'template',
          altText: 'ลงทะเบียนกับ ITTP',
          template: {
            type: 'buttons',
            thumbnailImageUrl:
              'https://storage.googleapis.com/noburo-public/logo-ittp.png',
            imageAspectRatio: 'square',
            imageSize: 'cover',
            imageBackgroundColor: '#FFFFFF',
            text: 'ระบบลงทะเบียน ITTP',
            defaultAction: {
              type: 'uri',
              label: 'คลิกที่นี้เพื่อลงทะเบียน',
              uri: 'line://app/1587801164-8rZbbDOX',
            },
            actions: [
              {
                type: 'uri',
                label: 'คลิกที่นี้เพื่อลงทะเบียน',
                uri: 'line://app/1587801164-8rZbbDOX',
              },
            ],
          },
        },
      ]

      //seve data to DB
      const userId = event.source.userId
      saveContact(userId, event)

      // use reply API
      return client.replyMessage(event.replyToken, echo)
    }
    case 'message': {
      const userId = event.source.userId
      let echo: any

      // log message to firebase

      // text message hendle
      if (event.message.type === 'text') {
        const message = event.message.text
        try {
          saveCustomerMessage(userId, event.message.type, message)
        } catch (error) {
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
            },
          },
        }

        // Send request and log result
        await sessionClient
          .detectIntent(requestJson)
          .then(async responses => {
            const result = responses[0].queryResult

            //handle Ask Debt balance Intent
            if (result.intent.displayName === 'Ask Debt balance') {
              // fecth data from apiV2
              // now can handle only 1 loan if customer have 2 loan this code have to fix

              const customerInfo = await fetch(
                `${API_SERVER}/chats/${userId}`,
                {
                  method: 'GET',
                  headers: headers,
                  mode,
                }
              ).then(async response => await response.json())
              const { minDue, minPaid } = customerInfo[0]
              const totalAmount = comma(((minDue - minPaid) / 100).toFixed(2))
              let { statementDate } = customerInfo[0]
              statementDate = statementDate + 15
              if (statementDate > 31) {
                statementDate = 5
              }

              echo = [
                {
                  type: 'text',
                  text: `ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท โปรดชำระก่อนวันที่ ${statementDate} นะคะ`,
                },
              ]

              // log message to firebase
              try {
                saveResponseMessage(userId, echo[0].text)
              } catch (error) {
                console.log('DataBase Error')
                console.error(error)
              }

              return client.replyMessage(event.replyToken, echo)
            } // end ask Debt handle

            // ask for barcode handle
            if (result.intent.displayName === 'Ask for barcode') {
              // uploadId
              const uuid = UUID()

              // generateBarcode and get downloadURL from firebase
              const downloadURL = await generateBarcode(userId, uuid)

              console.log('URL SEND TO LINE', downloadURL)
              return client.replyMessage(event.replyToken, {
                type: 'image',
                originalContentUrl: downloadURL,
                previewImageUrl: downloadURL,
              })
            }
            //end ask for barcode handle

            echo = [
              {
                type: 'text',
                text: result.fulfillmentMessages[0].text.text[0],
              },
            ]

            // log message that bot response to customer to firebase
            try {
              saveResponseMessage(userId, echo[0].text)
            } catch (error) {
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

    case 'postback': {
      const userId = event.source.userId

      if (event.postback.data === 'action=askDebt') {
        // fecth data from apiV2
        // now can handle only 1 loan if customer have 2 loan this code have to fix

        const customerInfo = await fetch(`${API_SERVER}/chats/${userId}`, {
          method: 'GET',
          headers: headers,
          mode,
        }).then(async response => await response.json())
        const { minDue, minPaid } = customerInfo[0]
        const totalAmount = comma(((minDue - minPaid) / 100).toFixed(2))
        let { statementDate } = customerInfo[0]
        statementDate = statementDate + 15
        if (statementDate > 31) {
          statementDate = 5
        }

        let echo

        echo = [
          {
            type: 'text',
            text: `ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท โปรดชำระก่อนวันที่ ${statementDate} นะคะ`,
          },
        ]

        // log message to firebase
        try {
          saveResponseMessage(userId, echo[0].text)
        } catch (error) {
          console.log('DataBase Error')
          console.error(error)
        }

        return client.replyMessage(event.replyToken, echo)
      }
    }

    default: {
      const echo: any = { type: 'text', text: event.type }
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
