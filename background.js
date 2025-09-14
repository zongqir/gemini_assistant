// 后台脚本，处理插件的后台任务

// 监听插件安装事件
chrome.runtime.onInstalled.addListener(function() {
  console.log('Gemini Timeline Assistant 插件已安装');
  
  // 可以在这里添加一些初始化操作
  // 例如：设置默认选项
  chrome.storage.sync.set({
    isTimelineEnabled: true,
    timelinePosition: 'right',
    timelineWidth: 250
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSettings') {
    // 获取用户设置
    chrome.storage.sync.get(['isTimelineEnabled', 'timelinePosition', 'timelineWidth'], function(settings) {
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
    chrome.storage.sync.get(['isTimelineEnabled'], function(settings) {
      const newStatus = !(settings.isTimelineEnabled || true);
      chrome.storage.sync.set({ isTimelineEnabled: newStatus });
      
      // 通知内容脚本切换时间线显示状态
      chrome.tabs.sendMessage(tab.id, {
        action: 'toggleTimeline',
        enabled: newStatus
      });
    });
  }
});