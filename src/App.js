import React, { Component } from 'react'
import fetch from 'isomorphic-fetch'
import PropTypes from 'prop-types'
import './App.css'

import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Grid from '@material-ui/core/Grid'
import TextField from '@material-ui/core/TextField'
import Button from '@material-ui/core/Button'
import Icon from '@material-ui/core/Icon'
import Paper from '@material-ui/core/Paper'
import { withStyles } from '@material-ui/core/styles'

const liff = window.liff

const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  layout: {
    width: 'auto',
    display: 'block', // Fix IE 11 issue.
    marginLeft: theme.spacing.unit * 3,
    marginRight: theme.spacing.unit * 3,
  },
  formControl: {
    minWidth: 120,
  },
  paper: {
    marginTop: theme.spacing.unit * 3,
    marginBottom: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 2,
    [theme.breakpoints.up(600 + theme.spacing.unit * 3 * 2)]: {
      marginTop: theme.spacing.unit * 6,
      marginBottom: theme.spacing.unit * 6,
      padding: theme.spacing.unit * 3,
    },
  },
  mobileStepper: {
    marginTop: theme.spacing.unit * 3,
  },
  image: {
    display: 'block',
    margin: 'auto',
    width: '80%',
  },
  button: {
    margin: theme.spacing.unit,
  },
  rightIcon: {
    marginLeft: theme.spacing.unit,
  },
})

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
    this.handleCitizenIdChange = this.handleCitizenIdChange.bind(this)
    this.handleUserNameChange = this.handleUserNameChange.bind(this)
    this.handleUserLastNameChange = this.handleUserLastNameChange.bind(this)
    this.handlePhoneNumberChange = this.handlePhoneNumberChange.bind(this)
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

  handleCitizenIdChange(event) {
    const citizenId = event.target.value
    this.setState({
      citizenId: citizenId,
    })
  }

  handleUserNameChange(event) {
    const userName = event.target.value
    this.setState({
      userName: userName,
    })
  }

  handleUserLastNameChange(event) {
    const userLastName = event.target.value
    this.setState({
      userLastName: userLastName,
    })
  }

  handlePhoneNumberChange(event) {
    const phoneNumber = event.target.value
    this.setState({
      phoneNumber: phoneNumber,
    })
  }

  render() {
    const { classes } = this.props
    return (
      <React.Fragment>
        <AppBar position="static" color="primary">
          <Toolbar>
            <Typography variant="h6" color="inherit">
              ระบบลงทะเบียน
            </Typography>
          </Toolbar>
        </AppBar>

        <main className={classes.layout}>
          <Paper className={classes.paper}>
            <form className={classes.container}>
              <Grid container spacing={24}>
                <Grid item xs={6}>
                  <TextField
                    id="firstName"
                    label="ชื่อ"
                    fullWidth
                    onChange={this.handleUserNameChange}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    id="lastName"
                    label="นามสกุล"
                    fullWidth
                    onChange={this.handleUserLastNameChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    id="citizenId"
                    type="number"
                    label="เลขบัตรประชาชน"
                    fullWidth
                    onChange={this.handleCitizenIdChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    id="mobileNo"
                    type="number"
                    label="เบอร์มือถือ"
                    fullWidth
                    onChange={this.handlePhoneNumberChange}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    className={classes.button}
                    style={{ width: '98.5%', marginBottom: '0' }}
                    onClick={this.handleSubmit}
                  >
                    ลงทะเบียน
                    <Icon className={classes.rightIcon}>send</Icon>
                  </Button>
                </Grid>
              </Grid>
            </form>
          </Paper>
        </main>
      </React.Fragment>
    )
  }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
}

export default withStyles(styles, { withTheme: true })(App)
