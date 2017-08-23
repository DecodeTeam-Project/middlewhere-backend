DROP DATABASE IF EXISTS middlewhere;

CREATE DATABASE middlewhere;

USE middlewhere;

-- CREATE TABLE `org` (
--   `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
--   `name` varchar(60) NOT NULL DEFAULT '',
--   `payment` varchar(100) DEFAULT NULL,
--   `code` varchar(100) DEFAULT NULL,
--   `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
--   `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`)

DROP TABLE IF EXISTS `middlewhere`.`users` ;
CREATE TABLE middlewhere.`users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(50) NOT NULL UNIQUE,
  `firstName` varchar(50) NOT NULL DEFAULT '',
  `lastName` varchar(50) NOT NULL DEFAULT '',
  `password` varchar(60) NOT NULL DEFAULT '',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
ALTER TABLE users ADD status VARCHAR(20) DEFAULT 'OFFLINE';


DROP TABLE IF EXISTS `middlewhere`.`projects` ;
CREATE TABLE middlewhere.`projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL DEFAULT '',
  `description` varchar(140) DEFAULT NULL,
  `adminUserId` int(11) NOT NULL,
  `deadline` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (adminUserId) REFERENCES users (id)
);



DROP TABLE IF EXISTS `middlewhere`.`sessions` ;
CREATE TABLE middlewhere.`sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `userId` int(11) NOT NULL,
  `token` varchar(100) NOT NULL DEFAULT '',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

-- # Dump of table subtasks
-- # ------------------------------------------------------------

-- CREATE TABLE `subtasks` (
--   `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
--   `name` varchar(100) NOT NULL DEFAULT '',
--   `milestones` varchar(100) NOT NULL DEFAULT '',
--   `completed` tinyint(1) NOT NULL,
--   `description` varchar(140) DEFAULT NULL,
--   `deadline` datetime DEFAULT NULL,
--   `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   `priority` tinyint(1) DEFAULT NULL,
--   `milestoneId` int(11) DEFAULT NULL,
--   PRIMARY KEY (`id`)


DROP TABLE IF EXISTS `tasks` ;
CREATE TABLE `tasks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL DEFAULT '',
  `description` varchar(140) DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `priority` enum('low', 'normal', 'high') DEFAULT 'normal',
  `projectId` int(11) NOT NULL, -- add foreign key
  `completed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (projectId) REFERENCES projects (id)
);


DROP TABLE IF EXISTS `usersForTask` ;
CREATE TABLE `usersForTask` (
  `userId` int(11) NOT NULL,
  `taskId` int(11) NOT NULL,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`,`taskId`),
  FOREIGN KEY (userId) REFERENCES users (id),
  FOREIGN KEY (taskId) REFERENCES tasks (id)
);
