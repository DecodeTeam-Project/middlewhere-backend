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

  getStatus(userId) {

    `UPDATE table_name
SET column1=value, column2=value2,...
WHERE some_column=some_value `

    return this.conn.query(`
      SELECT status FROM users WHERE users.id=?
    `, [userId])
  }
  resetStatus() {
    return this.conn.query(`UPDATE users SET status='OFFLINE'`)
      .then(() => this.conn.query(`
        UPDATE users JOIN

        (SELECT DISTINCT users.id FROM users JOIN sessions
          ON users.id=sessions.userId) AS userz ON users.id=userz.id

        SET status='ONLINE'
      `))
    }

  getSingleUser(userId) {
  return this.query(
    knex
    .select('email')
    .from('users')
    .where('id', userId)
    .toString()
  )
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
      if (results.length === 1) {
        user = results[0];
        return bcrypt.compare(password, user.password).catch(() => false);
      }
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
    return this.query(
      knex
      .delete()
      .from('sessions')
      .where('token', token)
      .toString()
    )
    .then(() => true);
  }


  // Project methods ***********************************

  // GET ALL THE PROJECTS FOR THE USER WITH ProgressPct
  getAllProjects(userId) {
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
                          ORDER BY progressPct ASC, deadline, updatedAt DESC
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
    return this.conn.query(`
      SELECT id FROM projects WHERE id=? AND adminUserId=?
    `, [projectId, userId])
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

  // task methods *********************************

  createTask(taskData) {
    return this.query(
      knex
      .insert(util.filterKeys(TASK_WRITE_FIELDS, taskData))
      .into('tasks')
      .toString()
    )
    .then((result) => {
      return this.query(
        knex
        .select(TASK_FIELDS)
        .from('tasks')
        .where('id', result.insertId)
        .toString()
      );
    });
  }

  taskBelongsToUser(taskId, userId) {
    return this.query(
      knex
      .select("*") // ******
      .from('usersForTask')
      // .join('tasks', 'usersForTask.taskId', "=", 'tasks.id')
      .where({
        userId: userId,
        taskId: taskId
      })
      .toString()
    )
    // .then((userForTask) => {
    //   return (project[0].projectId);
    // })
    // .then((projectId) => {
    //   return this.query(
      //   knex
      //   .select('id')
      //
      //   .from('Projects')
      //   .where({
      //     id: projectId,
      //     ownerId: userId
      //   })
      //   .toString()
      // )

    .then((results) => {
      if (results.length === 1) {
        return true;
      }
      throw new Error('Access denied');
    });
  }

  taskIsCompleted(taskId) {
    return this.conn.query(
      `SELECT completed FROM tasks
        WHERE id=?`,
        [taskId]
    )
  }

  TaskProjectBelongsToUser(projectId, userId) {
    return this.conn.query(`
      SELECT * FROM projects WHERE id=? AND adminUserId=?;
    `, [projectId, userId])
    .then((results) => {
      if (results.length === 1) {
        return true;
      }
      throw new Error('Access denied');
    });
  }

  getAllTasksForProject(projectId) {
    return this.query(
      knex
      .select(TASK_FIELDS)
      .from('tasks')
      .where('projectId', projectId)
      .orderBy('updatedAt', 'desc')
      .toString()
    );
  }

  // getAllTasksForProject(projectId) {
  //   return this.query(
  //     knex
  //     .select(TASK_FIELDS)
  //     .from('tasks')
  //     .where('projectId', projectId)
  //     .orderBy('updatedAt', 'desc')
  //     .toString()
  //   );
  // }


  /* Trying to select tasks in a project, whether my
      user is or is not in. If not, I would like to
      have a column named user. That column will be null
      . Since it's null, we will know that the user isn't
      assigned to that task from the Front Ent. So far,
      the AND seems to nullify the purpose of LEFT JOIN */
  // getAllTasksForProjectTwo(projectId, userId) { //userId
  //   return this.conn.query(`
  //     SELECT * FROM
  //     (SELECT DISTINCT tasks.*,usersForTask.userId AS user
  //     FROM tasks LEFT JOIN usersForTask
  //     ON usersForTask.taskId=tasks.id
  //     WHERE usersForTask.userId=32); OR usersForTask.userId IS NULL
  //     AND tasks.projectId=135
  //     ;
  //   `, [projectId, userId])
  // } // *******************************


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
      return this.conn.query(`
        SELECT * FROM usersForTask WHERE taskId=?
      `,[taskId]
      );
    })
    .then(data => {
      return data;
    })
  }

  retrieveUsers(MyUserId) {

    const queryForMyProjects = `
    (SELECT DISTINCT projects.id from tasks LEFT JOIN usersForTask on

      (tasks.id=usersForTask.taskId) JOIN projects on
      (tasks.projectId = projects.id)
    WHERE usersForTask.userId=` + MyUserId + `
      OR projects.adminUserId=` + MyUserId + ` )`;

    const coolQueryBro = `SELECT DISTINCT users.* from users
                          join usersForTask ON users.id=usersForTask.userId
                          join tasks on usersForTask.taskId=tasks.id
                          WHERE tasks.projectId in ` + queryForMyProjects + `
                            ORDER BY users.status DESC;`

    return this.conn.query(coolQueryBro);
    //SELECT DISTINCT users.* from users
    //                       join usersForTask ON users.id=usersForTask.userId
    //                       join tasks on usersForTask.taskId=tasks.id
    //                       WHERE tasks.projectId in
    // (SELECT DISTINCT projects.id from tasks LEFT JOIN usersForTask on
    //
    //   (tasks.id=usersForTask.taskId) JOIN projects on
    //   (tasks.projectId = projects.id)
    // WHERE usersForTask.userId=13
    //   OR projects.adminUserId=13 );

  }

  retrieveUsersDynamically(queryTerm) {
    //SELECT * FROM pet WHERE name LIKE 'b%'
    const currentQuery = `SELECT id AS userId, email, firstName, lastName
      FROM users WHERE firstName like '`
      + queryTerm + `%' OR lastName like '`
      + queryTerm + `%' OR email like '`
      + queryTerm + `%';`
    return this.conn.query(currentQuery);
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
