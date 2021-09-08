const express = require('express')
var jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/user')
const middlewares = require('./middlewares')
const router = express.Router()

router.post('/register', [
], (req, res) => {
  const username = req.body.username
  const password = req.body.password
  User.find({ username: username }, function (err, account) {
    if (err) {
      res.status(500).json({ error: err })
    }
    if (account.length) {
      res.json({
        success: false,
        message: 'Register failed. username already existed',
        account: account
      })
    } else {
      User.create({
        username: username,
        password: password
      })
      res.json({
        success: true,
        message: 'Register success'
      })
    }
  })
})
router.post('/login', (req, res) => {
  const username = req.body.username
  const password = req.body.password
  User.findOne({ username: username }, function (err, user) {
    if (err) {
      console.log(err)
      res.status(500).json({ error: err })
    }
    if (!user) {
      res.json({
        success: false,
        message: 'Login failed. account does not exist',
        token: ''
      })
    } else if (user) {
      bcrypt.compare(password, user.password, function (err, isMatch) {
        if (err) { throw (err) }
        if (!isMatch) {
          res.json({
            success: false,
            message: 'Login failed. password not match',
            token: ''
          })
        } else {
          var token = jwt.sign({ id: user.username }, process.env.PRIVATE_KEY, {
            algorithm: 'HS256',
            expiresIn: process.env.JWT_EXPIRE_SECONDS
          })
          res.json({
            success: true,
            message: 'Login success',
            token: token
          })
        }
      })
    }
  })
})
router.get('/list', middlewares.auth, (req, res) => {
  User.find({}, function (err, result) {
    if (err) {
      console.log(err)
    } else {
      res.json({
        success: true,
        userList: result
      })
    }
  })
})

module.exports = router
