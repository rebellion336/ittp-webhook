import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'
const bwipjs = require('bwip-js')

// init admin sdk with function.config
admin.initializeApp(functions.config().firebase)

// database setup
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

//generate and return URL for barcode
export const generateBarcode = async (userId, uuid) => {
  const ref = db.ref(`Binding/${userId}`)
  //get data from firebase
  let loanId, name, downloadURL, barcodeString
  await ref.once('value', async snapshot => {
    if (snapshot.exists()) {
      loanId = await snapshot.val().loanId
      name = `barcode-${loanId}`
      const prefix = '00'
      downloadURL = `https://firebasestorage.googleapis.com/v0/b/noburo-216104.appspot.com/o/${name}?alt=media&token=${uuid}`
      barcodeString = `|0105554146049${prefix}\n${loanId.replace(
        /-/g,
        ''
      )}\n\n0`
      return downloadURL
    } else return (downloadURL = false)
  })
  //generating barcode
  if (downloadURL) {
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
        // save barcode to fireStorage
        if (!err) {
          const bucket = admin.storage().bucket()
          const barcode = bucket.file(name)
          try {
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
  }
  return downloadURL
}

export const unreadMessageCount = userId => {
  const databaseRef = db.ref('ActiveUser')
  const activeUserRef = databaseRef.child(userId)
  activeUserRef.once('value', snapshot => {
    const newCount = snapshot.val().count + 1
    activeUserRef.update({
      count: newCount,
    })
  })
}

export const hendleFallback = userId => {
  const databaseRef = db.ref('ActiveUser')
  const activeUserRef = databaseRef.child(userId)
  const bindingRef = db.ref(`Binding/${userId}`)
  bindingRef.once('value', snapshot => {
    // in case user didnt bindID with us
    let name = 'anonymous'
    if (snapshot.exists()) {
      name = snapshot.val().name
    }
    activeUserRef.set({
      name: name,
      count: 1,
      userId: userId,
    })
  })
  const BotResponseRef = db.ref(`BotResponse/${userId}`)
  bindingRef.once('value', snapshot => {
    if (snapshot.exists()) {
      BotResponseRef.remove()
    }
  })
  const inActiveRef = db.ref(`InactiveUser/${userId}`)
  inActiveRef.once('value', inActiveSnapshot => {
    if (inActiveSnapshot.exists()) {
      inActiveRef.remove()
    }
  })
}

export const checkUserActive = async userId => {
  let bool
  const databaseRef = db.ref('ActiveUser')
  const activeUserRef = databaseRef.child(userId)
  await activeUserRef.once('value', async snapshot => {
    bool = await snapshot.exists()
  })
  return bool
}

export const patchUnreadMessageCount = userId => {
  const databaseRef = db.ref('ActiveUser')
  const activeUserRef = databaseRef.child(userId)
  activeUserRef.once('value', snapshot => {
    if (snapshot.exists()) {
      activeUserRef.update({
        count: 0,
      })
    }
  })
}

export const unActiveUser = userId => {
  const inActiveRef = db.ref(`InactiveUser/${userId}`)
  const bindingRef = db.ref(`Binding/${userId}`)
  bindingRef.once('value', snapshot => {
    // in case user didnt bindID with us
    let name = 'anonymous'
    if (snapshot.exists()) {
      name = snapshot.val().name
    }
    inActiveRef.set({
      name: name,
      userId: userId,
    })
  })
  const databaseRef = db.ref('ActiveUser')
  const activeUserRef = databaseRef.child(userId)
  activeUserRef.once('value', activeSnapshot => {
    if (activeSnapshot.exists()) {
      activeUserRef.remove()
    } else {
      const BotResponseRef = db.ref(`BotResponse/${userId}`)
      BotResponseRef.remove()
    }
  })
}

export const hendleBotResponse = userId => {
  const databaseRef = db.ref('BotResponse')
  const BotResponseRef = databaseRef.child(userId)
  BotResponseRef.once('value', snapshot => {
    if (snapshot.exists()) {
      const newCount = snapshot.val().count + 1
      BotResponseRef.update({
        count: newCount,
      })
    } else {
      const bindingRef = db.ref(`Binding/${userId}`)
      bindingRef.once('value', snapshot2 => {
        // in case user didnt bindID with us
        let name = 'anonymous'
        if (snapshot2.exists()) {
          name = snapshot2.val().name
        }
        BotResponseRef.set({
          name: name,
          count: 1,
          userId: userId,
        })
      })
      const inActiveRef = db.ref(`InactiveUser/${userId}`)
      inActiveRef.once('value', inActiveSnapshot => {
        if (inActiveSnapshot.exists()) {
          inActiveRef.remove()
        }
      })
    }
  })
}
