#!/usr/bin/env node
/**
 * 数据库初始化脚本
 * 用于创建数据库和表结构，方便合作人快速设置开发环境
 * 
 * 使用方式:
 * 1. 确保已安装 Node.js 和 MySQL
 * 2. 配置环境变量（复制 .env.example 为 .env 并修改）
 * 3. 运行: npm run setup
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// 数据库连接配置（使用 root 用户创建数据库）
const rootConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
};

const dbConfig = {
  ...rootConfig,
  database: process.env.MYSQL_DATABASE || 'program',
};

// 创建数据库和表结构
async function setupDatabase() {
  console.log('\n🚀 开始初始化数据库...\n');

  let connection;

  try {
    // 1. 连接到 MySQL（不指定数据库）
    console.log('🔌 连接到 MySQL...');
    connection = await mysql.createConnection(rootConfig);
    console.log('✅ MySQL 连接成功\n');

    // 2. 创建数据库
    console.log('🗄️ 创建数据库...');
    await connection.execute(
      `CREATE DATABASE IF NOT EXISTS ${dbConfig.database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ 数据库 \`${dbConfig.database}\` 创建成功\n`);

    // 3. 切换到新数据库
    await connection.execute(`USE ${dbConfig.database}`);

    // 4. 创建用户表
    console.log('📋 创建用户表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id CHAR(36) NOT NULL PRIMARY KEY COMMENT '用户唯一标识',
        email VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱地址',
        password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希值',
        display_name VARCHAR(100) NOT NULL COMMENT '显示名称',
        role ENUM('student', 'school') NOT NULL COMMENT '用户角色',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表'
    `);
    console.log('✅ 用户表创建成功');

    // 5. 创建活动表
    console.log('📋 创建活动表...');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动表'
    `);
    console.log('✅ 活动表创建成功');

    // 6. 创建评论表
    console.log('📋 创建评论表...');
    await connection.execute(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表'
    `);
    console.log('✅ 评论表创建成功');

    // 7. 创建平台管理员表
    console.log('📋 创建平台管理员表...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS platform_admins (
        user_id CHAR(36) NOT NULL PRIMARY KEY COMMENT '管理员用户ID',
        note VARCHAR(200) NULL COMMENT '备注信息',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
        CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='平台管理员表'
    `);
    console.log('✅ 平台管理员表创建成功\n');

    // 8. 显示创建的表
    console.log('📊 数据库表结构:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });

    console.log('\n🎉 数据库初始化完成！');
    console.log('\n📝 下一步操作:');
    console.log('  1. 确保已安装依赖: npm install');
    console.log('  2. 启动开发服务器: npm run dev');
    console.log('  3. 如需添加示例数据: npm run seed');

  } catch (error) {
    console.error('\n❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 检查环境变量配置
function checkEnvironment() {
  console.log('🔍 检查环境配置...');
  
  const requiredEnv = [
    'MYSQL_HOST',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'JWT_SECRET'
  ];

  const missingEnv = requiredEnv.filter(key => !process.env[key]);
  
  if (missingEnv.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missingEnv.forEach(key => console.error(`  - ${key}`));
    console.log('\n📌 请复制 server/.env.example 为 server/.env 并配置相关变量');
    process.exit(1);
  }

  console.log('✅ 环境配置检查通过\n');
}

// 主函数
async function main() {
  // 检查环境配置
  checkEnvironment();
  
  // 执行数据库初始化
  await setupDatabase();
}

// 运行
main();
