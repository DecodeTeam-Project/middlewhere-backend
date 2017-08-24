const express = require('express');
const onlyLoggedIn = require('../lib/only-logged-in');
var md5 = require('md5'); // for hashing emails for Gravatar


module.exports = (dataLoader) => {
  const authController = express.Router();
  // Create a new user (signup)
  authController.post('/users', (req, res) => {
    const userData = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: req.body.password
    };
    dataLoader.createUser(userData)
    .then(ans => {
      const email = ans.email;
      const HASH = md5(email);
      const hashed = "https://www.gravatar.com/avatar/"+HASH;
      ans.avatarUrl = hashed;
      return ans;
    })
    .then(user => res.status(201).json(user))
    .catch(err => { console.log(err);
      res.status(400).json(err)});
  });

  authController.get('/avatar/:id', (req, res) => {
  return dataLoader.getSingleUser(req.params.id)
  .then(ans => {
    ans[0]['avatarUrl'] = "https://www.gravatar.com/avatar/"+md5(ans[0].email);
    return ans[0];
  })
  .then(user => res.status(201).json(user))
  .catch(err => { console.log(err);
    res.status(400).json(err)});
  });

  // Create a new session (login)
  authController.post('/sessions', (req, res) => {
    dataLoader.createTokenFromCredentials(
      req.body.email,
      req.body.password
    )
    .then(token => res.status(201).json({ token: token })) // returns token
    .catch(err => res.status(401).json(err));
  });


  // Delete a session (logout)
  authController.delete('/sessions', onlyLoggedIn, (req, res) => {
      dataLoader.deleteToken(req.sessionToken)
      .then(() => res.status(204).end())
      .catch(err => res.status(400).json(err));
  });

  // Retrieve current user
  authController.get('/me', onlyLoggedIn, (req, res) => {
    dataLoader.getUserFromSession(req.sessionToken)
    .then(ans => {
      const email = ans.users_email;
      const HASH = md5(email);
      const hashed = "https://www.gravatar.com/avatar/"+HASH;
      ans.avatarUrl = hashed;
      return ans;
    })
    .then(ans => res.status(200).json(ans))
    .catch(err => res.status(500).json({ error: 'self not implemented' }));
  });

  // Retrieve current user
  authController.get('/all', onlyLoggedIn, (req, res) => {
    dataLoader.retrieveUsers(req.user.users_id)
    .then(ans => {
      ans.map(one => {
        const email = one.email;
        const HASH = md5(email);
        const hashed = "https://www.gravatar.com/avatar/"+HASH;
        one.avatarUrl = hashed;
      })
      return ans;
    })
    .then(ans => res.status(200).json(ans))
    .catch(err => res.status(500).json({ error: 'self not implemented' }));
  });

  // Retrieve current user
  authController.get('/autocomplete/', onlyLoggedIn, (req, res) => {
    dataLoader.retrieveUsersDynamically(req.query.queryTerm)
    .then(ans => {
      ans.map(one => {
        const email = one.email;
        const HASH = md5(email);
        const hashed = "https://www.gravatar.com/avatar/"+HASH;
        one.avatarUrl = hashed;
      })
      return ans;
    })
    .then(ans => res.status(200).json(ans))
    .catch(err => res.status(500).json({ error: "can't search the term" }));
  });

  authController.patch('/resetStatus', onlyLoggedIn, (req, res) => {
    dataLoader.resetStatus()
    .then(ans => res.status(200).json(ans))
    .catch(err => res.status(500).json({ error: "can't search the term" }));
  });



  // GET THE STATUS OF A GIVEN USER
  authController.get('/:id/status/', onlyLoggedIn, (req, res) => {
    dataLoader.getStatus(req.params.id)
    .then(ans => {
      if (ans.length>0){
        if (ans[0].status==null){
          return 'ONLINE'
        } else {
          return ans[0].status
        }
      } else {
        return 'OFFLINE'
      }
    })
    .then(ans => res.status(200).json(ans))
    .catch(err => res.status(500).json({ error: "can't search the term" }));
  });

  return authController;
};
