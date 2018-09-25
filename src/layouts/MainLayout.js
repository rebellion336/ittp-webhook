import React, { Component } from 'react'
import stylesheet from 'antd/dist/antd.min.css'
import Link from 'next/link'
import { Layout, Menu, Popover, Icon } from 'antd'
import PropTypes from 'prop-types'
import UserMenu from '../components/commons/UserMenu'

const { SubMenu } = Menu

class MainLayout extends Component {
  constructor(props) {
    super(props)
    this.state = { width: 0, visible: false }
    this.updateNavbar = this.updateNavbar.bind(this)
  }

  componentDidMount() {
    this.updateNavbar()
    global.window.addEventListener('resize', this.updateNavbar)
  }

  componentWillUnmount() {
    global.window.removeEventListener('resize', this.updateNavbar)
  }

  getMenuItem(title, href, key) {
    return (
      <Menu.Item
        key={key === undefined ? title.toLowerCase() : key}
        location="right"
      >
        <Link
          href={'/'.concat(
            href === undefined ? title.toLowerCase().concat('s') : href
          )}
        >
          <a>{title}</a>
        </Link>
      </Menu.Item>
    )
  }

  getMenu(mode) {
    return (
      <Menu
        mode={mode}
        defaultSelectedKeys={[this.props.activeMenu]}
        style={{ textAlign: 'center' }}
      >
        {/* {this.getMenuItem('Application', 'applications?tab=ALL')} */}
        {
          <SubMenu
            title={<span className="submenu-title-wrapper">Application</span>}
          >
            <Menu.Item key="ALL">
              <Link href="/applications?tab=ALL">ALL</Link>
            </Menu.Item>
            <Menu.Item key="CHECK_DOC">
              <Link href="/applications?tab=CHECK_DOC">CHECK_DOC</Link>
            </Menu.Item>
            <Menu.Item key="NCB">
              <Link href="/applications?tab=NCB">NCB</Link>
            </Menu.Item>
            <Menu.Item key="KEY_DATA">
              <Link href="/applications?tab=KEY_DATA">KEY_DATA</Link>
            </Menu.Item>
            <Menu.Item key="SCAN">
              <Link href="/applications?tab=SCAN">SCAN</Link>
            </Menu.Item>
            <Menu.Item key="VERIFY">
              <Link href="/applications?tab=VERIFY">VERIFY</Link>
            </Menu.Item>
            <Menu.Item key="ANALYZE">
              <Link href="/applications?tab=ANALYZE">ANALYZE</Link>
            </Menu.Item>
            <Menu.Item key="APPROVE">
              <Link href="/applications?tab=APPROVE">APPROVE</Link>
            </Menu.Item>
            <Menu.Item key="CONFIRM">
              <Link href="/applications?tab=CONFIRM">CONFIRM</Link>
            </Menu.Item>
            <Menu.Item key="OPEN">
              <Link href="/applications?tab=OPEN">OPEN</Link>
            </Menu.Item>
            <Menu.Item key="REJECT">
              <Link href="/applications?tab=REJECT">REJECT</Link>
            </Menu.Item>
          </SubMenu>
        }
        <SubMenu
          title={<Link href="/loans?tab=LOAN_OPENED"><span className="submenu-title-wrapper">Loan</span></Link>}
        >
          <Menu.Item key="ADJ">
            <Link href="/adjints">ADJ</Link>
          </Menu.Item>
          <Menu.Item key="STATEMENT">
            <Link href="/statements">STATEMENT</Link>
          </Menu.Item>
        </SubMenu>
        {/* {this.getMenuItem('Loan', 'loans?tab=LOAN_OPENED', 'loans')} */}
        {this.getMenuItem('Transaction')}
        {
        <SubMenu
          title={
            <span className="submenu-title-wrapper">
              <Icon type="upload" />
              Import
            </span>
          }
        >
          <Menu.Item key="payment">
            <Link href="/import/payment">Payment</Link>
          </Menu.Item>
          <Menu.Item key="ncb">
            <Link href="/import/ncb">NCB</Link>
          </Menu.Item>
        </SubMenu>
        }
        {this.getMenuItem('Withdraw', 'withdraws?tab=PENDING', 'withdraws')}
        {this.getMenuItem(
          'RequestCreditLimit',
          'requestCreditLimits?tab=PENDING',
          'requestCreditLimits'
        )}
        {this.getMenuItem('Report')}
        {this.getMenuItem('Note')}
        <SubMenu
          title={<span className="submenu-title-wrapper">Permission</span>}
        >
          <Menu.Item key="USER">
            <Link href="/users">USER</Link>
          </Menu.Item>
          <Menu.Item key="ROLES">
            <Link href="/roles">ROLES</Link>
          </Menu.Item>
        </SubMenu>
      </Menu>
    )
  }

  updateNavbar() {
    this.setState({ width: global.window.innerWidth })
  }

  render() {
    const { Header, Content, Footer } = Layout
    return (
      <Layout>
        <style dangerouslySetInnerHTML={{ __html: stylesheet }} />
        <Header style={{ backgroundColor: '#fff', height: '46px' }}>
          <div className="logo" />
          <div style={{ float: 'right', height: '45px', lineHeight: '46px' }}>
            <UserMenu />
          </div>
          {this.state.width < 1187 ? (
            <Menu
              mode="horizontal"
              selectedKeys={[]}
              onClick={() => this.setState({ visible: !this.state.visible })}
            >
              <Menu.Item style={{ height: '45px', width: '65px' }}>
                <Popover
                  placement="bottomLeft"
                  content={this.getMenu('vertical')}
                  visible={this.state.visible}
                  trigger="click"
                >
                  <Icon
                    type="bars"
                    style={{
                      fontSize: '25px',
                      color: 'grey',
                      marginTop: '10px'
                    }}
                  />
                </Popover>
              </Menu.Item>
            </Menu>
          ) : (
            this.getMenu('horizontal')
          )}
        </Header>
        <Content style={{ padding: '0 50px', marginTop: '10px' }}>
          {this.props.children}
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          JAIDEECash ©2018 Created by Ant UED
        </Footer>
      </Layout>
    )
  }
}

MainLayout.propTypes = {
  activeMenu: PropTypes.string,
  children: PropTypes.node
}
MainLayout.defaultProps = {
  activeMenu: 'application',
  children: null // render nothing
}

export default MainLayout
