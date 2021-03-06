import * as functions from 'firebase-functions'
import * as express from 'express'
import * as e6p from 'es6-promise'
;(e6p as any).polyfill()
import * as fetch from 'isomorphic-fetch'
import * as line from '@line/bot-sdk'
import * as cors from 'cors'
import * as dialogflow from 'dialogflow'
import * as bodyParser from 'body-parser'
import * as randomstring from 'randomstring'
import { comma } from './SatangToBath'
const UUID = require('uuidv4')
import {
  saveContact,
  saveBindingData,
  saveCustomerMessage,
  saveResponseMessage,
  generateBarcode,
  hendleFallback,
  patchUnreadMessageCount,
  checkUserActive,
  unreadMessageCount,
  unActiveUser,
  hendleBotResponse,
  saveOTP,
  submitRegister,
  seveLineImage,
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
const app = express()
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cors({ origin: true }))

// for call ittp-api-V2
const API_SERVER = 'http://45.77.47.114:7778'
// const API_SERVER = 'https://core-api.noburo.co'
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
    }).then(response => {
      console.log('response.json>>>>', response.json())
      return response.json()
    })
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
    //**************DATA SAVED********************
    res.status(200).send()
  } catch (error) {
    console.log('DataBase Error')
    console.error(error)
    res.status(400)
  }
})

app.post('/sendmessage', (req, res) => {
  const { userId, message } = req.body
  try {
    saveResponseMessage(userId, message)
    client.pushMessage(userId, {
      type: 'text',
      text: message,
    })
    res.status(200).send({ status: 'Success' })
  } catch (error) {
    console.log('error /sendmessage')
    console.error(error)
    res.status(400).send({ status: 'Fail' })
  }
})

app.post('/receiveMessage', (req, res) => {
  const { userId, messageType, message } = req.body
  try {
    saveCustomerMessage(userId, messageType, message)
    // emit event
  } catch (error) {
    console.log('error /sendmessage')
    console.error(error)
    res.status(400).send({ status: 'Fail' })
  }
})

app.patch('/patchMessageCount/:userId', (req, res) => {
  try {
    const { userId } = req.params
    patchUnreadMessageCount(userId)
  } catch (error) {
    console.log('error patch /messageCount')
    res.status(400).send({ status: 'Fail' })
  }
  res.status(200).send('Success')
})

app.patch('/unActiveUser/:userId', (req, res) => {
  const { userId } = req.params
  try {
    unActiveUser(userId)
  } catch (error) {
    console.log('error patch /unActiveUser')
    res.status(400).send({ status: 'Fail' })
  }
  res.status(200).send('Success')
})

app.post('/OTP/:phoneNumber', async (req, res) => {
  const { phoneNumber } = req.params
  const randomAlphabet = randomstring.generate({
    length: 4,
    charset: 'alphabetic',
  })
  const randomNumber = randomstring.generate({
    length: 6,
    charset: 'numeric',
  })
  try {
    saveOTP(phoneNumber, randomNumber, randomAlphabet)
    //send SMS
    const msisdn = phoneNumber
    const message = `${randomAlphabet} ${randomNumber} เป็นรหัสยืนยันกับ ITTP รหัสจะหมดอายุใน5นาที`
    const { username, password, sender, path } = functions.config().sms
    const url = encodeURI(
      `${path}?username=${username}&password=${password}&msisdn=${msisdn}&message=${message}&sender=${sender}`
    )
    await fetch(url)
  } catch (error) {
    console.log('error requestOTP >>> ', error)
    res.status(400)
  }
  res.send({ key: randomAlphabet })
})

app.post('/applications', async (req, res) => {
  const { data, otp, phoneNumber } = req.body
  const submitTime = new Date().toUTCString()
  let result = 'hello'
  try {
    result = await submitRegister(data, otp, phoneNumber, submitTime)
    console.log('result', result)
    res.send(result)
  } catch (error) {
    console.log('error submitRegister >>> ', error)
    res.status(400)
  }
})

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

        // check if user is talking with CS?
        // คอมเม้น เพือให้บอทตอบเสมอ ถ้า client เสร์จ ต้องเอาคอมเม้นออก
        // const doUserActive = await checkUserActive(userId)
        // if (doUserActive) {
        //   unreadMessageCount(userId)
        //   return
        // }

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
            if (result.intent.displayName === 'สอบถามยอดชำระขั้นต่ำ') {
              // fecth data from apiV2
              // now can handle only 1 loan if customer have 2 loan this code have to fix

              const debt = []
              const customerInfo = await fetch(
                `${API_SERVER}/chats/${userId}`,
                {
                  method: 'GET',
                  headers: headers,
                  mode,
                }
              ).then(async response => await response.json())
              customerInfo.forEach(info => {
                const { minDue, minPaid, loanId } = info
                const totalAmount = comma(((minDue - minPaid) / 100).toFixed(2))
                let { statementDate } = info
                statementDate = statementDate + 15
                if (statementDate > 31) {
                  statementDate = 5
                }
                const total = {
                  type: 'text',
                  text: `สัญญาเลขที่ ${loanId} ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท \nโปรดชำระก่อนวันที่ ${statementDate} `,
                }
                return debt.push(total)
              })

              // log message to firebase
              try {
                saveResponseMessage(userId, debt[0].text)
                hendleBotResponse(userId)
              } catch (error) {
                console.log('DataBase Error')
                console.error(error)
              }

              return client.replyMessage(event.replyToken, debt)
            } // end ask Debt handle

            // ask for barcode handle
            if (result.intent.displayName === 'Ask for barcode') {
              // uploadId
              const uuid = UUID()

              // generateBarcode and get downloadURL from firebase
              const downloadURL = await generateBarcode(userId, uuid)

              return client.replyMessage(event.replyToken, {
                type: 'image',
                originalContentUrl: downloadURL,
                previewImageUrl: downloadURL,
              })
            }
            //end ask for barcode handle

            //fallback Intent
            if (result.intent.displayName === 'Default Fallback Intent') {
              echo = [
                {
                  type: 'text',
                  text: result.fulfillmentMessages[0].text.text[0],
                },
                {
                  type: 'template',
                  altText: 'เมนู',
                  template: {
                    type: 'carousel',
                    columns: [
                      {
                        thumbnailImageUrl:
                          'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/logo-ittp.png?alt=media&token=0427fbe4-585f-4584-8db2-e023024960fe',
                        imageBackgroundColor: '#FFFFFF',
                        text: 'สอบถามยอดประจำเดือน',
                        defaultAction: {
                          type: 'postback',
                          label: 'สอบถามยอดประจำเดือน',
                          data: 'action=askDebt',
                        },
                        actions: [
                          {
                            type: 'postback',
                            label: 'สอบถามยอดประจำเดือน',
                            data: 'action=askDebt',
                          },
                        ],
                      },
                      {
                        thumbnailImageUrl:
                          'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/logo-ittp.png?alt=media&token=0427fbe4-585f-4584-8db2-e023024960fe',
                        imageBackgroundColor: '#FFFFFF',
                        text: 'ขอใบสมัครสินเชื่อ',
                        defaultAction: {
                          type: 'uri',
                          label: 'ขอใบสมัครสินเชื่อ',
                          uri: 'http://www.ittp.co.th/download.html',
                        },
                        actions: [
                          {
                            type: 'uri',
                            label: 'ขอใบสมัครสินเชื่อ',
                            uri: 'http://www.ittp.co.th/download.html',
                          },
                        ],
                      },
                      {
                        thumbnailImageUrl:
                          'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/logo-ittp.png?alt=media&token=0427fbe4-585f-4584-8db2-e023024960fe',
                        imageBackgroundColor: '#FFFFFF',
                        text: 'โปรโมชั่น',
                        defaultAction: {
                          type: 'uri',
                          label: 'โปรโมชั่น',
                          uri: 'https://www.facebook.com/ittpLending/',
                        },
                        actions: [
                          {
                            type: 'uri',
                            label: 'โปรโมชั่น',
                            uri: 'https://www.facebook.com/ittpLending/',
                          },
                        ],
                      },
                      {
                        thumbnailImageUrl:
                          'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/logo-ittp.png?alt=media&token=0427fbe4-585f-4584-8db2-e023024960fe',
                        imageBackgroundColor: '#FFFFFF',
                        text: 'ติดต่อเรา',
                        defaultAction: {
                          type: 'postback',
                          label: 'ติดต่อเรา',
                          data: 'action=contactUs',
                        },
                        actions: [
                          {
                            type: 'postback',
                            label: 'ติดต่อเรา',
                            data: 'action=contactUs',
                          },
                        ],
                      },
                      {
                        thumbnailImageUrl:
                          'https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/logo-ittp.png?alt=media&token=0427fbe4-585f-4584-8db2-e023024960fe',
                        imageBackgroundColor: '#FFFFFF',
                        text: 'ขอบาร์โค้ดสำหรับชำระเงิน',
                        defaultAction: {
                          type: 'postback',
                          label: 'ขอบาร์โค้ดสำหรับชำระเงิน',
                          data: 'action=askBarcode',
                        },
                        actions: [
                          {
                            type: 'postback',
                            label: 'ขอบาร์โค้ดสำหรับชำระเงิน',
                            data: 'action=askBarcode',
                          },
                        ],
                      },
                    ],
                    imageAspectRatio: 'square',
                    imageSize: 'cover',
                  },
                },
              ]
              try {
                saveResponseMessage(userId, echo[0].text)
              } catch (error) {
                console.log('DataBase Error')
                console.error(error)
              }
              hendleFallback(userId)
              return client.replyMessage(event.replyToken, echo)
            }
            //end fallback Intent

            echo = [
              {
                type: 'text',
                text: result.fulfillmentMessages[0].text.text[0],
              },
            ]

            // log message that bot response to customer to firebase
            try {
              saveResponseMessage(userId, echo[0].text)
              hendleBotResponse(userId)
            } catch (error) {
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
      //end text message handle

      //handle image
      if (event.message.type === 'image') {
        const imageId = event.message.id
        const getImageHeaders = {
          Authorization: `Bearer ${
            functions.config().line.channel_access_token
          }`,
        }
        let binaryImage
        await fetch(`https://api.line.me/v2/bot/message/${imageId}/content`, {
          method: 'GET',
          headers: getImageHeaders,
          mode,
        }).then(async response => {
          binaryImage = await response.buffer()
        })
        try {
          await seveLineImage(binaryImage, imageId, userId)
          echo = [
            {
              type: 'text',
              text: 'test save image Success',
            },
          ]
        } catch (error) {
          console.log('error seveLineImage', error)
          echo = [
            {
              type: 'text',
              text: 'test save image fail',
            },
          ]
        }
        return client.replyMessage(event.replyToken, echo)
      }
    }

    case 'postback': {
      const userId = event.source.userId
      let echo

      if (event.postback.data === 'action=askDebt') {
        // fecth data from apiV2
        // now can handle only 1 loan if customer have 2 loan this code have to fix
        let debt = []
        try {
          const customerInfo = await fetch(`${API_SERVER}/chats/${userId}`, {
            method: 'GET',
            headers: headers,
            mode,
          }).then(async response => await response.json())
          customerInfo.forEach(info => {
            const { minDue, minPaid, loanId } = info
            const totalAmount = comma(((minDue - minPaid) / 100).toFixed(2))
            let { statementDate } = info
            statementDate = statementDate + 15
            if (statementDate > 31) {
              statementDate = 5
            }
            const total = {
              type: 'text',
              text: `สัญญาเลขที่ ${loanId} ในเดือนนี้ท่านมียอดค้างชำระอยู่ ${totalAmount} บาท \nโปรดชำระก่อนวันที่ ${statementDate} `,
            }
            return debt.push(total)
          })
        } catch (error) {
          console.log('error postback askDebt', error)
          debt = [
            {
              type: 'text',
              text: `ขออภัยท่านยังไม่ได้ลงทะเบียนกับทางระบบ โปรดลงทะเบียนแล้วลองใหม่อีกครั้ง`,
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
        }
        return client.replyMessage(event.replyToken, debt)
      }

      if (event.postback.data === 'action=askBarcode') {
        // uploadId
        const uuid = UUID()

        // generateBarcode and get downloadURL from firebase
        try {
          const downloadURL = await generateBarcode(userId, uuid)

          if (downloadURL) {
            echo = [
              {
                text: 'send user a barcode',
              },
            ]

            return client.replyMessage(event.replyToken, {
              type: 'image',
              originalContentUrl: downloadURL,
              previewImageUrl: downloadURL,
            })
          } else {
            echo = [
              {
                type: 'text',
                text: `ขออภัยท่านยังไม่ได้ลงทะเบียนกับทางระบบ โปรดลงทะเบียนแล้วลองใหม่อีกครั้ง`,
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
            return client.replyMessage(event.replyToken, echo)
          }
        } catch (error) {
          console.log('barcode error >>>', error)
        }
      }

      if (event.postback.data === 'action=contactUs') {
        echo = [
          {
            type: 'text',
            text: 'ท่านสามารถติดต่อพนังงานได้ที่ \nโทร. 02-153-9580',
          },
        ]
        return client.replyMessage(event.replyToken, echo)
      }

      // log message to firebase
      try {
        saveResponseMessage(userId, echo[0].text)
      } catch (error) {
        console.log('DataBase Error')
        console.error(error)
      }

      return client.replyMessage(event.replyToken, echo)
    }

    default: {
      const echo: any = { type: 'text', text: event.type }
      return client.replyMessage(event.replyToken, echo)
    }
  }
}

// listen on port
const port = 9000
app.set('port', port)

app.listen(port, () => {
  console.log(`listening on ${port}`)
})

// end
