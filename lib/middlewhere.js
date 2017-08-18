const bcrypt = require('bcrypt-as-promised');

const knex = require('knex')({ client: 'mysql' });

const validate = require('./validations');
const util = require('./util');

const HASH_ROUNDS = 10;
const USER_FIELDS = ['id', 'email', 'firstName', 'lastName', 'password', 'createdAt', 'updatedAt'];
const USER_SIGNUP_FIELDS = ['email', 'firstName', 'lastName', 'password'];
const USER_LOGIN_FIELDS = ['email', 'password'];
const USER_FOR_TASK_FIELDS = ['userId','taskId','createdAt', 'updatedAt']; //
const USER_FOR_TASK_WRITE_FIELDS = ['userId','taskId']; //
const PROJECT_FIELDS = ['id', 'title', 'description', 'adminUserId', 'deadline', 'createdAt', 'updatedAt'];
const PROJECT_WRITE_FIELDS = ['adminUserId', 'title', 'description', 'deadline'];


const TASK_FIELDS = ['id','projectId', 'title', 'description', 'deadline', 'priority', 'completed', 'createdAt', 'updatedAt']; // added
const TASK_WRITE_FIELDS = ['projectId', 'title', 'description', 'deadline', 'priority', 'completed'];


class middlewhereDataLoader { // type of an object
  constructor(conn) {
    this.conn = conn;
  }

  query(sql) {
    return this.conn.query(sql);
  }

  // User methods
  createUser(userData) {
    const errors = validate.user(userData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }
    return bcrypt.hash(userData.password, HASH_ROUNDS)
    .then((hashedPassword) => {
      return this.query(
        knex
        .insert({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: hashedPassword
        })
        .into('users')
        .toString()
      );
    })
    .then((result) => {
      return this.query(
        knex
        .select(USER_FIELDS)
        .from('users')
        .where('id', result.insertId)
        .toString()
      );
    })
    .then(result => {
      return result[0]})
    .catch((error) => {
      // Special error handling for duplicate entry
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('A user with this email already exists');
      } else {
        throw error;
      }
    });
  }

  deleteUser(userId) {
    return this.query(
      knex.delete().from('users').where('id', userId).toString()
    );
  }

  getUserFromSession(sessionToken) {
    return this.query(
      knex
      .select(util.joinKeys('users', USER_FIELDS))
      .from('sessions')
      .join('users', 'sessions.userId', '=', 'users.id')
      .where({
        'sessions.token': sessionToken
      })
      .toString()
    )
    .then((result) => {
      if (result.length === 1) {
        return result[0];
      }
      return null;
    });
  }

  createTokenFromCredentials(email, password) {
    const errors = validate.credentials({
      email: email,
      password: password
    });
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    let sessionToken;
    let user;

    return this.query(
      knex
      .select('id', 'password')
      .from('users')
      .where('email', email)
      .toString()
    )
    .then((results) => {
      console.log('112 ' ,results);
      if (results.length === 1) {
        user = results[0];
        return bcrypt.compare(password, user.password).catch(() => false);
      }
      console.log('116 ' ,results);
      return false;
    })
    .then((result) => {
      if (result === true) {
        return util.getRandomToken();
      }

      throw new Error('Username or password invalid');
    })
    .then((token) => {
      sessionToken = token;
      return this.query(
        knex
        .insert({
          userId: user.id,
          token: sessionToken
        })
        .into('sessions')
        .toString()
      );
    })
    .then(() => sessionToken);
  }
  deleteToken(token) {
    console.log(token);
    return this.query(
      knex
      .delete()
      .from('sessions')
      .where('token', token)
      .toString()
    )
    .then(() => true);
  }


  // Project methods

  // GET ALL THE PROJECTS FOR THE USER WITH ProgressPct
  getAllProjects(userId) {

    // return this.conn.query(`
    //   SELECT * FROM projects;
    // `);
    // return this.conn.query(`SELECT projects.*, AVG(tasks.completed)*100 AS progressPct FROM projects
    //                   RIGHT OUTER JOIN tasks ON (tasks.projectId=projects.id)
    //                   GROUP BY projects.id`); // NEEDS TO HAVE TASKS THERE


    return this.conn.query(
      ` SELECT projects.*, AVG(tasks.completed)*100 AS progressPct FROM projects
                        LEFT JOIN tasks ON (tasks.projectId=projects.id)
                        WHERE

                        (   projects.id IN

                        (SELECT DISTINCT projects.id from tasks LEFT JOIN usersForTask on
                          (tasks.id=usersForTask.taskId) JOIN projects on
                          (tasks.projectId = projects.id)
                        WHERE usersForTask.userId=? )


                          OR projects.adminUserId=? )


                          GROUP BY projects.id
                          ;`, [userId, userId])
  }
  getSingleProject(projectId) {
    return this.query(
      knex
      .select(PROJECT_FIELDS)
      .from('projects')
      .where('id', projectId)
      .toString()
    ); // RETURNS A PROJECT IN AN ARRAY !!!
  }

  createProject(projectData) {

    const errors = validate.project(projectData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    if (!projectData.deadline){
      projectData.deadline = null;
    } // default -- no deadline

    return this.query(
      knex
      .insert(util.filterKeys(PROJECT_WRITE_FIELDS, projectData))
      .into('projects')
      .toString()
    )
    .then((result) => {
      return this.query(
        knex
        .select(PROJECT_FIELDS)
        .from('projects')
        .where('id', result.insertId)
        .toString()
      );
    });
  }

  projectBelongsToUser(projectId, userId) {
    return this.query(
      knex
      .select('id')
      .from('projects')
      .where({
        id: projectId,
        adminUserId: userId
      })
      .toString()
    )
    .then((results) => {
      if (results.length === 1) {
        return true;
      }
      throw new Error('Access denied');
    });
  }

  updateProject(projectId, projectData) {
    const errors = validate.projectUpdate(projectData);
    if (errors) {
      return Promise.reject({ errors: errors });
    }

    if (!projectData.deadline){
      projectData.deadline = null;
    } // default -- no deadline

    return this.query(
      knex('Projects')
      .update(util.filterKeys(PROJECT_WRITE_FIELDS, projectData))
      .where('id', projectId)
      .toString()
    )
    .then(() => {
      return this.query(
        knex
        .select(PROJECT_FIELDS)
        .from('projects')
        .where('id', projectId)
        .toString()
      );
    });
  }

  // deleteProject(projectId) {
  //   return this.query(
  //     knex
  //     .delete()
  //     .from('projects')
  //     .where('id', projectId)
  //     .toString()
  //   );
  // }

  // task methods
  getAllTasksForProject(projectId) {
    return this.query(
      knex
      .select(TASK_FIELDS)
      .from('tasks')
      .where('projectId', projectId)
      .toString()
    );
  }

  createTask(taskData) {
    return this.query(
      knex
      .insert(util.filterKeys(TASK_WRITE_FIELDS, taskData))
      .into('tasks')
      .toString()
    )
    // .then((result) => {
    //   return this.conn.query(`SELECT * FROM tasks;`);
    //   console.log('MW 304 .. .' , result.insertId);
    //   return this.query(
    //     knex
    //     .select("*")
    //     .from('tasks')
    //     .where('id', result.insertId)
    //     .toString()
    //   );
    // });
  }

  taskBelongsToUser(userId) {
    return this.query(
      knex
      .select(USER_FOR_TASK_FIELDS) // ******
      .from('usersForTask')
      .rightJoin('tasks', 'usersForTask.taskId', 'tasks.id')
      .where({
        userId: userId
      })
      .toString()
    )
    .then((userForTask) => {
      console.log('fdsfasdfasdf' , userForTask);
      return (project[0].projectId);
    })
    .then((projectId) => {
      return this.query(
        knex
        .select('id')

        .from('Projects')
        .where({
          id: projectId,
          ownerId: userId
        })
        .toString()
      )

    })
    .then((results) => {
      if (results.length === 1) {
        return true;
      }
      throw new Error('Access denied');
    });
  }
  // UPDATE THE TASK
  updateTask(taskId, taskData) {
    return this.query(
      knex('tasks')
      .update(util.filterKeys(TASK_WRITE_FIELDS, taskData))
      .where('id', taskId)
      .toString()
    )
    .then(() => {
      return this.query(
        knex
        .select(TASK_FIELDS)
        .from('tasks')
        .where('id', taskId)
        .toString()
      );
    });
  }
  // UPDATE THE TASK AS COMPLETED OR NOT
  updateTaskComplete(taskId, completed) {
    return this.query(
      knex('tasks')
      .update('completed', completed)
      .where('id', taskId)
      .toString()
    )
    .then(() => {
      return this.query(
        knex
        .select(TASK_FIELDS)
        .from('tasks')
        .where('id', taskId)
        .toString()
      );
    });
  }

  //  GET ALL PROJECTS FOR A GIVEN TASK
  getAllProjectsForTask(task_Id) {
    return this.conn.query(
      `SELECT projectId FROM tasks WHERE id=?;`, [task_Id])
  }
  //  GET ALL ASSIGNED USERS FOR A GIVEN TASK
  getAllUsersForTask(task_Id) {
    return this.conn.query(
      `SELECT users.* FROM usersForTask JOIN users ON
      usersForTask.userId=users.id
       WHERE taskId=?;`, [task_Id])
  }


  assignUsersForTask(userId , taskId) {
    return this.conn.query(
      `INSERT INTO usersForTask (userId, taskId) VALUES (? , ?);`, [userId, taskId]
    )
    .then((result) => {
      return this.query(
        knex
        .select('*')
        .from('usersForTask')
        .where('taskId', taskId)
        .toString()
      );
    })
    .then(data => {
      return data;
    })
  }

  retrieveUsers() {
    return this.conn.query(`SELECT id AS userId, email, firstName, lastName   FROM users;`)
  }

  // deleteTask(taskId) {
  //   return this.query(
  //     knex
  //     .delete()
  //     .from('tasks')
  //     .where('id', taskId)
  //     .toString()
  //   );
  // }
}

module.exports = middlewhereDataLoader;
