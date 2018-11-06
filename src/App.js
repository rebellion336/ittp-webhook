import React, { Component } from 'react'
import { Form, Icon, Input, Button } from 'antd'
import fetch from 'isomorphic-fetch'
import FullPageLayout from './layouts/FullPageLayout'
import './App.css'

const liff = window.liff
const FormItem = Form.Item

class App extends Component {
  constructor(props) {
    super(props)
    this.state = {
      displayName: '',
      userId: '',
      pictureUrl: '',
      statusMessage: '',
      citizenId: '',
      userName: '',
      userLastName: '',
      phoneNumber: '',
    }
    this.initialize = this.initialize.bind(this)
    this.closeApp = this.closeApp.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  componentDidMount() {
    window.addEventListener('load', this.initialize)
  }

  handleSubmit = async event => {
    event.preventDefault()
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    }

    const body = JSON.stringify({
      userId: this.state.userId,
      citizenId: this.state.citizenId,
      userName: this.state.userName,
      userLastName: this.state.userLastName,
      phoneNumber: this.state.phoneNumber,
    })

    await fetch(
      `https://us-central1-noburo-216104.cloudfunctions.net/line/bindId`,
      {
        method: 'POST',
        headers: headers,
        mode: 'cors',
        body: body,
      }
    )
    liff.closeWindow()
  }

  initialize() {
    liff.init(async data => {
      const profile = await liff.getProfile()
      this.setState({
        displayName: profile.displayName,
        userId: profile.userId,
        pictureUrl: profile.pictureUrl,
        statusMessage: profile.statusMessage,
      })
    })
  }

  closeApp(event) {
    event.preventDefault()
    liff.closeWindow()
  }

  render() {
    return (
      <FullPageLayout>
        <div className="App">
          <header className="App-header" style={{ height: 'auto' }}>
            <h1 className="App-title" style={{ color: 'white' }}>
              ระบบลงทะเบียน
            </h1>
          </header>
          <br />
          <Form
            onSubmit={this.handleSubmit}
            className="login-form"
            style={{ width: '90%', margin: 'auto' }}
          >
            <FormItem>
              {getFieldDecorator('userName', {
                rules: [{ required: true, message: 'โปรดระบุชื่อของท่าน' }],
              })(
                <Input
                  size="large"
                  prefix={
                    <Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />
                  }
                  placeholder="ชื่อ"
                />
              )}
            </FormItem>
            <FormItem>
              {getFieldDecorator('userLastName', {
                rules: [{ required: true, message: 'โปรดระบุนามสกุลของท่าน' }],
              })(
                <Input
                  size="large"
                  prefix={
                    <Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />
                  }
                  placeholder="นามสกุล"
                />
              )}
            </FormItem>
            <FormItem>
              {getFieldDecorator('phoneNumber', {
                rules: [
                  { required: true, message: 'โปรดระบุเบอร์โทรศัพท์ของท่าน' },
                ],
              })(
                <Input
                  size="large"
                  prefix={
                    <Icon type="mobile" style={{ color: 'rgba(0,0,0,.25)' }} />
                  }
                  placeholder="เบอร์โทรศัพท์"
                />
              )}
            </FormItem>
            <FormItem>
              {getFieldDecorator('citizenId', {
                rules: [
                  { required: true, message: 'โปรดระบุเลขบัตรประชาชนของท่าน' },
                ],
              })(
                <Input
                  size="large"
                  prefix={
                    <Icon type="idcard" style={{ color: 'rgba(0,0,0,.25)' }} />
                  }
                  placeholder="เลขประชาชน"
                />
              )}
            </FormItem>
          </Form>
          <br />
          <div>
            <Button onClick={this.closeApp}>Close</Button>
            &nbsp;&nbsp;&nbsp;
            <Button
              type="primary"
              htmlType="submit"
              onClick={this.handleSubmit}
              className="login-form-button"
            >
              submit
            </Button>
          </div>
        </div>
      </FullPageLayout>
    )
  }
}

export default Form.create()(App)
