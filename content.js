// 监听页面加载完成
window.addEventListener('load', function() {
  initPlugin();
});

// 当DOM内容变化时也尝试初始化（针对SPA应用）
function initPlugin() {
  // 检查是否在Gemini页面
  if (window.location.hostname === 'gemini.google.com') {
    // 确保只初始化一次
    if (!window.geminiTimelineInitialized) {
      window.geminiTimelineInitialized = true;
      // 创建时间线容器
      createTimelineContainer();
      // 改进的初始化时间线
      initializeTimeline();
      // 设置MutationObserver监听页面变化
      observePageChanges();
      // 定期检查更新（以防MutationObserver失效），降低频率
      setInterval(scanQuestions, 10000); // 改为10秒，减少频繁扫描
    }
  }
}

// 简化的初始化函数
function initializeTimeline() {
  console.log('Gemini Timeline: 开始简化初始化');
  
  // 立即扫描一次
  setTimeout(scanQuestions, 500);
  
  // 添加输入监听
  addInputListeners();
  
  // 添加滚动监听
  addScrollListeners();
}

// 添加输入监听 - 监听用户输入完成
function addInputListeners() {
  // 监听 Enter 键和发送按钮
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      console.log('Gemini Timeline: 检测到Enter键，准备更新时间线');
      setTimeout(() => {
        scanQuestions();
      }, 1000); // 等待1秒让问题提交并渲染
    }
  });
  
  // 监听发送按钮点击（通用选择器）
  document.addEventListener('click', function(e) {
    const target = e.target;
    if (target.matches('[data-testid*="send"], button[aria-label*="Send"], button[aria-label*="发送"], .send-button, [class*="send"]')) {
      console.log('Gemini Timeline: 检测到发送按钮点击，准备更新时间线');
      setTimeout(() => {
        scanQuestions();
      }, 1000);
    }
  });
}

// 添加滚动监听 - 监听滚动到顶部的刷新
function addScrollListeners() {
  let lastScrollTop = window.scrollY;
  let scrollTimeout = null;
  
  window.addEventListener('scroll', function() {
    const currentScrollTop = window.scrollY;
    
    // 检测向上滚动到顶部
    if (currentScrollTop < 100 && lastScrollTop > currentScrollTop) {
      console.log('Gemini Timeline: 检测到滚动到顶部，可能触发历史加载');
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      // 延迟更新，等待可能的历史内容加载
      scrollTimeout = setTimeout(() => {
        scanQuestions();
      }, 2000);
    }
    
    lastScrollTop = currentScrollTop;
  });
}

// 创建时间线容器
function createTimelineContainer() {
  // 检查时间线容器是否已存在
  const existing = document.getElementById('gemini-timeline');
  if (existing) {
    console.log('Gemini Timeline: 时间线容器已存在');
    return;
  }
  
  console.log('Gemini Timeline: 创建新的时间线容器');
  
  // 创建主容器
  const sidebar = document.createElement('div');
  sidebar.id = 'gemini-timeline';
  sidebar.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    width: 320px;
    max-height: 80vh;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;

  // 创建标题栏
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    border-radius: 12px 12px 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
  `;
  header.innerHTML = `
    <span>问题时间线</span>
    <div>
      <span id="question-count" style="font-size: 12px; opacity: 0.8; margin-right: 10px;">0 个问题</span>
      <button id="timeline-toggle" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0;">−</button>
    </div>
  `;

  // 创建搜索框容器
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafbfc;
  `;
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 搜索问题...';
  searchInput.id = 'timeline-search';
  searchInput.style.cssText = `
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
  `;
  
  searchContainer.appendChild(searchInput);

  // 创建内容区域
  const content = document.createElement('div');
  content.id = 'timeline-content';
  content.className = 'timeline-content';
  content.style.cssText = `
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
    max-height: calc(80vh - 120px);
  `;

  sidebar.appendChild(header);
  sidebar.appendChild(searchContainer);
  sidebar.appendChild(content);
  
  // 添加到页面
  document.body.appendChild(sidebar);

  // 添加切换功能
  document.getElementById('timeline-toggle').addEventListener('click', function() {
    const content = document.getElementById('timeline-content');
    const searchContainer = sidebar.children[1]; // 搜索容器
    const isCollapsed = content.style.display === 'none';
    
    content.style.display = isCollapsed ? 'block' : 'none';
    searchContainer.style.display = isCollapsed ? 'block' : 'none';
    this.textContent = isCollapsed ? '−' : '+';
  });

  // 添加搜索功能
  setupSearch();
  
  // 监控时间线容器的可见性
  monitorTimelineVisibility();
}

// 全局变量
let allQuestions = [];
let lastScanTime = 0;
const SCAN_COOLDOWN = 1000; // 1秒冷却时间，避免过于频繁的扫描
let lastQuestionEl = null;

// 设置搜索功能
function setupSearch() {
  const searchInput = document.getElementById('timeline-search');
  if (!searchInput) return;

  searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    filterQuestions(searchTerm);
  });

  // 搜索框获得焦点时的样式
  searchInput.addEventListener('focus', function() {
    this.style.borderColor = '#667eea';
    this.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
  });

  searchInput.addEventListener('blur', function() {
    this.style.borderColor = '#ddd';
    this.style.boxShadow = 'none';
  });
}

// 过滤问题
function filterQuestions(searchTerm) {
  const timelineContent = document.getElementById('timeline-content');
  if (!timelineContent) return;

  const questionItems = timelineContent.querySelectorAll('.timeline-item');
  let visibleCount = 0;

  questionItems.forEach(item => {
    const questionText = item.textContent.toLowerCase();
    const isMatch = !searchTerm || questionText.includes(searchTerm);
    
    item.style.display = isMatch ? 'block' : 'none';
    if (isMatch) visibleCount++;
  });

  // 更新计数显示
  updateQuestionCount(visibleCount, questionItems.length);

  // 如果没有匹配结果，显示提示
  if (visibleCount === 0 && searchTerm) {
    showNoResultsMessage(timelineContent, searchTerm);
  } else {
    hideNoResultsMessage(timelineContent);
  }
}

// 显示无结果提示
function showNoResultsMessage(container, searchTerm) {
  hideNoResultsMessage(container);
  
  const noResultsDiv = document.createElement('div');
  noResultsDiv.id = 'no-results-message';
  noResultsDiv.style.cssText = `
    padding: 20px;
    text-align: center;
    color: #666;
    font-style: italic;
  `;
  noResultsDiv.innerHTML = `
    <div style="margin-bottom: 8px;">🔍</div>
    <div>未找到包含 "${searchTerm}" 的问题</div>
  `;
  
  container.appendChild(noResultsDiv);
}

// 隐藏无结果提示
function hideNoResultsMessage(container) {
  const existing = container.querySelector('#no-results-message');
  if (existing) {
    existing.remove();
  }
}

// 更新问题计数
function updateQuestionCount(visible, total) {
  const countElement = document.getElementById('question-count');
  if (countElement) {
    if (visible === total) {
      countElement.textContent = `${total} 个问题`;
    } else {
      countElement.textContent = `${visible}/${total} 个问题`;
    }
  }
}

// 监控时间线容器的可见性
function monitorTimelineVisibility() {
  console.log('Gemini Timeline: 开始监控时间线可见性');
  
  setInterval(() => {
    const timeline = document.getElementById('gemini-timeline');
    const timelineContent = document.getElementById('timeline-content');
    
    if (timeline && timelineContent) {
      // 确保时间线容器始终可见且样式正确
      if (timeline.style.display === 'none' || timeline.style.visibility === 'hidden') {
        timeline.style.display = 'flex';
        timeline.style.visibility = 'visible';
      }
      
      // 重新应用关键样式
      timeline.style.position = 'fixed';
      timeline.style.zIndex = '999999';
      timeline.style.top = '50%';
      timeline.style.right = '20px';
      timeline.style.transform = 'translateY(-50%)';
    }
  }, 2000);
}

// 🚀 完全重写的扫描函数 - 零内容过滤！
function scanQuestions() {
  console.log('=== Gemini Timeline: 开始扫描用户问题（零过滤版本）===');
  console.log('Gemini Timeline: 当前URL:', window.location.href);
  console.log('Gemini Timeline: 扫描时间:', new Date().toLocaleTimeString());

  // 查询函数：在当前对话容器内查找元素
  function queryInCurrentContainer(selector) {
    return Array.from(document.querySelectorAll(selector));
  }

  let userMessages = [];

  // 🎯 只基于DOM结构检测，完全不做内容过滤
  console.log('Gemini Timeline: 使用零过滤DOM结构检测');
  
  // 根据真实DOM结构，查找用户问题的精确选择器
  const userQuerySelectors = [
    'user-query-content',  // 自定义标签
    '.user-query-bubble-with-background',  // 用户问题气泡
    '.query-text',  // 问题文本容器
    '.query-text-line',  // 问题文本行
    '[class*="user-query"]',
    '[class*="query-text"]',
    '[class*="query-bubble"]'
  ];
  
  const foundUserQueries = [];
  
  for (const selector of userQuerySelectors) {
    try {
      const elements = queryInCurrentContainer(selector);
      console.log(`Gemini Timeline: 选择器 "${selector}" 找到 ${elements.length} 个元素`);
      
      elements.forEach(el => {
        const text = el.textContent?.trim() || '';
        
        // 🚨 只过滤明显的系统错误，不过滤任何用户内容！
        const isSystemError = 
          text.includes('Request ID:') ||
          text.includes('ConnectError:') ||
          text.includes('socket hang up') ||
          text.includes('vscode-file://') ||
          text.includes('at iol.$') ||
          text.includes('at Zhr._');
        
        // 🎯 接受所有非系统错误的内容，包括"范围"、"你好"等任何用户输入
        if (!isSystemError && text.length > 0) {
          console.log(`Gemini Timeline: ✅ 找到用户问题: "${text}"`);
          foundUserQueries.push(el);
        } else if (isSystemError) {
          console.log(`Gemini Timeline: ❌ 跳过系统错误: "${text.substring(0, 50)}..."`);
        }
      });
    } catch (e) {
      console.log(`Gemini Timeline: 选择器 "${selector}" 执行出错:`, e);
    }
  }
  
  if (foundUserQueries.length > 0) {
    userMessages = foundUserQueries;
    console.log(`Gemini Timeline: 基于结构检测找到 ${userMessages.length} 条用户问题`);
  } else {
    console.log('Gemini Timeline: ⚠️ 没有找到任何用户问题，可能需要调整选择器');
  }

  // 🎯 完全跳过所有内容过滤
  console.log(`Gemini Timeline: 🚀 跳过所有内容过滤，直接使用DOM检测结果: ${userMessages.length} 条`);

  // 简单去重 - 只基于文本内容去重，不做内容判断
  const uniqueMessages = [];
  const seenTexts = new Set();
  
  userMessages.forEach(message => {
    const text = message.textContent.trim();
    const fingerprint = text.substring(0, 100); // 使用前100个字符作为指纹
    
    if (!seenTexts.has(fingerprint)) {
      seenTexts.add(fingerprint);
      uniqueMessages.push(message);
    }
  });
  
  userMessages = uniqueMessages;
  console.log(`Gemini Timeline: 去重后保留 ${userMessages.length} 条用户问题`);

  // 显示找到的问题
  console.log(`Gemini Timeline: 🎉 最终找到 ${userMessages.length} 条用户问题`);
  for (let i = 0; i < Math.min(5, userMessages.length); i++) {
    console.log(`Gemini Timeline: 问题 ${i+1}: "${userMessages[i].textContent.substring(0, 100)}..."`);
  }

  // 渲染到时间线
  renderTimeline(userMessages);
}

// 渲染时间线
function renderTimeline(userMessages) {
  const timelineContainer = document.getElementById('timeline-content');
  const timelineContentCheck = document.getElementById('gemini-timeline');
  
  if (!timelineContainer || !timelineContentCheck) {
    console.log('Gemini Timeline: 时间线容器不存在，重新创建');
    createTimelineContainer();
    return;
  }

  // 清空现有内容
  timelineContainer.innerHTML = '';

  if (userMessages.length === 0) {
    timelineContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">暂无问题记录</div>';
    updateQuestionCount(0, 0);
    return;
  }

  // 简单去重显示
  const finalQuestions = [];
  const seenTextsForRender = new Set();
  
  userMessages.forEach((message) => {
    const questionText = message.textContent.trim();
    const shortText = questionText.substring(0, 50); // 使用前50个字符作为去重标识
    
    if (!seenTextsForRender.has(shortText) && questionText.length > 0) {
      seenTextsForRender.add(shortText);
      finalQuestions.push(message);
    }
  });

  // 显示全部问题，最多100个，并倒序（新问题在前）
  const questionsToShow = finalQuestions.slice(0, 100).reverse();
  
  questionsToShow.forEach((message, index) => {
    const questionText = message.textContent.trim();
    const displayText = questionText.length > 100 ? questionText.substring(0, 100) + '...' : questionText;
    
    try {
      const questionItem = document.createElement('div');
      questionItem.className = 'timeline-item';
      questionItem.dataset.index = index;
      questionItem.textContent = `Q${index + 1}: ${displayText}`;
      questionItem.title = questionText; // 完整文本作为tooltip
      
      // 添加样式
      questionItem.style.cssText = `
        padding: 8px 12px;
        margin: 4px 8px;
        background: #f8f9fa;
        border-radius: 6px;
        cursor: pointer;
        border-left: 3px solid #667eea;
        transition: all 0.2s ease;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      `;
      
      // 添加点击事件
      questionItem.addEventListener('click', function() {
        try {
          // 滚动到对应的问题
          message.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // 添加高亮效果
          message.classList.add('timeline-highlight');
          setTimeout(() => {
            message.classList.remove('timeline-highlight');
          }, 2000);
        } catch (e) {
          console.log('Gemini Timeline: 滚动出错:', e);
        }
      });
      
      // 添加悬停效果
      questionItem.addEventListener('mouseenter', function() {
        this.style.background = '#e3f2fd';
        this.style.transform = 'translateX(4px)';
      });
      
      questionItem.addEventListener('mouseleave', function() {
        this.style.background = '#f8f9fa';
        this.style.transform = 'translateX(0)';
      });
      
      timelineContainer.appendChild(questionItem);
    } catch (e) {
      console.log('Gemini Timeline: 创建问题项出错:', e);
    }
  });
  
  console.log(`Gemini Timeline: 成功渲染 ${questionsToShow.length} 条问题`);
  
  // 更新问题计数
  updateQuestionCount(questionsToShow.length, questionsToShow.length);
  
  // 如果有搜索内容，重新应用过滤
  const searchInput = document.getElementById('timeline-search');
  if (searchInput && searchInput.value.trim()) {
    filterQuestions(searchInput.value.toLowerCase().trim());
  }
}

// 简化的页面变化监听
function observePageChanges() {
  let updateTimeout = null;
  
  const observer = new MutationObserver(function(mutations) {
    // 只监听用户问题相关的变化
    let hasUserQueryChange = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        Array.from(mutation.addedNodes).forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查是否是用户问题相关的DOM变化
            const isUserQueryElement = 
              node.tagName === 'USER-QUERY-CONTENT' ||
              node.classList?.contains('user-query-bubble-with-background') ||
              node.classList?.contains('query-text') ||
              node.classList?.contains('query-text-line') ||
              (node.querySelector && (
                node.querySelector('user-query-content') ||
                node.querySelector('.user-query-bubble-with-background') ||
                node.querySelector('.query-text')
              ));
            
            if (isUserQueryElement) {
              console.log('Gemini Timeline: MutationObserver检测到用户问题变化');
              hasUserQueryChange = true;
            }
          }
        });
      }
    });
    
    // 如果检测到用户问题变化，快速更新
    if (hasUserQueryChange) {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      updateTimeout = setTimeout(() => {
        scanQuestions();
        updateTimeout = null;
      }, 500);
    }
  });
  
  // 监听整个文档的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleTimeline') {
    const timeline = document.getElementById('gemini-timeline');
    if (timeline) {
      const show = request.enabled;
      timeline.style.display = show ? 'flex' : 'none';
    }
    sendResponse({ status: 'success', currentStatus: request.enabled });
  } else if (request.action === 'getTimelineStatus') {
    const timeline = document.getElementById('gemini-timeline');
    const isVisible = timeline && timeline.style.display !== 'none';
    sendResponse({ status: 'success', isVisible: isVisible });
  }
});