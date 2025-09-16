// DeepSeek DOM结构分析脚本
// 请在DeepSeek对话页面的控制台中运行此脚本

console.log('🔍 开始分析DeepSeek DOM结构...');

// 1. 检查常见的用户消息选择器
const userSelectors = [
  '[data-role="user"]',
  '[data-author="user"]',
  '[data-message-author="user"]',
  '[data-message-author-role="user"]',
  '.user-message',
  '.message-user',
  '.user',
  '.human',
  '.conversation-item.user',
  '[class*="user"]',
  '[class*="human"]',
  '[role="user"]'
];

console.log('📋 检查用户消息选择器:');
userSelectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ ${selector}: 找到 ${elements.length} 个元素`);
      // 显示第一个元素的信息
      if (elements[0]) {
        console.log(`   - 文本内容: "${elements[0].textContent.trim().substring(0, 50)}..."`);
        console.log(`   - 类名: "${elements[0].className}"`);
        console.log(`   - 标签: ${elements[0].tagName}`);
      }
    }
  } catch (e) {
    console.log(`❌ ${selector}: 选择器错误`);
  }
});

// 2. 检查AI回答选择器
const assistantSelectors = [
  '[data-role="assistant"]',
  '[data-author="assistant"]',
  '[data-message-author="assistant"]',
  '[data-message-author-role="assistant"]',
  '[data-message-author-role="model"]',
  '.assistant-message',
  '.message-assistant',
  '.assistant',
  '.ai',
  '.bot',
  '.model',
  '.conversation-item.assistant',
  '[class*="assistant"]',
  '[class*="ai"]',
  '[class*="bot"]',
  '[class*="model"]',
  '[role="assistant"]'
];

console.log('\n🤖 检查AI回答选择器:');
assistantSelectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ ${selector}: 找到 ${elements.length} 个元素`);
      if (elements[0]) {
        console.log(`   - 文本内容: "${elements[0].textContent.trim().substring(0, 50)}..."`);
        console.log(`   - 类名: "${elements[0].className}"`);
        console.log(`   - 标签: ${elements[0].tagName}`);
      }
    }
  } catch (e) {
    console.log(`❌ ${selector}: 选择器错误`);
  }
});

// 3. 分析整体对话结构
console.log('\n🏗️ 分析对话容器结构:');
const conversationSelectors = [
  '.conversation',
  '.chat',
  '.messages',
  '.dialog',
  '[class*="conversation"]',
  '[class*="chat"]',
  '[class*="message"]',
  '[class*="dialog"]'
];

conversationSelectors.forEach(selector => {
  try {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ ${selector}: 找到 ${elements.length} 个容器`);
    }
  } catch (e) {
    console.log(`❌ ${selector}: 选择器错误`);
  }
});

// 4. 输出页面的基本信息
console.log('\n📄 页面基本信息:');
console.log(`URL: ${window.location.href}`);
console.log(`标题: ${document.title}`);
console.log(`Body类名: ${document.body.className}`);

console.log('\n🎯 请将以上完整输出结果发给我，我将据此更新DeepSeek选择器配置！');
