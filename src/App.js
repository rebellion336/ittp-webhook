import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

const liff = window.liff;  

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
      text: "Thank you, Bye!"
    }]).then(() => {
      liff.closeWindow();
    });
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <h1>Hello world 77777</h1>
        <div>
          <h1>Data</h1>
          <p>displayName : {this.state.displayName}</p>
          <p>userId : {this.state.userId}</p>
          <p>pictureUrl : {this.state.pictureUrl}</p>
          <p>statusMessage : {this.state.statusMessage}</p>
        </div>
        <button color="primary" onClick={this.closeApp}>Close</button>
      </div>
    );
  }
}

export default App;
