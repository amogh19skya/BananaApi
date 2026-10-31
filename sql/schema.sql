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

-- 4. Endless Runner Runs Table (Logs each 3D Banana Surfers run)
CREATE TABLE IF NOT EXISTS `runner_runs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `distance_meters` INT NOT NULL DEFAULT '0',
  `bananas_collected` INT NOT NULL DEFAULT '0',
  `crates_encountered` INT NOT NULL DEFAULT '0',
  `crates_solved` INT NOT NULL DEFAULT '0',
  `powerups_used` INT NOT NULL DEFAULT '0',
  `highest_multiplier` INT NOT NULL DEFAULT '1',
  `final_score` BIGINT NOT NULL DEFAULT '0',
  `run_duration_seconds` INT NOT NULL DEFAULT '0',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_final_score` (`final_score` DESC),
  CONSTRAINT `runner_runs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 5. Endless Runner Upgrades Table (Persistent upgrades and banked currency)
CREATE TABLE IF NOT EXISTS `runner_upgrades` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL UNIQUE,
  `magnet_level` INT NOT NULL DEFAULT '1',
  `jetpack_level` INT NOT NULL DEFAULT '1',
  `sneakers_level` INT NOT NULL DEFAULT '1',
  `multiplier_level` INT NOT NULL DEFAULT '1',
  `hoverboards_in_stock` INT NOT NULL DEFAULT '3',
  `total_bananas_banked` BIGINT NOT NULL DEFAULT '0',
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `runner_upgrades_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


