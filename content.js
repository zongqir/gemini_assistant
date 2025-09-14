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
async function initializeTimeline() {
  console.log('Gemini Timeline: 开始简化初始化');
  
  // 初始化标注数据
  await initBookmarks();
  
  // 检查当前页面是否有标注问题
  const currentBookmarks = getCurrentPageBookmarks();
  if (currentBookmarks.length > 0) {
    console.log(`Gemini Timeline: 当前页面找到 ${currentBookmarks.length} 个标注问题`);
    // 显示标注问题的提示
    showBookmarkNotification(currentBookmarks.length);
  }
  
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
      <button id="bookmarks-toggle" title="显示/隐藏标注问题" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; margin-right: 8px;">⭐</button>
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
  
  // 添加TTL提示文本
  const hintText = document.createElement('div');
  hintText.style.cssText = `
    font-size: 11px;
    color: #999;
    margin-top: 6px;
    text-align: center;
    line-height: 1.3;
  `;
  hintText.textContent = '⭐ 标注问题将在7天后自动清理';
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(hintText);

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

  // 添加标注切换功能
  let showOnlyBookmarks = false;
  document.getElementById('bookmarks-toggle').addEventListener('click', function() {
    showOnlyBookmarks = !showOnlyBookmarks;
    this.style.opacity = showOnlyBookmarks ? '1' : '0.7';
    this.title = showOnlyBookmarks ? '显示所有问题' : '只显示标注问题';
    
    // 重新渲染时间线
    const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
      .filter(el => el.textContent?.trim().length > 0);
    renderTimeline(userMessages);
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

// 标注相关变量
let bookmarkedQuestions = new Map(); // 存储标注的问题 key: questionId, value: {text, url, timestamp}

// 标注功能相关函数
// 初始化标注数据
async function initBookmarks() {
  try {
    const result = await chrome.storage.sync.get(['bookmarkedQuestions']);
    if (result.bookmarkedQuestions) {
      bookmarkedQuestions = new Map(Object.entries(result.bookmarkedQuestions));
      console.log('Gemini Timeline: 加载了', bookmarkedQuestions.size, '个标注问题');
      
      // 清理过期的标注
      await cleanExpiredBookmarks();
    }
  } catch (error) {
    console.error('Gemini Timeline: 加载标注数据失败:', error);
  }
}

// 清理过期的标注数据
async function cleanExpiredBookmarks() {
  try {
    const now = Date.now();
    let cleanedCount = 0;
    const expiredIds = [];
    
    // 找出过期的标注
    for (const [id, bookmark] of bookmarkedQuestions) {
      // 如果没有expiresAt字段，给旧数据添加7天过期时间
      if (!bookmark.expiresAt) {
        bookmark.expiresAt = bookmark.timestamp + (7 * 24 * 60 * 60 * 1000);
      }
      
      // 检查是否过期
      if (now > bookmark.expiresAt) {
        expiredIds.push(id);
        cleanedCount++;
      }
    }
    
    // 删除过期的标注
    if (expiredIds.length > 0) {
      expiredIds.forEach(id => bookmarkedQuestions.delete(id));
      
      // 更新存储
      const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
      await chrome.storage.sync.set({ bookmarkedQuestions: bookmarksObj });
      
      console.log(`Gemini Timeline: 清理了 ${cleanedCount} 个过期标注`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Gemini Timeline: 清理过期标注失败:', error);
    return 0;
  }
}

// 生成问题的唯一ID
function generateQuestionId(questionText, url = window.location.href) {
  // 使用问题文本的前50个字符 + URL的hash部分作为ID
  const textHash = questionText.substring(0, 50).replace(/\s+/g, ' ').trim();
  const urlHash = new URL(url).pathname + new URL(url).search;
  return btoa(encodeURIComponent(textHash + '|' + urlHash)).replace(/[+/=]/g, '');
}

// 保存标注到存储
async function saveBookmark(questionId, questionText, url = window.location.href) {
  try {
    const now = Date.now();
    bookmarkedQuestions.set(questionId, {
      text: questionText,
      url: url,
      timestamp: now,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7天后过期
      id: questionId
    });
    
    // 转换Map为对象以便存储
    const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
    await chrome.storage.sync.set({ bookmarkedQuestions: bookmarksObj });
    console.log('Gemini Timeline: 保存标注成功:', questionText.substring(0, 30));
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 保存标注失败:', error);
    return false;
  }
}

// 移除标注
async function removeBookmark(questionId) {
  try {
    bookmarkedQuestions.delete(questionId);
    
    // 转换Map为对象以便存储
    const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
    await chrome.storage.sync.set({ bookmarkedQuestions: bookmarksObj });
    console.log('Gemini Timeline: 移除标注成功:', questionId);
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 移除标注失败:', error);
    return false;
  }
}

// 检查问题是否已标注
function isBookmarked(questionId) {
  const bookmark = bookmarkedQuestions.get(questionId);
  if (!bookmark) return false;
  
  // 检查是否过期
  const now = Date.now();
  if (bookmark.expiresAt && now > bookmark.expiresAt) {
    // 如果过期，从内存中删除（下次清理时会从存储中删除）
    bookmarkedQuestions.delete(questionId);
    return false;
  }
  
  return true;
}

// 获取当前页面的标注问题
function getCurrentPageBookmarks() {
  const currentUrl = window.location.href;
  const currentBookmarks = [];
  const now = Date.now();
  
  for (const [id, bookmark] of bookmarkedQuestions) {
    // 检查是否过期
    if (bookmark.expiresAt && now > bookmark.expiresAt) {
      continue; // 跳过过期的标注
    }
    
    // 检查URL是否匹配（比较pathname和search部分）
    try {
      const bookmarkUrl = new URL(bookmark.url);
      const currentUrlObj = new URL(currentUrl);
      
      if (bookmarkUrl.pathname === currentUrlObj.pathname && 
          bookmarkUrl.search === currentUrlObj.search) {
        currentBookmarks.push({...bookmark, id});
      }
    } catch (e) {
      console.warn('Gemini Timeline: URL解析失败:', bookmark.url);
    }
  }
  
  return currentBookmarks.sort((a, b) => b.timestamp - a.timestamp); // 按时间倒序
}

// 显示标注问题通知
function showBookmarkNotification(count) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.id = 'bookmark-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
    color: #333;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
    z-index: 1000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    transform: translateY(-10px);
    opacity: 0;
    animation: slideInNotification 0.5s ease-out forwards;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center;">
      <span style="margin-right: 8px;">⭐</span>
      <span>此页面有 ${count} 个标注问题</span>
      <span style="margin-left: 8px; font-size: 12px; opacity: 0.7;">点击查看</span>
    </div>
  `;
  
  // 添加点击事件
  notification.addEventListener('click', function() {
    // 激活标注过滤
    const bookmarksToggle = document.getElementById('bookmarks-toggle');
    if (bookmarksToggle) {
      bookmarksToggle.style.opacity = '1';
      bookmarksToggle.title = '显示所有问题';
      
      // 重新渲染时间线，只显示标注问题
      const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
        .filter(el => el.textContent?.trim().length > 0);
      renderTimeline(userMessages);
    }
    
    // 移除通知
    this.remove();
  });
  
  // 添加悬停效果
  notification.addEventListener('mouseenter', function() {
    this.style.transform = 'translateY(-10px) scale(1.05)';
  });
  
  notification.addEventListener('mouseleave', function() {
    this.style.transform = 'translateY(-10px) scale(1)';
  });
  
  document.body.appendChild(notification);
  
  // 5秒后自动消失
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOutNotification 0.5s ease-in forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 500);
    }
  }, 5000);
}

// 添加通知动画的CSS
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
  @keyframes slideInNotification {
    from {
      opacity: 0;
      transform: translateY(-10px) translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateY(-10px) translateX(0);
    }
  }
  
  @keyframes slideOutNotification {
    from {
      opacity: 1;
      transform: translateY(-10px) translateX(0);
    }
    to {
      opacity: 0;
      transform: translateY(-10px) translateX(20px);
    }
  }
`;
document.head.appendChild(notificationStyles);

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
    const bookmarksToggle = document.getElementById('bookmarks-toggle');
    const showOnlyBookmarks = bookmarksToggle && bookmarksToggle.style.opacity === '1';
    
    if (showOnlyBookmarks) {
      const bookmarkCount = visible;
      countElement.textContent = `${bookmarkCount} 个标注`;
    } else {
      const bookmarkCount = Array.from(bookmarkedQuestions.keys()).filter(id => {
        const bookmark = bookmarkedQuestions.get(id);
        if (!bookmark) return false;
        
        // 检查是否过期
        const now = Date.now();
        if (bookmark.expiresAt && now > bookmark.expiresAt) {
          return false;
        }
        
        try {
          const bookmarkUrl = new URL(bookmark.url);
          const currentUrl = new URL(window.location.href);
          return bookmarkUrl.pathname === currentUrl.pathname && bookmarkUrl.search === currentUrl.search;
        } catch (e) {
          return false;
        }
      }).length;
      
      if (visible === total) {
        countElement.textContent = `${total} 个问题${bookmarkCount > 0 ? ` (${bookmarkCount}⭐)` : ''}`;
      } else {
        countElement.textContent = `${visible}/${total} 个问题${bookmarkCount > 0 ? ` (${bookmarkCount}⭐)` : ''}`;
      }
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

// 🚀 修复长问题拆分的扫描函数
function scanQuestions() {
  console.log('=== Gemini Timeline: 开始扫描用户问题（修复拆分版本）===');
  console.log('Gemini Timeline: 当前URL:', window.location.href);
  console.log('Gemini Timeline: 扫描时间:', new Date().toLocaleTimeString());

  let userMessages = [];

  // 🎯 新的策略：优先寻找问题的父容器，而不是子元素
  console.log('Gemini Timeline: 使用父容器优先检测策略');
  
  // 分层次的选择器策略：从父容器到子元素
  const containerSelectors = [
    // 最外层容器选择器 - 这些通常包含完整的问题
    '[class*="conversation-turn"][data-is-user-turn="true"]',
    '[class*="user-turn"]',
    '[class*="user-message"]',
    '[data-role="user"]',
    // 中层容器选择器
    '[class*="user-query-bubble"]',
    'user-query-content',
    // 备用选择器 - 如果上面都没找到才使用
    '.query-text',
    '[class*="query-text"]'
  ];
  
  const foundContainers = [];
  
  for (const selector of containerSelectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      console.log(`Gemini Timeline: 容器选择器 "${selector}" 找到 ${elements.length} 个元素`);
      
      if (elements.length > 0) {
        // 如果找到了容器级别的元素，优先使用这些
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          // 过滤系统错误和空内容
          const isSystemError = 
            text.includes('Request ID:') ||
            text.includes('ConnectError:') ||
            text.includes('socket hang up') ||
            text.includes('vscode-file://') ||
            text.includes('at iol.$') ||
            text.includes('at Zhr._');
          
          if (!isSystemError && text.length > 10) { // 至少10个字符才算有效问题
            console.log(`Gemini Timeline: ✅ 找到完整问题容器: "${text.substring(0, 100)}..."`);
            foundContainers.push({
              element: el,
              text: text,
              priority: containerSelectors.indexOf(selector) // 优先级，越小越高
            });
          }
        });
        
        // 如果找到了高优先级的容器，就不再查找低优先级的
        if (foundContainers.length > 0 && containerSelectors.indexOf(selector) < 3) {
          console.log(`Gemini Timeline: 使用高优先级选择器 "${selector}"，停止查找`);
          break;
        }
      }
    } catch (e) {
      console.log(`Gemini Timeline: 选择器 "${selector}" 执行出错:`, e);
    }
  }
  
  // 如果没有找到容器级别的元素，使用备用策略
  if (foundContainers.length === 0) {
    console.log('Gemini Timeline: 未找到容器级元素，使用备用策略');
    
    const fallbackSelectors = [
      '.query-text-line',
      '[class*="user-query"]',
      '[class*="query-bubble"]'
    ];
    
    for (const selector of fallbackSelectors) {
      try {
        const elements = Array.from(document.querySelectorAll(selector));
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text.length > 5) {
            foundContainers.push({
              element: el,
              text: text,
              priority: 10 // 低优先级
            });
          }
        });
      } catch (e) {
        console.log(`Gemini Timeline: 备用选择器 "${selector}" 执行出错:`, e);
      }
    }
  }
  
  console.log(`Gemini Timeline: 总共找到 ${foundContainers.length} 个候选问题容器`);
  
  // 智能去重和合并
  const processedQuestions = [];
  const seenQuestions = new Map(); // 使用Map来存储更详细的信息
  
  // 按优先级排序
  foundContainers.sort((a, b) => a.priority - b.priority);
  
  foundContainers.forEach(container => {
    const fullText = container.text;
    const shortFingerprint = fullText.substring(0, 50).trim();
    const mediumFingerprint = fullText.substring(0, 150).trim();
    
    // 检查是否是已有问题的子集或重复
    let isDuplicate = false;
    let isSubset = false;
    
    for (const [existingFingerprint, existingData] of seenQuestions) {
      // 检查是否完全重复
      if (shortFingerprint === existingFingerprint) {
        isDuplicate = true;
        break;
      }
      
      // 检查是否是已有问题的子集（当前文本被包含在已有文本中）
      if (existingData.fullText.includes(fullText) && existingData.fullText.length > fullText.length * 1.5) {
        isSubset = true;
        break;
      }
      
      // 检查已有问题是否是当前问题的子集（需要替换）
      if (fullText.includes(existingData.fullText) && fullText.length > existingData.fullText.length * 1.5) {
        // 当前问题更完整，移除旧的
        seenQuestions.delete(existingFingerprint);
        // 从processedQuestions中移除对应项
        const indexToRemove = processedQuestions.findIndex(q => q.textContent.trim() === existingData.fullText);
        if (indexToRemove !== -1) {
          processedQuestions.splice(indexToRemove, 1);
        }
        break;
      }
    }
    
    if (!isDuplicate && !isSubset) {
      seenQuestions.set(shortFingerprint, {
        fullText: fullText,
        element: container.element
      });
      processedQuestions.push(container.element);
      console.log(`Gemini Timeline: ✅ 添加问题: "${shortFingerprint}..."`);
    } else {
      console.log(`Gemini Timeline: ❌ 跳过重复/子集问题: "${shortFingerprint}..."`);
    }
  });
  
  userMessages = processedQuestions;
  console.log(`Gemini Timeline: 智能去重后保留 ${userMessages.length} 条用户问题`);

  // 显示找到的问题
  console.log(`Gemini Timeline: 🎉 最终找到 ${userMessages.length} 条用户问题`);
  for (let i = 0; i < Math.min(3, userMessages.length); i++) {
    const questionText = userMessages[i].textContent.substring(0, 100);
    console.log(`Gemini Timeline: 问题 ${i+1}: "${questionText}..."`);
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

  // 改进的去重显示逻辑
  const finalQuestions = [];
  const seenTextsForRender = new Map();
  
  userMessages.forEach((message) => {
    const questionText = message.textContent.trim();
    const shortText = questionText.substring(0, 80); // 增加指纹长度到80个字符
    
    // 检查是否已有相似问题
    let isDuplicateForRender = false;
    
    for (const [existingShort, existingFull] of seenTextsForRender) {
      // 检查完全重复
      if (shortText === existingShort) {
        isDuplicateForRender = true;
        break;
      }
      
      // 检查是否是子集关系（相似度检查）
      const similarity = calculateTextSimilarity(questionText, existingFull);
      if (similarity > 0.8) { // 80%相似度认为是重复
        isDuplicateForRender = true;
        break;
      }
    }
    
    if (!isDuplicateForRender && questionText.length > 0) {
      seenTextsForRender.set(shortText, questionText);
      finalQuestions.push(message);
    }
  });
  
  // 简单的文本相似度计算函数
  function calculateTextSimilarity(text1, text2) {
    if (text1 === text2) return 1;
    if (text1.length === 0 || text2.length === 0) return 0;
    
    // 使用最长公共子序列的简化版本
    const shorter = text1.length < text2.length ? text1 : text2;
    const longer = text1.length >= text2.length ? text1 : text2;
    
    // 如果短文本完全包含在长文本中，认为相似度很高
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }
    
    // 简单的字符匹配比例
    let matches = 0;
    const minLength = Math.min(text1.length, text2.length);
    for (let i = 0; i < minLength; i++) {
      if (text1[i] === text2[i]) matches++;
    }
    
    return matches / Math.max(text1.length, text2.length);
  }

  // 检查是否只显示标注问题
  const bookmarksToggle = document.getElementById('bookmarks-toggle');
  const showOnlyBookmarks = bookmarksToggle && bookmarksToggle.style.opacity === '1';
  
  let questionsToShow = finalQuestions.slice(0, 100).reverse();
  
  // 如果只显示标注问题，过滤出已标注的问题
  if (showOnlyBookmarks) {
    questionsToShow = questionsToShow.filter(message => {
      const questionText = message.textContent.trim();
      const questionId = generateQuestionId(questionText);
      return isBookmarked(questionId);
    });
  } else {
    // 正常显示时，将标注的问题置顶
    const bookmarkedQuestions = [];
    const normalQuestions = [];
    
    questionsToShow.forEach(message => {
      const questionText = message.textContent.trim();
      const questionId = generateQuestionId(questionText);
      if (isBookmarked(questionId)) {
        bookmarkedQuestions.push(message);
      } else {
        normalQuestions.push(message);
      }
    });
    
    // 标注问题在前，普通问题在后
    questionsToShow = [...bookmarkedQuestions, ...normalQuestions];
  }
  
  questionsToShow.forEach((message, index) => {
    const questionText = message.textContent.trim();
    const questionId = generateQuestionId(questionText);
    const isBookmarkedQuestion = isBookmarked(questionId);
    const displayText = questionText.length > 100 ? questionText.substring(0, 100) + '...' : questionText;
    
    try {
      const questionItem = document.createElement('div');
      questionItem.className = 'timeline-item';
      questionItem.dataset.index = index;
      questionItem.dataset.questionId = questionId;
      
      // 创建问题内容容器
      const questionContent = document.createElement('div');
      questionContent.style.cssText = `
        display: flex;
        align-items: center;
        width: 100%;
      `;
      
      const bookmarkButton = document.createElement('button');
      bookmarkButton.innerHTML = isBookmarkedQuestion ? '★' : '☆';
      bookmarkButton.title = isBookmarkedQuestion ? '取消标注' : '标注问题';
      bookmarkButton.style.cssText = `
        background: none;
        border: none;
        color: ${isBookmarkedQuestion ? '#ffd700' : '#ccc'};
        cursor: pointer;
        font-size: 16px;
        padding: 2px 4px;
        border-radius: 3px;
        transition: all 0.2s ease;
        margin-right: 6px;
        flex-shrink: 0;
      `;
      
      const questionTextSpan = document.createElement('span');
      questionTextSpan.textContent = `Q${index + 1}: ${displayText}`;
      questionTextSpan.style.cssText = `
        flex: 1;
        cursor: pointer;
      `;
      
      questionContent.appendChild(bookmarkButton);
      questionContent.appendChild(questionTextSpan);
      questionItem.appendChild(questionContent);
      
      questionItem.title = questionText; // 完整文本作为tooltip
      
      // 添加样式
      questionItem.style.cssText = `
        padding: 8px 12px;
        margin: 4px 8px;
        background: ${isBookmarkedQuestion ? '#fff3cd' : '#f8f9fa'};
        border-radius: 6px;
        border-left: 3px solid ${isBookmarkedQuestion ? '#ffd700' : '#667eea'};
        transition: all 0.2s ease;
        user-select: text;
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
      `;
      
      // 标注按钮点击事件
      bookmarkButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        if (isBookmarked(questionId)) {
          // 移除标注
          const success = await removeBookmark(questionId);
          if (success) {
            this.innerHTML = '☆';
            this.style.color = '#ccc';
            this.title = '标注问题';
            questionItem.style.background = '#f8f9fa';
            questionItem.style.borderLeftColor = '#667eea';
          }
        } else {
          // 添加标注
          const success = await saveBookmark(questionId, questionText);
          if (success) {
            this.innerHTML = '★';
            this.style.color = '#ffd700';
            this.title = '取消标注';
            questionItem.style.background = '#fff3cd';
            questionItem.style.borderLeftColor = '#ffd700';
          }
        }
      });
      
      // 标注按钮悬停效果
      bookmarkButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.2)';
        this.style.color = isBookmarked(questionId) ? '#ffed4e' : '#667eea';
      });
      
      bookmarkButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.color = isBookmarked(questionId) ? '#ffd700' : '#ccc';
      });
      
      // 问题文本点击事件
      questionTextSpan.addEventListener('click', function() {
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
        this.style.background = isBookmarkedQuestion ? '#fff8dc' : '#e3f2fd';
        this.style.transform = 'translateX(4px)';
      });
      
      questionItem.addEventListener('mouseleave', function() {
        this.style.background = isBookmarkedQuestion ? '#fff3cd' : '#f8f9fa';
        this.style.transform = 'translateX(0)';
      });
      
      timelineContainer.appendChild(questionItem);
    } catch (e) {
      console.log('Gemini Timeline: 创建问题项出错:', e);
    }
  });
  
  console.log(`Gemini Timeline: 成功渲染 ${questionsToShow.length} 条问题`);
  
  // 更新问题计数
  const totalQuestions = finalQuestions.length;
  const displayedQuestions = questionsToShow.length;
  updateQuestionCount(displayedQuestions, totalQuestions);
  
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