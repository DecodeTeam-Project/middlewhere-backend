const express = require('express');
const onlyLoggedIn = require('../lib/only-logged-in');
var md5 = require('md5'); // for hashing emails for Gravatar

module.exports = (dataLoader) => {
  const tasksController = express.Router();

  // Modify a task
  tasksController.patch('/:id', onlyLoggedIn, (req, res) => {

    console.log(req.body, "this is my new consolelog")
      const task_data = {
        projectId: req.body.projectId, /// ADDED REQ..projectId
         master
        title: req.body.title,
        description: req.body.description,
        deadline: req.body.deadline,
        priority: req.body.priority
      }


      if (!task_data.deadline){
        task_data.deadline=null;
      } // DAFAULT FOR DEADLINE
      if (!task_data.priority){
        task_data.priority='normal';
      } // DAFAULT FOR PRIORITY
      if (!task_data.description){
        task_data.description='';
      } // DAFAULT FOR DESCRIPTION

      const real_user = req.user.users_id;


      dataLoader.projectBelongsToUser(req.body.projectId, real_user)
      .then(() => {
        dataLoader.updateTask(req.params.id, task_data)})
      .then(data => {
        return res.json(data)})
      .catch(err => res.status(400).send(err.stack));

  });
  // Retrieve a list of projects
  // projectsController.get('/', (req, res) => {
  //   dataLoader.getAllprojects({
  //     page: req.query.page,
  //     limit: req.query.count
  //   })
  //   .then(data => res.json(data))
  //   .catch(err => res.status(400).json(err));
  // });


  tasksController.patch('/:id', onlyLoggedIn, (req, res) => {
      const real_user = req.user.users_id;
      console.log('tasks.js 52 : ', req.params.id, real_user);
      dataLoader.taskBelongsToUser(req.params.id, real_user)
      .then(() => dataLoader.updateTask(req.params.id, task_data))
      .then(data => {
        return res.json(data)})
      .catch(err => res.status(400).json(err));
  });

  // CHANGE TASK COMPLETION STATUS IF IT BELONGS TO USER
  tasksController.patch('/:id/completed', onlyLoggedIn, (req, res) => {
      return dataLoader.taskBelongsToUser(req.params.id, req.user.users_id)
      .then(() => {
        return dataLoader.updateTaskComplete(req.params.id, req.body.completed)
      })
      .then(data => {
        return res.json(data)})
      .catch(err => res.status(400).json(err));
  });


  tasksController.get('/:id/completed', onlyLoggedIn, (req, res) => {
      return dataLoader.taskIsCompleted(req.params.id)
      .then(data => {
        return res.json(data)})
      .catch(err => res.status(400).json(err));
  });

  tasksController.post('/:id/assigned', onlyLoggedIn, (req, res) => {
      const userId = req.user.users_id;
      var projectId;
      const taskId = req.params.id;
      var assigneeId = userId;
      if (req.body && req.body.assigneeId){
        assigneeId=req.body.assigneeId;
      };
      dataLoader.getAllProjectsForTask(taskId)
      .then(project_Id => {
        dataLoader.projectBelongsToUser(project_Id, userId)
      })
      .then(() => {
        return dataLoader.assignUsersForTask(assigneeId, taskId);})
      .then(data => {
        return res.json(data[0])})
      .catch(err => res.status(400).json(err));
  });

  // RETRIEVE USERS THAT ARE ASSIGNED FOR A GIVEN TASK *******
  tasksController.get('/:id/assigned', onlyLoggedIn, (req, res) => {
    dataLoader.getAllUsersForTask(req.params.id)
    .then(users => {
      users.map(user=> {
        const email = user.email;
        const HASH = md5(email);
        const hashed = "https://www.gravatar.com/avatar/"+HASH;
        user.avatarUrl = hashed;
        return user;
      });

      return res.json(users)
    })
    .catch(err => res.status(400).json(err));
  });

  return tasksController;
};
