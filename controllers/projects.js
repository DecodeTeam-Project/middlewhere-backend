const express = require('express');

const onlyLoggedIn = require('../lib/only-logged-in');

module.exports = (dataLoader) => {
  const projectsController = express.Router();

  // GET ALL THE PROJECTS FOR THE USER WITH ProgressPct FOR CURRENT USER

  projectsController.get('/', onlyLoggedIn, (req, res) => {
    dataLoader.getAllProjects(req.user.users_id) // we're getting the user all his projects
    .then(tData => {
      return(tData);
    })
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
  });

  // RETRIEVE THE DATA OF A SINNGLE PROJECT
  projectsController.get('/:id', (req, res) => {
    dataLoader.getSingleProject(req.params.id)
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
  });

  // Create a new project
  projectsController.post('/', onlyLoggedIn, (req, res) => {
    project_data = {
      adminUserId: req.user.users_id,
      title: req.body.title,
      description: req.body.description,
      deadline: req.body.deadline
    };
    dataLoader.createProject(project_data)
    .then(data => res.status(201).json(data))
    .catch(err => res.status(400).json(err));
  });


  // Modify an owned project
  projectsController.patch('/:id', onlyLoggedIn, (req, res) => {
    console.log('projects.js 44' , req.body);
    dataLoader.projectBelongsToUser(req.params.id, req.user.users_id)
    .then( () => {
      dataLoader.updateProject(req.params.id, {
       title: req.body.title,
       description: req.body.description,
       deadline: req.body.deadline
      })
    }
       )
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
  });


  // Delete an owned project ******* MAY WORK ON DELETE LATER
  // projectsController.delete('/:id', onlyLoggedIn, (req, res) => {
  //   // First check if the project to be DELETEd belongs to the user making the request
  //   dataLoader.projectBelongsToUser(req.params.id, req.user.id)
  //   .then(() => {
  //     return dataLoader.deleteProject(req.params.id);
  //   })
  //   .then(() => res.status(204).end())
  //   .catch(err => res.status(400).json(err));
  // });


  // Retrieve all the tasks for a single project
  projectsController.get('/:id/tasks', (req, res) => {
    const this_project_id = req.params.id;
    dataLoader.getAllTasksForProject(this_project_id)
    .then(data => res.json(data))
    .catch(err => res.status(400).json(err));
    // res.status(500).json({ error: 'not implemented' });
  });

  // Create a new task under a project
  projectsController.post('/:id/tasks', onlyLoggedIn, (req, res) => {
    const user_id = req.user.users_id;
    const project_id = Number(req.params.id);
    const task_data = {
      projectId: project_id,
      title: req.body.title,
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

    dataLoader.projectBelongsToUser(req.params.id, user_id)
    .then(() => {
      dataLoader.createTask(task_data) } )
    .then(data => {
      console.log('the response ... PROJ.js ' , data);
      res.json(data)}) // status(201).   no response
    .catch(err => res.status(400).json(err));
    // res.status(500).json({ error: 'not implemented' });
  });

  return projectsController;
};
