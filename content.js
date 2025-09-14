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
  sidebar.className = 'timeline-docked-right'; // 添加停靠状态类
  sidebar.style.cssText = `
    position: fixed;
    top: 50%;
    right: -290px;
    transform: translateY(-50%);
    width: 320px;
    max-height: 80vh;
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid #e0e0e0;
    border-radius: 12px 0 0 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: right 0.3s ease, border-radius 0.3s ease;
    cursor: move;
  `;
  
  // 添加停靠指示器
  const dockIndicator = document.createElement('div');
  dockIndicator.id = 'timeline-dock-indicator';
  dockIndicator.style.cssText = `
    position: absolute;
    left: -1px;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 40px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px 0 0 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 12px;
    writing-mode: vertical-rl;
    text-orientation: mixed;
  `;
  dockIndicator.innerHTML = '📋';
  dockIndicator.title = '点击展开时间线';
  
  sidebar.appendChild(dockIndicator);

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
      <button id="bookmarks-toggle" title="只显示标注问题" style="background: none; border: none; color: white; cursor: pointer; font-size: 16px; padding: 0; margin-right: 6px; opacity: 0.7;">⭐</button>
      <button id="notes-toggle" title="只显示有笔记的问题" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px; padding: 0; margin-right: 6px; opacity: 0.7;">📝</button>
      <button id="global-toggle" title="查看所有对话的标记和笔记" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px; padding: 0; margin-right: 6px; opacity: 0.7;">🌐</button>
      <button id="clear-all-data" title="清除所有标记和笔记数据" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0; margin-right: 8px; opacity: 0; display: none;">🗑️</button>
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
  searchInput.placeholder = '🔍 搜索问题和笔记...';
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
  
  // 根据当前筛选模式和视图模式添加不同提示
  const updateHintText = () => {
    if (currentViewMode === 'global') {
      hintText.innerHTML = '🌐 全局视图：查看所有对话的标记和笔记（只读模式）';
    } else {
      const notesToggle = document.getElementById('notes-toggle');
      if (notesToggle && notesToggle.style.opacity === '1') {
        hintText.innerHTML = '💡 点击📝按钮直接编辑笔记';
      } else {
        hintText.textContent = '⭐ 标注问题将在7天后自动清理';
      }
    }
  };
  
  // 暴露更新提示的函数给全局
  window.updateTimelineHint = updateHintText;
  
  // 监听筛选按钮变化
  document.addEventListener('click', (e) => {
    if (e.target.id === 'notes-toggle' || e.target.id === 'bookmarks-toggle') {
      setTimeout(updateHintText, 100);
    }
  });
  
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
  let wasDockedBeforeMinimize = false; // 记录最小化前是否处于停靠状态
  
  document.getElementById('timeline-toggle').addEventListener('click', function() {
    const content = document.getElementById('timeline-content');
    const searchContainer = sidebar.children[2]; // 搜索容器 (正确的索引)
    const header = sidebar.children[1]; // 标题栏 (正确的索引)
    const dockIndicatorElement = document.getElementById('timeline-dock-indicator'); // 获取停靠指示器
    const isCollapsed = content.style.display === 'none';
    
    console.log('最小化切换点击，当前状态:', { 
      isCollapsed, 
      currentRight: sidebar.style.right,
      wasDockedBefore: wasDockedBeforeMinimize 
    });
    
    if (isCollapsed) {
      // 展开：显示内容和搜索框
      content.style.display = 'block';
      searchContainer.style.display = 'block';
      this.textContent = '−';
      this.title = '最小化时间线';
      
      // 恢复正常高度
      sidebar.style.maxHeight = '80vh';
      sidebar.style.minHeight = 'auto';
      
      // 移除最小化状态的视觉提示
      if (header) {
        header.style.borderBottom = '';
      }
      
      // 恢复之前的停靠状态
      if (wasDockedBeforeMinimize) {
        console.log('恢复到停靠状态');
        sidebar.style.right = '-290px';
        sidebar.style.borderRadius = '12px 0 0 12px';
        if (dockIndicatorElement) {
          dockIndicatorElement.style.display = 'flex';
        }
        wasDockedBeforeMinimize = false;
      }
      
      console.log('展开完成，当前位置:', sidebar.style.right);
    } else {
      // 最小化：只隐藏内容和搜索框，保留标题栏
      content.style.display = 'none';
      searchContainer.style.display = 'none';
      this.textContent = '+';
      this.title = '展开时间线';
      
      // 调整高度为仅显示标题栏
      sidebar.style.maxHeight = '60px';
      sidebar.style.minHeight = '60px';
      
      // 确保标题栏可见，并添加视觉提示
      if (header) {
        header.style.display = 'flex';
        header.style.borderBottom = '2px solid rgba(102, 126, 234, 0.3)';
      }
      
      // 检查当前是否在停靠状态
      const currentRight = sidebar.style.right;
      const isDocked = currentRight === '-290px' || currentRight.includes('-');
      
      console.log('最小化时检查停靠状态:', { currentRight, isDocked });
      
      if (isDocked) {
        console.log('从停靠状态最小化，强制展开');
        wasDockedBeforeMinimize = true;
        sidebar.style.right = '20px'; // 强制展开到完全可见
        sidebar.style.borderRadius = '12px';
        if (dockIndicatorElement) {
          dockIndicatorElement.style.display = 'none';
        }
      }
      
      console.log('最小化完成，当前位置:', sidebar.style.right, '标题栏可见:', header ? header.style.display : 'N/A');
    }
  });

  // 筛选状态变量
  let filterMode = 'all'; // 'all', 'bookmarks', 'notes'
  
  // 全局视图切换功能
  document.getElementById('global-toggle').addEventListener('click', async function() {
    const wasGlobal = currentViewMode === 'global';
    currentViewMode = wasGlobal ? 'current' : 'global';
    
    // 如果切换到全局视图，先实时刷新数据
    if (currentViewMode === 'global') {
      console.log('🔄 切换到全局视图，实时刷新数据...');
      try {
        // 从存储重新加载最新数据
        const result = await chrome.storage.local.get(['bookmarkedQuestions']);
        if (result.bookmarkedQuestions) {
          bookmarkedQuestions = new Map(Object.entries(result.bookmarkedQuestions));
          console.log('✅ 全局视图数据刷新完成，加载了', bookmarkedQuestions.size, '个标注问题');
          // 清理过期的标注
          await cleanExpiredBookmarks();
        } else {
          console.log('ℹ️ 全局视图：无历史标注数据');
        }
      } catch (error) {
        console.error('❌ 全局视图数据刷新失败:', error);
      }
    }
    
    // 更新按钮状态和颜色
    const clearButton = document.getElementById('clear-all-data');
    if (currentViewMode === 'global') {
      this.style.opacity = '1';
      this.style.color = '#ffd700'; // 黄色表示当前在全局视图，点击切换到本地
      this.title = '返回当前对话视图';
      // 显示清除按钮
      if (clearButton) {
        clearButton.style.display = 'inline';
        clearButton.style.opacity = '0.7';
      }
    } else {
      this.style.opacity = '0.7';
      this.style.color = 'white'; // 白色/蓝色表示当前在本地视图，点击切换到全局
      this.title = '查看所有对话的标记和笔记';
      // 隐藏清除按钮
      if (clearButton) {
        clearButton.style.display = 'none';
        clearButton.style.opacity = '0';
      }
    }
    
    // 更新标题显示
    const titleSpan = document.querySelector('#gemini-timeline span');
    if (titleSpan) {
      titleSpan.textContent = currentViewMode === 'global' ? '全局视图' : '问题时间线';
    }
    
    if (currentViewMode === 'global') {
      // 切换到全局视图
      renderGlobalView(filterMode);
    } else {
      // 切换回当前对话视图
      renderTimeline(processedUserMessages);
    }
    
    // 更新提示文本
    if (window.updateTimelineHint) {
      window.updateTimelineHint();
    }
  });
  
  // 添加清除全部数据功能
  document.getElementById('clear-all-data').addEventListener('click', function() {
    // 显示确认对话框
    const confirmed = confirm(
      '⚠️ 确认清除所有数据？\n\n这将删除所有对话中的标记和笔记数据，此操作无法撤销！\n\n点击"确定"继续，点击"取消"放弃操作。'
    );
    
    if (confirmed) {
      // 调用清除数据函数
      if (window.geminiTimelineClearAllData) {
        const success = window.geminiTimelineClearAllData();
        if (success) {
          // 重新渲染全局视图
          renderGlobalView(getCurrentFilterMode());
          showToast('所有数据已清除', 'success');
        } else {
          showToast('清除失败，请重试', 'error');
        }
      }
    }
  });
  
  // 添加标注切换功能
  document.getElementById('bookmarks-toggle').addEventListener('click', function() {
    const wasActive = filterMode === 'bookmarks';
    filterMode = wasActive ? 'all' : 'bookmarks';
    
    // 更新按钮状态
    this.style.opacity = filterMode === 'bookmarks' ? '1' : '0.7';
    this.title = filterMode === 'bookmarks' ? '显示所有问题' : '只显示标注问题';
    
    // 重置备注按钮状态
    const notesButton = document.getElementById('notes-toggle');
    notesButton.style.opacity = '0.7';
    notesButton.title = '只显示有笔记的问题';
    
    // 根据当前视图模式重新渲染
    if (currentViewMode === 'global') {
      renderGlobalView(filterMode);
    } else {
      renderTimeline(processedUserMessages);
    }
  });
  
  // 添加备注切换功能
  document.getElementById('notes-toggle').addEventListener('click', function() {
    const wasActive = filterMode === 'notes';
    filterMode = wasActive ? 'all' : 'notes';
    
    // 更新按钮状态
    this.style.opacity = filterMode === 'notes' ? '1' : '0.7';
    this.title = filterMode === 'notes' ? '显示所有问题' : '只显示有笔记的问题';
    
    // 重置标注按钮状态
    const bookmarksButton = document.getElementById('bookmarks-toggle');
    bookmarksButton.style.opacity = '0.7';
    bookmarksButton.title = '只显示标注问题';
    
    // 根据当前视图模式重新渲染
    if (currentViewMode === 'global') {
      renderGlobalView(filterMode);
    } else {
      renderTimeline(processedUserMessages);
    }
  });

  // 添加搜索功能
  setupSearch();
  
  // 添加停靠和拖拽功能
  setupDockingAndDragging(sidebar, dockIndicator);
  
  // 监控时间线容器的可见性
  monitorTimelineVisibility();
}

// 全局变量
let allQuestions = [];
let lastScanTime = 0;
let processedUserMessages = []; // 保存处理后的用户问题列表
const SCAN_COOLDOWN = 1000; // 1秒冷却时间，避免过于频繁的扫描
let lastQuestionEl = null;

// 标注相关变量
let bookmarkedQuestions = new Map(); // 存储标注的问题 key: questionId, value: {text, url, timestamp}
let currentViewMode = 'current'; // 'current' 或 'global' 视图模式

// 标注功能相关函数
// 初始化标注数据
async function initBookmarks() {
  try {
    // 先测试存储是否正常工作
    console.log('测试Chrome存储功能...');
    const testKey = 'gemini_timeline_test_' + Date.now();
    await chrome.storage.local.set({ [testKey]: 'test_value' });
    const testResult = await chrome.storage.local.get([testKey]);
    await chrome.storage.local.remove([testKey]);
    
    if (testResult[testKey] === 'test_value') {
      console.log('✅ Chrome存储功能正常');
    } else {
      throw new Error('存储测试失败');
    }
    
    const result = await chrome.storage.local.get(['bookmarkedQuestions']);
    if (result.bookmarkedQuestions) {
      bookmarkedQuestions = new Map(Object.entries(result.bookmarkedQuestions));
      console.log('Gemini Timeline: 加载了', bookmarkedQuestions.size, '个标注问题');
      
      // 清理过期的标注
      await cleanExpiredBookmarks();
    } else {
      console.log('Gemini Timeline: 无历史标注数据');
    }
  } catch (error) {
    console.error('❌ Gemini Timeline: 初始化失败:', error);
    // 显示错误提示给用户
    showToast(`存储初始化失败: ${error.message}`, 'error');
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
      await chrome.storage.local.set({ bookmarkedQuestions: bookmarksObj });
      
      console.log(`Gemini Timeline: 清理了 ${cleanedCount} 个过期标注`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('Gemini Timeline: 清理过期标注失败:', error);
    return 0;
  }
}

// 强制清理过期和多余的标注数据（配额超限时使用）
async function forceCleanExpiredBookmarks() {
  const now = Date.now();
  let cleanedCount = 0;
  
  // 1. 清理所有过期数据
  const expiredIds = [];
  for (const [questionId, bookmark] of bookmarkedQuestions) {
    if (!bookmark.expiresAt) {
      bookmark.expiresAt = bookmark.timestamp + (7 * 24 * 60 * 60 * 1000);
    }
    if (now > bookmark.expiresAt) {
      expiredIds.push(questionId);
      cleanedCount++;
    }
  }
  
  expiredIds.forEach(id => bookmarkedQuestions.delete(id));
  
  // 2. 如果仍然太多，按时间顺序清理旧数据，只保留最近50个
  const bookmarksArray = Array.from(bookmarkedQuestions.entries());
  if (bookmarksArray.length > 50) {
    // 按创建时间排序，保留最新的50个
    bookmarksArray.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
    
    // 清空原Map，只保留前50个
    bookmarkedQuestions.clear();
    for (let i = 0; i < Math.min(50, bookmarksArray.length); i++) {
      bookmarkedQuestions.set(bookmarksArray[i][0], bookmarksArray[i][1]);
    }
    cleanedCount += bookmarksArray.length - 50;
  }
  
  // 3. 进一步优化：移除超长的笔记内容
  for (const [questionId, bookmark] of bookmarkedQuestions) {
    if (bookmark.note && bookmark.note.length > 200) {
      bookmark.note = bookmark.note.substring(0, 200) + '...';
      cleanedCount++;
    }
  }
  
  console.log(`Gemini Timeline: 强制清理完成，清理了 ${cleanedCount} 项数据`);
}

// 获取当前页面所有用户问题（统一的获取逻辑）
function getAllUserQuestions() {
  const containerSelectors = [
    '[class*="conversation-turn"][data-is-user-turn="true"]',
    '[class*="user-turn"]',
    '[class*="user-message"]',
    '[data-role="user"]',
    '[class*="user-query-bubble"]',
    'user-query-content',
    '.query-text',
    '[class*="query-text"]'
  ];
  
  const foundQuestions = [];
  
  for (const selector of containerSelectors) {
    try {
      const elements = Array.from(document.querySelectorAll(selector));
      console.log(`获取问题文本 - 选择器 "${selector}" 找到 ${elements.length} 个元素`);
      
      if (elements.length > 0) {
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          
          const isSystemError = 
            text.includes('Request ID:') ||
            text.includes('ConnectError:') ||
            text.includes('socket hang up') ||
            text.includes('vscode-file://') ||
            text.includes('at iol.$') ||
            text.includes('at Zhr._');
          
          if (!isSystemError && text.length > 10) {
            foundQuestions.push({
              element: el,
              text: text,
              id: generateQuestionId(text)
            });
          }
        });
        
        if (foundQuestions.length > 0) {
          console.log(`获取问题文本 - 使用选择器 "${selector}"，找到 ${foundQuestions.length} 个问题`);
          break;
        }
      }
    } catch (e) {
      console.log(`获取问题文本 - 选择器 "${selector}" 执行出错:`, e);
    }
  }
  
  return foundQuestions;
}

// 生成问题的唯一ID
function generateQuestionId(questionText, url = window.location.href) {
  // 使用问题文本的前50个字符 + URL的hash部分作为ID
  const textHash = questionText.substring(0, 50).replace(/\s+/g, ' ').trim();
  const urlHash = new URL(url).pathname + new URL(url).search;
  return btoa(encodeURIComponent(textHash + '|' + urlHash)).replace(/[+/=]/g, '');
}

// 保存标注到存储
async function saveBookmark(questionId, questionText, note = '', url = window.location.href) {
  try {
    const now = Date.now();
    bookmarkedQuestions.set(questionId, {
      text: questionText,
      url: url,
      timestamp: now,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7天后过期
      note: note, // 新增备注字段
      id: questionId
    });
    
    // 转换Map为对象以便存储
    const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
        await chrome.storage.local.set({ bookmarkedQuestions: bookmarksObj });
    console.log('Gemini Timeline: 保存标注成功:', questionText.substring(0, 30));
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 保存标注失败:', error);
    return false;
  }
}

// 检查存储权限
async function checkStoragePermissions() {
  try {
    // 测试storage.local权限
    await chrome.storage.local.get(['test']);
    console.log('storage.local 权限正常');
    return true;
  } catch (error) {
    console.error('storage.local 权限异常:', error);
    return false;
  }
}

// 更新标注笔记
async function updateBookmarkNote(questionId, note) {
  console.log('updateBookmarkNote 开始执行:', { questionId, noteLength: note.length });
  
  // 首先检查存储权限
  const hasPermissions = await checkStoragePermissions();
  if (!hasPermissions) {
    return { success: false, error: 'Chrome存储权限异常，请重新安装扩展' };
  }
  
  try {
    const bookmark = bookmarkedQuestions.get(questionId);
    console.log('获取到的bookmark:', bookmark);
    
    if (!bookmark) {
      console.warn('标注不存在，先创建标注');
      // 如果标注不存在，先创建标注（获取实际的问题文本）
      try {
        // 使用统一的获取逻辑从DOM中获取实际的问题文本
        console.log('尝试获取问题文本，questionId:', questionId);
        const allQuestions = getAllUserQuestions();
        console.log('找到的问题数量:', allQuestions.length);
        
        let questionText = '未找到问题文本';
        
        // 尝试通过questionId找到对应的问题文本
        for (const question of allQuestions) {
          console.log('比较ID:', { elementId: question.id, targetId: questionId, text: question.text.substring(0, 50) });
          
          if (question.id === questionId) {
            questionText = question.text;
            console.log('找到匹配的问题文本:', questionText.substring(0, 100));
            break;
          }
        }
        
        if (questionText === '未找到问题文本') {
          console.warn('警告：未能找到匹配的问题文本，questionId:', questionId);
          console.warn('当前页面所有问题ID:', allQuestions.map(q => q.id));
        }
        
        const success = await saveBookmark(questionId, questionText, note);
        if (success) {
          return { success: true, message: '已创建新标注并保存笔记' };
        } else {
          return { success: false, error: '无法创建标注' };
        }
      } catch (error) {
        return { success: false, error: '创建标注失败: ' + error.message };
      }
    }
    
    // 更新笔记
    bookmark.note = note;
    bookmarkedQuestions.set(questionId, bookmark);
    console.log('内存中已更新笔记');
    
    // 转换Map为对象以便存储
    const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
    console.log('准备保存到存储，数据大小:', JSON.stringify(bookmarksObj).length);
    
    try {
      await chrome.storage.local.set({ bookmarkedQuestions: bookmarksObj });
      console.log('Gemini Timeline: 更新笔记成功:', note.substring(0, 30));
      return { success: true, message: '笔记保存成功' };
    } catch (storageError) {
      console.error('存储错误详情:', storageError);
      
      if (storageError.message.includes('quota exceeded') || storageError.message.includes('Quota')) {
        console.warn('Gemini Timeline: 存储配额超限，正在清理过期数据...');
        
        // 强制清理过期数据
        await forceCleanExpiredBookmarks();
        
        // 重新尝试保存
        try {
          const cleanedBookmarksObj = Object.fromEntries(bookmarkedQuestions);
          await chrome.storage.local.set({ bookmarkedQuestions: cleanedBookmarksObj });
          console.log('Gemini Timeline: 清理后重新保存成功');
          return { success: true, message: '清理后保存成功' };
        } catch (retryError) {
          console.error('Gemini Timeline: 清理后仍然保存失败:', retryError);
          return { success: false, error: `清理后仍失败: ${retryError.message}` };
        }
      } else {
        return { success: false, error: `存储错误: ${storageError.message}` };
      }
    }
  } catch (error) {
    console.error('Gemini Timeline: 更新笔记失败:', error);
    return { success: false, error: `更新失败: ${error.message}` };
  }
}

// 移除标注
async function removeBookmark(questionId) {
  try {
    bookmarkedQuestions.delete(questionId);
    
    // 转换Map为对象以便存储
    const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
        await chrome.storage.local.set({ bookmarkedQuestions: bookmarksObj });
    console.log('Gemini Timeline: 移除标注成功:', questionId);
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 移除标注失败:', error);
    return false;
  }
}

// 彻底清理所有数据（用于插件卸载或重置）
async function clearAllData() {
  try {
    // 清空内存中的数据
    bookmarkedQuestions.clear();
    
    // 清空本地存储中的所有相关数据
    await chrome.storage.local.remove([
      'bookmarkedQuestions',
      'isTimelineEnabled', 
      'timelinePosition', 
      'timelineWidth'
    ]);
    
    // 也清理可能残留的sync数据
    await chrome.storage.sync.remove([
      'bookmarkedQuestions',
      'isTimelineEnabled', 
      'timelinePosition', 
      'timelineWidth'
    ]);
    
    console.log('Gemini Timeline: 所有数据已清理');
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 清理数据失败:', error);
    return false;
  }
}

// 导出数据清理函数，供外部调用
window.geminiTimelineClearAllData = clearAllData;

// 导出调试函数，供外部调用
window.debugGlobalView = function() {
  console.log('🔍 调试全局视图数据:');
  console.log('bookmarkedQuestions大小:', bookmarkedQuestions.size);
  console.log('currentViewMode:', currentViewMode);
  console.log('当前URL:', window.location.href);
  
  const allBookmarks = Array.from(bookmarkedQuestions.entries());
  console.log('所有标注数据:', allBookmarks.map(([id, bookmark]) => ({
    id: id.substring(0, 15) + '...',
    url: bookmark.url,
    text: bookmark.text ? bookmark.text.substring(0, 30) + '...' : 'undefined'
  })));
  
  // 按URL分组
  const groupedByUrl = {};
  allBookmarks.forEach(([questionId, bookmark]) => {
    const url = bookmark.url || '未知对话';
    if (!groupedByUrl[url]) {
      groupedByUrl[url] = [];
    }
    groupedByUrl[url].push([questionId, bookmark]);
  });
  
  console.log('按URL分组结果:', Object.keys(groupedByUrl).map(url => ({
    url: url,
    count: groupedByUrl[url].length,
    isCurrentPage: url === window.location.href
  })));
};

// 渲染全局视图
async function renderGlobalView(filterType = 'all') {
  const timelineContainer = document.getElementById('timeline-content');
  if (!timelineContainer) {
    console.warn('时间线容器不存在');
    return;
  }

  // 清空现有内容
  timelineContainer.innerHTML = '';

  // 获取所有标注的问题
  const allBookmarks = Array.from(bookmarkedQuestions.entries());
  
  // 调试输出所有书签数据
  console.log('🌐 全局视图渲染调试:', {
    totalBookmarks: allBookmarks.length,
    currentUrl: window.location.href,
    allBookmarksUrls: allBookmarks.map(([id, bookmark]) => ({
      id: id.substring(0, 10) + '...',
      url: bookmark.url,
      text: bookmark.text ? bookmark.text.substring(0, 30) + '...' : 'undefined'
    }))
  });
  
  // 修复错误的问题文本数据
  let needsDataFix = false;
  const allQuestions = getAllUserQuestions();
  console.log('全局视图数据修复 - 当前页面找到问题数量:', allQuestions.length);
  
  for (const [questionId, bookmark] of allBookmarks) {
    if (bookmark.text === '问题文本' || bookmark.text === '未找到问题文本') {
      console.log('发现需要修复的数据:', questionId, bookmark.text);
      
      // 使用统一的获取逻辑尝试从DOM中重新获取问题文本
      for (const question of allQuestions) {
        if (question.id === questionId) {
          console.log('修复问题文本:', question.text.substring(0, 50));
          bookmark.text = question.text;
          bookmarkedQuestions.set(questionId, bookmark);
          needsDataFix = true;
          break;
        }
      }
      
      // 如果在当前页面没找到，说明这个问题来自其他页面
      if (bookmark.text === '问题文本' || bookmark.text === '未找到问题文本') {
        console.log('该问题来自其他页面，无法在当前页面修复:', questionId);
        // 为来自其他页面的问题生成一个更友好的显示文本
        const urlObj = new URL(bookmark.url || window.location.href);
        const pathParts = urlObj.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1] || 'unknown';
        bookmark.text = `来自其他对话的问题 (${conversationId.substring(0, 8)}...)`;
        bookmarkedQuestions.set(questionId, bookmark);
        needsDataFix = true;
      }
    }
  }
  
  // 如果有数据修复，保存到存储
  if (needsDataFix) {
    try {
      const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
      await chrome.storage.local.set({ bookmarkedQuestions: bookmarksObj });
      console.log('数据修复完成，已保存到存储');
    } catch (error) {
      console.error('数据修复保存失败:', error);
    }
  }
  
  if (allBookmarks.length === 0) {
    timelineContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">暂无全局标记记录</div>';
    updateQuestionCount(0, 0);
    return;
  }

  // 按时间戳排序（最新在前）
  allBookmarks.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

  // 根据筛选类型过滤
  let filteredBookmarks = allBookmarks;
  if (filterType === 'bookmarks') {
    // 只显示有标记的（所有都是）
    filteredBookmarks = allBookmarks;
  } else if (filterType === 'notes') {
    // 只显示有笔记的
    filteredBookmarks = allBookmarks.filter(([id, bookmark]) => bookmark.note && bookmark.note.trim());
  }

  if (filteredBookmarks.length === 0) {
    const emptyMessage = filterType === 'notes' ? '暂无全局笔记记录' : '暂无全局标记记录';
    timelineContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #666;">${emptyMessage}</div>`;
    updateQuestionCount(0, 0);
    return;
  }

  // 按URL分组显示
  const groupedByUrl = {};
  filteredBookmarks.forEach(([questionId, bookmark]) => {
    const url = bookmark.url || '未知对话';
    if (!groupedByUrl[url]) {
      groupedByUrl[url] = [];
    }
    groupedByUrl[url].push([questionId, bookmark]);
  });

  // 渲染分组内容
  Object.keys(groupedByUrl).forEach((url, groupIndex) => {
    const items = groupedByUrl[url];
    
    // 创建对话组标题
    const groupTitle = document.createElement('div');
    groupTitle.style.cssText = `
      padding: 8px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      position: sticky;
      top: 0;
      z-index: 10;
    `;
    
    // 提取有意义的对话标识
    let conversationTitle = '未知对话';
    try {
      if (url && url !== '未知对话') {
        const urlObj = new URL(url);
        // 尝试从URL中提取对话ID或使用第一个问题作为标识
        const pathParts = urlObj.pathname.split('/');
        const conversationId = pathParts[pathParts.length - 1] || 'unknown';
        
        // 使用第一个问题的前50个字符作为对话描述
        const firstQuestion = items[0] && items[0][1] && items[0][1].text ? 
          items[0][1].text.substring(0, 50) + '...' : 
          '无问题文本';
        
        // 调试输出
        console.log('全局视图对话组调试:', {
          url: url,
          itemsCount: items.length,
          firstQuestionText: items[0] && items[0][1] ? items[0][1].text.substring(0, 100) : 'undefined'
        });
          
        conversationTitle = `💬 ${firstQuestion} (${items.length}项)`;
      } else {
        // 使用第一个问题作为标识
        const firstQuestion = items[0] && items[0][1] && items[0][1].text ? 
          items[0][1].text.substring(0, 50) + '...' : 
          '无问题文本';
        conversationTitle = `💬 ${firstQuestion} (${items.length}项)`;
      }
    } catch (e) {
      const firstQuestion = items[0] && items[0][1] && items[0][1].text ? 
        items[0][1].text.substring(0, 50) + '...' : 
        '无问题文本';
      conversationTitle = `💬 ${firstQuestion} (${items.length}项)`;
    }
    
    groupTitle.textContent = conversationTitle;
    timelineContainer.appendChild(groupTitle);

    // 渲染该组的问题
    items.forEach(([questionId, bookmark], index) => {
      const questionItem = document.createElement('div');
      questionItem.className = 'timeline-item';
      questionItem.style.cssText = `
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background-color 0.2s;
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: unset !important;
        display: block !important;
      `;

      questionItem.addEventListener('mouseenter', () => {
        questionItem.style.backgroundColor = '#f8f9fa';
      });

      questionItem.addEventListener('mouseleave', () => {
        questionItem.style.backgroundColor = 'transparent';
      });

      const questionContent = document.createElement('div');
      questionContent.style.cssText = `
        display: flex;
        align-items: flex-start;
        gap: 8px;
        width: 100%;
      `;

      // 标记按钮在全局视图中不显示

      // 笔记按钮
      const noteButton = document.createElement('button');
      noteButton.style.cssText = `
        background: ${bookmark.note && bookmark.note.trim() ? '#3b82f6' : '#e5e7eb'};
        border: 1px solid ${bookmark.note && bookmark.note.trim() ? '#2563eb' : '#d1d5db'};
        color: ${bookmark.note && bookmark.note.trim() ? 'white' : '#6b7280'};
        border-radius: 4px;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: ${bookmark.note && bookmark.note.trim() ? 'pointer' : 'default'};
        font-size: 10px;
        flex-shrink: 0;
        min-width: 20px;
        min-height: 20px;
      `;
      noteButton.innerHTML = '📝';
      noteButton.title = bookmark.note && bookmark.note.trim() ? '查看笔记' : '无笔记';

      // 如果有笔记，点击可查看
      if (bookmark.note && bookmark.note.trim()) {
        noteButton.addEventListener('click', (e) => {
          e.stopPropagation();
          showNoteModal(questionId, bookmark.text, bookmark.note, true);
        });
      }

      // 问题文本
      const questionTextSpan = document.createElement('span');
      questionTextSpan.style.cssText = `
        flex: 1;
        color: #333;
        line-height: 1.4;
        font-size: 13px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 2.8em;
      `;

      const displayText = bookmark.text || '未知问题';
      questionTextSpan.textContent = `${index + 1}: ${displayText}`;

      // 时间标签
      const timeSpan = document.createElement('div');
      timeSpan.style.cssText = `
        font-size: 11px;
        color: #999;
        margin-top: 4px;
        flex-shrink: 0;
      `;
      const timeStr = bookmark.timestamp ? new Date(bookmark.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '未知时间';
      timeSpan.textContent = timeStr;

      // 全局视图中不显示标记按钮，只显示笔记按钮
      questionContent.appendChild(noteButton);
      questionContent.appendChild(questionTextSpan);

      questionItem.appendChild(questionContent);
      questionItem.appendChild(timeSpan);

      // 如果有笔记，显示完整笔记内容
      if (bookmark.note && bookmark.note.trim()) {
        const noteContent = document.createElement('div');
        noteContent.style.cssText = `
          margin-top: 8px;
          padding: 10px 12px;
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          border-radius: 0 6px 6px 0;
          font-size: 13px;
          color: #1e40af;
          line-height: 1.5;
          white-space: pre-wrap;
          word-wrap: break-word;
        `;
        
        // 创建笔记标题
        const noteHeader = document.createElement('div');
        noteHeader.style.cssText = `
          font-weight: 600;
          margin-bottom: 6px;
          font-size: 12px;
          color: #1565c0;
          display: flex;
          align-items: center;
          gap: 4px;
        `;
        noteHeader.innerHTML = '📝 我的笔记';
        
        // 创建笔记正文
        const noteBody = document.createElement('div');
        noteBody.style.cssText = `
          color: #1e40af;
          font-size: 13px;
          line-height: 1.4;
        `;
        noteBody.textContent = bookmark.note;
        
        noteContent.appendChild(noteHeader);
        noteContent.appendChild(noteBody);
        questionItem.appendChild(noteContent);
      }

      timelineContainer.appendChild(questionItem);
    });
  });

  // 更新计数
  updateQuestionCount(filteredBookmarks.length, allBookmarks.length);
}

// 带搜索功能的全局视图渲染
function renderGlobalViewWithSearch(searchTerm) {
  const timelineContainer = document.getElementById('timeline-content');
  if (!timelineContainer) {
    console.warn('时间线容器不存在');
    return;
  }

  // 清空现有内容
  timelineContainer.innerHTML = '';

  // 获取所有标注的问题
  const allBookmarks = Array.from(bookmarkedQuestions.entries());
  
  if (allBookmarks.length === 0) {
    timelineContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">暂无全局标记记录</div>';
    updateQuestionCount(0, 0);
    return;
  }

  // 搜索过滤
  let filteredBySearch = allBookmarks;
  if (searchTerm) {
    filteredBySearch = allBookmarks.filter(([questionId, bookmark]) => {
      const questionText = (bookmark.text || '').toLowerCase();
      const noteText = (bookmark.note || '').toLowerCase();
      return questionText.includes(searchTerm.toLowerCase()) || 
             noteText.includes(searchTerm.toLowerCase());
    });
  }

  // 按时间戳排序（最新在前）
  filteredBySearch.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

  // 根据筛选类型过滤
  let filteredBookmarks = filteredBySearch;
  const currentFilterMode = getCurrentFilterMode();
  if (currentFilterMode === 'bookmarks') {
    // 只显示有标记的（所有都是）
    filteredBookmarks = filteredBySearch;
  } else if (currentFilterMode === 'notes') {
    // 只显示有笔记的
    filteredBookmarks = filteredBySearch.filter(([id, bookmark]) => bookmark.note && bookmark.note.trim());
  }

  if (filteredBookmarks.length === 0) {
    const emptyMessage = searchTerm ? `未找到包含"${searchTerm}"的记录` : '暂无符合条件的记录';
    timelineContainer.innerHTML = `<div style="padding: 16px; text-align: center; color: #666;">${emptyMessage}</div>`;
    updateQuestionCount(0, allBookmarks.length);
    return;
  }

  // 显示搜索结果提示
  if (searchTerm) {
    const searchHint = document.createElement('div');
    searchHint.style.cssText = `
      padding: 8px 16px;
      background: #e3f2fd;
      border-bottom: 1px solid #bbdefb;
      font-size: 12px;
      color: #1565c0;
      text-align: center;
    `;
    searchHint.textContent = `搜索"${searchTerm}"的结果：${filteredBookmarks.length} 项`;
    timelineContainer.appendChild(searchHint);
  }

  // 按URL分组显示（简化版，减少重复代码）
  renderGlobalItems(filteredBookmarks, searchTerm);

  // 更新计数
  updateQuestionCount(filteredBookmarks.length, allBookmarks.length);
}

// 获取当前筛选模式
function getCurrentFilterMode() {
  const bookmarksButton = document.getElementById('bookmarks-toggle');
  const notesButton = document.getElementById('notes-toggle');
  
  if (bookmarksButton?.style.opacity === '1') return 'bookmarks';
  if (notesButton?.style.opacity === '1') return 'notes';
  return 'all';
}

// 渲染全局视图项目
function renderGlobalItems(filteredBookmarks, searchTerm = '') {
  const timelineContainer = document.getElementById('timeline-content');
  
  // 按URL分组显示
  const groupedByUrl = {};
  filteredBookmarks.forEach(([questionId, bookmark]) => {
    const url = bookmark.url || '未知对话';
    if (!groupedByUrl[url]) {
      groupedByUrl[url] = [];
    }
    groupedByUrl[url].push([questionId, bookmark]);
  });

  // 渲染分组内容
  Object.keys(groupedByUrl).forEach((url, groupIndex) => {
    const items = groupedByUrl[url];
    
    // 创建对话组标题
    const groupTitle = document.createElement('div');
    groupTitle.style.cssText = `
      padding: 8px 16px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      font-size: 12px;
      color: #666;
      font-weight: 500;
      position: sticky;
      top: 0;
      z-index: 10;
    `;
    
    let conversationTitle = '未知对话';
    try {
      if (url && url !== '未知对话') {
        const urlObj = new URL(url);
        conversationTitle = `对话 ${groupIndex + 1} (${items.length}项)`;
      }
    } catch (e) {
      conversationTitle = `对话 ${groupIndex + 1} (${items.length}项)`;
    }
    
    groupTitle.textContent = conversationTitle;
    timelineContainer.appendChild(groupTitle);

    // 渲染该组的问题
    items.forEach(([questionId, bookmark], index) => {
      const questionItem = createGlobalQuestionItem(questionId, bookmark, index, searchTerm);
      timelineContainer.appendChild(questionItem);
    });
  });
}

// 创建全局视图问题项
function createGlobalQuestionItem(questionId, bookmark, index, searchTerm = '') {
  const questionItem = document.createElement('div');
  questionItem.className = 'timeline-item';
  questionItem.style.cssText = `
    padding: 12px 16px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: unset !important;
    display: block !important;
  `;

  questionItem.addEventListener('mouseenter', () => {
    questionItem.style.backgroundColor = '#f8f9fa';
  });

  questionItem.addEventListener('mouseleave', () => {
    questionItem.style.backgroundColor = 'transparent';
  });

  const questionContent = document.createElement('div');
  questionContent.style.cssText = `
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
  `;

  // 标记按钮在全局视图中不显示

  // 笔记按钮
  const noteButton = document.createElement('button');
  noteButton.style.cssText = `
    background: ${bookmark.note && bookmark.note.trim() ? '#3b82f6' : '#e5e7eb'};
    border: 1px solid ${bookmark.note && bookmark.note.trim() ? '#2563eb' : '#d1d5db'};
    color: ${bookmark.note && bookmark.note.trim() ? 'white' : '#6b7280'};
    border-radius: 4px;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: ${bookmark.note && bookmark.note.trim() ? 'pointer' : 'default'};
    font-size: 10px;
    flex-shrink: 0;
    min-width: 20px;
    min-height: 20px;
  `;
  noteButton.innerHTML = '📝';
  noteButton.title = bookmark.note && bookmark.note.trim() ? '查看笔记' : '无笔记';

  // 如果有笔记，点击可查看
  if (bookmark.note && bookmark.note.trim()) {
    noteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      showNoteModal(questionId, bookmark.text, bookmark.note, true);
    });
  }

  // 问题文本（支持搜索高亮）
  const questionTextSpan = document.createElement('span');
  questionTextSpan.style.cssText = `
    flex: 1;
    color: #333;
    line-height: 1.4;
    font-size: 13px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 2.8em;
  `;

  const displayText = bookmark.text || '未知问题';
  let highlightedText = `${index + 1}: ${displayText}`;
  
  // 搜索高亮
  if (searchTerm && displayText.toLowerCase().includes(searchTerm.toLowerCase())) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark style="background: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
    questionTextSpan.innerHTML = highlightedText;
  } else {
    questionTextSpan.textContent = highlightedText;
  }

  // 时间标签
  const timeSpan = document.createElement('div');
  timeSpan.style.cssText = `
    font-size: 11px;
    color: #999;
    margin-top: 4px;
    flex-shrink: 0;
  `;
  const timeStr = bookmark.timestamp ? new Date(bookmark.timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '未知时间';
  timeSpan.textContent = timeStr;

  questionContent.appendChild(bookmarkButton);
  questionContent.appendChild(noteButton);
  questionContent.appendChild(questionTextSpan);

  questionItem.appendChild(questionContent);
  questionItem.appendChild(timeSpan);

  // 如果有笔记，显示完整笔记内容（支持搜索高亮）
  if (bookmark.note && bookmark.note.trim()) {
    const noteContent = document.createElement('div');
    noteContent.style.cssText = `
      margin-top: 8px;
      padding: 10px 12px;
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      border-radius: 0 6px 6px 0;
      font-size: 13px;
      color: #1e40af;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
    `;
    
    // 如果有搜索词匹配，高亮背景
    if (searchTerm && bookmark.note.toLowerCase().includes(searchTerm.toLowerCase())) {
      noteContent.style.background = '#fff3cd';
    }
    
    // 创建笔记标题
    const noteHeader = document.createElement('div');
    noteHeader.style.cssText = `
      font-weight: 600;
      margin-bottom: 6px;
      font-size: 12px;
      color: #1565c0;
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    noteHeader.innerHTML = '📝 我的笔记';
    
    // 创建笔记正文
    const noteBody = document.createElement('div');
    noteBody.style.cssText = `
      color: #1e40af;
      font-size: 13px;
      line-height: 1.4;
    `;
    
    // 笔记内容搜索高亮
    if (searchTerm && bookmark.note.toLowerCase().includes(searchTerm.toLowerCase())) {
      const regex = new RegExp(`(${searchTerm})`, 'gi');
      const highlightedNote = bookmark.note.replace(regex, '<mark style="background: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
      noteBody.innerHTML = highlightedNote;
    } else {
      noteBody.textContent = bookmark.note;
    }
    
    noteContent.appendChild(noteHeader);
    noteContent.appendChild(noteBody);
    questionItem.appendChild(noteContent);
  }

  return questionItem;
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
      
      // 根据当前视图模式重新渲染
      if (currentViewMode === 'global') {
        renderGlobalView(filterMode);
      } else {
        renderTimeline(processedUserMessages);
      }
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

// 显示备注编辑弹窗
function showNoteModal(questionId, questionText, currentNote = '', readOnly = false) {
  // 移除现有的弹窗
  const existingModal = document.getElementById('note-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // 创建模态框背景
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'note-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000001;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeInModal 0.3s ease-out;
  `;
  
  // 创建模态框内容
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 500px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    animation: slideInModal 0.3s ease-out;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;
  
  modalContent.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">${readOnly ? '查看笔记内容' : '记录笔记内容'}</h3>
      <div style="font-size: 14px; color: #666; line-height: 1.4; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">
        ${questionText.substring(0, 150)}${questionText.length > 150 ? '...' : ''}
      </div>
      ${readOnly ? '<div style="font-size: 11px; color: #999; margin-top: 4px;">🌐 全局视图 - 只读模式</div>' : ''}
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500;">
        笔记内容：
      </label>
      <textarea id="note-input" placeholder="${readOnly ? '笔记内容（只读）' : '记录这个问题的重要性或原因，如：答案很不错、需要参考、重要信息等...'}" style="
        width: 100%;
        height: 100px;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        outline: none;
        transition: border-color 0.2s ease;
        box-sizing: border-box;
        background: ${readOnly ? '#f5f5f5' : 'white'};
        color: ${readOnly ? '#666' : '#333'};
      " ${readOnly ? 'readonly' : ''}>${currentNote}</textarea>
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button id="note-cancel" style="
        padding: 10px 20px;
        border: 2px solid #ddd;
        background: white;
        color: #666;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">${readOnly ? '关闭' : '取消'}</button>
      ${readOnly ? '' : `<button id="note-save" style="
        padding: 10px 20px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">保存</button>`}
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // 获取元素
  const noteInput = document.getElementById('note-input');
  const cancelBtn = document.getElementById('note-cancel');
  const saveBtn = readOnly ? null : document.getElementById('note-save');
  
  // 聚焦到输入框
  setTimeout(() => {
    noteInput.focus();
    noteInput.setSelectionRange(noteInput.value.length, noteInput.value.length);
  }, 100);
  
  // 样式交互
  noteInput.addEventListener('focus', () => {
    noteInput.style.borderColor = '#667eea';
  });
  
  noteInput.addEventListener('blur', () => {
    noteInput.style.borderColor = '#e0e0e0';
  });
  
  cancelBtn.addEventListener('mouseenter', () => {
    cancelBtn.style.borderColor = '#bbb';
    cancelBtn.style.color = '#333';
  });
  
  cancelBtn.addEventListener('mouseleave', () => {
    cancelBtn.style.borderColor = '#ddd';
    cancelBtn.style.color = '#666';
  });
  
  // 只在非只读模式下添加保存按钮的事件
  if (saveBtn) {
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.transform = 'translateY(-1px)';
      saveBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
    });
    
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.transform = 'translateY(0)';
      saveBtn.style.boxShadow = 'none';
    });
  }
  
  // 事件处理
  const closeModal = () => {
    modalOverlay.style.animation = 'fadeOutModal 0.2s ease-in';
    setTimeout(() => {
      if (modalOverlay.parentNode) {
        modalOverlay.remove();
      }
    }, 200);
  };
  
  cancelBtn.addEventListener('click', closeModal);
  
  // 点击背景关闭
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
  
  // ESC键关闭
  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
  
  // 保存备注（只在非只读模式下）
  if (!readOnly && saveBtn) {
    saveBtn.addEventListener('click', async () => {
    const note = noteInput.value.trim();
    console.log('开始保存笔记:', {
      questionId,
      noteLength: note.length,
      currentBookmarksSize: bookmarkedQuestions.size
    });
    
    try {
      const result = await updateBookmarkNote(questionId, note);
      console.log('保存结果:', result);
      
      if (result.success) {
        // 根据当前视图模式重新渲染
        if (currentViewMode === 'global') {
          renderGlobalView(getCurrentFilterMode());
        } else {
          renderTimeline(processedUserMessages);
        }
        
        closeModal();
        
        // 显示成功提示
        showToast(note ? '笔记已保存' : '笔记已清空', 'success');
      } else {
        console.error('保存失败详情:', result.error);
        showToast(`保存失败: ${result.error || '未知错误'}`, 'error');
      }
    } catch (error) {
      console.error('保存过程出现异常:', error);
      showToast(`保存异常: ${error.message}`, 'error');
    }
    });
    
    // Ctrl+Enter 快捷保存
    noteInput.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        saveBtn.click();
      }
    });
  }
}

// 显示提示消息
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 12px 16px;
    background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
    color: white;
    border-radius: 6px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000002;
    animation: slideInToast 0.3s ease-out;
  `;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutToast 0.3s ease-in';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 2000);
}

// 添加所有动画的CSS
const allStyles = document.createElement('style');
allStyles.textContent = `
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
  
  @keyframes fadeInModal {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes fadeOutModal {
    from { opacity: 1; }
    to { opacity: 0; }
  }
  
  @keyframes slideInModal {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  @keyframes slideInToast {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOutToast {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(20px);
    }
  }
`;
document.head.appendChild(allStyles);

// 设置停靠和拖拽功能
function setupDockingAndDragging(sidebar, dockIndicator) {
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };
  let isExpanded = false;
  let expandTimeout = null;
  
  // 停靠指示器点击展开
  dockIndicator.addEventListener('click', () => {
    toggleTimeline();
  });
  
  // 鼠标悬停展开
  sidebar.addEventListener('mouseenter', () => {
    if (!isExpanded && !isDragging) {
      clearTimeout(expandTimeout);
      expandTimeout = setTimeout(() => {
        expandTimeline();
      }, 300);
    }
  });
  
  // 添加对停靠指示器的悬停支持
  dockIndicator.addEventListener('mouseenter', () => {
    if (!isExpanded && !isDragging) {
      clearTimeout(expandTimeout);
      expandTimeout = setTimeout(() => {
        expandTimeline();
      }, 200); // 更快响应
    }
  });
  
  // 鼠标离开收起
  sidebar.addEventListener('mouseleave', () => {
    clearTimeout(expandTimeout);
    if (isExpanded && !isDragging) {
      setTimeout(() => {
        if (!sidebar.matches(':hover') && !isDragging) {
          collapseTimeline();
        }
      }, 500);
    }
  });
  
  function toggleTimeline() {
    if (isExpanded) {
      collapseTimeline();
    } else {
      expandTimeline();
    }
  }
  
  function expandTimeline() {
    isExpanded = true;
    const dockIndicatorElement = document.getElementById('timeline-dock-indicator');
    const toggleButton = document.getElementById('timeline-toggle');
    const isMinimized = toggleButton && toggleButton.textContent === '+';
    
    console.log('expandTimeline调用，最小化状态:', isMinimized);
    
    sidebar.style.right = '20px';
    sidebar.style.borderRadius = '12px';
    if (dockIndicatorElement) {
      dockIndicatorElement.style.display = 'none';
    }
    
    // 确保内容区域可以滚动，但要检查是否处于最小化状态
    const timelineContent = document.getElementById('timeline-content');
    if (timelineContent && !isMinimized) {
      timelineContent.style.overflowY = 'auto';
      timelineContent.style.pointerEvents = 'auto';
    }
    
    console.log('expandTimeline完成，位置:', sidebar.style.right);
  }
  
  function collapseTimeline() {
    isExpanded = false;
    
    // 检查是否处于最小化状态
    const toggleButton = document.getElementById('timeline-toggle');
    const isMinimized = toggleButton && toggleButton.textContent === '+';
    const dockIndicatorElement = document.getElementById('timeline-dock-indicator');
    
    console.log('collapseTimeline调用，最小化状态:', isMinimized);
    
    // 如果是最小化状态，不要停靠，保持展开状态
    if (isMinimized) {
      console.log('保持最小化展开状态');
      sidebar.style.right = '20px'; // 保持展开状态
      sidebar.style.borderRadius = '12px';
      if (dockIndicatorElement) {
        dockIndicatorElement.style.display = 'none';
      }
      return; // 直接返回，不执行停靠逻辑
    }
    
    // 正常停靠
    console.log('执行正常停靠');
    sidebar.style.right = '-290px';
    sidebar.style.borderRadius = '12px 0 0 12px';
    if (dockIndicatorElement) {
      dockIndicatorElement.style.display = 'flex';
    }
    
    // 确保停靠状态下内容区域仍然可以滚动
    const timelineContent = document.getElementById('timeline-content');
    if (timelineContent) {
      timelineContent.style.overflowY = 'auto';
      timelineContent.style.pointerEvents = 'auto';
    }
  }
  
  // 拖拽功能
  let longPressTimer = null;
  let startPos = { x: 0, y: 0 };
  
  sidebar.addEventListener('mousedown', (e) => {
    // 排除按钮和输入框
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    startPos = { x: e.clientX, y: e.clientY };
    
    // 移除长按检测功能
    
    const handleMouseMove = (e) => {
      const deltaX = Math.abs(e.clientX - startPos.x);
      const deltaY = Math.abs(e.clientY - startPos.y);
      
      // 如果移动距离超过阈值，开始拖拽
      if ((deltaX > 5 || deltaY > 5) && !isDragging) {
        clearTimeout(longPressTimer);
        startDragging(e);
      }
      
      if (isDragging) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // 限制拖拽范围
        const maxX = window.innerWidth - sidebar.offsetWidth;
        const maxY = window.innerHeight - sidebar.offsetHeight;
        
        const clampedX = Math.max(0, Math.min(maxX, newX));
        const clampedY = Math.max(0, Math.min(maxY, newY));
        
        sidebar.style.left = clampedX + 'px';
        sidebar.style.top = clampedY + 'px';
        sidebar.style.right = 'auto';
        sidebar.style.transform = 'none';
        
        // 更新边框样式
        sidebar.style.borderRadius = '12px';
        dockIndicator.style.display = 'none';
      }
    };
    
    const handleMouseUp = () => {
      clearTimeout(longPressTimer);
      
      if (isDragging) {
        isDragging = false;
        sidebar.style.cursor = 'move';
        
        // 检查是否靠近边缘，如果是则停靠
        const rect = sidebar.getBoundingClientRect();
        const snapDistance = 50;
        
        if (rect.right > window.innerWidth - snapDistance) {
          // 停靠到右边
          snapToRight();
        } else if (rect.left < snapDistance) {
          // 停靠到左边
          snapToLeft();
        }
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });
  
  function startDragging(e) {
    isDragging = true;
    isExpanded = true;
    sidebar.style.cursor = 'grabbing';
    
    const rect = sidebar.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
  }
  
  function snapToRight() {
    sidebar.className = 'timeline-docked-right';
    sidebar.style.left = 'auto';
    sidebar.style.top = '50%';
    sidebar.style.right = '-290px';
    sidebar.style.transform = 'translateY(-50%)';
    sidebar.style.borderRadius = '12px 0 0 12px';
    dockIndicator.style.display = 'flex';
    isExpanded = false;
  }
  
  function snapToLeft() {
    sidebar.className = 'timeline-docked-left';
    sidebar.style.right = 'auto';
    sidebar.style.top = '50%';
    sidebar.style.left = '-290px';
    sidebar.style.transform = 'translateY(-50%)';
    sidebar.style.borderRadius = '0 12px 12px 0';
    
    // 调整停靠指示器到右侧
    dockIndicator.style.left = 'auto';
    dockIndicator.style.right = '-1px';
    dockIndicator.style.borderRadius = '0 4px 4px 0';
    dockIndicator.style.display = 'flex';
    
    // 更新悬停展开逻辑
    sidebar.addEventListener('mouseenter', () => {
      if (!isExpanded && !isDragging) {
        sidebar.style.left = '20px';
        sidebar.style.borderRadius = '12px';
        dockIndicator.style.display = 'none';
        isExpanded = true;
      }
    });
    
    isExpanded = false;
  }
  
  // 初始状态为收起
  collapseTimeline();
}

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

// 过滤问题（包括笔记搜索）
function filterQuestions(searchTerm) {
  if (currentViewMode === 'global') {
    // 在全局视图中，重新渲染以应用搜索过滤
    renderGlobalViewWithSearch(searchTerm);
    return;
  }
  
  const timelineContent = document.getElementById('timeline-content');
  if (!timelineContent) return;

  const questionItems = timelineContent.querySelectorAll('.timeline-item');
  let visibleCount = 0;

  questionItems.forEach(item => {
    const questionId = item.dataset.questionId;
    const questionText = item.textContent.toLowerCase();
    
    // 获取笔记内容
    const bookmark = bookmarkedQuestions.get(questionId);
    const noteText = (bookmark?.note || '').toLowerCase();
    
    // 检查问题文本或笔记是否匹配搜索词
    const questionMatch = !searchTerm || questionText.includes(searchTerm);
    const noteMatch = !searchTerm || noteText.includes(searchTerm);
    const isMatch = questionMatch || noteMatch;
    
    item.style.display = isMatch ? 'block' : 'none';
    if (isMatch) visibleCount++;
    
    // 如果是通过笔记匹配的，高亮显示笔记区域
    const noteDisplay = item.querySelector('[style*="rgba(255, 215, 0, 0.1)"]');
    if (noteDisplay && noteMatch && !questionMatch && searchTerm) {
      noteDisplay.style.background = 'rgba(255, 215, 0, 0.25)';
      noteDisplay.style.borderLeftColor = '#ff8c00';
    } else if (noteDisplay) {
      noteDisplay.style.background = 'rgba(255, 215, 0, 0.1)';
      noteDisplay.style.borderLeftColor = '#ffd700';
    }
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
    const notesToggle = document.getElementById('notes-toggle');
    
    let currentFilterMode = 'all';
    if (bookmarksToggle && bookmarksToggle.style.opacity === '1') {
      currentFilterMode = 'bookmarks';
    } else if (notesToggle && notesToggle.style.opacity === '1') {
      currentFilterMode = 'notes';
    }
    
    if (currentFilterMode === 'bookmarks') {
      countElement.textContent = `${visible} 个标注`;
    } else     if (currentFilterMode === 'notes') {
      countElement.textContent = `${visible} 个笔记`;
    } else {
      // 普通视图 - 简化计数显示，不显示标注统计
      if (visible === total) {
        countElement.textContent = `${total} 个问题`;
      } else {
        countElement.textContent = `${visible}/${total} 个问题`;
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

  // 保存到全局变量
  processedUserMessages = userMessages;

  // 显示找到的问题
  console.log(`Gemini Timeline: 🎉 最终找到 ${userMessages.length} 条用户问题`);
  for (let i = 0; i < Math.min(3, userMessages.length); i++) {
    const questionText = userMessages[i].textContent.substring(0, 100);
    console.log(`Gemini Timeline: 问题 ${i+1}: "${questionText}..."`);
  }

  // 根据当前视图模式渲染
  if (currentViewMode === 'global') {
    renderGlobalView(getCurrentFilterMode());
  } else {
    renderTimeline(userMessages);
  }
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

  // 检查当前的筛选模式
  const bookmarksToggle = document.getElementById('bookmarks-toggle');
  const notesToggle = document.getElementById('notes-toggle');
  
  let currentFilterMode = 'all';
  if (bookmarksToggle && bookmarksToggle.style.opacity === '1') {
    currentFilterMode = 'bookmarks';
  } else if (notesToggle && notesToggle.style.opacity === '1') {
    currentFilterMode = 'notes';
  }
  
  let questionsToShow = finalQuestions.slice(0, 100).reverse();
  
  // 根据筛选模式过滤问题
  if (currentFilterMode === 'bookmarks') {
    // 只显示标注问题
    questionsToShow = questionsToShow.filter(message => {
      const questionText = message.textContent.trim();
      const questionId = generateQuestionId(questionText);
      return isBookmarked(questionId);
    });
  } else if (currentFilterMode === 'notes') {
    // 只显示有备注的问题
    questionsToShow = questionsToShow.filter(message => {
      const questionText = message.textContent.trim();
      const questionId = generateQuestionId(questionText);
      const bookmark = bookmarkedQuestions.get(questionId);
      return bookmark && bookmark.note && bookmark.note.trim().length > 0;
    });
  } else {
    // 正常显示时，将标注的问题置顶
    const bookmarkedMessages = [];
    const normalMessages = [];
    
    questionsToShow.forEach(message => {
      const questionText = message.textContent.trim();
      const questionId = generateQuestionId(questionText);
      if (isBookmarked(questionId)) {
        bookmarkedMessages.push(message);
      } else {
        normalMessages.push(message);
      }
    });
    
    // 标注问题在前，普通问题在后
    questionsToShow = [...bookmarkedMessages, ...normalMessages];
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
      
      // 检查是否在标注筛选模式
      const isBookmarkFilterMode = currentFilterMode === 'bookmarks';
      
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
      questionTextSpan.textContent = `${index + 1}: ${displayText}`;
      questionTextSpan.style.cssText = `
        flex: 1;
        cursor: pointer;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.4;
        max-height: 2.8em;
      `;
      
      // 添加笔记按钮 - 确保可见版本，放在五角星旁边
      const bookmark = bookmarkedQuestions.get(questionId);
      const noteText = bookmark?.note || '';
      
      const noteButton = document.createElement('button');
      noteButton.innerHTML = '📝';
      noteButton.title = noteText ? `编辑笔记: ${noteText}` : '记录笔记';
      noteButton.className = 'timeline-note-button'; // 添加类名用于调试
      noteButton.style.cssText = `
        background: rgba(102, 126, 234, 0.1);
        border: 1px solid #667eea;
        color: ${noteText ? '#667eea' : '#888'};
        cursor: pointer;
        font-size: 12px;
        padding: 3px 5px;
        border-radius: 3px;
        transition: all 0.2s ease;
        margin-left: 4px;
        margin-right: 6px;
        flex-shrink: 0;
        min-width: 20px;
        min-height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      `;
      
      // 笔记按钮点击事件 - 直接弹出编辑框
      noteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        console.log('笔记按钮被点击:', questionId, questionText);
        showNoteModal(questionId, questionText, noteText);
      });
      
      // 笔记按钮悬停效果
      noteButton.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.backgroundColor = 'rgba(102, 126, 234, 0.2)';
        this.style.borderColor = '#4285f4';
      });
      
      noteButton.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.backgroundColor = 'rgba(102, 126, 234, 0.1)';
        this.style.borderColor = '#667eea';
      });
      
      console.log('添加笔记按钮到问题:', index + 1, noteButton);
      
      // 按顺序添加：五角星 -> 笔记按钮 -> 问题文本
      questionContent.appendChild(bookmarkButton);
      questionContent.appendChild(noteButton);
      questionContent.appendChild(questionTextSpan);
      
      questionItem.appendChild(questionContent);
      
        // 如果有笔记，在问题下方显示笔记内容
      if (isBookmarkedQuestion) {
        const bookmark = bookmarkedQuestions.get(questionId);
        const noteText = bookmark?.note || '';
        
        if (noteText) {
          const noteDisplay = document.createElement('div');
          noteDisplay.style.cssText = `
            margin-top: 6px;
            padding: 8px 10px;
            background: rgba(255, 215, 0, 0.1);
            border-radius: 4px;
            font-size: 12px;
            color: #666;
            line-height: 1.3;
            border-left: 3px solid #ffd700;
            cursor: pointer;
          `;
          noteDisplay.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 2px;">
              <span style="font-weight: 500; color: #b8860b;">📝 笔记:</span>
            </div>
            <div style="word-break: break-word;">${noteText}</div>
          `;
          
          // 点击笔记区域也可以编辑
          noteDisplay.addEventListener('click', (e) => {
            e.stopPropagation();
            showNoteModal(questionId, questionText, noteText);
          });
          
          // 笔记区域悬停效果
          noteDisplay.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255, 215, 0, 0.15)';
          });
          
          noteDisplay.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255, 215, 0, 0.1)';
          });
          
          questionItem.appendChild(noteDisplay);
        }
      }
      
      questionItem.title = questionText; // 完整文本作为tooltip
      
      // 添加样式 - 覆盖CSS文件中的样式
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
        white-space: normal !important;
        overflow: visible !important;
        text-overflow: unset !important;
        display: block !important;
      `;
      
      
      // 标注按钮点击事件 - 只做标注，不弹出备注框
      bookmarkButton.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        if (isBookmarked(questionId)) {
          // 移除标注
          const success = await removeBookmark(questionId);
          if (success) {
            this.innerHTML = '☆';
            this.style.color = '#ccc';
            this.title = '标注问题';
            
            // 根据当前视图模式重新渲染
            if (currentViewMode === 'global') {
              renderGlobalView(getCurrentFilterMode());
            } else {
              renderTimeline(processedUserMessages);
            }
            
            showToast('标注已移除', 'info');
          }
        } else {
          // 添加标注 - 只标注，不弹出备注框
          const success = await saveBookmark(questionId, questionText, '');
          if (success) {
            this.innerHTML = '★';
            this.style.color = '#ffd700';
            this.title = '已标注';
            
            // 根据当前视图模式重新渲染
            if (currentViewMode === 'global') {
              renderGlobalView(getCurrentFilterMode());
            } else {
              renderTimeline(processedUserMessages);
            }
            
            showToast('标注已保存', 'success');
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
  } else if (request.action === 'clearAllData') {
    // 清除所有数据
    clearAllData().then(() => {
      sendResponse({ status: 'success', message: '数据已清除' });
      
      // 刷新时间线显示
      const timelineContent = document.getElementById('timeline-content');
      if (timelineContent) {
        timelineContent.innerHTML = '<div style="padding: 16px; text-align: center; color: #666;">数据已清除，暂无问题记录</div>';
      }
      
      // 更新计数显示
      const countElement = document.getElementById('question-count');
      if (countElement) {
        countElement.textContent = '0 个问题';
      }
    }).catch(error => {
      sendResponse({ status: 'error', message: error.message });
    });
    return true; // 保持消息通道开放，等待异步响应
  }
});