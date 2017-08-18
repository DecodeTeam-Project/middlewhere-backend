const express = require('express');
const onlyLoggedIn = require('../lib/only-logged-in');
var md5 = require('md5'); // for hashing emails for Gravatar

module.exports = (dataLoader) => {
  const tasksController = express.Router();

  // Modify a task
  tasksController.patch('/:id', onlyLoggedIn, (req, res) => {

      const task_data = {
        projectId: req.body.project_id, /// ADDED REQ..projectId
        title: req.body.title,
        url: req.body.url,
        description: req.body.description,
        deadline: req.body.deadline,
        priority: req.body.priority
      }

      if (!task_data.deadline){
        task_data.deadline=null;
      } // DAFAULT FOR DEADLINE
      if (!task_data.priority){
        task_data.priority=null;
      } // DAFAULT FOR PRIORITY
      if (!task_data.description){
        task_data.description='';
      } // DAFAULT FOR DESCRIPTION

      const real_user = req.user.users_id;
      dataLoader.taskBelongsToUser(req.params.id, real_user)
      .then(() => dataLoader.updateTask(req.params.id, task_data))
      .then(data => {
        console.log(data);
      return res.json(data)})
      .catch(err => res.status(400).json(err));

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
      console.log(' ++++++ ++++++ ++++++');
      const real_user = req.user.users_id;
      dataLoader.taskBelongsToUser(req.params.id, real_user)
      .then(() => dataLoader.updateTask(req.params.id, task_data))
      .then(data => {
        console.log('tasks 55 ' ,data);
        return res.json(data)})
      .catch(err => res.status(400).json(err));
  });


  tasksController.post('/:taskId/assigned', onlyLoggedIn, (req, res) => {
      const userId = req.user.users_id;
      var projectId;
      const taskId = req.params.taskId;
      var assigneeId = userId;
      if (req.body && req.body.assigneeId){
        assigneeId=req.body.assigneeId;
      };
      dataLoader.getAllProjectsForTask(taskId)
      .then(project_Id => {
        console.log(project_Id);
        dataLoader.projectBelongsToUser(project_Id, userId)
      })
      .then(() => {
        return dataLoader.assignUsersForTask(assigneeId, taskId);})
      .then(data => {
        return res.json(data[0])})
      .catch(err => res.status(400).json(err));
  });

  // RETRIEVE USERS THAT ARE ASSIGNED FOR A GIVEN TASK
  tasksController.get('/:id/assigned', onlyLoggedIn, (req, res) => {
    const taskId = req.params.id;
    dataLoader.getAllUsersForTask(taskId)
    .then(users => {

      users.map(user=> {
        const email = user.email;
        const HASH = md5(email);
        const hashed = "https://www.gravatar.com/avatar/"+HASH;
        user.avatarUrl = hashed;
        return user;
      });

      console.log(users);
      return res.json(users)
    })
    .catch(err => res.status(400).json(err));
  });

  // Delete a task
  // tasksController.delete('/:id', onlyLoggedIn, (req, res) => {
  //   const real_user = req.user.users_id; //
  //   const task_id = req.params.id;
  //
  //   dataLoader.taskBelongsToUser(task_id, real_user)
  //   .then(() => {
  //     return dataLoader.deletetask(task_id);
  //   })
  //   .then(() => res.status(204).end())
  //   .catch(err => res.status(400).json(err));
  // });
  //
  return tasksController;
};
