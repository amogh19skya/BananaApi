-- ==========================================================
-- Banana Brain Quest - Database Schema
-- Database: banana_brain_quest
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `banana_brain_quest`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `banana_brain_quest`;

-- 1. Users Table (Stores user credentials and profile timestamps)
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Scores Table (Tracks player scores across difficulty levels)
CREATE TABLE IF NOT EXISTS `scores` (
  `score_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `difficulty` ENUM('easy', 'hard', 'extraHard') NOT NULL,
  `score` INT NOT NULL DEFAULT '0',
  `correct_answers` INT NOT NULL DEFAULT '0',
  `total_questions` INT NOT NULL DEFAULT '10',
  `played_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`score_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `scores_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 3. Game History Table (Logs detailed gameplay round outcomes)
CREATE TABLE IF NOT EXISTS `game_history` (
  `game_id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `difficulty` ENUM('easy', 'hard', 'extraHard') NOT NULL,
  `final_score` INT NOT NULL DEFAULT '0',
  `questions_answered` INT NOT NULL DEFAULT '0',
  `game_status` ENUM('completed', 'timeout') NOT NULL,
  `played_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`game_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `game_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

