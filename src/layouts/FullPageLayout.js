import React from 'react'
import stylesheet from 'antd/dist/antd.min.css'
import PropTypes from 'prop-types'

const FullPageLayout = ({ children }) => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
      }}
    >
      <style jsx global>{`
        body,
        html {
          height: 100%;
          margin: 0;
          width: 100%;
        }
        :global(#__next) {
          height: 100%;
        }
      `}</style>
      <style dangerouslySetInnerHTML={{ __html: stylesheet }} />
      {children}
    </div>
  )
}
FullPageLayout.propTypes = {
  children: PropTypes.node,
}
FullPageLayout.defaultProps = {
  children: null, // render nothing
}

export default FullPageLayout
