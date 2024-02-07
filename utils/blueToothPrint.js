/**
 * 封装所有的 蓝牙打印相关逻辑
 * deviceId => 
 *    IOS 中 290F1F17-77EF-1AE2-B558-074F66EF8E16
 *    Android 中 66:22:B3:CF:B1:0C
 * serviceId => 
 *    IOS 中 000018F0-0000-1000-8000-00805F9B34FB
 *    Android 中 000018F0-0000-1000-8000-00805F9B34FB
 */
import {
  TextEncoder
} from "./encoding";

// 区分当前手机类型
let isIos = false;

let printDeviceId = '';
let printServiceId = '';
let writeCharacterId = '';

/**
 * 蓝牙打印数据
 */
export default function blueToothPrint() {
  openBlueTooth();
}

/**
 * 初始化蓝牙模块
 */
function openBlueTooth() {
  wx.openBluetoothAdapter({
    mode: 'central',
    success: (res) => {
      console.log('打开蓝牙成功', res)
      wx.showLoading({
        title: '蓝牙已开启,扫描设备',
      });
      getBlueToothDevices();
    },
    fail: (err) => {
      console.log('打开蓝牙失败', err)
      let {
        errno,
        errCode
      } = err;

      if (errno === 103) {
        wx.showModal({
          title: '提示',
          content: '用户未授权使用蓝牙申请,请点击右上角三个点-设置-蓝牙，设置为允许',
          success(res) {
            if (res.confirm) {
              console.log('用户点击确定')
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })
      } else if (errCode === 10001) {
        // 用户蓝牙开关未开启或者手机不支持蓝牙功能
        // 此时小程序蓝牙模块已经初始化完成
        wx.showModal({
          title: '提示',
          content: '当前未开启蓝牙，请手动打开蓝牙；',
          complete: () => {
            wx.onBluetoothAdapterStateChange(function (res) {
              let {
                available
              } = res;
              if (available) {
                // 蓝牙适配器可用
                wx.showLoading({
                  title: '蓝牙已开启,扫描设备',
                });
                getBlueToothDevices();
              }
            })
          }
        })

      } else {
        wx.showToast({
          title: '请打开手机蓝牙并开启微信定位授权',
          duration: 3000,
          icon: 'none'
        });
      }
    }
  });
}

/**
 * 开始搜寻附近的蓝牙外围设备。
 */
function getBlueToothDevices() {
  wx.startBluetoothDevicesDiscovery({
    // 上报设备的间隔，单位 ms。0 表示找到新设备立即上报，其他数值根据传入的间隔上报。
    interval: 1000,
    success: () => {
      /**
       * 监听搜索到新设备的事件
       */
      wx.onBluetoothDeviceFound((res) => {
        // 扫描到设备停止扫描
        wx.stopBluetoothDevicesDiscovery();
        console.log('扫描到的设备 res', res);
        let devices = res.devices;
        // 290F1F17-77EF-1AE2-B558-074F66EF8E16
        let deviceId = "";
        devices.forEach(item => {
          if (item.name.indexOf("Jucsan") > -1) {
            deviceId = item.deviceId;
          }
        });

        if (deviceId != "") {
          connectDevice(deviceId);
        } else {
          wx.showToast({
            title: '未找到设备',
            icon: 'error',
            duration: 2000
          });
        }
      });
    },
    fail: () => {
      wx.hideLoading();
      wx.showToast({
        title: '搜寻蓝牙设备失败',
        duration: 4000,
      })
    }
  })
}

/**
 * 连接蓝牙设备
 */
function connectDevice(deviceId) {
  wx.showLoading({
    title: '设备连接中...'
  })
  /**
   * 连接 蓝牙低功耗中心设备
   */
  wx.createBLEConnection({
    deviceId: deviceId,
    success: () => {
      getDeviceService(deviceId);
    },
    fail: function () {
      wx.hideLoading();
      wx.showToast({
        title: '连接设备失败',
        icon: 'error',
        duration: 4000
      });
    }
  });
}

/**
 * 获得设备服务
 */
function getDeviceService(deviceId) {
  wx.showLoading({
    title: '获取已连接设备服务...'
  })
  /**
   * 获取蓝牙低功耗设备所有服务 (service)。
   */
  wx.getBLEDeviceServices({
    deviceId,
    success: (res) => {
      console.log('低功耗蓝牙所有的服务 res', res);
      let services = res.services;
      if (services.length > 2) {
        // 000018F0-0000-1000-8000-00805F9B34FB
        let serviceId = services[2].uuid;
        getDeviceServiceCharacteristic(deviceId, serviceId);
      }
    }
  });
}

/**
 * 获取设备服务特征值
 */
function getDeviceServiceCharacteristic(deviceId, serviceId) {
  wx.getBLEDeviceCharacteristics({
    deviceId,
    serviceId,
    success: (res) => {
      let characteristics = res.characteristics;
      characteristics.forEach((character) => {
        if (character.properties.write) {
          writeCharacterId = character.uuid;
        }
      });

      if (writeCharacterId != "") {
        //  找到写入特征值 
        printDeviceId = deviceId;
        printServiceId = serviceId;
        writeCharacterId = writeCharacterId;
        // 获取本机蓝牙适配器状态
        startPrint();
      }
    }
  });
}

/**
 * 进行打印操作
 */
function startPrint() {
  wx.showLoading({
    title: '打印数据中...'
  })

  writeCharacteristicValue("\r\n");
  writeCharacteristicValue(" JUCSAN智能物联网终端数据报表\r\n");
  writeCharacteristicValue(" 设备ID:123456 \r\n");
  writeCharacteristicValue("\r\n");
  writeCharacteristicValue("\r\n", true);
}

/**
 * 写入特征值
 */
function writeCharacteristicValue(printValue, isCloseBlueTooth = false) {
  let printValueTarget = gbkToArray(printValue);
  let printUnitLength = 20; // 打印长度等于30
  let printStartIndex = 0;
  let printEndIndex = 0;

  while (printStartIndex < printValueTarget.byteLength) {
    // 结束索引
    printEndIndex = printStartIndex + printUnitLength;

    if (printEndIndex > printValueTarget.byteLength) {
      printEndIndex = printValueTarget.byteLength;
    }
    let printValueUnit = printValueTarget.slice(printStartIndex, printEndIndex);
    writeUnit(printValueUnit, isCloseBlueTooth);

    // 开始索引
    printStartIndex = printEndIndex;
  }
}

function writeUnit(value, isCloseBlueTooth) {
  wx.writeBLECharacteristicValue({
    deviceId: printDeviceId,
    serviceId: printServiceId,
    characteristicId: writeCharacterId,
    value: value,
    writeType: isIos ? 'write' : 'writeNoResponse',
    success: function () {
      if (isCloseBlueTooth) {
        setTimeout(() => {
          closeBlueToothPrint();
        }, 500);
      }
    },
    fail: function (res) {
      wx.hideLoading();
      let {
        errCode
      } = res;

      if (errCode === 10005) {
        wx.showModal({
          title: '提示',
          content: '没有找到指定特征',
        })
      } else if (errCode === 10012) {
        wx.showModal({
          title: '提示',
          content: '连接超时',
        })
      } else {
        wx.showModal({
          title: '提示',
          content: '写入失败',
        })
      }
    },
    complete: (res) => {
      console.log('写入二进制数据 complete - res', res);
    }
  });
}

/**
 * 打印完毕，关闭蓝牙
 * @param {*} content 
 */
function closeBlueToothPrint() {
  wx.hideLoading();
  wx.showModal({
    title: '数据打印完毕！',
  })
  // 关闭蓝牙
  wx.closeBluetoothAdapter({
    success(res) {
      console.log('关闭蓝牙', res)
    }
  })
}

function gbkToArray(content) {
  /**
   * gb2312 是中文映射表 可显示 2000多个汉字
   * TextEncoder 文本编码器： 文本 =》 二进制字节流
   * TextDecoder 文本译码器： 字节流 =》 文本
   */
  var _encoder = new TextEncoder("gb2312", {
    NONSTANDARD_allowLegacyEncoding: true
  });
  // content 需要打印的字符串
  const val = _encoder.encode(content);
  // console.log("gbkToArryval", val);
  return val.buffer;
}