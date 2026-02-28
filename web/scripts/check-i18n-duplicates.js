#!/usr/bin/env node

/**
 * 检查 i18n 文件中同一对象内的重复键
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkDuplicates(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  const duplicates = [];
  const stack = []; // 跟踪嵌套层级
  const keysByLevel = [new Map()]; // 每层的键映射

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 检测对象开始 {
    const openBrace = line.match(/\{/g);
    if (openBrace) {
      for (let j = 0; j < openBrace.length; j++) {
        stack.push(lineNum);
        keysByLevel.push(new Map());
      }
    }

    // 检测键定义
    const keyMatch = line.match(/^\s*(\w+):\s*['{]/);
    if (keyMatch) {
      const key = keyMatch[1];
      const currentLevel = keysByLevel[keysByLevel.length - 1];

      if (currentLevel.has(key)) {
        duplicates.push({
          key,
          firstLine: currentLevel.get(key),
          secondLine: lineNum
        });
      } else {
        currentLevel.set(key, lineNum);
      }
    }

    // 检测对象结束 }
    const closeBrace = line.match(/\}/g);
    if (closeBrace) {
      for (let j = 0; j < closeBrace.length; j++) {
        if (stack.length > 0) {
          stack.pop();
          keysByLevel.pop();
        }
      }
    }
  }

  return duplicates;
}

const localesDir = path.join(__dirname, '../src/locales');
const files = ['zh-CN.ts', 'en-US.ts'];

let hasErrors = false;

for (const file of files) {
  const filePath = path.join(localesDir, file);
  console.log(`\nChecking ${file}...`);

  const duplicates = checkDuplicates(filePath);

  if (duplicates.length > 0) {
    hasErrors = true;
    console.error(`❌ Found ${duplicates.length} duplicate key(s) in same object:`);
    for (const { key, firstLine, secondLine } of duplicates) {
      console.error(`  - "${key}" appears on lines: ${firstLine}, ${secondLine}`);
    }
  } else {
    console.log(`✅ No duplicates found`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('\n✅ All i18n files are valid');
