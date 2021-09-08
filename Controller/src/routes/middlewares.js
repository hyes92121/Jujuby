var jwt = require('jsonwebtoken')
module.exports = {
  auth: function (req, res, next) {
    if (req.headers) {
      const token = req.headers.authorization
      if (token) {
        jwt.verify(token, process.env.PRIVATE_KEY, (err, decoded) => {
          if (err) {
            console.log(err)
            return res.json({
              success: false,
              message: 'Token is not valid'
            })
          } else {
            req.decoded = decoded
            next()
          }
        })
      } else {
        return res.json({
          success: false,
          message: 'Auth token is not provided'
        })
      }
    } else {
      return res.sendStatus(401)
    }
  }
}
