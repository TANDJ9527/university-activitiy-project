-- 校园活动发布平台 - 数据库初始化脚本
-- 使用方式: mysql -u root -p < schema.sql

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS program CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE program;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT '用户唯一标识',
  email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱地址',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希值',
  display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
  role ENUM('student', 'school') NOT NULL COMMENT '用户角色: student-学生, school-校方',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 创建活动表
CREATE TABLE IF NOT EXISTS activities (
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT '活动唯一标识',
  user_id CHAR(36) NOT NULL COMMENT '发布者ID',
  publisher_role ENUM('student', 'school') NOT NULL COMMENT '发布者角色',
  title VARCHAR(120) NOT NULL COMMENT '活动标题',
  description TEXT NOT NULL COMMENT '活动描述',
  location VARCHAR(500) NOT NULL DEFAULT '' COMMENT '活动地点',
  organizer VARCHAR(200) NOT NULL DEFAULT '' COMMENT '主办方',
  contact VARCHAR(200) NOT NULL DEFAULT '' COMMENT '联系方式',
  category VARCHAR(50) NOT NULL DEFAULT '其他' COMMENT '活动类别',
  start_at DATETIME(3) NOT NULL COMMENT '开始时间',
  end_at DATETIME(3) NULL COMMENT '结束时间',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',
  KEY idx_activities_user (user_id),
  KEY idx_activities_start (start_at),
  KEY idx_activities_publisher (publisher_role),
  CONSTRAINT fk_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表';

-- 创建评论表
CREATE TABLE IF NOT EXISTS comments (
  id CHAR(36) NOT NULL PRIMARY KEY COMMENT '评论唯一标识',
  activity_id CHAR(36) NOT NULL COMMENT '活动ID',
  user_id CHAR(36) NOT NULL COMMENT '评论者ID',
  content TEXT NOT NULL COMMENT '评论内容',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '评论时间',
  KEY idx_comments_activity (activity_id),
  KEY idx_comments_user (user_id),
  CONSTRAINT fk_comments_activity FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 创建平台管理员表
CREATE TABLE IF NOT EXISTS platform_admins (
  user_id CHAR(36) NOT NULL PRIMARY KEY COMMENT '管理员用户ID',
  note VARCHAR(200) NULL COMMENT '备注信息',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台管理员表';

-- 显示创建的表
SHOW TABLES;

-- 显示表结构
DESCRIBE users;
DESCRIBE activities;
DESCRIBE comments;
DESCRIBE platform_admins;

SELECT '✅ 数据库初始化完成' AS result;
