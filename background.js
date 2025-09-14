// 后台脚本，处理插件的后台任务

// 监听插件安装/更新事件
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Gemini Timeline Assistant 插件已安装');
  
  if (details.reason === 'install') {
    // 首次安装：设置默认选项
    chrome.storage.local.set({
      isTimelineEnabled: true,
      timelinePosition: 'right',
      timelineWidth: 250
    });
  } else if (details.reason === 'update') {
    // 更新时：迁移storage.sync数据到storage.local
    migrateStorageData();
  }
});

// 数据迁移函数
async function migrateStorageData() {
  try {
    // 从sync获取旧数据
    const syncData = await chrome.storage.sync.get(['bookmarkedQuestions']);
    if (syncData.bookmarkedQuestions) {
      // 迁移到local存储
      await chrome.storage.local.set({ bookmarkedQuestions: syncData.bookmarkedQuestions });
      // 清除sync中的数据
      await chrome.storage.sync.remove(['bookmarkedQuestions']);
      console.log('Gemini Timeline: 数据迁移完成');
    }
  } catch (error) {
    console.error('Gemini Timeline: 数据迁移失败:', error);
  }
}

// 监听插件卸载准备事件（Chrome的限制：无法直接监听卸载）
// 但我们可以在扩展启动时检查是否需要清理
chrome.runtime.onStartup.addListener(function() {
  // 定期清理过期数据
  cleanupExpiredData();
});

// 清理过期数据
async function cleanupExpiredData() {
  try {
    const result = await chrome.storage.local.get(['bookmarkedQuestions']);
    if (result.bookmarkedQuestions) {
      const bookmarks = new Map(Object.entries(result.bookmarkedQuestions));
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [id, bookmark] of bookmarks) {
        if (bookmark.expiresAt && now > bookmark.expiresAt) {
          bookmarks.delete(id);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        const cleanedData = Object.fromEntries(bookmarks);
        await chrome.storage.local.set({ bookmarkedQuestions: cleanedData });
        console.log(`后台清理了 ${cleanedCount} 个过期标注`);
      }
    }
  } catch (error) {
    console.error('后台清理失败:', error);
  }
}

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSettings') {
    // 获取用户设置
    chrome.storage.local.get(['isTimelineEnabled', 'timelinePosition', 'timelineWidth'], function(settings) {
      sendResponse(settings);
    });
    return true; // 保持消息通道开放，等待异步响应
  }
});

// 监听标签页更新事件
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  // 当标签页加载完成并且是Gemini页面时，通知内容脚本更新时间线
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('gemini.google.com')) {
    chrome.tabs.sendMessage(tabId, { action: 'updateTimeline' });
  }
});

// 监听扩展图标的点击事件
chrome.action.onClicked.addListener(function(tab) {
  // 检查是否在Gemini页面
  if (tab.url && tab.url.includes('gemini.google.com')) {
    // 切换时间线的显示状态
    chrome.storage.local.get(['isTimelineEnabled'], function(settings) {
      const newStatus = !(settings.isTimelineEnabled || true);
      chrome.storage.local.set({ isTimelineEnabled: newStatus });
      
      // 通知内容脚本切换时间线显示状态
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleTimeline',
        enabled: newStatus
      });
    });
  }
});