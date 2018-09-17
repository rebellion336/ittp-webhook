import React, { Component } from 'react'
import { Form, Icon, Input, Button } from 'antd'
import './App.css'

const liff = window.liff
const FormItem = Form.Item

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      displayName : '',
      userId : '',
      pictureUrl : '',
      statusMessage : ''
    }
    this.initialize = this.initialize.bind(this)
    this.closeApp = this.closeApp.bind(this)
  }

  componentDidMount() {
    window.addEventListener('load', this.initialize);
  }

  handleSubmit = (event) => {
    event.preventDefault()
    this.props.form.validateFields((err, values) => {
      if (!err) {
        console.log('Received values of form: ', values)
      }
    })
  }

  initialize() {
    liff.init( async (data) => {
      const profile = await liff.getProfile()
      this.setState({
        displayName : profile.displayName,
        userId : profile.userId,
        pictureUrl : profile.pictureUrl,
        statusMessage : profile.statusMessage
      })
    })
  }

  closeApp(event){
    event.preventDefault();
    liff.sendMessages([{
      type: 'text',
      text: "ขอบคุณสำหรับการลงทะเบียน"
    }]).then(() => {
      liff.closeWindow();
    });
  }

  render() {
    const { getFieldDecorator } = this.props.form
    return (
      <div className="App">
        <header className="App-header" style={{height:'auto'}} >
          <h1 className="App-title">ระบบลงทะเบียน</h1>
        </header>
        <h4>โปรดกรอกข้อมูลด้านล่าง</h4>
        <Form onSubmit={this.handleSubmit} className="login-form">
          <FormItem>
            {getFieldDecorator('userName', {
              rules: [{ required: true, message: 'โปรดระบุชื่อของท่าน' }],
            })(
              <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="ชื่อ" />
            )}
          </FormItem>
          <FormItem>
            {getFieldDecorator('userLastName', {
              rules: [{ required: true, message: 'โปรดระบุนามสกุลของท่าน' }],
            })(
              <Input prefix={<Icon type="user" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="นามสกุล" />
            )}
          </FormItem>
          <FormItem>
            {getFieldDecorator('phoneNumber', {
              rules: [{ required: true, message: 'โปรดระบุเบอร์โทรศัพท์ของท่าน' }],
            })(
              <Input prefix={<Icon type="mobile" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="เบอร์โทรศัพท์" />
            )}
          </FormItem>
          <FormItem>
            {getFieldDecorator('citizenId', {
              rules: [{ required: true, message: 'โปรดระบุเลขบัตรประชาชนของท่าน' }],
            })(
              <Input prefix={<Icon type="idcard" style={{ color: 'rgba(0,0,0,.25)' }} />} placeholder="เลขประชาชน" />
            )}
          </FormItem>
          </Form>
          <br/>
            <Button color="primary" onClick={this.closeApp}>Close</Button>
            <Button type="primary" htmlType="submit" className="login-form-button">submit</Button>
      </div>
    );
  }
}

export default Form.create()(App);
