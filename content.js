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
    right: -280px;
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
    left: -8px;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
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
      <button id="notes-toggle" title="只显示有笔记的问题" style="background: none; border: none; color: white; cursor: pointer; font-size: 14px; padding: 0; margin-right: 8px; opacity: 0.7;">📝</button>
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
  
  // 根据当前筛选模式添加不同提示
  const updateHintText = () => {
    const notesToggle = document.getElementById('notes-toggle');
    if (notesToggle && notesToggle.style.opacity === '1') {
      hintText.innerHTML = '💡 在普通界面长按标注3秒可快速编辑笔记';
    } else {
      hintText.textContent = '⭐ 标注问题将在7天后自动清理';
    }
  };
  
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
  document.getElementById('timeline-toggle').addEventListener('click', function() {
    const content = document.getElementById('timeline-content');
    const searchContainer = sidebar.children[1]; // 搜索容器
    const isCollapsed = content.style.display === 'none';
    
    content.style.display = isCollapsed ? 'block' : 'none';
    searchContainer.style.display = isCollapsed ? 'block' : 'none';
    this.textContent = isCollapsed ? '−' : '+';
  });

  // 筛选状态变量
  let filterMode = 'all'; // 'all', 'bookmarks', 'notes'
  
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
    
    // 重新渲染时间线
    const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
      .filter(el => el.textContent?.trim().length > 0);
    renderTimeline(userMessages);
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
    
    // 重新渲染时间线
    const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
      .filter(el => el.textContent?.trim().length > 0);
    renderTimeline(userMessages);
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
    await chrome.storage.sync.set({ bookmarkedQuestions: bookmarksObj });
    console.log('Gemini Timeline: 保存标注成功:', questionText.substring(0, 30));
    return true;
  } catch (error) {
    console.error('Gemini Timeline: 保存标注失败:', error);
    return false;
  }
}

// 更新标注笔记
async function updateBookmarkNote(questionId, note) {
  try {
    const bookmark = bookmarkedQuestions.get(questionId);
    if (bookmark) {
      bookmark.note = note;
      bookmarkedQuestions.set(questionId, bookmark);
      
      // 转换Map为对象以便存储
      const bookmarksObj = Object.fromEntries(bookmarkedQuestions);
      await chrome.storage.sync.set({ bookmarkedQuestions: bookmarksObj });
      console.log('Gemini Timeline: 更新笔记成功:', note.substring(0, 30));
      return true;
    }
    return false;
  } catch (error) {
    console.error('Gemini Timeline: 更新笔记失败:', error);
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

// 显示备注编辑弹窗
function showNoteModal(questionId, questionText, currentNote = '') {
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
      <h3 style="margin: 0 0 8px 0; font-size: 18px; color: #333;">记录笔记内容</h3>
      <div style="font-size: 14px; color: #666; line-height: 1.4; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">
        ${questionText.substring(0, 150)}${questionText.length > 150 ? '...' : ''}
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <label style="display: block; margin-bottom: 8px; font-size: 14px; color: #333; font-weight: 500;">
        笔记内容：
      </label>
      <textarea id="note-input" placeholder="记录这个问题的重要性或原因，如：答案很不错、需要参考、重要信息等..." style="
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
      ">${currentNote}</textarea>
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
      ">取消</button>
      <button id="note-save" style="
        padding: 10px 20px;
        border: none;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      ">保存</button>
    </div>
  `;
  
  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
  
  // 获取元素
  const noteInput = document.getElementById('note-input');
  const cancelBtn = document.getElementById('note-cancel');
  const saveBtn = document.getElementById('note-save');
  
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
  
  saveBtn.addEventListener('mouseenter', () => {
    saveBtn.style.transform = 'translateY(-1px)';
    saveBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
  });
  
  saveBtn.addEventListener('mouseleave', () => {
    saveBtn.style.transform = 'translateY(0)';
    saveBtn.style.boxShadow = 'none';
  });
  
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
  
  // 保存备注
  saveBtn.addEventListener('click', async () => {
    const note = noteInput.value.trim();
    const success = await updateBookmarkNote(questionId, note);
    
    if (success) {
      // 重新渲染时间线以显示更新后的备注
      const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
        .filter(el => el.textContent?.trim().length > 0);
      renderTimeline(userMessages);
      
      closeModal();
      
      // 显示成功提示
      showToast(note ? '笔记已保存' : '笔记已清空', 'success');
    } else {
      showToast('保存失败，请重试', 'error');
    }
  });
  
  // Ctrl+Enter 快捷保存
  noteInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      saveBtn.click();
    }
  });
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
    sidebar.style.right = '20px';
    sidebar.style.borderRadius = '12px';
    dockIndicator.style.display = 'none';
  }
  
  function collapseTimeline() {
    isExpanded = false;
    sidebar.style.right = '-280px';
    sidebar.style.borderRadius = '12px 0 0 12px';
    dockIndicator.style.display = 'flex';
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
    
    // 长按检测（用于标注长按功能）
    longPressTimer = setTimeout(() => {
      const target = e.target.closest('.timeline-item');
      if (target && target.dataset.questionId) {
        const questionId = target.dataset.questionId;
        const bookmark = bookmarkedQuestions.get(questionId);
        const questionText = target.textContent.trim();
        
        if (isBookmarked(questionId)) {
          // 如果已标注，触发长按笔记编辑
          const noteText = bookmark?.note || '';
          showNoteModal(questionId, questionText, noteText);
          showToast('长按编辑笔记', 'info');
        }
      }
    }, 3000);
    
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
    sidebar.style.right = '-280px';
    sidebar.style.transform = 'translateY(-50%)';
    sidebar.style.borderRadius = '12px 0 0 12px';
    dockIndicator.style.display = 'flex';
    isExpanded = false;
  }
  
  function snapToLeft() {
    sidebar.className = 'timeline-docked-left';
    sidebar.style.right = 'auto';
    sidebar.style.top = '50%';
    sidebar.style.left = '-280px';
    sidebar.style.transform = 'translateY(-50%)';
    sidebar.style.borderRadius = '0 12px 12px 0';
    
    // 调整停靠指示器到右侧
    dockIndicator.style.left = 'auto';
    dockIndicator.style.right = '-8px';
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
      // 计算标注和笔记数量
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
      
      const noteCount = Array.from(bookmarkedQuestions.keys()).filter(id => {
        const bookmark = bookmarkedQuestions.get(id);
        if (!bookmark) return false;
        
        // 检查是否过期
        const now = Date.now();
        if (bookmark.expiresAt && now > bookmark.expiresAt) {
          return false;
        }
        
        // 检查是否有笔记
        if (!bookmark.note || bookmark.note.trim().length === 0) {
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
      
      let statusText = '';
      if (bookmarkCount > 0) statusText += `${bookmarkCount}⭐`;
      if (noteCount > 0) statusText += `${bookmarkCount > 0 ? ' ' : ''}${noteCount}📝`;
      
      if (visible === total) {
        countElement.textContent = `${total} 个问题${statusText ? ` (${statusText})` : ''}`;
      } else {
        countElement.textContent = `${visible}/${total} 个问题${statusText ? ` (${statusText})` : ''}`;
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
      questionTextSpan.textContent = `Q${index + 1}: ${displayText}`;
      questionTextSpan.style.cssText = `
        flex: 1;
        cursor: pointer;
      `;
      
      questionContent.appendChild(bookmarkButton);
      questionContent.appendChild(questionTextSpan);
      
      // 添加笔记按钮
      const bookmark = bookmarkedQuestions.get(questionId);
      const noteText = bookmark?.note || '';
      
      const noteButton = document.createElement('button');
      noteButton.innerHTML = '📝';
      noteButton.title = noteText ? `编辑笔记: ${noteText}` : '记录笔记';
      
      // 在标注筛选模式下，笔记按钮更加突出
      if (isBookmarkFilterMode) {
        noteButton.style.cssText = `
          background: ${noteText ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f0f0'};
          border: 1px solid ${noteText ? '#667eea' : '#ddd'};
          color: ${noteText ? 'white' : '#666'};
          cursor: pointer;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          margin-left: 8px;
          flex-shrink: 0;
          font-weight: 500;
        `;
        noteButton.innerHTML = noteText ? '📝 已记录' : '📝 添加笔记';
      } else {
        noteButton.style.cssText = `
          background: none;
          border: none;
          color: ${noteText ? '#667eea' : '#ccc'};
          cursor: pointer;
          font-size: 14px;
          padding: 2px 4px;
          border-radius: 3px;
          transition: all 0.2s ease;
          margin-left: 4px;
          flex-shrink: 0;
        `;
      }
      
      // 笔记按钮点击事件
      noteButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        
        // 如果问题还没有标注，先自动标注
        if (!isBookmarked(questionId)) {
          const success = await saveBookmark(questionId, questionText, '');
          if (!success) {
            showToast('标注失败，请重试', 'error');
            return;
          }
        }
        
        showNoteModal(questionId, questionText, noteText);
      });
      
      // 笔记按钮悬停效果
      noteButton.addEventListener('mouseenter', function() {
        if (isBookmarkFilterMode) {
          this.style.transform = 'scale(1.05)';
          this.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
        } else {
          this.style.transform = 'scale(1.1)';
          this.style.color = noteText ? '#4285f4' : '#667eea';
        }
      });
      
      noteButton.addEventListener('mouseleave', function() {
        if (isBookmarkFilterMode) {
          this.style.transform = 'scale(1)';
          this.style.boxShadow = 'none';
        } else {
          this.style.transform = 'scale(1)';
          this.style.color = noteText ? '#667eea' : '#ccc';
        }
      });
      
      questionContent.appendChild(noteButton);
      
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
            
            // 重新渲染时间线
            const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
              .filter(el => el.textContent?.trim().length > 0);
            renderTimeline(userMessages);
            
            showToast('标注已移除', 'info');
          }
        } else {
          // 添加标注 - 只标注，不弹出备注框
          const success = await saveBookmark(questionId, questionText, '');
          if (success) {
            this.innerHTML = '★';
            this.style.color = '#ffd700';
            this.title = '已标注';
            
            // 重新渲染时间线
            const userMessages = Array.from(document.querySelectorAll('user-query-content, .user-query-bubble-with-background, .query-text, .query-text-line, [class*="user-query"], [class*="query-text"], [class*="query-bubble"]'))
              .filter(el => el.textContent?.trim().length > 0);
            renderTimeline(userMessages);
            
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
  }
});