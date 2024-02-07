const systemInfo = wx.getSystemInfoSync();
  // 获取设备机型
  const model = systemInfo.model;
  // 判断机型
  if (model.includes('iPhone')) {
    isIos = true;
  } else {
    isIos = false;
  }