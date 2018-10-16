import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
const bwipjs = require('bwip-js')
admin.initializeApp(functions.config().firebase)

// fireBase setup
const db = admin.database()

export const saveContact = (userId, event) => {
  const ref = db.ref('Contact')
  const usersRef = ref.child(userId)
  usersRef.set(event).catch(err => {
    console.log('dataBase')
    console.error(err)
  })
}

export const saveBindingData = (
  userId,
  citizenId,
  userName,
  userLastName,
  phoneNumber,
  loanId,
  loanType
) => {
  const ref = db.ref('Binding')
  const newUser = ref.child(userId)
  newUser
    .set({
      citizenId: citizenId,
      name: `${userName} ${userLastName}`,
      phoneNumber: phoneNumber,
      userId: userId,
      loanId: loanId,
      loanType: loanType,
    })
    .catch(error => {
      console.log('DataBase Error')
      console.error(error)
    })
}

export const saveCustomerMessage = (userId, messageType, customerMessage) => {
  const ref = db.ref('Message')
  const newMessage = ref.child(userId)
  newMessage.push({
    platform: 'line',
    messageType: messageType,
    customerMessage: customerMessage,
    operatorMessage: '',
    timeStamp: new Date(),
  })
}

// case bot can response
export const saveResponseMessage = (userId, message) => {
  const ref = db.ref('Message')
  const newMessage = ref.child(userId)
  newMessage.push({
    platform: 'line',
    messageType: 'text',
    customerMessage: '',
    operatorMessage: message,
    timeStamp: new Date(),
  })
}

const getBingingData = async ref => {
  return new Promise((resolve, rejects) => {
    let loanId
    let loanType
    ref.once('value', async snapshot => {
      loanId = await snapshot.val().loanId
      loanType = await snapshot.val().loanType
      resolve({ loanId, loanType })
    })
  })
}

//generate and return URL for barcode
export const generateBarcode = async (userId, uuid) => {
  const ref = db.ref(`Binding/${userId}`)
  //get data from firebase
  let loanId, loanType, name, downloadURL, barcodeString
  await getBingingData(ref).then((result: any) => {
    loanId = result.loanId
    loanType = result.loanType
    name = `barcode-${loanId}`
    let prefix = '00'
    downloadURL = `https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/${name}?alt=media&token=${uuid}`
    barcodeString = `|0105554146049${prefix}\n${loanId.replace(/-/g, '')}\n\n0`

    return downloadURL
  })
  //generating barcode
  bwipjs.toBuffer(
    {
      bcid: 'code128', // Barcode type
      text: '' + barcodeString,
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
      includetext: true, // Show human-readable text
      textxalign: 'center', // Always good to set this
    },
    function(err, png) {
      // save barcode
      if (!err) {
        const bucket = admin.storage().bucket()
        const barcode = bucket.file(name)
        try {
          // work save barcode
          barcode.save(png, {
            metadata: {
              contentType: 'image/png',
              metadata: {
                firebaseStorageDownloadTokens: uuid,
              },
            },
          })
        } catch (error) {
          console.log('error 366')
          console.error(error)
        }
      } else {
        console.log('error 351')
        console.error('Error 351', err)
      }
    }
  ) // end generate barcode
  return downloadURL
}

const makeData = async dataBaseRef => {
  return new Promise((resolve, rejects) => {
    let chatLog = []
    try {
      dataBaseRef.on('value', async snapshot => {
        snapshot.forEach(childSnapshot => {
          const childData = childSnapshot.val()
          chatLog.push(childData)
        })
        resolve({ chatLog })
      })
    } catch (error) {
      console.log('error makeData')
      console.error(error)
      rejects
    }
  })
}

export const getChat = async userId => {
  const dataBaseRef = db.ref(`Message/${userId}`)
  let chatLog
  await makeData(dataBaseRef).then(result => {
    chatLog = result
  })
  return chatLog
}
