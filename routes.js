const express = require('express');
const router = express.Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const url = require('url');
const User = require('./models/user');



router.post('/authenticate', (req, res, next) => {
    console.log(req.body);
  //   if(req.body.username == undefined || req.body.password == undefined){
  //     // return res.json({success: false, msg: 'Invalid Username or Password'});
  //   }
  //   let username = req.body.username.toLowerCase();
  //   let password = req.body.password;
  //
  //   User.getUserByUsername(username, (err, user) =>{
  //   if(err){
  //     // return res.json({success: false, msg: 'Invalid Username or Password'});
  //   }
  //   if(!user){
  //     // return res.json({success: false, msg: 'Invalid Username or Password'});
  //   }
  //   else
  //   {
  //     User.comparePassword(password, user.password, (err, isMatch) => {
  //       if(err){
  //         // return res.json({success: false, msg: 'Invalid Username or Password'});
  //       }
  //       if(isMatch)
  //       {
  //         let randString = "secret";
  //         //Token never expires
  //         const token = jwt.sign({_id: user._id}, randString);
  //         let userObj = {
  //           _id: user._id,
  //           fullName: user.fullName,
  //           username: user.username,
  //           email: user.email
  //         };
  //         return res.render('game', {token: JSON.stringify('JWT '+token), user: JSON.stringify(userObj)});
  //       }
  //       else
  //         {
  //           // return res.json({success: false, msg: 'Invalid Username or Password'});
  //         }
  //       });
  //   }
  // });
});

router.post('/game', (req, res, next) => {
  console.log(req.body);
  if(req.body.t == "reg"){
    let userObj = new User({
      fullName: req.body.firstName + " "+ req.body.lastName,
      username: req.body.username.toLowerCase(),
      password: req.body.password
    });
    // console.log("============ New User Obj ==========");
    // console.log(userObj);
    User.getUserByUsername(userObj.username, (err, user) =>{
      if(err){
        // return res.json({success: false, msg: "Error with registration, please try again."});
      }
      if(!user){
        User.addUser(userObj, (err, retUser) =>{
          if(err){
            console.log(err);
            // return res.json({success: false, msg:"Error with registration, please try again."});
          }
          else{
            console.log(retUser);
            let randString = "secret";
            //token never expires
            const token = jwt.sign({_id: retUser._id}, randString);
            let userObj = {
              _id: retUser._id,
              fullName: retUser.fullName,
              username: retUser.username
            };
            console.log("================== New User Obj ===============");
            console.log(userObj);
            res.render("game", {token: JSON.stringify(token), user: JSON.stringify(userObj)});
          }
        });
      }
      else{
        // return res.json({success: false, msg: "That username exists already, please try another one"});
      }

    });
  }
  else if(req.body.t == "log"){
      if(req.body.username == undefined || req.body.password == undefined){
        // return res.json({success: false, msg: 'Invalid Username or Password'});
      }
      let username = req.body.username.toLowerCase();
      let password = req.body.password;

      User.getUserByUsername(username, (err, user) =>{
      if(err){
        // return res.json({success: false, msg: 'Invalid Username or Password'});
      }
      if(!user){
        // return res.json({success: false, msg: 'Invalid Username or Password'});
      }
      else
      {
        User.comparePassword(password, user.password, (err, isMatch) => {
          if(err){
            // return res.json({success: false, msg: 'Invalid Username or Password'});
          }
          if(isMatch)
          {
            let randString = "secret";
            //Token never expires
            const token = jwt.sign({_id: user._id}, randString);
            let userObj = {
              _id: user._id,
              fullName: user.fullName,
              username: user.username,
              email: user.email
            };
            return res.render('game', {token: JSON.stringify('JWT '+token), user: JSON.stringify(userObj)});
          }
          else
            {
              // return res.json({success: false, msg: 'Invalid Username or Password'});
            }
          });
      }
    });
  }


});
router.post('/delete', passport.authenticate('jwt', {session:false}) ,(req, res, next) =>{
  //NOTE keeping this incase user's want to delete their accounts
  // console.log(req.body);
  // User.removeAccount(req.body, (err, val) => {
  //   if(err){
  //     return res.json({success: false, msg: 'Failed to delete account. Try again.'});
  //   }
  //   else {
  //     return res.json({success: true, msg: 'Account removed!'});
  //   }
  // });
});

router.get('/protected', passport.authenticate('jwt', {session:false}) ,(req, res, next) =>{
    return res.send({ content: 'Success'});
});
router.get('/', (req, res, next) =>{
    //TODO send index file
    // res.render('index');
    res.render('game');
});

module.exports = router;
